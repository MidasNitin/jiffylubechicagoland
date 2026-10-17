// Vercel serverless function: POST /api/fleet  (JSON body from the /fleet/ form)
// Appends a fleet lead to the Google Sheet FLEET_SHEET_ID using the wallet service account (GOOGLE_WALLET_SA_KEY),
// which must be shared on the sheet as an editor. Returns {ok:true} or {ok:false,error}.
'use strict';
const crypto = require('crypto');
const stores = require('../data/stores.json');

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
async function token(sa) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const sig = crypto.sign('RSA-SHA256', Buffer.from(unsigned), sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${unsigned}.${sig}` });
  const j = await r.json();
  if (!j.access_token) throw new Error('token: ' + JSON.stringify(j).slice(0, 200));
  return j.access_token;
}
const clean = (v, max = 200) => String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
const recent = new Map(); // ip -> timestamps, basic flood control per function instance

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'POST only' }); return; }
  const sheetId = process.env.FLEET_SHEET_ID, saRaw = process.env.GOOGLE_WALLET_SA_KEY;
  if (!sheetId || !saRaw) { res.status(503).json({ ok: false, error: 'Fleet form is not configured yet.' }); return; }
  let b = req.body; if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } } b = b || {};
  if (b.website) { res.status(200).json({ ok: true }); return; } // honeypot: bots fill the hidden field, we pretend it worked
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now(), hits = (recent.get(ip) || []).filter((t) => now - t < 60000); hits.push(now); recent.set(ip, hits);
  if (hits.length > 6) { res.status(429).json({ ok: false, error: 'Too many submissions. Please wait a minute.' }); return; }

  const company = clean(b.company), first = clean(b.first), last = clean(b.last), phone = clean(b.phone, 40), email = clean(b.email, 120);
  const address = clean(b.address), city = clean(b.city, 80), state = clean(b.state, 2).toUpperCase(), zip = clean(b.zip, 10);
  const store = stores.find((s) => String(s.id) === clean(b.store, 10)) || null;
  if (!company || !first || !last || !phone || !address || !city || !state || !zip) { res.status(400).json({ ok: false, error: 'Please fill in every required field.' }); return; }
  if (!/^\+?[\d\s().-]{7,}$/.test(phone)) { res.status(400).json({ ok: false, error: 'Please enter a valid phone number.' }); return; }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ ok: false, error: 'Please enter a valid email address.' }); return; }
  if (!store) { res.status(400).json({ ok: false, error: 'Please choose the Jiffy Lube location.' }); return; }

  const when = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', hour12: false });
  const row = [when, store.id, `${store.city}, ${store.street_name}`, company, first, last, clean(b.title, 80), email, phone, address, city, state, zip, clean(b.vehicles, 10), clean(b.emp_first, 60), clean(b.emp_last, 60), clean(b.source || 'qr', 20), 'New', ''];
  try {
    const sa = JSON.parse(saRaw);
    const t = await token(sa);
    const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [row] }) });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    res.status(200).json({ ok: true, store: `${store.city}, ${store.street_name}` });
  } catch (e) {
    console.error('fleet lead failed', e.message, row);
    res.status(500).json({ ok: false, error: 'We could not save that. Please call the store and they will take your details.' });
  }
};
