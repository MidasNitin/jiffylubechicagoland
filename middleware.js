// Vercel Edge Middleware: HTTP Basic Auth for everything under /private/.
// Two kinds of login:
//   PRIVATE_USER + PRIVATE_PASS            the original shared owner login, sees everything
//   PRIVATE_USERS                          one entry per person, separated by ";"  ->  email:password:scope
//                                          scope "all" sees everything; scope "nopos" cannot open /private/pos/ (register data, JLO only)
// The scope is also sent back as a cookie so the dashboard can hide the Store results tab for restricted logins.
export const config = { matcher: ['/private/:path*'] };

function users() {
  const list = [];
  if (process.env.PRIVATE_USER && process.env.PRIVATE_PASS) list.push({ u: process.env.PRIVATE_USER, p: process.env.PRIVATE_PASS, scope: 'all' });
  for (const entry of String(process.env.PRIVATE_USERS || '').split(';')) {
    const parts = entry.trim().split(':'); if (parts.length < 2) continue;
    list.push({ u: parts[0].trim().toLowerCase(), p: parts[1], scope: (parts[2] || 'all').trim() });
  }
  return list;
}

export default function middleware(request) {
  const all = users();
  const deny = (msg) => new Response(msg, {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Jiffy Lube Chicagoland owners and marketing", charset="UTF-8"', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }
  });
  if (!all.length) return new Response('Private area is not configured.', { status: 503, headers: { 'Cache-Control': 'no-store' } });
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) return deny('Sign in required.');
  let decoded = '';
  try { decoded = atob(header.slice(6)); } catch (e) { return deny('Sign in required.'); }
  const i = decoded.indexOf(':');
  const u = decoded.slice(0, i), p = decoded.slice(i + 1);
  const who = all.find((x) => (x.u === u || x.u === u.toLowerCase()) && x.p === p);
  if (!who) return deny('Wrong username or password.');
  const path = new URL(request.url).pathname;
  if (who.scope === 'nopos' && /^\/private\/pos(\/|$)/.test(path)) {
    return new Response('<!doctype html><meta charset="utf-8"><title>Restricted</title><body style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:80px auto;padding:0 20px;color:#1a1d23"><h1 style="font-size:22px">Store results is restricted</h1><p>This section holds register data and is available to the JLO Group login only.</p><p><a href="/private/" style="color:#c8102e">Back to the dashboard</a></p></body>', {
      status: 403, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }
    });
  }
  // continue to the static file, and tell the page which scope this login has (the nav hides restricted tabs)
  return new Response(null, { headers: { 'x-middleware-next': '1', 'set-cookie': `jl_scope=${who.scope}; Path=/private; SameSite=Lax; Secure` } });
}
