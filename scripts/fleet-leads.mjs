#!/usr/bin/env node
// Reads the Fleet Leads Google Sheet (filled by /fleet/) into data/fleet/leads.json for the owner dashboard.
// Contact details (phone, email, address, names) stay in the sheet; the dashboard gets company, store, status, vehicles and dates.
//   node scripts/fleet-leads.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try { for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split('\n')) { const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); } } catch {}
const SHEET = process.env.FLEET_SHEET_ID || '1GMEE1CR-waI34QVZgwG7_PrbxsNwyVX-hu6_esnhW3A';
const keyFile = path.join(ROOT, 'wallet', 'certs', 'google-wallet-sa.json');
const sa = process.env.GOOGLE_WALLET_SA_KEY ? JSON.parse(process.env.GOOGLE_WALLET_SA_KEY) : JSON.parse(fs.readFileSync(keyFile, 'utf8'));
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/spreadsheets.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
const sig = crypto.sign('RSA-SHA256', Buffer.from(unsigned), sa.private_key).toString('base64url');
const tok = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${unsigned}.${sig}` })).json();
if (!tok.access_token) throw new Error('token: ' + JSON.stringify(tok).slice(0, 200));
const r = await (await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET}/values/A1:S2000`, { headers: { Authorization: `Bearer ${tok.access_token}` } })).json();
if (r.error) throw new Error(r.error.message);
const [header, ...rows] = r.values || [];
const col = (name) => header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
const ix = { when: col('Submitted (Central)'), store: col('Store #'), store_name: col('Store'), company: col('Company'), title: col('Title'), city: col('City'), state: col('State'), vehicles: col('Vehicles in fleet'), emp: col('Employee first name'), source: col('Source'), status: col('Status'), notes: col('Notes') };
const leads = rows.filter((row) => row[ix.company]).map((row) => ({
  when: row[ix.when] || '', store: Number(row[ix.store]) || null, store_name: row[ix.store_name] || '', company: row[ix.company] || '', title: row[ix.title] || '', city: row[ix.city] || '', state: row[ix.state] || '',
  vehicles: Number(row[ix.vehicles]) || null, employee: row[ix.emp] || '', source: row[ix.source] || '', status: (row[ix.status] || 'New').trim(), notes: row[ix.notes] || '',
  test: /test|please ignore/i.test(row[ix.company] || '')
}));
fs.mkdirSync(path.join(ROOT, 'data', 'fleet'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'data', 'fleet', 'leads.json'), JSON.stringify({ pulled_at: new Date().toISOString(), sheet: `https://docs.google.com/spreadsheets/d/${SHEET}/edit`, leads }, null, 1));
console.log(`Fleet leads: ${leads.length} rows (${leads.filter((l) => !l.test).length} real) -> data/fleet/leads.json`);
