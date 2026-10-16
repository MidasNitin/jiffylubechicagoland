// Vercel Edge Middleware: HTTP Basic Auth for everything under /private/.
// Credentials come from the PRIVATE_USER and PRIVATE_PASS environment variables in Vercel.
export const config = { matcher: ['/private/:path*'] };

export default function middleware(request) {
  const user = process.env.PRIVATE_USER;
  const pass = process.env.PRIVATE_PASS;
  const deny = (msg) => new Response(msg, {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Jiffy Lube Chicagoland owners and marketing", charset="UTF-8"', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }
  });
  if (!user || !pass) return new Response('Private area is not configured.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) return deny('Sign in required.');
  let decoded = '';
  try { decoded = atob(header.slice(6)); } catch (e) { return deny('Sign in required.'); }
  const i = decoded.indexOf(':');
  const u = decoded.slice(0, i), p = decoded.slice(i + 1);
  if (u !== user || p !== pass) return deny('Wrong username or password.');
  return undefined; // continue to the static file
}
