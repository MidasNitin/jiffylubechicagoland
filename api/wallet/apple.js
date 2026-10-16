// Vercel serverless function: GET /api/wallet/apple?store=<slug>
// Generates a signed Apple Wallet coupon (.pkpass) for the store.
//
// Required environment variables (set in Vercel → Project → Settings → Environment Variables):
//   APPLE_PASS_TYPE_ID       e.g. pass.com.jiffylubechicagoland.coupon
//   APPLE_TEAM_ID            10-character Team ID from developer.apple.com → Membership
//   APPLE_PASS_CERT          the Pass Type ID certificate, PEM text (-----BEGIN CERTIFICATE----- ...)
//   APPLE_PASS_KEY           the matching private key, PEM text
//   APPLE_PASS_KEY_PASSPHRASE  passphrase for the key (if any)
'use strict';
const path = require('path');
const fs = require('fs');
const { PKPass } = require('passkit-generator');
const site = require('../../data/site.json');
const stores = require('../../data/stores.json');
const ES = require('../../data/es.json'); // Spanish pass text when ?lang=es

const MODEL_DIR = path.join(__dirname, '..', '..', 'wallet', 'apple-model.pass');
const WWDR = fs.readFileSync(path.join(__dirname, '..', '..', 'wallet', 'certs', 'wwdr.pem'));

const pem = (v) => (v || '').replace(/\\n/g, '\n');

module.exports = async (req, res) => {
  const env = process.env;
  if (!env.APPLE_PASS_TYPE_ID || !env.APPLE_TEAM_ID || !env.APPLE_PASS_CERT || !env.APPLE_PASS_KEY) {
    res.status(503).json({ error: 'Apple Wallet is not configured yet.' });
    return;
  }
  const slug = String((req.query && req.query.store) || '');
  const store = slug ? stores.find((s) => s.slug === slug) : null;
  if (slug && !store) { res.status(404).json({ error: 'Unknown store.' }); return; }

  const es = String((req.query && req.query.lang) || '') === 'es';
  const o = Object.assign({}, site.offer, (store && store.offer) || {});
  if (es) Object.assign(o, ES.site.offer, ES.offers[o.code] || {});
  const codeKey = String((req.query && req.query.code) || '').toLowerCase();
  const code = (store && store.offer && store.offer.code) || (site.attribution && site.attribution.codes && site.attribution.codes[codeKey]) || (store && store.coupon_code) || o.code;
  const free = (es ? { air: 'Aire gratis para llantas', battery: 'Prueba de batería gratis' } : { air: 'Free tire air', battery: 'Free battery test' })[String((req.query && req.query.variant) || '')] || '';
  const off = es ? (o.off || o.amount) : o.amount.replace(/\s*OFF$/i, ' off');
  const expires = new Date((es ? site.offer.expires : o.expires) + ' 23:59:59 GMT-0600'); // parse the English date
  const storeLabel = store ? `JIFFY LUBE ${store.city.toUpperCase()}` : (es ? 'CUALQUIER UBICACIÓN DEL ÁREA DE CHICAGO' : 'ANY CHICAGO AREA LOCATION');

  try {
    const pass = await PKPass.from({
      model: MODEL_DIR,
      certificates: {
        wwdr: WWDR,
        signerCert: pem(env.APPLE_PASS_CERT),
        signerKey: pem(env.APPLE_PASS_KEY),
        signerKeyPassphrase: env.APPLE_PASS_KEY_PASSPHRASE || undefined
      }
    }, {
      passTypeIdentifier: env.APPLE_PASS_TYPE_ID,
      teamIdentifier: env.APPLE_TEAM_ID,
      serialNumber: `${store ? store.slug : 'region'}-${code}${free ? '-' + String(req.query.variant) : ''}${es ? '-es' : ''}`,
      organizationName: 'Jiffy Lube Chicagoland',
      description: free ? (es ? `${free}, ${off} en tu cambio de aceite` : `${free}, ${off} oil change`) : `${o.amount} ${o.description}`,
      logoText: 'Jiffy Lube',
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(112, 0, 0)',
      labelColor: 'rgb(243, 204, 203)'
    });

    pass.type = 'coupon';
    if (free) {
      pass.primaryFields.push({ key: 'offer', label: storeLabel, value: free.toUpperCase() });
      pass.secondaryFields.push({ key: 'desc', label: es ? 'MÁS' : 'PLUS', value: es ? `${off} en cualquier cambio de aceite` : `${off} any oil change` });
    } else {
      pass.primaryFields.push({ key: 'offer', label: storeLabel, value: o.amount });
      pass.secondaryFields.push({ key: 'desc', label: es ? 'EN' : 'ON', value: es ? o.description.replace(/^en /, '') : o.description });
    }
    pass.auxiliaryFields.push({ key: 'expires', label: es ? 'VENCE' : 'EXPIRES', value: o.expires });
    if (store) {
      pass.backFields.push({ key: 'address', label: es ? 'Ubicación' : 'Location', value: `${store.street}\n${store.city}, ${store.state} ${store.zip}` });
      if (store.phone) pass.backFields.push({ key: 'phone', label: es ? 'Teléfono' : 'Phone', value: store.phone });
      pass.backFields.push({ key: 'web', label: es ? 'Página de la tienda' : 'Store page', value: `${site.domain}${es ? '/es' : ''}/store/${store.slug}/` });
    }
    pass.backFields.push({ key: 'terms', label: es ? 'Términos' : 'Terms', value: es
      ? `${o.copy_instructions}${free ? ' El servicio gratuito no requiere compra.' : ''} Válido solo en ubicaciones participantes. Consulta los detalles en la tienda. El código del cupón debe presentarse al momento del servicio.`
      : `${o.copy_instructions}${free ? ' The free service requires no purchase.' : ''} Valid only at participating locations. See store for details. Coupon code must be presented at time of service.` });

    pass.setBarcodes({ format: 'PKBarcodeFormatPDF417', message: code, messageEncoding: 'iso-8859-1', altText: code });
    pass.setExpirationDate(expires);
    if (store) pass.setLocations({ latitude: store.lat, longitude: store.lng, relevantText: es ? (free ? `${free} y ${off} en tu cambio de aceite en este Jiffy Lube. Muestra tu cupón en el mostrador.` : `${o.amount} en este Jiffy Lube. Muestra tu cupón en el mostrador.`) : (free ? `${free} and ${off} an oil change at this Jiffy Lube. Show your coupon at the counter.` : `${o.amount} at this Jiffy Lube. Show your coupon at the counter.`) });

    const buffer = pass.getAsBuffer();
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
    res.setHeader('Content-Disposition', `attachment; filename="jiffy-lube-${store ? store.slug : 'chicagoland'}.pkpass"`);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(buffer);
  } catch (err) {
    console.error('pkpass error', err);
    res.status(500).json({ error: 'Could not generate the pass.' });
  }
};
