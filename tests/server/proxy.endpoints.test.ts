import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import net from 'net';
import http from 'http';
// proxy.mjs has no type declarations; suppress the implicit-any error here
// rather than widen allowJs/checkJs project-wide for one test file.
// @ts-expect-error -- '../../server/proxy.mjs' has no declaration file
// prettier-ignore
import { server, mapVertexProductToFrontend, buildRetailUserEvent, validateRetailUserEvent, getClientIp, checkRateLimit, resetRateLimits, MAX_TRACKED_IPS, ipRequestCounts, getGcpAccessToken, resetGcpTokenCache, getCachedGcpToken, setCachedGcpTokenForTesting } from '../../server/proxy.mjs';

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

  it('correctly filters products by new department categories', async () => {
    const res = await postJson(
      '/api/search',
      JSON.stringify({
        category: 'electronics',
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products.length).toBeGreaterThan(0);
    for (const p of body.products) {
      expect(p.category).toBe('electronics');
    }
  });

  it('returns jewelry products under the canonical spelling and accepts the legacy category key', async () => {
    for (const category of ['jewelry', 'jewelery']) {
      const res = await postJson('/api/search', JSON.stringify({ category }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.products.length).toBeGreaterThan(0);
      for (const product of body.products) {
        expect(product.category).toBe('jewelry');
      }
    }
  });

  it('correctly discriminates coffee products between furniture and groceries', async () => {
    const furnRes = await postJson(
      '/api/search',
      JSON.stringify({
        query: 'coffee',
        category: 'furniture',
      }),
    );
    expect(furnRes.status).toBe(200);
    const furnBody = await furnRes.json();
    expect(furnBody.products.length).toBeGreaterThan(0);
    for (const p of furnBody.products) {
      expect(p.category).toBe('furniture');
    }

    const grocRes = await postJson(
      '/api/search',
      JSON.stringify({
        query: 'coffee',
        category: 'groceries',
      }),
    );
    expect(grocRes.status).toBe(200);
    const grocBody = await grocRes.json();
    expect(grocBody.products.length).toBeGreaterThan(0);
    for (const p of grocBody.products) {
      expect(p.category).toBe('groceries');
    }
  });

  it('correctly discriminates skincare/beauty from fragrances without overlap in /api/search', async () => {
    const beautyRes = await postJson(
      '/api/search',
      JSON.stringify({
        category: 'beauty',
      }),
    );
    expect(beautyRes.status).toBe(200);
    const beautyBody = await beautyRes.json();
    expect(beautyBody.products.length).toBeGreaterThan(0);
    for (const p of beautyBody.products) {
      expect(p.category).toBe('beauty');
    }

    const fragRes = await postJson(
      '/api/search',
      JSON.stringify({
        category: 'fragrances',
      }),
    );
    expect(fragRes.status).toBe(200);
    const fragBody = await fragRes.json();
    expect(fragBody.products.length).toBeGreaterThan(0);
    for (const p of fragBody.products) {
      expect(p.category).toBe('fragrances');
    }

    const beautyIds = new Set(beautyBody.products.map((p: { id: number }) => p.id));
    const fragranceIds = fragBody.products.map((p: { id: number }) => p.id);
    expect(fragranceIds.every((id: number) => !beautyIds.has(id))).toBe(true);
  });

  it("strictly separates men's clothing and women's clothing in simulation mode search", async () => {
    const menRes = await postJson('/api/search', JSON.stringify({ category: "men's clothing" }));
    expect(menRes.status).toBe(200);
    const menBody = await menRes.json();
    expect(menBody.products.length).toBeGreaterThan(0);
    for (const p of menBody.products) {
      expect(p.category).toBe("men's clothing");
    }

    const womenRes = await postJson(
      '/api/search',
      JSON.stringify({ category: "women's clothing" }),
    );
    expect(womenRes.status).toBe(200);
    const womenBody = await womenRes.json();
    expect(womenBody.products.length).toBeGreaterThan(0);
    for (const p of womenBody.products) {
      expect(p.category).toBe("women's clothing");
    }

    // Result sets must be completely disjoint: men's search must not contain any women's items
    const menIds = new Set(menBody.products.map((p: { id: number }) => p.id));
    const womenIds = womenBody.products.map((p: { id: number }) => p.id);
    expect(womenIds.every((id: number) => !menIds.has(id))).toBe(true);
  });

  it('handles unknown category gracefully by falling through to unfiltered catalog matching live mode', async () => {
    const allRes = await postJson('/api/search', JSON.stringify({ category: 'all' }));
    expect(allRes.status).toBe(200);
    const allBody = await allRes.json();

    const unknownRes = await postJson(
      '/api/search',
      JSON.stringify({ category: 'nonexistent-department' }),
    );
    expect(unknownRes.status).toBe(200);
    const unknownBody = await unknownRes.json();
    expect(unknownBody.products.length).toBe(allBody.products.length);
  });

  it('maps tech accessories under Electronics to electronics and never jewelery', () => {
    const product = mapVertexProductToFrontend({
      id: 'onx-999',
      title: 'Wireless Fast Charger Stand',
      categories: ['Electronics', 'Electronics > Accessories'],
      attributes: {
        department: { text: ['Electronics'] },
      },
    });
    expect(product.category).toBe('electronics');
    expect(product.category).not.toBe('jewelery');
  });

  it('maps AICS standard sizes, colors, and ratings to the storefront product', () => {
    const product = mapVertexProductToFrontend({
      id: 'onx-999',
      title: 'Standard fields product',
      categories: ['Apparel', "Apparel > Men's Clothing"],
      sizes: ['M', 'L'],
      colorInfo: { colors: ['Forest Green'] },
      rating: { averageRating: 4.2, ratingCount: 0 },
      attributes: {
        sizes: { text: ['XS'] },
        colors: { text: ['Fallback color'] },
        color_hexes: { text: ['#228b22'] },
        rating_rate: { numbers: [3] },
        rating_count: { numbers: [18] },
      },
    });

    expect(product.sizes).toEqual(['M', 'L']);
    expect(product.colors).toEqual([{ name: 'Forest Green', hex: '#228b22' }]);
    expect(product.rating).toEqual({ rate: 4.2, count: 0 });
  });

  it('maps categories case-insensitively across all departments', () => {
    const testCases: [string[], string][] = [
      [["apparel > women's clothing"], "women's clothing"],
      [["APPAREL > MEN'S CLOTHING"], "men's clothing"],
      [['electronics > audio & visual'], 'electronics'],
      [['home & living > kitchen & tabletop'], 'furniture'],
      [['FURNITURE'], 'furniture'],
      [['beauty & fragrance > skincare'], 'beauty'],
      [['beauty & fragrance > fragrances'], 'fragrances'],
      [['gourmet pantry > specialty coffee'], 'groceries'],
      [['accessories > fine jewelry'], 'jewelry'],
      [['accessories > fine jewelery'], 'jewelry'],
      [['accessories'], 'jewelry'],
      [['accessories > watches & bags'], 'jewelry'],
    ];

    for (const [categories, expected] of testCases) {
      const product = mapVertexProductToFrontend({
        id: 'onx-test',
        title: 'Test Product',
        categories,
      });
      expect(product.category).toBe(expected);
    }
  });

  it('maps unrecognised category hierarchies to the neutral Category union member "all"', () => {
    const product = mapVertexProductToFrontend({
      id: 'onx-cam',
      title: 'HD Webcam',
      categories: ['Hardware > Office Equipment'],
    });
    // Fall back to the neutral Category enum member ("all") to avoid misclassifying
    // new departments into specific departments like "men's clothing" while strictly
    // adhering to the Category union and OpenAPI enum contract.
    expect(product.category).toBe('all');
  });

  it('treats an explicit null query and sortBy as absent, not invalid', async () => {
    // Deliberate leniency beyond the published contract (openapi.yaml does not
    // mark these fields nullable): an explicit null is treated as omitted.
    const res = await postJson('/api/search', JSON.stringify({ query: null, sortBy: null }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.products.length).toBeGreaterThan(0);
  });

  it('guarantees that every facet group has an array of values', async () => {
    const res = await postJson('/api/search', JSON.stringify({ query: 'jacket' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.facets)).toBe(true);
    expect(body.facets.length).toBeGreaterThan(0);
    for (const facet of body.facets) {
      expect(Array.isArray(facet.values)).toBe(true);
    }
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

  it('rejects an invalid eventType with 400', async () => {
    const res = await postJson(
      '/api/events',
      JSON.stringify({ eventType: 'invalid-type', visitorId: 'v1' }),
    );
    expect(res.status).toBe(400);
  });

  it('rejects a whitespace-only visitorId with 400', async () => {
    const res = await postJson(
      '/api/events',
      JSON.stringify({ eventType: 'detail-page-view', visitorId: '   ' }),
    );
    expect(res.status).toBe(400);
  });

  it('accepts a consolidated multi-item purchase-complete event', async () => {
    const res = await postJson(
      '/api/events',
      JSON.stringify({
        eventType: 'purchase-complete',
        visitorId: 'buyer-1',
        items: [
          { product: { id: 101 }, quantity: 2 },
          { product: { id: 102 }, quantity: 1 },
        ],
        purchaseTransaction: {
          id: 'ord-999',
          revenue: 159.98,
          currencyCode: 'USD',
        },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.loggedEvent.eventType).toBe('purchase-complete');
    expect(body.loggedEvent.productEventDetail.productDetails).toHaveLength(2);
    expect(body.loggedEvent.productEventDetail.productDetails[0].product.id).toBe('onx-101');
    expect(body.loggedEvent.productEventDetail.purchaseTransaction.id).toBe('ord-999');
    expect(body.loggedEvent.productEventDetail.purchaseTransaction.revenue).toBe(159.98);
  });

  it('rejects a purchase-complete event without items', async () => {
    const res = await postJson(
      '/api/events',
      JSON.stringify({
        eventType: 'purchase-complete',
        visitorId: 'buyer-1',
        items: [],
        purchaseTransaction: {
          id: 'ord-999',
          revenue: 100,
        },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('rejects a purchase-complete event with negative revenue', async () => {
    const res = await postJson(
      '/api/events',
      JSON.stringify({
        eventType: 'purchase-complete',
        visitorId: 'buyer-1',
        items: [{ product: { id: 1 }, quantity: 1 }],
        purchaseTransaction: {
          id: 'ord-999',
          revenue: -50,
        },
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe('Retail User Event Helpers', () => {
  it('correctly maps single and multi-item events', () => {
    const single = buildRetailUserEvent({
      eventType: 'detail-page-view',
      visitorId: 'user-1',
      product: { id: 42 },
      details: { quantity: 1 },
    });
    expect(single.eventType).toBe('detail-page-view');
    expect(single.productEventDetail?.productDetails[0].product.id).toBe('onx-42');

    const multi = buildRetailUserEvent({
      eventType: 'purchase-complete',
      visitorId: 'user-2',
      items: [{ product: { id: 'onx-99' }, quantity: 3 }],
      purchaseTransaction: { id: 'tx-1', revenue: 75.5, currencyCode: 'USD' },
    });
    expect(multi.productEventDetail?.productDetails[0].product.id).toBe('onx-99');
    expect(multi.productEventDetail?.purchaseTransaction?.revenue).toBe(75.5);
  });

  it('validates event schema correctly', () => {
    expect(validateRetailUserEvent({}).valid).toBe(false);
    expect(validateRetailUserEvent({ eventType: 'unknown', visitorId: 'v1' }).valid).toBe(false);
    expect(validateRetailUserEvent({ eventType: 'detail-page-view', visitorId: '' }).valid).toBe(
      false,
    );
    expect(validateRetailUserEvent({ eventType: 'detail-page-view', visitorId: 'v1' }).valid).toBe(
      true,
    );
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
    expect(typeof body.catalogItemCount).toBe('number');
    expect(typeof body.itemCount).toBe('number');
    expect(body.catalogItemCount).toBe(body.itemCount);
    expect(body.itemCount).toBeGreaterThan(0);
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

describe('POST /api/search sorting', () => {
  it('puts every new arrival ahead of everything else under sortBy newest', async () => {
    // Pins the grouping itself: the bundled catalog interleaves new arrivals
    // among the rest, so this fails if the sort is dropped or inverted. It does
    // not distinguish the comparator's earlier form, which read only its second
    // operand and never returned 0. That form violated the comparator contract
    // but still grouped correctly for 14 items under V8's insertion sort, so no
    // black-box assertion over this catalog can separate the two.
    const res = await postJson('/api/search', JSON.stringify({ sortBy: 'newest' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.appliedSort).toBe('newest');

    const flags: boolean[] = body.products.map((p: { isNewArrival?: boolean }) =>
      Boolean(p.isNewArrival),
    );
    expect(flags.filter(Boolean).length).toBeGreaterThan(0);
    expect(flags.filter((f) => !f).length).toBeGreaterThan(0);

    const firstOld = flags.indexOf(false);
    expect(
      flags.slice(firstOld).some(Boolean),
      'a new arrival appears after a product that is not one',
    ).toBe(false);
  });
});

describe('Rate limiting and trusted proxy resolution', () => {
  it('extracts rightmost client IP appended by trusted proxy and falls back safely', () => {
    // Single IP
    expect(
      getClientIp({
        headers: { 'x-forwarded-for': '203.0.113.195' },
        socket: { remoteAddress: '127.0.0.1' },
      }),
    ).toBe('203.0.113.195');

    // Spoofed chain: client forged first hop, proxy appended verified second hop
    expect(
      getClientIp({
        headers: { 'x-forwarded-for': 'attacker-spoofed-ip, 198.51.100.22' },
        socket: { remoteAddress: '127.0.0.1' },
      }),
    ).toBe('198.51.100.22');

    // Missing X-Forwarded-For falls back to socket address
    expect(
      getClientIp({
        headers: {},
        socket: { remoteAddress: '192.168.1.50' },
      }),
    ).toBe('192.168.1.50');
  });

  it('enforces 429 when client exceeds 120 req/window and blocks rotated spoofed headers', async () => {
    resetRateLimits();
    const targetIp = '198.51.100.77';

    // Make 120 requests
    for (let i = 0; i < 120; i++) {
      const res = await fetch(`${base}/api/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': `rotated-fake-${i}, ${targetIp}`,
        },
        body: JSON.stringify({ query: 'jacket' }),
      });
      expect(res.status).toBe(200);
    }

    // 121st request from same real IP (even with another fake header) must return 429
    const throttled = await fetch(`${base}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': `yet-another-fake, ${targetIp}`,
      },
      body: JSON.stringify({ query: 'jacket' }),
    });
    expect(throttled.status).toBe(429);
    const body = await throttled.json();
    expect(body.error).toContain('Too Many Requests');
  });

  it('strictly bounds in-memory map size to MAX_TRACKED_IPS under IP churn', () => {
    resetRateLimits();
    const churnCount = MAX_TRACKED_IPS + 50;

    for (let i = 0; i < churnCount; i++) {
      const req = {
        headers: { 'x-forwarded-for': `10.10.${i % 250}.${Math.floor(i / 250)}` },
        socket: { remoteAddress: '127.0.0.1' },
      };
      checkRateLimit(req);
    }

    expect(ipRequestCounts.size).toBeLessThanOrEqual(MAX_TRACKED_IPS);
  });
});

describe('getGcpAccessToken resolution, caching, and priority order', () => {
  const originalEnvToken = process.env.GOOGLE_ACCESS_TOKEN;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    resetGcpTokenCache();
    if (originalEnvToken !== undefined) {
      process.env.GOOGLE_ACCESS_TOKEN = originalEnvToken;
    } else {
      delete process.env.GOOGLE_ACCESS_TOKEN;
    }
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('prioritizes GOOGLE_ACCESS_TOKEN environment variable in non-production environments', async () => {
    resetGcpTokenCache();
    process.env.NODE_ENV = 'development';
    process.env.GOOGLE_ACCESS_TOKEN = 'test-explicit-ci-token';
    const token = await getGcpAccessToken();
    expect(token).toBe('test-explicit-ci-token');
  });

  it('serves unexpired token directly from in-memory cache without hitting external resolvers', async () => {
    resetGcpTokenCache();
    delete process.env.GOOGLE_ACCESS_TOKEN;
    setCachedGcpTokenForTesting('cached-test-token-active', 60000);

    // Call getGcpAccessToken and verify it returns cached token unconditionally
    const token = await getGcpAccessToken();
    expect(token).toBe('cached-test-token-active');
    expect(getCachedGcpToken()).toBe('cached-test-token-active');
  });

  it('flushes cached token when resetGcpTokenCache is called', () => {
    setCachedGcpTokenForTesting('token-to-flush', 60000);
    expect(getCachedGcpToken()).toBe('token-to-flush');

    resetGcpTokenCache();
    expect(getCachedGcpToken()).toBeNull();
  });

  it('ignores expired cache entry and proceeds to next source', async () => {
    resetGcpTokenCache();
    process.env.NODE_ENV = 'production';
    delete process.env.GOOGLE_ACCESS_TOKEN;
    // Set a cache entry that expired in the past (-5 seconds)
    setCachedGcpTokenForTesting('stale-expired-token', -5000);

    // Stub fetch to simulate a fresh token from metadata server deterministically (0ms)
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('computeMetadata/v1/instance/service-accounts/default/token')) {
        return Promise.resolve(
          new Response(JSON.stringify({ access_token: 'fresh-resolved-token', expires_in: 3600 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      return Promise.reject(new Error('not found'));
    });

    try {
      // getGcpAccessToken ignores the expired cache entry and resolves the fresh token
      const token = await getGcpAccessToken();
      expect(token).toBe('fresh-resolved-token');
      expect(token).not.toBe('stale-expired-token');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('does not cache short-lived tokens with 10s or less remaining', async () => {
    resetGcpTokenCache();
    process.env.NODE_ENV = 'production';
    delete process.env.GOOGLE_ACCESS_TOKEN;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve(
        new Response(JSON.stringify({ access_token: 'short-lived-token', expires_in: 5 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    try {
      const token = await getGcpAccessToken();
      expect(token).toBe('short-lived-token');
      // Token was returned, but NOT cached to prevent serving an expired token
      expect(getCachedGcpToken()).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('treats presence of K_SERVICE environment variable as production', async () => {
    resetGcpTokenCache();
    delete process.env.NODE_ENV;
    process.env.K_SERVICE = 'onix-apparel-service';
    process.env.GOOGLE_ACCESS_TOKEN = 'stale-token';

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      return Promise.resolve(
        new Response(
          JSON.stringify({ access_token: 'cloud-run-identity-token', expires_in: 3600 }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );
    });

    try {
      const token = await getGcpAccessToken();
      expect(token).toBe('cloud-run-identity-token');
      expect(token).not.toBe('stale-token');
    } finally {
      globalThis.fetch = originalFetch;
      delete process.env.K_SERVICE;
    }
  });

  it('prevents GOOGLE_ACCESS_TOKEN from silently overriding metadata server in production', async () => {
    resetGcpTokenCache();
    process.env.NODE_ENV = 'production';
    process.env.GOOGLE_ACCESS_TOKEN = 'stale-static-prod-token';

    // Mock fetch to simulate metadata server returning a fresh token
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url: string | URL | Request) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('computeMetadata/v1/instance/service-accounts/default/token')) {
        return Promise.resolve(
          new Response(JSON.stringify({ access_token: 'fresh-metadata-token', expires_in: 3600 }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        );
      }
      return originalFetch(url);
    });

    try {
      const token = await getGcpAccessToken();
      expect(token).toBe('fresh-metadata-token');
      expect(token).not.toBe('stale-static-prod-token');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('falls back to GOOGLE_ACCESS_TOKEN in production without assuming static TTL, avoiding repeated timeouts via cooldown', async () => {
    resetGcpTokenCache();
    process.env.NODE_ENV = 'production';
    process.env.GOOGLE_ACCESS_TOKEN = 'off-gcp-fallback-token';
    const oldCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/nonexistent/credentials.json';

    const originalFetch = globalThis.fetch;
    const fetchSpy = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    globalThis.fetch = fetchSpy;

    try {
      // First call fails metadata server & ADC, triggers cooldown, and returns live env token
      const firstToken = await getGcpAccessToken();
      expect(firstToken).toBe('off-gcp-fallback-token');
      // Static env token is NOT cached with false TTL, allowing immediate rotation
      expect(getCachedGcpToken()).toBeNull();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Rotating env token immediately reflects without stale cache
      process.env.GOOGLE_ACCESS_TOKEN = 'rotated-env-token';

      // Second call during cooldown returns new token immediately without re-calling metadata server
      const secondToken = await getGcpAccessToken();
      expect(secondToken).toBe('rotated-env-token');
      expect(fetchSpy).toHaveBeenCalledTimes(1); // fetch was NOT called again due to cooldown!
    } finally {
      globalThis.fetch = originalFetch;
      if (oldCreds !== undefined) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = oldCreds;
      } else {
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
    }
  });

  it('handles 200 response without access_token by setting cooldown and proceeding to fallback', async () => {
    resetGcpTokenCache();
    process.env.NODE_ENV = 'production';
    process.env.GOOGLE_ACCESS_TOKEN = 'fallback-after-empty-200';
    const oldCreds = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    process.env.GOOGLE_APPLICATION_CREDENTIALS = '/nonexistent/credentials.json';

    const originalFetch = globalThis.fetch;
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    globalThis.fetch = fetchSpy;

    try {
      const token = await getGcpAccessToken();
      expect(token).toBe('fallback-after-empty-200');
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Second call does not re-fetch due to cooldown set by empty 200 payload
      const token2 = await getGcpAccessToken();
      expect(token2).toBe('fallback-after-empty-200');
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.fetch = originalFetch;
      if (oldCreds !== undefined) {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = oldCreds;
      } else {
        delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
      }
    }
  });
});

describe('legacy Cloud Run host', () => {
  const publicUrl = 'https://gecx-shopping-agent-demo-835936341567.us-central1.run.app';

  function getWithHost(path: string, host: string) {
    const { port } = new URL(base);
    return new Promise<{ status?: number; location?: string; cacheControl?: string }>(
      (resolve, reject) => {
        const r = http.request(
          { host: '127.0.0.1', port, path, method: 'GET', headers: { host } },
          (res) => {
            res.resume();
            resolve({
              status: res.statusCode,
              location: res.headers.location,
              cacheControl: res.headers['cache-control'],
            });
          },
        );
        r.on('error', reject);
        r.end();
      },
    );
  }

  afterEach(() => {
    delete process.env.PUBLIC_URL;
  });

  it('redirects a page load to PUBLIC_URL and still serves the API there', async () => {
    process.env.PUBLIC_URL = publicUrl;
    const legacy = 'gecx-shopping-agent-demo-as77tzr44a-uc.a.run.app';

    expect(await getWithHost('/?q=boots', legacy)).toEqual({
      status: 302,
      location: `${publicUrl}/?q=boots`,
      cacheControl: 'no-store',
    });
    expect((await getWithHost('/api/health', legacy)).status).toBe(200);
  });
});
