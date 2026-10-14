/**
 * Every Cloud Run service answers on two URLs: the project-number form
 * (https://<service>-<project-number>.<region>.run.app) and an older hashed form
 * (https://<service>-<hash>-<region-code>.a.run.app). This storefront
 * standardises on the first. FullStory's domain allowlist and the consent
 * cookie key on the host, as will any origin check, so a page served from the
 * other one quietly loses session capture and asks for consent again.
 *
 * PUBLIC_URL is set per environment by Terragrunt. A page load on a legacy
 * *.a.run.app host is redirected there. Only page routes move: anything under
 * /api or /.well-known, and any path that names a file (openapi.yaml, a
 * bundle, an image), is served where it is asked for, because callers holding
 * the old URL, such as an agent registry, need not follow redirects. Other
 * hosts (localhost, health probes, a custom domain added later) are served as
 * they are.
 *
 * The redirect is a 302 rather than a 301 so that pointing these hosts
 * somewhere else later is not fighting a cached permanent redirect.
 */
const LEGACY_HOST_SUFFIX = '.a.run.app';
const MACHINE_PREFIXES = ['/api', '/.well-known'];

function isPageRoute(pathname) {
  if (MACHINE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false;
  const lastSegment = pathname.slice(pathname.lastIndexOf('/') + 1);
  return !lastSegment.includes('.') || lastSegment.endsWith('.html');
}

function publicOrigin(publicUrl) {
  if (!publicUrl) return null;
  try {
    const parsed = new URL(publicUrl);
    return parsed.protocol === 'https:' ? parsed : null;
  } catch {
    return null;
  }
}

/** The URL to redirect to, or null when the request should be served here. */
export function canonicalRedirect(req, publicUrl = process.env.PUBLIC_URL) {
  const target = publicOrigin(publicUrl);
  if (!target) return null;
  if (req.method !== 'GET' && req.method !== 'HEAD') return null;

  const host = (req.headers.host || '').toLowerCase().replace(/:\d+$/, '');
  if (!host.endsWith(LEGACY_HOST_SUFFIX) || host === target.host) return null;

  const path = req.url || '/';
  if (!path.startsWith('/')) return null;
  const pathname = path.split('?')[0];
  if (!isPageRoute(pathname)) return null;
  return `${target.origin}${path}`;
}
