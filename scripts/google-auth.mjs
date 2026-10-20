#!/usr/bin/env node
// One-time Google sign-in for the daily job (Gmail read-only). Opens a browser window; David clicks Allow once.
// Needs wallet/certs/gmail-oauth-client.json (an OAuth "Desktop app" client from the jiffy-lube-wallet Cloud project).
// Writes wallet/certs/gmail-token.json (refresh token). Both files are gitignored.
//   node scripts/google-auth.mjs
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLIENT = path.join(ROOT, 'wallet', 'certs', 'gmail-oauth-client.json');
const TOKEN = path.join(ROOT, 'wallet', 'certs', 'gmail-token.json');
const SCOPE = 'https://www.googleapis.com/auth/gmail.readonly';
if (!fs.existsSync(CLIENT)) { console.error(`Missing ${CLIENT}. Download the OAuth client JSON from the Cloud console and save it there.`); process.exit(1); }
const raw = JSON.parse(fs.readFileSync(CLIENT, 'utf8')); const c = raw.installed || raw.web || raw;
const verifier = crypto.randomBytes(32).toString('base64url');
const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
const server = http.createServer();
server.listen(0, '127.0.0.1', () => {
  const port = server.address().port; const redirect = `http://127.0.0.1:${port}/`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({ client_id: c.client_id, redirect_uri: redirect, response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent', code_challenge: challenge, code_challenge_method: 'S256' });
  console.log('Opening Google sign-in. Pick wdavidperez@gmail.com and click Allow.\n' + url);
  execFile('open', [url]);
  server.on('request', async (req, res) => {
    const u = new URL(req.url, redirect); const code = u.searchParams.get('code');
    if (!code) { res.end('No code.'); return; }
    const tok = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: c.client_id, client_secret: c.client_secret || '', redirect_uri: redirect, grant_type: 'authorization_code', code_verifier: verifier }) })).json();
    if (!tok.refresh_token) { res.end('Sign-in failed: ' + JSON.stringify(tok)); console.error(tok); server.close(); return; }
    fs.writeFileSync(TOKEN, JSON.stringify({ refresh_token: tok.refresh_token, client_id: c.client_id, client_secret: c.client_secret || '', scope: SCOPE, created: new Date().toISOString() }, null, 1));
    res.end('Done. You can close this window.'); console.log(`Saved ${TOKEN}`); server.close();
  });
});
