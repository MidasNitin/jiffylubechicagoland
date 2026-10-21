#!/usr/bin/env node
// Reads the GROW POS extract emails (sent to jiffy-pos@neptuneventures.co, delivered to wdavidperez@gmail.com),
// saves each CSV attachment under data/pos/raw/, and merges them into data/pos/promo.json and data/pos/invoices.json
// (deduped by store + invoice number). Customer names, phones, emails and addresses are never requested in the extracts.
//   node scripts/pos-pull.mjs            (daily job)      node scripts/pos-pull.mjs --days=60   (look further back)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN = path.join(ROOT, 'wallet', 'certs', 'gmail-token.json');
const RAW = path.join(ROOT, 'data', 'pos', 'raw');
const args = Object.fromEntries(process.argv.slice(2).map((a) => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const DAYS = Number(args.days || 10);
if (!fs.existsSync(TOKEN)) { console.error('No Gmail token. Run: node scripts/google-auth.mjs'); process.exit(1); }
const t = JSON.parse(fs.readFileSync(TOKEN, 'utf8'));
const tok = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ refresh_token: t.refresh_token, client_id: t.client_id, client_secret: t.client_secret, grant_type: 'refresh_token' }) })).json();
if (!tok.access_token) throw new Error('Gmail token refresh failed: ' + JSON.stringify(tok).slice(0, 200));
const H = { Authorization: `Bearer ${tok.access_token}` };
const api = async (p) => { const r = await (await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${p}`, { headers: H })).json(); if (r.error) throw new Error(r.error.message); return r; };
fs.mkdirSync(RAW, { recursive: true });
// 1. find extract emails and save attachments we have not seen
const q = encodeURIComponent(`to:jiffy-pos@neptuneventures.co has:attachment newer_than:${DAYS}d`);
let saved = 0, pageToken = '';
do {
  const list = await api(`messages?q=${q}&maxResults=100${pageToken ? '&pageToken=' + pageToken : ''}`); pageToken = list.nextPageToken || '';
  for (const m of list.messages || []) {
    const msg = await api(`messages/${m.id}?format=full`);
    const subject = (msg.payload.headers.find((h) => h.name === 'Subject') || {}).value || '';
    const when = new Date(Number(msg.internalDate)).toISOString().slice(0, 10);
    const parts = []; (function walk(p) { if (!p) return; if (p.filename && p.body && (p.body.attachmentId || p.body.data)) parts.push(p); (p.parts || []).forEach(walk); })(msg.payload);
    for (const p of parts) {
      if (!/\.(csv|txt|zip)$/i.test(p.filename)) continue;
      const out = path.join(RAW, `${when}_${m.id.slice(-6)}_${p.filename.replace(/[^A-Za-z0-9._-]/g, '_')}`);
      if (fs.existsSync(out)) continue;
      const data = p.body.data || (await api(`messages/${m.id}/attachments/${p.body.attachmentId}`)).data;
      fs.writeFileSync(out, Buffer.from(data, 'base64url')); saved++; console.log(`  saved ${path.basename(out)}  (${subject})`);
    }
  }
} while (pageToken);
// 1b. unzip anything that is still zipped (GROW delivers ZIPs; files downloaded by hand can be dropped into data/pos/raw/ too)
import { execFileSync } from 'node:child_process';
for (const f of fs.readdirSync(RAW).filter((f) => /\.zip$/i.test(f))) {
  const dir = path.join(RAW, f.replace(/\.zip$/i, '')); if (fs.existsSync(dir)) continue;
  fs.mkdirSync(dir); try { execFileSync('unzip', ['-o', '-q', path.join(RAW, f), '-d', dir]); console.log(`  unzipped ${f}`); } catch (e) { console.error(`  !! could not unzip ${f}: ${e.message}`); }
}
const allCsv = []; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(csv|txt)$/i.test(e.name)) allCsv.push(p); } })(RAW);
// 2. merge every CSV into two tables
function csv(text) { const rows = []; let row = [], cell = '', qd = false; for (let i = 0; i < text.length; i++) { const c = text[i]; if (qd) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else qd = false; } else cell += c; } else if (c === '"') qd = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c; } if (cell || row.length) { row.push(cell); rows.push(row); } const [h, ...b] = rows; return b.filter((r) => r.length > 1).map((r) => Object.fromEntries(h.map((k, i) => [k.trim(), (r[i] || '').trim()]))); }
const promo = new Map(), inv = new Map(); let files = 0;
for (const f of allCsv.sort()) {
  const rows = csv(fs.readFileSync(f, 'latin1')); if (!rows.length) continue; files++;
  const cols = Object.keys(rows[0]);
  if (cols.includes('Promo_Code')) for (const r of rows) promo.set(`${r.Store_Number}|${r.Invoice_Number}|${r.Promo_Code}`, { store: Number(r.Store_Number), invoice: r.Invoice_Number, date: r.Invoice_Date.slice(0, 10), code: r.Promo_Code, desc: r.Promo_Description, amount: Number(r.Promo_Amount) || 0, category: r.Promo_Category_Code, full_service: r.Full_Service_Promo_Flag });
  else if (cols.includes('Invoice_Total')) for (const r of rows) inv.set(`${r.Store_Number}|${r.Invoice_Number}`, { store: Number(r.Store_Number), invoice: r.Invoice_Number, date: r.Invoice_Date.slice(0, 10), zip: (r.ZIP_Code || '').slice(0, 5), year: r.Vehicle_Year, make: r.Vehicle_Make, model: r.Vehicle_Model, type: r.Vehicle_Type, mileage: Number(r.Vehicle_Mileage) || null, oil: r.Oil_Used, total: Number(r.Invoice_Total) || 0, net: Number(r.Net_Sales) || 0, promo_total: Number(r.Promotion_Total) || 0, repeat: /^(Y|1|T)/i.test(r.Repeat_Vehicle_Flag || ''), source: r.Invoice_Source, source_type: r.Source_Type, fleet_account: r.Business_Account_ID || '', greet: r.Greet_Time, bay_in: r.Bay_Start_Time, bay_out: r.Bay_End_Time, bay: r.Bay_Number });
}
fs.mkdirSync(path.join(ROOT, 'data', 'pos'), { recursive: true });
const P = [...promo.values()].sort((a, b) => a.date.localeCompare(b.date)), I = [...inv.values()].sort((a, b) => a.date.localeCompare(b.date));
fs.writeFileSync(path.join(ROOT, 'data', 'pos', 'promo.json'), JSON.stringify({ pulled_at: new Date().toISOString(), rows: P }));
fs.writeFileSync(path.join(ROOT, 'data', 'pos', 'invoices.json'), JSON.stringify({ pulled_at: new Date().toISOString(), rows: I }));
console.log(`POS: ${saved} new attachments, ${files} files merged; ${P.length} promo redemptions (${P[0]?.date || '-'} to ${P.at(-1)?.date || '-'}), ${I.length} invoices (${I[0]?.date || '-'} to ${I.at(-1)?.date || '-'}) -> data/pos/`);
