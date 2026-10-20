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
const ES = require('../../data/es.json'); // Spanish pass text when ?lang=es

const ORIGIN = site.domain; // https://www.jiffylubechicagoland.com

function findStore(slug) {
  return stores.find((s) => s.slug === slug) || null;
}

function buildPayload(issuerId, store, code, free, es) {
  const o = Object.assign({}, site.offer, (store && store.offer) || {});
  if (es) Object.assign(o, ES.site.offer, ES.offers[o.code] || {});
  const off = es ? (o.off || o.amount) : o.amount.replace(/\s*OFF$/i, ' off');
  const safeSlug = store ? store.slug.replace(/[^a-z0-9]/gi, '_') : 'region';
  const freeKey = free ? (/batter/i.test(free) ? 'battery' : 'air') : '';
  const classId = `${issuerId}.jiffy_${free ? 'free_' + freeKey : 'oil_change'}_${o.code.toLowerCase()}${es ? '_es' : ''}`;
  const objectId = `${issuerId}.jiffy_${safeSlug}_${code.toLowerCase()}${free ? '_free_' + freeKey : ''}${es ? '_es' : ''}`;
  const expires = new Date(site.offer.expires + ' 23:59:59 GMT-0600').toISOString();
  const storeName = store ? `Jiffy Lube ${store.city}` : (es ? 'Cualquier ubicación del área de Chicago' : 'Any Chicago area location');

  const offerClass = {
    id: classId,
    issuerName: 'Jiffy Lube Chicagoland',
    reviewStatus: 'UNDER_REVIEW',
    provider: 'Jiffy Lube Chicagoland',
    title: free ? (es ? `${free}, ${off} en tu cambio de aceite` : `${free}, ${off} oil change`) : `${o.amount} ${o.description}`,
    redemptionChannel: 'INSTORE',
    titleImage: { sourceUri: { uri: `${ORIGIN}/assets/img/wallet/logo-square.png` } },
    hexBackgroundColor: '#700000',
    helpUri: { uri: ORIGIN },
    finePrint: es ? `${o.copy_instructions}${free ? ' El servicio gratuito no requiere compra.' : ''} Vence el ${o.expires}.` : `${o.copy_instructions}${free ? ' The free service requires no purchase.' : ''} Expires ${o.expires}.`
  };

  const offerObject = {
    id: objectId,
    classId,
    state: 'ACTIVE',
    barcode: { type: 'PDF_417', value: code, alternateText: code },
    validTimeInterval: { end: { date: expires } },
    heroImage: { sourceUri: { uri: `${ORIGIN}/assets/img/wallet/hero.png` } },
    textModulesData: [
      { id: 'location', header: storeName, body: store ? `${store.street}, ${store.city}, ${store.state} ${store.zip}` : (es ? 'Válido en ubicaciones participantes de Chicagoland.' : 'Valid at participating Chicagoland locations.') },
      ...(store && store.phone ? [{ id: 'phone', header: es ? 'Teléfono' : 'Phone', body: store.phone }] : [])
    ],
    linksModuleData: {
      uris: [
        { id: 'site', description: store ? (es ? 'Página de la tienda' : 'Store page') : (es ? 'Encuentra una ubicación' : 'Find a location'), uri: store ? `${ORIGIN}${es ? '/es' : ''}/store/${store.slug}/` : `${ORIGIN}${es ? '/es/' : ''}` },
        ...(store ? [{ id: 'directions', description: es ? 'Cómo llegar' : 'Get directions', uri: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${store.street}, ${store.city}, ${store.state} ${store.zip}`)}&destination_place_id=${store.place_id}` }] : [])
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
  // Crawlers (Amazonbot, GPTBot, Bingbot and friends) follow the wallet links on every page. They get the coupon page, not a pass.
  const ua = String(req.headers['user-agent'] || '');
  if (/bot|crawl|spider|slurp|headlesschrome|phantomjs|python-requests|curl\/|wget|scrapy|httpclient|go-http-client|java\//i.test(ua)) {
    const back = String((req.query && req.query.store) || '').replace(/[^a-z0-9-]/g, '');
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Robots-Tag', 'noindex');
    res.statusCode = 302; res.setHeader('Location', back ? `/coupon/${back}/` : '/'); res.end(); return;
  }
  const slug = String((req.query && req.query.store) || '');
  const store = slug ? findStore(slug) : null;
  if (slug && !store) { res.status(404).json({ error: 'Unknown store.' }); return; }
  const o = Object.assign({}, site.offer, (store && store.offer) || {});
  const codeKey = String((req.query && req.query.code) || '').toLowerCase();
  const code = (store && store.offer && store.offer.code) || (site.attribution && site.attribution.codes && site.attribution.codes[codeKey]) || (store && store.coupon_code) || o.code;

  const claims = {
    iss: sa.client_email,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    origins: [ORIGIN],
    payload: buildPayload(issuerId, store, code, ((String((req.query && req.query.lang) || '') === 'es') ? { air: 'Aire gratis para llantas', battery: 'Prueba de batería gratis' } : { air: 'Free tire air', battery: 'Free battery test' })[String((req.query && req.query.variant) || '')] || '', String((req.query && req.query.lang) || '') === 'es')
  };
  const token = jwt.sign(claims, sa.private_key, { algorithm: 'RS256' });
  const url = `https://pay.google.com/gp/v/save/${token}`;

  res.setHeader('Cache-Control', 'no-store');
  if (req.query && req.query.format === 'json') { res.status(200).json({ url }); return; }
  res.statusCode = 302;
  res.setHeader('Location', url);
  res.end();
};
