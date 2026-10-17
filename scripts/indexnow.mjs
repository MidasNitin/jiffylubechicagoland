#!/usr/bin/env node
// Pings IndexNow (Bing, Yandex, DuckDuckGo, Naver, Seznam share the endpoint) with every URL in the live sitemap.
// Run after a deploy has finished: node scripts/indexnow.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const key = fs.readFileSync(path.join(ROOT, 'data/indexnow.key'), 'utf8').trim();
const host = 'www.jiffylubechicagoland.com';
const xml = await (await fetch(`https://${host}/sitemap.xml`)).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList: urls }) });
console.log(`IndexNow: ${urls.length} URLs, HTTP ${r.status}${r.status === 200 || r.status === 202 ? ' (accepted)' : ' ' + (await r.text()).slice(0, 200)}`);
