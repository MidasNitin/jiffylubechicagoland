// Vercel serverless function: GET /api/wallet/google?store=<slug>
// Builds a signed "Save to Google Wallet" link for the store's coupon and redirects to it.
//
// Required environment variables (set in Vercel → Project → Settings → Environment Variables):
//   GOOGLE_WALLET_ISSUER_ID   e.g. 3388000000012345678  (from pay.google.com/business/console)
//   GOOGLE_WALLET_SA_KEY      the full JSON of the service-account key file, pasted as one line
'use strict';
const jwt = require('jsonwebtoken');
const site = require('../../data/site.json');
const stores = require('../../data/stores.json');

const ORIGIN = site.domain; // https://www.jiffylubechicagoland.com

function findStore(slug) {
  return stores.find((s) => s.slug === slug) || null;
}

function buildPayload(issuerId, store, code) {
  const o = site.offer;
  const safeSlug = store ? store.slug.replace(/[^a-z0-9]/gi, '_') : 'region';
  const classId = `${issuerId}.jiffy_oil_change_${o.code.toLowerCase()}`;
  const objectId = `${issuerId}.jiffy_${safeSlug}_${code.toLowerCase()}`;
  const expires = new Date(o.expires + ' 23:59:59 GMT-0600').toISOString();
  const storeName = store ? `Jiffy Lube ${store.city}` : 'Any Chicago area location';

  const offerClass = {
    id: classId,
    issuerName: 'Jiffy Lube Chicagoland',
    reviewStatus: 'UNDER_REVIEW',
    provider: 'Jiffy Lube Chicagoland',
    title: `${o.amount} ${o.description}`,
    redemptionChannel: 'INSTORE',
    titleImage: { sourceUri: { uri: `${ORIGIN}/assets/img/wallet/logo-square.png` } },
    hexBackgroundColor: '#700000',
    helpUri: { uri: ORIGIN },
    finePrint: `${o.copy_instructions} Expires ${o.expires}.`
  };

  const offerObject = {
    id: objectId,
    classId,
    state: 'ACTIVE',
    barcode: { type: 'CODE_128', value: code, alternateText: code },
    validTimeInterval: { end: { date: expires } },
    heroImage: { sourceUri: { uri: `${ORIGIN}/assets/img/wallet/hero.png` } },
    textModulesData: [
      { id: 'location', header: storeName, body: store ? `${store.street}, ${store.city}, ${store.state} ${store.zip}` : 'Valid at participating Chicagoland locations.' },
      ...(store && store.phone ? [{ id: 'phone', header: 'Phone', body: store.phone }] : [])
    ],
    linksModuleData: {
      uris: [
        { id: 'site', description: store ? 'Store page' : 'Find a location', uri: store ? `${ORIGIN}/store/${store.slug}/` : ORIGIN },
        ...(store ? [{ id: 'directions', description: 'Get directions', uri: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${store.street}, ${store.city}, ${store.state} ${store.zip}`)}&destination_place_id=${store.place_id}` }] : [])
      ]
    },
    ...(store ? { locations: [{ latitude: store.lat, longitude: store.lng }] } : {})
  };

  return { offerClasses: [offerClass], offerObjects: [offerObject] };
}

module.exports = async (req, res) => {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
  const saKeyRaw = process.env.GOOGLE_WALLET_SA_KEY;
  if (!issuerId || !saKeyRaw) {
    res.status(503).json({ error: 'Google Wallet is not configured yet.' });
    return;
  }
  let sa;
  try { sa = JSON.parse(saKeyRaw); } catch (e) {
    res.status(500).json({ error: 'GOOGLE_WALLET_SA_KEY is not valid JSON.' });
    return;
  }
  const slug = String((req.query && req.query.store) || '');
  const store = slug ? findStore(slug) : null;
  if (slug && !store) { res.status(404).json({ error: 'Unknown store.' }); return; }
  const o = site.offer;
  const codeKey = String((req.query && req.query.code) || '').toLowerCase();
  const code = (site.attribution && site.attribution.codes && site.attribution.codes[codeKey]) || (store && store.coupon_code) || o.code;

  const claims = {
    iss: sa.client_email,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    origins: [ORIGIN],
    payload: buildPayload(issuerId, store, code)
  };
  const token = jwt.sign(claims, sa.private_key, { algorithm: 'RS256' });
  const url = `https://pay.google.com/gp/v/save/${token}`;

  res.setHeader('Cache-Control', 'no-store');
  if (req.query && req.query.format === 'json') { res.status(200).json({ url }); return; }
  res.statusCode = 302;
  res.setHeader('Location', url);
  res.end();
};
