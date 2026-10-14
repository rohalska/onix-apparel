import { describe, it, expect } from 'vitest';
import { canonicalRedirect } from '../../server/canonicalUrl.mjs';

const PUBLIC_URL = 'https://gecx-shopping-agent-demo-835936341567.us-central1.run.app';
const LEGACY = 'gecx-shopping-agent-demo-as77tzr44a-uc.a.run.app';

function req(method: string, url: string, host?: string) {
  return { method, url, headers: host === undefined ? {} : { host } };
}

describe('canonicalRedirect', () => {
  it('sends a page on the legacy Cloud Run host to the public URL, keeping path and query', () => {
    expect(canonicalRedirect(req('GET', '/?q=boots', LEGACY), PUBLIC_URL)).toBe(
      `${PUBLIC_URL}/?q=boots`,
    );
    expect(canonicalRedirect(req('GET', '/collections?sort=new', LEGACY), PUBLIC_URL)).toBe(
      `${PUBLIC_URL}/collections?sort=new`,
    );
    expect(canonicalRedirect(req('HEAD', '/', LEGACY), PUBLIC_URL)).toBe(`${PUBLIC_URL}/`);
  });

  it('matches the legacy host whatever its case or port', () => {
    expect(canonicalRedirect(req('GET', '/', `${LEGACY.toUpperCase()}:443`), PUBLIC_URL)).toBe(
      `${PUBLIC_URL}/`,
    );
  });

  // API callers and agent registries may hold the old URL and need not follow
  // redirects, so only page loads move.
  it.each([
    '/api',
    '/api/health',
    '/api/search?q=x',
    '/.well-known',
    '/.well-known/agent-card.json',
    '/openapi.yaml',
    '/assets/index-abc123.js',
    '/vite.svg',
  ])('leaves %s alone on the legacy host', (path) => {
    expect(canonicalRedirect(req('GET', path, LEGACY), PUBLIC_URL)).toBeNull();
  });

  it.each(['POST', 'OPTIONS', 'PUT'])('leaves %s requests alone', (method) => {
    expect(canonicalRedirect(req(method, '/', LEGACY), PUBLIC_URL)).toBeNull();
  });

  it('moves an explicit .html page and a dotted query string', () => {
    expect(canonicalRedirect(req('GET', '/index.html', LEGACY), PUBLIC_URL)).toBe(
      `${PUBLIC_URL}/index.html`,
    );
    expect(canonicalRedirect(req('GET', '/search?q=v1.2', LEGACY), PUBLIC_URL)).toBe(
      `${PUBLIC_URL}/search?q=v1.2`,
    );
  });

  it('does nothing on the public host itself', () => {
    expect(canonicalRedirect(req('GET', '/', new URL(PUBLIC_URL).host), PUBLIC_URL)).toBeNull();
  });

  // Only the legacy *.a.run.app form moves. Localhost, probes and any custom
  // domain added later are served as they are.
  it.each(['localhost:3001', '127.0.0.1:8080', '10.0.0.4', 'shop.example.com', undefined])(
    'does nothing for host %s',
    (host) => {
      expect(canonicalRedirect(req('GET', '/', host), PUBLIC_URL)).toBeNull();
    },
  );

  it.each([undefined, '', 'not a url', 'http://plain-http.example.com'])(
    'does nothing when PUBLIC_URL is %j',
    (publicUrl) => {
      expect(canonicalRedirect(req('GET', '/', LEGACY), publicUrl)).toBeNull();
    },
  );
});
