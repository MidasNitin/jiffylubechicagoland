#!/usr/bin/env node
// Pulls Google Analytics 4 report data for the owner dashboard and writes data/ga/latest.json.
//   node scripts/ga-pull.mjs            # last 90 days, daily
// Auth: the wallet service account (wallet/certs/google-wallet-sa.json, or GOOGLE_WALLET_SA_KEY env) must be a
// Viewer on the GA property. API: Google Analytics Data API, enabled on project jiffy-lube-wallet.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROPERTY = process.env.GA_PROPERTY_ID || '557624164';
const DAYS = Number(process.env.GA_DAYS || 90);
const OUT = path.join(ROOT, 'data', 'ga');

const keyFile = path.join(ROOT, 'wallet', 'certs', 'google-wallet-sa.json');
const sa = process.env.GOOGLE_WALLET_SA_KEY ? JSON.parse(process.env.GOOGLE_WALLET_SA_KEY) : JSON.parse(fs.readFileSync(keyFile, 'utf8'));

// --- service-account JWT -> access token (no SDK needed) ---
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
async function token() {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/analytics.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const sig = crypto.sign('RSA-SHA256', Buffer.from(unsigned), sa.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${unsigned}.${sig}` });
  const j = await r.json();
  if (!j.access_token) throw new Error('Token error: ' + JSON.stringify(j));
  return j.access_token;
}

const TOKEN = await token();
async function report(body) {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (j.error) throw new Error(`GA API: ${j.error.message}`);
  const dims = (j.dimensionHeaders || []).map((h) => h.name), mets = (j.metricHeaders || []).map((h) => h.name);
  return (j.rows || []).map((row) => { const o = {}; row.dimensionValues.forEach((v, i) => { o[dims[i]] = v.value; }); row.metricValues.forEach((v, i) => { o[mets[i]] = Number(v.value); }); return o; });
}
const range = [{ startDate: `${DAYS}daysAgo`, endDate: 'yesterday' }];
const KEY_EVENTS = ['get_coupon', 'copy_code', 'wallet_add', 'call_click', 'get_directions'];
const M = (...n) => n.map((name) => ({ name }));
const D = (...n) => n.map((name) => ({ name }));
const evFilter = { filter: { fieldName: 'eventName', inListFilter: { values: KEY_EVENTS } } };

const out = { pulled_at: new Date().toISOString(), days: DAYS, property: PROPERTY, key_events: KEY_EVENTS };
out.daily = await report({ dateRanges: range, dimensions: D('date'), metrics: M('sessions', 'totalUsers', 'newUsers', 'screenPageViews', 'keyEvents', 'engagedSessions', 'sessionKeyEventRate'), orderBys: [{ dimension: { dimensionName: 'date' } }] });
out.daily_events = await report({ dateRanges: range, dimensions: D('date', 'eventName'), metrics: M('eventCount'), dimensionFilter: evFilter, limit: 5000 });
out.events = await report({ dateRanges: range, dimensions: D('eventName'), metrics: M('eventCount', 'totalUsers'), orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }], limit: 50 });
out.sources = await report({ dateRanges: range, dimensions: D('sessionSource', 'sessionMedium'), metrics: M('sessions', 'totalUsers', 'keyEvents', 'engagedSessions', 'sessionKeyEventRate'), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 50 });
out.channels = await report({ dateRanges: range, dimensions: D('sessionDefaultChannelGroup'), metrics: M('sessions', 'totalUsers', 'keyEvents', 'sessionKeyEventRate'), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }] });
out.campaigns = await report({ dateRanges: range, dimensions: D('sessionCampaignName', 'sessionSource'), metrics: M('sessions', 'totalUsers', 'keyEvents', 'sessionKeyEventRate'), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 50 });
out.pages = await report({ dateRanges: range, dimensions: D('pagePath'), metrics: M('screenPageViews', 'sessions', 'keyEvents'), orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }], limit: 100 });
out.cities = await report({ dateRanges: range, dimensions: D('city'), metrics: M('sessions', 'totalUsers', 'keyEvents'), orderBys: [{ metric: { metricName: 'sessions' }, desc: true }], limit: 25 });
out.devices = await report({ dateRanges: range, dimensions: D('deviceCategory'), metrics: M('sessions', 'keyEvents') });
// Google Ads (via the GA <-> Ads link): spend, clicks, impressions by campaign / ad group / day / search term
const adsM = M('advertiserAdImpressions', 'advertiserAdClicks', 'advertiserAdCost', 'sessions', 'keyEvents', 'sessionKeyEventRate');
const adsFilter = { notExpression: { filter: { fieldName: 'sessionGoogleAdsCampaignName', stringFilter: { value: '(not set)' } } } };
out.ads_campaigns = await report({ dateRanges: range, dimensions: D('sessionGoogleAdsCampaignName'), metrics: adsM, dimensionFilter: adsFilter, orderBys: [{ metric: { metricName: 'advertiserAdCost' }, desc: true }], limit: 200 });
out.ads_daily = await report({ dateRanges: range, dimensions: D('date', 'sessionGoogleAdsCampaignName'), metrics: adsM, dimensionFilter: adsFilter, limit: 5000 });
out.ads_queries = await report({ dateRanges: range, dimensions: D('sessionGoogleAdsQuery', 'sessionGoogleAdsCampaignName'), metrics: M('advertiserAdClicks', 'advertiserAdCost', 'sessions', 'keyEvents'), dimensionFilter: adsFilter, orderBys: [{ metric: { metricName: 'advertiserAdClicks' }, desc: true }], limit: 300 });
out.ads_keywords = await report({ dateRanges: range, dimensions: D('sessionGoogleAdsKeyword', 'sessionGoogleAdsCampaignName'), metrics: M('advertiserAdImpressions', 'advertiserAdClicks', 'advertiserAdCost', 'keyEvents'), dimensionFilter: adsFilter, orderBys: [{ metric: { metricName: 'advertiserAdCost' }, desc: true }], limit: 300 });
// which key events each campaign produced (event counts by action), for the GA campaign table and the Ads campaign table
out.campaign_events = await report({ dateRanges: range, dimensions: D('sessionCampaignName', 'sessionSource', 'eventName'), metrics: M('eventCount'), dimensionFilter: evFilter, limit: 2000 });
out.ads_campaign_events = await report({ dateRanges: range, dimensions: D('sessionGoogleAdsCampaignName', 'eventName'), metrics: M('eventCount'), dimensionFilter: { andGroup: { expressions: [evFilter, adsFilter] } }, limit: 2000 });
// custom event parameters (registered as event-scoped custom dimensions in GA): store slug and campaign key
for (const [name, dim] of [['by_store', 'customEvent:store'], ['by_campaign_key', 'customEvent:campaign_key']]) {
  try { out[name] = await report({ dateRanges: range, dimensions: D(dim, 'eventName'), metrics: M('eventCount'), dimensionFilter: evFilter, limit: 2000 }); }
  catch (e) { out[name] = []; out[name + '_error'] = String(e.message).slice(0, 200); }
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'latest.json'), JSON.stringify(out));
const tot = out.daily.reduce((a, d) => ({ s: a.s + d.sessions, k: a.k + d.keyEvents }), { s: 0, k: 0 });
console.log(`GA pulled: ${out.daily.length} days, ${tot.s} sessions, ${tot.k} key events -> data/ga/latest.json`);
