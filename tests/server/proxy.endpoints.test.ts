import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import net from 'net';
// proxy.mjs has no type declarations; suppress the implicit-any error here
// rather than widen allowJs/checkJs project-wide for one test file.
// @ts-expect-error -- '../../server/proxy.mjs' has no declaration file
import { server } from '../../server/proxy.mjs';

// proxy.mjs derives live mode from GCP_PROJECT_ID at import time, so pin it
// empty before that import runs, to keep a developer's .env from turning these
// tests into live Vertex calls. The pin is not airtight: on a Node that has
// process.loadEnvFile, proxy.mjs calls it and an already-set variable survives,
// but on one that does not, proxy.mjs falls back to a manual .env parser whose
// `if (!process.env[key])` test treats '' as unset, so a GCP_PROJECT_ID in .env
// would win. package.json declares no engines, so that path is reachable. The
// health test asserts mode === 'mock' rather than trusting the pin.
vi.hoisted(() => {
  process.env.GCP_PROJECT_ID = '';
});

let base: string;

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (typeof address === 'string' || address === null) throw new Error('no port');
  base = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

async function postJson(path: string, raw: string) {
  return fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw,
  });
}

// Raw-socket helper for cases fetch cannot express: a malformed request line
// (an invalid Host header the Fetch API would refuse to send), or asserting
// that a connection survives to serve a second request after the first.
function rawStatus(statusLine: string): number {
  return Number(statusLine.split(' ')[1]);
}

function sendRaw(socket: net.Socket, data: string) {
  socket.write(data);
}

// Reads exactly one response off a raw socket, body included, and hands back
// whatever bytes arrived past it as `rest`. Anything already read past the
// previous response must be passed back in as `carry`: a response's headers and
// body do not have to arrive in the same TCP segment, so dropping the leftovers
// and starting a fresh buffer makes the next read parse a body fragment as a
// status line. The body has to be consumed to find where it ends, which means
// honouring both framings the proxy emits -- sendJson responses are chunked,
// static files carry a Content-Length. Rejects, with the reason, if the socket
// errors or closes first; otherwise a dead socket only surfaces as a test
// timeout with nothing to explain it.
function readOneResponse(
  socket: net.Socket,
  carry: Buffer = Buffer.alloc(0),
): Promise<{ statusLine: string; rest: Buffer }> {
  return new Promise((resolve, reject) => {
    let buf = carry;

    const cleanup = () => {
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('close', onClose);
    };

    const tryParse = (): boolean => {
      const headerEnd = buf.indexOf('\r\n\r\n');
      if (headerEnd === -1) return false;
      const lines = buf.subarray(0, headerEnd).toString().split('\r\n');
      const headers = new Map<string, string>();
      for (const line of lines.slice(1)) {
        const colon = line.indexOf(':');
        if (colon !== -1) {
          headers.set(line.slice(0, colon).toLowerCase(), line.slice(colon + 1).trim());
        }
      }

      const bodyStart = headerEnd + 4;
      let bodyEnd: number;
      if (headers.get('transfer-encoding') === 'chunked') {
        // The terminal zero-length chunk. Safe to search for as a literal
        // because the proxy's JSON bodies contain no CR or LF of their own.
        const terminator = buf.indexOf('0\r\n\r\n', bodyStart);
        if (terminator === -1) return false;
        bodyEnd = terminator + 5;
      } else {
        const length = Number(headers.get('content-length') ?? 0);
        if (buf.length < bodyStart + length) return false;
        bodyEnd = bodyStart + length;
      }

      cleanup();
      resolve({ statusLine: lines[0], rest: buf.subarray(bodyEnd) });
      return true;
    };

    const onData = (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);
      tryParse();
    };
    const onError = (err: Error) => {
      cleanup();
      reject(new Error(`socket errored before a complete response arrived: ${err.message}`));
    };
    const onClose = () => {
      cleanup();
      reject(
        new Error(
          `socket closed after ${buf.length} bytes without a complete response: ` +
            JSON.stringify(buf.toString().slice(0, 200)),
        ),
      );
    };

    socket.on('data', onData);
    socket.on('error', onError);
    socket.on('close', onClose);
    // `carry` may already hold the whole next response.
    tryParse();
  });
}

describe('POST /api/search input handling', () => {
  it('rejects a literal null body with 400 rather than crashing', async () => {
    const res = await postJson('/api/search', 'null');
    expect(res.status).toBe(400);
  });

  it('rejects a non-object body with 400', async () => {
    const res = await postJson('/api/search', '"a string"');
    expect(res.status).toBe(400);
  });

  it('rejects a non-string query with 400', async () => {
    const res = await postJson('/api/search', JSON.stringify({ query: 42 }));
    expect(res.status).toBe(400);
  });

  it('rejects a non-string sortBy with 400', async () => {
    const res = await postJson('/api/search', JSON.stringify({ query: 'jacket', sortBy: 42 }));
    expect(res.status).toBe(400);
  });

  it('rejects malformed JSON with 400', async () => {
    const res = await postJson('/api/search', '{not json');
    expect(res.status).toBe(400);
  });

  it('accepts a well-formed search', async () => {
    const res = await postJson('/api/search', JSON.stringify({ query: 'jacket' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products.length).toBeGreaterThan(0);
  });

  it('treats explicit nulls on visitorId and pageSize as absent', async () => {
    // Only live mode forwards these to Vertex, so this pins acceptance rather
    // than the live payload.
    const res = await postJson(
      '/api/search',
      JSON.stringify({ query: 'jacket', visitorId: null, pageSize: null }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products.length).toBeGreaterThan(0);
  });

  it('accepts a body with every optional field omitted', async () => {
    const res = await postJson('/api/search', '{}');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products.length).toBeGreaterThan(0);
  });

  it('accepts the exact shape AppContent.tsx builds on mount (AppContent.tsx:142-152)', async () => {
    // query: '', category: 'all', maxPrice: 700, size/color omitted (both
    // start out null, so AppContent sends `undefined` and JSON drops them),
    // sortBy: 'featured' -- the component's initial useState values, plus the
    // visitorId the searchVertexProducts wrapper adds before it fetches.
    const res = await postJson(
      '/api/search',
      JSON.stringify({
        query: '',
        category: 'all',
        maxPrice: 700,
        sortBy: 'featured',
        visitorId: 'visitor-test',
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products.length).toBeGreaterThan(0);
  });

  it('treats an explicit null query and sortBy as absent, not invalid', async () => {
    // Deliberate leniency beyond the published contract (openapi.yaml does not
    // mark these fields nullable): an explicit null is treated as omitted.
    const res = await postJson('/api/search', JSON.stringify({ query: null, sortBy: null }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products.length).toBeGreaterThan(0);
  });

  it('rejects a body over the 100 KB limit with 413, and the connection is still usable afterwards', async () => {
    const huge = JSON.stringify({ query: 'x'.repeat(200 * 1024) });
    const res = await postJson('/api/search', huge);
    expect(res.status).toBe(413);

    // Reuse *some* connection right after -- fetch's pool may or may not
    // reuse the exact socket, but the raw-socket test below pins the case
    // that actually broke (the same TCP connection carrying a second
    // request straight after an oversized body was rejected).
    const followUp = await postJson('/api/search', JSON.stringify({ query: 'jacket' }));
    expect(followUp.status).toBe(200);
  });

  it('drains an oversized body without corrupting a request replayed on the same connection', async () => {
    // Regression test for the keep-alive corruption bug: the body reader
    // used to abandon the request stream mid-read once the 100 KB limit was
    // exceeded, leaving unread bytes on the socket that broke the framing of
    // whatever request came next on the same connection.
    //
    // The invariant is send-then-drain, in that order: answer 413 the moment
    // the limit is crossed, then req.resume() to discard whatever is still
    // inbound. Draining to completion first also fixes the framing, which is
    // why it looks like the tidier shape -- but it was measured leaving a
    // stalled oversized upload with no response at all, holding the
    // connection for as long as Node's 300s requestTimeout allows. At the
    // rate limiter's 120 req/min per IP that is enough held sockets to
    // saturate a Cloud Run instance and shed legitimate traffic. Do not
    // reorder the send after the drain.
    //
    // Proven with a raw socket carrying two requests, so there is no
    // ambiguity about which TCP connection is used.
    const socket = net.createConnection({ port: Number(new URL(base).port), host: '127.0.0.1' });
    await new Promise<void>((resolve) => socket.once('connect', () => resolve()));

    const hugeBody = JSON.stringify({ query: 'x'.repeat(200 * 1024) });
    sendRaw(
      socket,
      `POST /api/search HTTP/1.1\r\n` +
        `Host: 127.0.0.1\r\n` +
        `Content-Type: application/json\r\n` +
        `Content-Length: ${Buffer.byteLength(hugeBody)}\r\n` +
        `Connection: keep-alive\r\n\r\n${hugeBody}`,
    );
    const first = await readOneResponse(socket);
    expect(rawStatus(first.statusLine)).toBe(413);

    const smallBody = JSON.stringify({ query: 'jacket' });
    sendRaw(
      socket,
      `POST /api/search HTTP/1.1\r\n` +
        `Host: 127.0.0.1\r\n` +
        `Content-Type: application/json\r\n` +
        `Content-Length: ${Buffer.byteLength(smallBody)}\r\n` +
        `Connection: close\r\n\r\n${smallBody}`,
    );
    // Hand the first read's leftovers to the second so a body that arrived in
    // its own segment cannot be mistaken for the second response.
    const second = await readOneResponse(socket, first.rest);
    expect(rawStatus(second.statusLine)).toBe(200);

    socket.end();
  });
});

describe('POST /api/events input handling', () => {
  it('rejects an empty object with 400 rather than crashing', async () => {
    const res = await postJson('/api/events', '{}');
    expect(res.status).toBe(400);
  });

  it('rejects a non-string eventType with 400', async () => {
    const res = await postJson('/api/events', JSON.stringify({ eventType: 7 }));
    expect(res.status).toBe(400);
  });

  it('rejects an empty-string eventType with 400', async () => {
    const res = await postJson('/api/events', JSON.stringify({ eventType: '' }));
    expect(res.status).toBe(400);
  });

  it('accepts a well-formed event', async () => {
    const res = await postJson(
      '/api/events',
      JSON.stringify({ eventType: 'detail-page-view', visitorId: 'v1' }),
    );
    expect(res.status).toBe(200);
  });

  it('accepts an explicit null details rather than crashing on details.quantity', async () => {
    const res = await postJson(
      '/api/events',
      JSON.stringify({ eventType: 'add-to-cart', product: { id: 1 }, details: null }),
    );
    expect(res.status).toBe(200);
  });
});

describe('GET /api/health', () => {
  it('reports mock mode, which also proves the GCP_PROJECT_ID pin took', async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    // Exactly 'mock', not one of a set: with GCP_PROJECT_ID pinned empty above,
    // isLiveMode is deterministically false, so this is the assertion that
    // catches a pin that did not take. Accepting 'live' here would let the whole
    // suite make real Vertex calls and still pass.
    expect(body.mode).toBe('mock');
  });
});

describe('the request error boundary', () => {
  it('turns an unanticipated throw into a 500 and keeps serving', async () => {
    // The validation guards above close every known unguarded property access
    // (that is the point of this task), so this test needs a genuinely
    // different, still-live throw to prove the boundary itself works rather
    // than re-testing a bug that no longer exists. A Host header the Fetch
    // API would refuse to send -- an unterminated IPv6 literal -- makes
    // `new URL(req.url, 'http://' + host)` throw before routing ever runs.
    const socket = net.createConnection({ port: Number(new URL(base).port), host: '127.0.0.1' });
    await new Promise<void>((resolve) => socket.once('connect', () => resolve()));

    sendRaw(socket, `GET /api/health HTTP/1.1\r\nHost: [::1\r\nConnection: close\r\n\r\n`);
    const res = await readOneResponse(socket);
    expect(rawStatus(res.statusLine)).toBe(500);
    socket.end();

    const health = await fetch(`${base}/api/health`);
    expect(health.status).toBe(200);
  });
});
