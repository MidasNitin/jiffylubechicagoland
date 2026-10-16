#!/usr/bin/env node
/* Builds the static site into ./docs from data/ + assets/.
   Run:  node build.js
   No dependencies — plain Node. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'docs');
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/site.json'), 'utf8'));
const stores = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/stores.json'), 'utf8'));
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ---------- helpers ---------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const svgCache = {};
function svg(name, cls) {
  if (!svgCache[name]) {
    let s = fs.readFileSync(path.join(ROOT, 'assets/img', name + '.svg'), 'utf8');
    s = s.replace(/<\?xml[^>]*>/, '').replace(/\s(width|height)="[^"]*"/g, (m, k, off, str) => (str.indexOf('<svg') === 0 && off < 120 ? '' : m));
    s = s.replace(/^<svg/, '<svg aria-hidden="true" focusable="false"');
    svgCache[name] = s.trim();
  }
  return cls ? svgCache[name].replace(/^<svg/, `<svg class="${cls}"`) : svgCache[name];
}
/* Repeated icons go in one SVG sprite per page; each use is a tiny <use> reference. */
const SPRITE_ICONS = ['icon-check', 'icon-phone', 'icon-mappin', 'icon-caretright', 'icon-caretdown', 'icon-star', 'icon-ticket'];
function symbol(name) {
  const raw = svg(name);
  const vb = (raw.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 24 24';
  const inner = raw.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(/\sfill="#[0-9A-Fa-f]{3,6}"/g, '');
  return `<symbol id="${name}" viewBox="${vb}">${inner}</symbol>`;
}
const SPRITE = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">${SPRITE_ICONS.map(symbol).join('')}</svg>`;
const icon = (name, color, cls = '') => `<svg class="ic${cls ? ' ' + cls : ''}" fill="${color}" aria-hidden="true" focusable="false"><use href="#${name}"/></svg>`;
const CHECK = icon('icon-check', '#fc2b22');
const PHONE = icon('icon-phone', '#ffffff');
const PIN = icon('icon-mappin', '#ffffff');
const CARET_RIGHT = icon('icon-caretright', '#ffffff');
const CARET_DOWN = icon('icon-caretdown', '#700000');
const STAR = icon('icon-star', '#fc2b22');
const TICKET = icon('icon-ticket', '#ffffff');
const CSS = (fs.readFileSync(path.join(ROOT, 'assets/fonts/fonts.css'), 'utf8') + fs.readFileSync(path.join(ROOT, 'assets/css/site.css'), 'utf8'))
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').replace(/\s*([{}:;,>])\s*/g, '$1').trim();

const fmtTime = (m) => { const h = Math.floor(m / 60), mm = m % 60; const s = h >= 12 ? 'p.m.' : 'a.m.'; const h12 = h % 12 || 12; return `${h12}${mm ? ':' + String(mm).padStart(2, '0') : ''} ${s}`; };
const tel = (p) => 'tel:' + p.replace(/\D/g, '');
const dirUrl = (s) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${s.street}, ${s.city}, ${s.state} ${s.zip}`)}&destination_place_id=${s.place_id}`;
const fullAddr = (s) => `${s.street}, ${s.city}, ${s.state} ${s.zip}`;
const legalLines = (franchisee) => site.legal.lines.map((l) => l.replace('{expires}', site.offer.expires).replace('{franchisee}', franchisee));

/* A store may carry its own offer (amount/description/code/hero_title); otherwise the site-wide one applies. */
const offerFor = (store) => Object.assign({}, site.offer, (store && store.offer) || {});

/* ---------- partials ---------- */
function head(title, desc, canonical, extra = '', phone = null) {
  const adsCall = (phone && site.analytics.google_ads_id && site.analytics.google_ads_call_label) ? `gtag('config','${site.analytics.google_ads_call_label}',{'phone_conversion_number':'${phone}'});` : '';
  // GA4, loaded after the page has finished loading so it never competes with content.
  // Events fired before the library arrives are queued in dataLayer and sent once it loads.
  const ga = site.analytics.ga4_id ? `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${site.analytics.ga4_id}',{send_page_view:true});${site.analytics.google_ads_id ? `gtag('config','${site.analytics.google_ads_id}');` : ''}${adsCall}(function(){var d=false;function l(){if(d)return;d=true;var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${site.analytics.ga4_id}';document.head.appendChild(s);}if(document.readyState==='complete')setTimeout(l,0);else window.addEventListener('load',function(){setTimeout(l,0);});['pointerdown','keydown','touchstart'].forEach(function(e){window.addEventListener(e,l,{once:true,passive:true});});})();</script>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${site.domain}${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${site.domain}${canonical}">
<meta property="og:image" content="${site.domain}/assets/img/team.jpg">
<meta name="theme-color" content="#700000">
<script>window.JL_ATTR=${JSON.stringify({ params: site.attribution.params, days: site.attribution.days, codes: site.attribution.codes, defaultCode: site.offer.code })};window.JL_ADS=${JSON.stringify(Object.fromEntries(Object.entries(site.analytics.google_ads_conversions || {}).filter(([k]) => !k.startsWith('_'))))};</script>
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/Poppins-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/Poppins-400.woff2" as="font" type="font/woff2" crossorigin>
<style>${CSS}</style>
${extra}${ga}
</head>`;
}

function nav(store) {
  const right = store ? `
    <div class="nav__right">
      <div class="nav__status js-status"><span class="dot"></span><span class="js-status-text">Open</span></div>
      <div class="nav__btns">
        ${store.phone ? `<a class="btn btn--primary btn--sm" href="${tel(store.phone)}">${PHONE}${esc(store.phone)}</a>` : ''}
        <a class="btn btn--inverse btn--sm" href="${dirUrl(store)}" target="_blank" rel="noopener">${CARET_RIGHT}Get Directions</a>
      </div>
    </div>` : '';
  return `<header class="nav"><div class="wrap nav__inner">
    <a class="nav__logo" href="/" aria-label="Jiffy Lube Chicagoland home">${svg('logo')}</a>${right}
  </div></header>`;
}

function trust(store) {
  const rating = store ? `
    <div class="trust__item rating">
      <span class="rating__num">${store.rating.toFixed(1)}</span>${icon('icon-star', '#fc2b22', 'rating__star')}
      <div><a class="rating__link" href="${store.maps_url}" target="_blank" rel="noopener">${store.review_count.toLocaleString('en-US')} reviews</a>
      <div class="rating__sub">Google Rating as of ${site.rating_as_of}</div></div>
    </div>` : '';
  return `<section class="trust"><div class="wrap trust__inner${store ? '' : ' trust__inner--single'}">
    <div class="trust__item">
      <picture><source type="image/webp" srcset="/assets/img/newsweek-badge-160.webp 160w, /assets/img/newsweek-badge.webp 175w" sizes="72px"><img class="trust__badge" src="/assets/img/newsweek-badge-160.png" srcset="/assets/img/newsweek-badge-160.png 160w, /assets/img/newsweek-badge.png 175w" sizes="72px" alt="Newsweek #1 Most Trusted badge" width="72" height="80" decoding="async"></picture>
      <div><div class="trust__title">#1 Trusted Fast Oil Change<span class="sup">*</span></div>
      <div class="trust__sub">BrandSpark® American Trust Study, ${site.trust_year}</div></div>
    </div>${rating}
  </div></section>`;
}

const offAmount = (o) => o.amount.replace(/\s*OFF$/i, ' off'); // "$22 OFF" -> "$22 off"
// Ad landing page variants: one free service each, plus the store's oil change coupon.
const FREE_VARIANTS = {
  air: { path: 'free-air', h1: 'Free air for your tires.', titleWord: 'Free air for tires', sub: "we'll check and fill your tire pressure, free.", feature: 'Free tire pressure check and fill', cardTitle: 'Tire air check and fill', cta: 'Get My Free Air Coupon', show: 'free air', sticky: 'Get Free Air Coupon', desc: 'Free tire pressure check and fill, no purchase necessary.' },
  battery: { path: 'free-battery', h1: 'Free battery test.', titleWord: 'Free battery test', sub: "we'll test your battery, free.", feature: 'Free battery test', cardTitle: 'Battery test', cta: 'Get My Free Battery Test Coupon', show: 'a free battery test', sticky: 'Get Free Battery Coupon', desc: 'Free battery test, no purchase necessary.' }
};
function couponCard(store, extraCls = '', variant = '') {
  const o = offerFor(store);
  const fixed = store && store.offer && store.offer.code ? ' data-fixed-code="1"' : '';
  const fv = FREE_VARIANTS[variant] || null;
  const free = !!fv;
  const walletQs = (store ? '?store=' + esc(store.slug) : '?') + (free ? (store ? '&' : '') + 'variant=' + variant : '');
  return `<div class="coupon ${extraCls}${free ? ' coupon--free' : ''}" data-code="${esc(o.code)}"${fixed}>
    ${free ? `<div class="coupon__store coupon__store--free">FREE</div>` : store ? `<div class="coupon__store">Jiffy Lube ${esc(store.city)}</div>` : `<div class="coupon__store">Any Chicago area location</div>`}
    ${free ? `<div class="coupon__amount coupon__amount--text">${fv.cardTitle}</div>` : `<div class="coupon__amount">${esc(o.amount)}</div>`}
    <p class="coupon__desc">${free ? `No purchase necessary. If you get an oil change today, take ${esc(offAmount(o))}.` : esc(o.description)}</p>
    <hr class="coupon__divider">
    <button class="btn btn--primary btn--block coupon__cta" type="button">${free ? fv.cta : 'Get My Coupon'}</button>
    <div class="coupon__reveal">
      <div class="coupon__code js-code" aria-label="Coupon code ${esc(o.code)}">${esc(o.code)}</div>
      ${free ? `<p class="coupon__show">Show this code at the counter for ${fv.show}. It also takes ${esc(offAmount(o))} any oil change.</p>` : ''}
      <button class="btn btn--primary btn--block js-copy" type="button">Copy Code</button>
      <div class="coupon__copied">Code copied to your clipboard.</div>
      ${site.wallet && site.wallet.enabled ? `<div class="coupon__wallet" data-store="${store ? esc(store.slug) : ''}">
        ${site.wallet.apple ? `<a class="coupon__wallet-btn coupon__wallet-btn--apple" href="/api/wallet/apple/${walletQs}" aria-label="Add to Apple Wallet">${svg('badge-apple-wallet')}</a>` : ''}
        ${site.wallet.google ? `<a class="coupon__wallet-btn coupon__wallet-btn--google" href="/api/wallet/google/${walletQs}" aria-label="Add to Google Wallet">${svg('badge-google-wallet')}</a>` : ''}
      </div>` : ''}
      <p class="coupon__fine">${esc(o.copy_instructions)} Expires ${esc(o.expires)}.${free ? ' The free service requires no purchase.' : ''}</p>
    </div>
  </div>`;
}

function offerBand(store) {
  const title = store ? 'Save on any change today at this Jiffy Lube location' : `Save on any oil change at any ${site.region_name} area location`;
  return `<section class="section section--gray" id="coupon"><div class="wrap offer">
    <h2 class="h2 h2--dark offer__title">${esc(title)}</h2>
    ${couponCard(store)}
  </div></section>`;
}

function how() {
  const steps = [['step-hood-up', 'Hood Up'], ['step-review', 'Review'], ['step-oil-change', 'Oil Change'], ['step-hood-down', 'Hood Down']];
  return `<section class="how"><div class="wrap how__inner">
    <div>
      <h2 class="h2 how__title">Your oil change, in about 15 minutes<span class="sup">*</span></h2>
      <div class="how__checks"><span class="check">${CHECK}No appointment needed</span><span class="check">${CHECK}Open 7 days</span></div>
      <div class="steps">${steps.map(([f, l]) => `<div class="step"><div class="step__icon">${svg(f)}</div><div class="step__label">${l}</div></div>`).join('')}</div>
      <div class="how__toggle"><button class="btn btn--text" type="button" aria-expanded="false"><span>See what's included</span>${CARET_DOWN}</button></div>
    </div>
    <div class="included">
      <div class="included__title">What’s included</div>
      <ul class="included__list">${site.included.map((i) => `<li>${CHECK}${esc(i)}</li>`).join('')}</ul>
    </div>
  </div></section>`;
}

const TEAM_IMG = `<picture><source type="image/webp" srcset="/assets/img/team-450.webp 450w, /assets/img/team-600.webp 600w, /assets/img/team-900.webp 900w" sizes="(min-width: 900px) 450px, calc(100vw - 32px)"><img src="/assets/img/team-900.jpg" srcset="/assets/img/team-450.jpg 450w, /assets/img/team-600.jpg 600w, /assets/img/team-900.jpg 900w" sizes="(min-width: 900px) 450px, calc(100vw - 32px)" width="900" height="675" alt="Jiffy Lube technician reviewing service with a customer" loading="lazy" decoding="async"></picture>`;
function team(store) {
  let heading, body, photos, cls = '';
  if (store) {
    heading = site.store_copy.team_heading.replace('{city}', store.city);
    body = store.manager_name ? site.store_copy.team_body_with_manager.replace('{manager}', store.manager_name) : site.store_copy.team_body;
    if (store.manager_photo) {
      cls = ' team__grid--manager';
      photos = `<div class="team__photos team__photos--two"><img src="/assets/img/${esc(store.manager_photo)}" width="284" height="254" alt="${esc(store.manager_name || 'Store manager')}" loading="lazy" decoding="async">${TEAM_IMG}</div>`;
    } else {
      photos = `<div class="team__photos">${TEAM_IMG}</div>`;
    }
  } else {
    heading = site.region_copy.team_heading; body = site.region_copy.team_body;
    photos = `<div class="team__photos">${TEAM_IMG}</div>`;
  }
  return `<section class="section team"><div class="wrap team__grid${cls}">
    <div><h2 class="h2">${esc(heading)}</h2><p class="team__body desktop-only">${esc(body)}</p></div>
    ${photos}
    <p class="team__body mobile-only">${esc(body)}</p>
  </div></section>`;
}

const lounge = () => `<section class="lounge section--maroon"><div class="wrap">
  <h2 class="h2">Car or lounge? Your call.</h2><p>Stay in your car or relax in our lounge while we take care of it.</p>
</div></section>`;

function findUs(store) {
  const hoursRows = [];
  const h = store.hours;
  // Today row is filled by JS; render Mon–Fri collapsed when identical, else each day.
  const wk = [1, 2, 3, 4, 5].map((d) => JSON.stringify(h[d]));
  const same = wk.every((x) => x === wk[0]);
  const row = (label, hh, day) => `<tr${day !== undefined ? ` data-day="${day}"` : ''}><td>${label}</td><td>${hh ? `${fmtTime(hh.open)} – ${fmtTime(hh.close)}` : 'Closed'}</td></tr>`;
  const todayRows = DAY_NAMES.map((n, d) => `<tr data-day="${d}" class="hours__today" hidden><td class="js-today-label">Today</td><td>${h[d] ? `${fmtTime(h[d].open)} – ${fmtTime(h[d].close)}` : 'Closed'}</td></tr>`).join('');
  if (same) hoursRows.push(row('Mon – Fri', h[1]));
  else [1, 2, 3, 4, 5].forEach((d) => hoursRows.push(row(DAY_NAMES[d] === 'Thu' ? 'Thursday' : { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Fri: 'Friday' }[DAY_NAMES[d]], h[d])));
  hoursRows.push(row('Saturday', h[6]), row('Sunday', h[0]));

  const pt = site.popular_times;
  const popular = pt.enabled ? `<div class="popular" data-popular='${JSON.stringify(pt.days)}' data-start="${pt.hours_start}">
      <h3 class="h3">Popular times</h3>
      <div class="popular__days">${DAY_NAMES.map((n, d) => `<button class="popular__day" type="button" data-day="${d}">${n}</button>`).join('')}</div>
      <div class="popular__chart" aria-hidden="true"></div>
      <div class="popular__axis"><span style="left:7.1%">8a</span><span style="left:39.3%">12p</span><span style="left:67.9%">4p</span><span style="left:96.4%">8p</span></div>
      <p class="popular__now"></p>
      ${store.phone ? `<p class="popular__call"><a href="${tel(store.phone)}">Call us to check on wait times</a></p>` : ''}
    </div>` : '';

  return `<section class="section find" id="find-us"><div class="wrap">
    <h2 class="h2 desktop-only">Find us</h2>
    <div class="find__grid" style="margin-top:24px">
      <div class="mobile-only"><h2 class="h2">Hours</h2>
        <table class="hours"><tbody>${todayRows}${hoursRows.join('')}</tbody></table>${popular}</div>
      <div class="desktop-only">
        <div class="map js-map" data-src="https://maps.google.com/maps?q=${store.lat},${store.lng}&z=15&output=embed" data-title="Map of Jiffy Lube ${esc(store.city)}">
          <a class="map__placeholder" href="${store.maps_url}" target="_blank" rel="noopener">${icon('icon-mappin', '#fc2b22', 'map__pin')}<span>View on Google Maps</span></a>
        </div>
        <div class="map__name">Jiffy Lube® ${esc(store.city)}</div>
        <div class="map__addr">${esc(store.street)}, ${esc(store.city)}</div>
        <a class="btn btn--secondary btn--block map__btn" href="${dirUrl(store)}" target="_blank" rel="noopener">${CARET_RIGHT.replace('#ffffff', '#700000')}Get Directions</a>
      </div>
      <div class="desktop-only"><h3 class="h3">Hours</h3>
        <table class="hours"><tbody>${todayRows}${hoursRows.join('')}</tbody></table>${popular}</div>
    </div>
  </div></section>`;
}

const services = () => `<section class="section services" id="services"><div class="wrap">
  <h2 class="h2">Services at this location</h2>
  <ul class="services__list">${site.services.map((s) => `<li>${CHECK}${esc(s)}</li>`).join('')}</ul>
</div></section>`;

function footer(franchisee, store = null) {
  const links = store
    ? [[`/store/${store.slug}/`, `Jiffy Lube ${store.city}, ${store.street_name}`], [`/coupon/${store.slug}/`, `${offAmount(offerFor(store))} oil change coupon`], ...(store.free_pages ? [[`/free-air/${store.slug}/`, 'Free air for tires'], [`/free-battery/${store.slug}/`, 'Free battery test']] : []), ['/', 'All Chicagoland locations']]
    : [['/', 'Find a Jiffy Lube location'], ['/#all-locations', 'All Chicagoland locations']];
  return `<footer class="footer section--dark"><div class="wrap">
    <nav class="footer__links" aria-label="Site links">${links.map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join('')}</nav>
    <div class="footer__heading">${esc(site.legal.privacy_heading)}</div>
    ${legalLines(franchisee).map((l) => `<p>${esc(l)}</p>`).join('')}
  </div></footer>`;
}

const sticky = (store, label = 'Get Coupon') => `<div class="sticky mobile-only">
  ${store.phone ? `<a class="btn btn--primary" href="${tel(store.phone)}">${PHONE}Call</a>` : `<a class="btn btn--primary" href="${dirUrl(store)}" target="_blank" rel="noopener">${PIN}Directions</a>`}
  <a class="btn btn--secondary js-goto-coupon" href="#coupon">${TICKET.replace(/#ffffff/g, '#700000')}${label}</a>
</div>`;

function allLocations() {
  const sorted = [...stores].sort((a, b) => a.city.localeCompare(b.city) || a.street_name.localeCompare(b.street_name));
  return `<section class="section locations" id="all-locations"><div class="wrap">
    <h2 class="h2">All Chicagoland locations</h2>
    <ul class="locations__list">${sorted.map((s) => `<li><a href="/store/${s.slug}/">${esc(s.city)}, ${esc(s.street_name)}</a></li>`).join('')}</ul>
  </div></section>`;
}

const JS_HASH = require('crypto').createHash('sha1').update(fs.readFileSync(path.join(ROOT, 'assets/js/site.js'))).digest('hex').slice(0, 10);
const JS_FILE = `site.${JS_HASH}.js`;
const scripts = () => `<script src="/assets/js/${JS_FILE}" defer></script>${site.analytics.vercel_analytics ? `<script defer src="/_vercel/insights/script.js"></script>` : ''}`;

function storeJsonLd(store) {
  const spec = DAY_NAMES.map((n, d) => store.hours[d] ? { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d], opens: `${String(Math.floor(store.hours[d].open / 60)).padStart(2, '0')}:${String(store.hours[d].open % 60).padStart(2, '0')}`, closes: `${String(Math.floor(store.hours[d].close / 60)).padStart(2, '0')}:${String(store.hours[d].close % 60).padStart(2, '0')}` } : null).filter(Boolean);
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'AutoRepair', name: `Jiffy Lube ${store.city}, ${store.street_name}`,
    address: { '@type': 'PostalAddress', streetAddress: store.street, addressLocality: store.city, addressRegion: store.state, postalCode: store.zip, addressCountry: 'US' },
    geo: { '@type': 'GeoCoordinates', latitude: store.lat, longitude: store.lng },
    telephone: store.phone || undefined, url: `${site.domain}/store/${store.slug}/`, openingHoursSpecification: spec,
    aggregateRating: { '@type': 'AggregateRating', ratingValue: store.rating, reviewCount: store.review_count }
  })}</script>`;
}

/* ---------- pages ---------- */
function regionPage() {
  const title = `Jiffy Lube Chicagoland | Find a Jiffy Lube location in the ${site.region_name} Area`;
  const desc = `Fast, easy oil changes at over ${stores.length} Chicagoland Jiffy Lube locations. No appointment needed. Find your nearest location and save with a coupon.`;
  return `${head(title, desc, '/', '<meta name="google-site-verification" content="U3tLAynZUkEMmaz5xKYES6V3tN6ElHLO9mZ8Ek5KoTw">')}
<body>
${SPRITE}
${nav(null)}
<main>
<section class="hero hero--center"><div class="hero__graphic">${svg('j-graphic')}</div><div class="wrap hero__inner">
  <h1 class="h1 hero__title--region">Find a Jiffy Lube location in the ${esc(site.region_name)} Area</h1>
  <p class="hero__sub">Fast, easy oil changes at over ${stores.length} Chicagoland locations. Jiffy Does It.</p>
  <form class="search js-search" data-base="/" action="/" method="get">
    <label class="visually-hidden" for="zip">Zip code</label>
    <input class="search__field" id="zip" name="zip" type="text" inputmode="numeric" autocomplete="postal-code" pattern="[0-9]{5}" maxlength="5" placeholder="Enter zip code">
    <button class="btn btn--inverse" type="submit">Search</button>
    <div class="search__geo"><button class="btn btn--inverse js-geo" type="button">${PIN}Use my location</button><button class="search__geo-link js-geo" type="button">Use my location</button></div>
  </form>
  <p class="search__error" role="alert"></p>
  <div class="results" aria-live="polite">
    <div class="results__title"></div>
    <div class="results__list"></div>
    <div class="results__more"><button class="btn btn--text" type="button">Show more</button></div>
  </div>
</div></section>
${trust(null)}
${offerBand(null)}
${how()}
${team(null)}
${lounge()}
${allLocations()}
</main>
${footer(site.legal.region_franchisee)}
${scripts()}
</body></html>`;
}

function storePage(s) {
  const title = `Jiffy Lube® ${s.city}, ${s.street_name} | Oil Change, No Appointment Needed`;
  const desc = `Jiffy Lube at ${s.street}, ${s.city}, ${s.state}. Oil changes in about 15 minutes, no appointment needed. Hours, directions, and a ${offerFor(s).amount.toLowerCase()} coupon.`;
  return `${head(title, desc, `/store/${s.slug}/`, storeJsonLd(s), s.phone)}
<body data-hours='${JSON.stringify(s.hours)}' data-store="${esc(s.slug)}">
${SPRITE}
${nav(s)}
<main class="page page--store">
<section class="hero hero--store"><div class="hero__graphic">${svg('j-graphic')}</div><div class="wrap hero__inner">
  <h1 class="h1">Jiffy Lube® ${esc(s.city)},<br>${esc(s.street_name)}</h1>
  <p class="hero__sub">${esc(s.street)} · No appointment needed</p>
  <div class="hero__actions">
    ${s.phone ? `<a class="btn btn--primary" href="${tel(s.phone)}">${PHONE}Call ${esc(s.phone)}</a>` : ''}
    <a class="btn btn--inverse" href="${dirUrl(s)}" target="_blank" rel="noopener">${PIN}Get Directions</a>
  </div>
</div></section>
${findUs(s)}
${trust(s)}
${offerBand(s)}
${how()}
${lounge()}
${team(s)}
${services()}
</main>
${footer(s.group, s)}
${sticky(s)}
${scripts()}
</body></html>`;
}

function couponPage(s) {
  const o = offerFor(s);
  const title = `${o.hero_title} in ${s.city} | Jiffy Lube® ${s.street_name}`;
  const desc = `${o.amount} ${o.description} at Jiffy Lube ${s.street}, ${s.city}. No appointment needed. Get your coupon code.`;
  return `${head(title, desc, `/coupon/${s.slug}/`, storeJsonLd(s), s.phone)}
<body data-hours='${JSON.stringify(s.hours)}' data-store="${esc(s.slug)}">
${SPRITE}
${nav(s)}
<main class="page page--coupon">
<section class="hero hero--split"><div class="wrap hero__inner">
  <div>
    <h1 class="h1">${esc(o.hero_title)}<br>in ${esc(s.city)}</h1>
    <p class="hero__sub">No appointment needed. Pull in to ${esc(s.street)}.</p>
  </div>
  ${couponCard(s, 'coupon--hero')}
</div></section>
<div id="coupon"></div>
${trust(s)}
${team(s)}
${how()}
${lounge()}
${findUs(s)}
${services()}
</main>
${footer(s.group, s)}
${sticky(s)}
${scripts()}
</body></html>`;
}

/* Ad landing pages: one free service (air or battery) plus the store's oil change coupon. Not linked from the nav. */
function freePage(s, key) {
  const v = FREE_VARIANTS[key];
  const o = offerFor(s);
  const off = offAmount(o);
  const title = `${v.titleWord}, no purchase necessary | Jiffy Lube ${s.street_name}, ${s.city}`;
  const desc = `${v.desc} Pull in to Jiffy Lube ${s.street}, ${s.city}. Want an oil change while you're here? Take ${off}.`;
  return `${head(title, desc, `/${v.path}/${s.slug}/`, storeJsonLd(s), s.phone)}
<body data-hours='${JSON.stringify(s.hours)}' data-store="${esc(s.slug)}">
${SPRITE}
${nav(s)}
<main class="page page--coupon page--free">
<section class="hero hero--split"><div class="wrap hero__inner">
  <div>
    <h1 class="h1">${v.h1} No purchase necessary.</h1>
    <p class="hero__sub">Pull in to ${esc(s.street)} and ${v.sub} Want an oil change while you're here? Take ${esc(off)}.</p>
    <ul class="freefeat">
      <li class="freefeat__item">${icon('icon-check', '#ffffff', 'freefeat__ic')}<div><strong class="freefeat__title">${v.feature}</strong><span class="freefeat__sub">No appointment. No purchase necessary. Stay in your car.</span></div></li>
    </ul>
  </div>
  ${couponCard(s, 'coupon--hero', key)}
</div></section>
<div id="coupon"></div>
${trust(s)}
${team(s)}
${how()}
${lounge()}
${findUs(s)}
${services()}
</main>
${footer(s.group, s)}
${sticky(s, v.sticky)}
${scripts()}
</body></html>`;
}

/* ---------- write ---------- */
function rmrf(p) { if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true }); }
function write(rel, content) { const p = path.join(OUT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, content); }
function copyDir(src, dst) { fs.mkdirSync(dst, { recursive: true }); for (const f of fs.readdirSync(src)) { const s = path.join(src, f), d = path.join(dst, f); fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d); } }

rmrf(OUT);
copyDir(path.join(ROOT, 'assets'), path.join(OUT, 'assets'));
if (fs.existsSync(path.join(ROOT, 'private'))) copyDir(path.join(ROOT, 'private'), path.join(OUT, 'private')); // password-gated by middleware.js; never linked, never in sitemap/llms
fs.copyFileSync(path.join(ROOT, 'assets/js/site.js'), path.join(OUT, 'assets/js', JS_FILE));
write('assets/img/favicon.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#700000"/><text x="32" y="44" font-family="Poppins,Arial,sans-serif" font-weight="700" font-size="36" fill="#fff" text-anchor="middle">J</text></svg>`);
const publicStores = stores.map(({ slug, card_title, street, city, state, zip, lat, lng, phone, rating, place_id }) => ({ slug, card_title, street, city, state, zip, lat, lng, phone, rating, place_id }));
write('data/stores.json', JSON.stringify(publicStores));
write('index.html', regionPage());
const urls = ['/'];
for (const s of stores) {
  write(`store/${s.slug}/index.html`, storePage(s));
  write(`coupon/${s.slug}/index.html`, couponPage(s));
  urls.push(`/store/${s.slug}/`, `/coupon/${s.slug}/`);
  if (s.free_pages) for (const key of Object.keys(FREE_VARIANTS)) { // free-service ad pages: only stores flagged in stores.json
    write(`${FREE_VARIANTS[key].path}/${s.slug}/index.html`, freePage(s, key));
    urls.push(`/${FREE_VARIANTS[key].path}/${s.slug}/`);
  }
}
write('404.html', `${head('Page not found | Jiffy Lube Chicagoland', 'Page not found', '/404.html')}<body>${nav(null)}<main><section class="section"><div class="wrap" style="text-align:center"><h1 class="h2">We couldn’t find that page.</h1><p class="body" style="margin-top:12px"><a href="/">Find a Jiffy Lube location near you</a></p></div></section></main>${footer(site.legal.region_franchisee)}</body></html>`);
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${site.domain}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\nDisallow: /private/\nSitemap: ${site.domain}/sitemap.xml\n`);
// llms.txt: a plain-language index for AI assistants (Claude, ChatGPT, Gemini, Perplexity).
{
  const pilots = stores.filter((s) => s.free_pages);
  const byCity = [...stores].sort((a, b) => a.city.localeCompare(b.city) || a.street_name.localeCompare(b.street_name));
  write('llms.txt', `# Jiffy Lube Chicagoland

> Official site for ${stores.length} Jiffy Lube service centers in the Chicago area (Illinois, northwest Indiana and southeast Wisconsin). Oil changes in about 15 minutes, no appointment needed. Each location page lists the street address, phone number, today's hours, Google rating and a printable or mobile-wallet coupon code.

Current offers (valid through ${site.offer.expires}):
- ${site.offer.amount} ${site.offer.description} at most locations, code ${site.offer.code}
${pilots.map((s) => `- ${s.offer.amount} ${s.offer.description} at Jiffy Lube ${s.street}, ${s.city}, code ${s.offer.code}`).join('\n')}
- Free tire pressure check and fill, and free battery test, no purchase necessary, at the ${pilots.length} locations listed under Free services.

## Main pages
- [Find a location](${site.domain}/): search by zip code or use your location.
- [Sitemap](${site.domain}/sitemap.xml)
- [Full site text](${site.domain}/llms-full.txt): every page as plain text in one file.

## Free services (no purchase necessary)
${pilots.map((s) => `- [Free air for tires, ${s.city} ${s.street_name}](${site.domain}/free-air/${s.slug}/)\n- [Free battery test, ${s.city} ${s.street_name}](${site.domain}/free-battery/${s.slug}/)`).join('\n')}

## Locations
${byCity.map((s) => `- [Jiffy Lube ${s.city}, ${s.street}](${site.domain}/store/${s.slug}/): ${s.phone || ''}${s.phone ? ', ' : ''}coupon at ${site.domain}/coupon/${s.slug}/`).join('\n')}
`);
}
// llms-full.txt: every page as plain text in one file, for crawlers that want the whole site in a single fetch.
{
  const toText = (html) => html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>|<!--[\s\S]*?-->/gi, ' ')
    .replace(/<(h1|h2|h3|p|li|div|section|footer|header|tr|br|hr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
  const pages = [];
  const walk = (dir) => { for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (dir === OUT && f === 'private') continue; if (fs.statSync(p).isDirectory()) walk(p); else if (f === 'index.html') pages.push(p); } };
  walk(OUT);
  const order = (p) => (p.includes('/store/') ? 1 : p.includes('/coupon/') ? 2 : p.includes('/free-') ? 3 : 0);
  pages.sort((a, b) => order(a) - order(b) || a.localeCompare(b));
  const out = pages.map((p) => {
    const rel = '/' + path.relative(OUT, path.dirname(p)).split(path.sep).filter(Boolean).join('/') + '/';
    const html = fs.readFileSync(p, 'utf8');
    const title = (html.match(/<title>([^<]*)<\/title>/) || [, ''])[1];
    const body = (html.match(/<main[\s\S]*?<\/main>/i) || [html])[0];
    return `# ${title}\nURL: ${site.domain}${rel === '//' ? '/' : rel}\n\n${toText(body)}`;
  }).join('\n\n---\n\n');
  write('llms-full.txt', `# Jiffy Lube Chicagoland, full site text\n\nSee ${site.domain}/llms.txt for the index. Generated ${new Date().toISOString().slice(0, 10)}.\n\n---\n\n${out}\n`);
}
write('CNAME', site.domain.replace(/^https?:\/\//, '') + '\n');
write('.nojekyll', '');
console.log(`Built ${urls.length} pages into docs/`);
