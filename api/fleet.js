// Vercel serverless function: POST /api/fleet  (JSON body from the /fleet/ form)
// Appends a fleet lead to the Google Sheet FLEET_SHEET_ID using the wallet service account (GOOGLE_WALLET_SA_KEY),
// which must be shared on the sheet as an editor, then mirrors it into HubSpot when HUBSPOT_TOKEN is set. Returns {ok:true} or {ok:false,error}.
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
// HubSpot (Matt's portal 52028774): one Contact, one Company and one Deal in the Fleet pipeline per submission. Runs after the sheet
// write and never blocks the customer: if HubSpot is down the lead still lands in the sheet and the error is logged.
const HS_PIPELINE = '950162517', HS_STAGE_NEW = '1466473544';
async function hs(path, method, body, tok) {
  const r = await fetch('https://api.hubapi.com' + path, { method, headers: { Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${path} ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}
async function hubspot(lead, tok) {
  const jl = { jl_store_number: String(lead.storeId), jl_store_name: lead.storeName, jl_lead_source: lead.source, jl_employee: lead.employee, jl_submitted: lead.when };
  if (lead.vehicles) jl.jl_fleet_vehicles = lead.vehicles;
  // contact: match on email when given, otherwise on phone
  let contactId = null;
  const filter = lead.email ? { propertyName: 'email', operator: 'EQ', value: lead.email.toLowerCase() } : { propertyName: 'phone', operator: 'EQ', value: lead.phone };
  const found = await hs('/crm/v3/objects/contacts/search', 'POST', { filterGroups: [{ filters: [filter] }], properties: ['email'], limit: 1 }, tok);
  const cprops = { firstname: lead.first, lastname: lead.last, phone: lead.phone, jobtitle: lead.title, company: lead.company, address: lead.address, city: lead.city, state: lead.state, zip: lead.zip, ...jl };
  if (lead.email) cprops.email = lead.email.toLowerCase();
  if (found.results && found.results.length) { contactId = found.results[0].id; await hs(`/crm/v3/objects/contacts/${contactId}`, 'PATCH', { properties: cprops }, tok); }
  else contactId = (await hs('/crm/v3/objects/contacts', 'POST', { properties: cprops }, tok)).id;
  // company: reuse the contact's own company when the name matches (the search index lags a few seconds behind new records), else search by name, else create
  let companyId = null;
  const linked = await hs(`/crm/v4/objects/contacts/${contactId}/associations/companies`, 'GET', null, tok).catch(() => ({ results: [] }));
  for (const l of linked.results || []) { const c = await hs(`/crm/v3/objects/companies/${l.toObjectId}?properties=name`, 'GET', null, tok).catch(() => null); if (c && (c.properties.name || '').trim().toLowerCase() === lead.company.toLowerCase()) { companyId = c.id; break; } }
  const cf = companyId ? null : await hs('/crm/v3/objects/companies/search', 'POST', { filterGroups: [{ filters: [{ propertyName: 'name', operator: 'EQ', value: lead.company }] }], properties: ['name'], limit: 1 }, tok);
  if (!companyId && cf && cf.results && cf.results.length) companyId = cf.results[0].id;
  else companyId = (await hs('/crm/v3/objects/companies', 'POST', { properties: { name: lead.company, phone: lead.phone, address: lead.address, city: lead.city, state: lead.state, zip: lead.zip, jl_fleet_vehicles: lead.vehicles || undefined } }, tok)).id;
  await hs(`/crm/v4/objects/contacts/${contactId}/associations/default/companies/${companyId}`, 'PUT', null, tok).catch(() => {});
  // deal: one per submission in the Fleet pipeline, stage New
  const deal = await hs('/crm/v3/objects/deals', 'POST', { properties: { dealname: `${lead.company} fleet (${lead.storeName})`, pipeline: HS_PIPELINE, dealstage: HS_STAGE_NEW, ...jl }, associations: [
    { to: { id: contactId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 3 }] },
    { to: { id: companyId }, types: [{ associationCategory: 'HUBSPOT_DEFINED', associationTypeId: 5 }] }] }, tok);
  return { contactId, companyId, dealId: deal.id };
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
  let digits = phone.replace(/\D/g, ''); if (digits.length === 11 && digits[0] === '1') digits = digits.slice(1);
  if (digits.length !== 10) { res.status(400).json({ ok: false, error: 'Please enter a 10-digit phone number.' }); return; }
  const phoneFmt = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`; // stored as (000) 000-0000 so the sheet imports cleanly
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ ok: false, error: 'Please enter a valid email address.' }); return; }
  if (!store) { res.status(400).json({ ok: false, error: 'Please choose the Jiffy Lube location.' }); return; }

  const when = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', hour12: false });
  const row = [when, store.id, `${store.city}, ${store.street_name}`, company, first, last, clean(b.title, 80), email, phoneFmt, address, city, state, zip, clean(b.vehicles, 10), clean(b.emp_first, 60), clean(b.emp_last, 60), clean(b.source || 'qr', 20), 'New', ''];
  try {
    const sa = JSON.parse(saRaw);
    const t = await token(sa);
    const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ values: [row] }) });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    res.status(200).json({ ok: true, store: `${store.city}, ${store.street_name}` });
    if (process.env.HUBSPOT_TOKEN) {
      try { const ids = await hubspot({ storeId: store.id, storeName: `${store.city}, ${store.street_name}`, company, first, last, title: clean(b.title, 80), email, phone: phoneFmt, address, city, state, zip, vehicles: Number(clean(b.vehicles, 10)) || 0, employee: [clean(b.emp_first, 60), clean(b.emp_last, 60)].filter(Boolean).join(' '), source: clean(b.source || 'qr', 20), when }, process.env.HUBSPOT_TOKEN); console.log('hubspot lead', JSON.stringify(ids)); }
      catch (e) { console.error('hubspot lead failed (sheet row saved)', e.message); }
    }
  } catch (e) {
    console.error('fleet lead failed', e.message, row);
    res.status(500).json({ ok: false, error: 'We could not save that. Please call the store and they will take your details.' });
  }
};

module.exports._hubspot = hubspot; // for the local test harness
