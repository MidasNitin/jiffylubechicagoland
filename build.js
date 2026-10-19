#!/usr/bin/env node
/* Builds the static site into ./docs from data/ + assets/.
   Run:  node build.js
   No dependencies — plain Node. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'docs');
const siteEn = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/site.json'), 'utf8'));
const ES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/es.json'), 'utf8'));
const stores = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/stores.json'), 'utf8'));
const LEGAL = require('./data/legal.js');
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* ---------- languages: every page is built twice, English at / and Spanish at /es/ ---------- */
const deepMerge = (a, b) => { const o = Array.isArray(a) ? [...a] : { ...a }; for (const k of Object.keys(b || {})) o[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a && typeof a[k] === 'object') ? deepMerge(a[k], b[k]) : b[k]; return o; };
const UI_EN = {
  lang_switch: 'Español', skip: 'Skip to main content', quick_actions: 'Quick actions', site_links: 'Site links', legal_links: 'Legal', footer_privacy: 'Privacy and call recording', footer_dns: 'Do Not Sell or Share My Personal Information', footer_terms: 'Terms of use', footer_a11y: 'Accessibility', nav_open: 'Open', nav_directions: 'Get Directions', logo_aria: 'Jiffy Lube Chicagoland home',
  reviews: '{n} reviews', rating_asof: 'Google Rating as of {date}', trust_title: '#1 Trusted Fast Oil Change', trust_sub: 'BrandSpark® American Trust Study, {year}', badge_alt: 'Newsweek #1 Most Trusted badge',
  coupon_any: 'Any Chicago area location', coupon_free: 'FREE', free_desc: 'No purchase necessary. If you get an oil change today, take {off}.', get_coupon: 'Get My Coupon', coupon_code_aria: 'Coupon code {code}',
  free_show: 'Show this code at the counter for {show}. It also takes {off} any oil change.', copy_code: 'Copy Code', copied: 'Code copied to your clipboard.', apple_aria: 'Add to Apple Wallet', google_aria: 'Add to Google Wallet',
  expires: 'Expires {date}.', free_fine: 'The free service requires no purchase.', offer_title_store: 'Save on any change today at this Jiffy Lube location', offer_title_region: 'Save on any oil change at any {region} area location',
  how_title: 'Your oil change, in about 15 minutes', no_appt: 'No appointment needed', open7: 'Open 7 days', steps: ['Hood Up', 'Review', 'Oil Change', 'Hood Down'], see_included: "See what's included", hide: 'Hide', included_title: 'What’s included',
  team_alt: 'Jiffy Lube technician reviewing service with a customer', manager_alt: 'Store manager', lounge_title: 'Car or lounge? Your call.', lounge_body: 'Stay in your car or relax in our lounge while we take care of it.',
  closed: 'Closed', today: 'Today', mon_fri: 'Mon – Fri', days_long: { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday' }, saturday: 'Saturday', sunday: 'Sunday', day_short: DAY_NAMES,
  popular: 'Popular times', call_wait: 'Call us to check on wait times', find_us: 'Find us', hours: 'Hours', map_title: 'Map of Jiffy Lube {city}', view_maps: 'View on Google Maps', services_title: 'Services at this location',
  footer_store: 'Jiffy Lube {city}, {street}', footer_coupon: '{off} oil change coupon', footer_air: 'Free air for tires', footer_battery: 'Free battery test', footer_all: 'All Chicagoland locations', footer_find: 'Find a Jiffy Lube location',
  sticky_call: 'Call', sticky_dir: 'Directions', sticky_coupon: 'Get Coupon', all_locations: 'All Chicagoland locations',
  region_title: 'Jiffy Lube Chicagoland | Find a Jiffy Lube location in the {region} Area', region_desc: 'Fast, easy oil changes at over {n} Chicagoland Jiffy Lube locations. No appointment needed. Find your nearest location and save with a coupon.',
  region_h1: 'Find a Jiffy Lube location in the {region} Area', region_sub: 'Fast, easy oil changes at over {n} Chicagoland locations. Jiffy Does It.', zip_label: 'Zip code', zip_ph: 'Enter zip code', search: 'Search', use_location: 'Use my location', show_more: 'Show more',
  store_title: 'Jiffy Lube® {city}, {street} | Oil Change, No Appointment Needed', store_desc: 'Jiffy Lube at {addr}, {city}, {state}. Oil changes in about 15 minutes, no appointment needed. Hours, directions, and a {off} coupon.', store_sub: '{addr} · No appointment needed', call_phone: 'Call {phone}',
  coupon_title: '{hero} in {city} | Jiffy Lube® {street}', coupon_desc: '{amount} {desc} at Jiffy Lube {addr}, {city}. No appointment needed. Get your coupon code.', coupon_h1_in: 'in {city}', coupon_sub: 'No appointment needed. Pull in to {addr}.',
  free_title: '{word}, no purchase necessary | Jiffy Lube {street}, {city}', free_meta: "{desc} Pull in to Jiffy Lube {addr}, {city}. Want an oil change while you're here? Take {off}.", free_h1_tail: 'No purchase necessary.', free_sub: "Pull in to {addr} and {sub} Want an oil change while you're here? Take {off}.", free_feat_sub: 'No appointment. No purchase necessary. Stay in your car.',
  faq_title: 'Questions drivers ask about Jiffy Lube {city}',
  faq: [
    { k: 'appt', q: 'Do I need an appointment at Jiffy Lube {city}?', a: 'No. Drive in any time during open hours at {addr}, {city}. Most oil changes take about 15 minutes.' },
    { k: 'time', q: 'How long does an oil change take?', a: 'About 15 minutes for most vehicles. At most locations you can stay in your car during the service; ask the technician when you arrive.' },
    { k: 'air', q: 'Is the tire pressure check free?', a: 'Yes. Every Jiffy Lube Chicagoland location checks and fills your tire pressure free, with no purchase necessary.' },
    { k: 'battery', q: 'Is the battery test free?', a: 'Yes. Every location tests your battery free, with no purchase necessary.' },
    { k: 'oil', q: 'Which oils do you carry?', a: 'Conventional, synthetic blend and full synthetic. The technician recommends the grade your vehicle manufacturer specifies.' },
    { k: 'services', q: 'What services does this location offer besides oil changes?', a: 'Wiper blades, bulbs, filters, batteries, fluid exchanges and tire rotation.' },
    { k: 'coupon', q: 'How does the {off} coupon work?', a: 'Show the coupon on your phone or printed before service starts. One coupon per visit, not valid with any other offer. Get it at {coupon_url}' },
    { k: 'holiday', q: 'Are you open on holidays?', a: 'Holiday hours vary by location. Check the hours on this page or call {phone} before you come in.' },
    { k: 'lang', q: 'Is this information available in Spanish?', a: 'Yes. See this page in Spanish at {lang_url}' }
  ],
  faq_multicare: ' This Multi-Care location also does brakes and spark plugs.', faq_tires: ' It also sells tires, with mounting and balancing.'
};
let L = 'en', P = '', site = siteEn, UI = UI_EN;
const t = (k, vars) => { let v = UI[k] !== undefined ? UI[k] : UI_EN[k]; if (typeof v !== 'string') return v; return vars ? v.replace(/\{(\w+)\}/g, (m, n) => (vars[n] !== undefined ? vars[n] : m)) : v; };
function setLang(lang) { L = lang; P = lang === 'es' ? '/es' : ''; site = lang === 'es' ? deepMerge(siteEn, ES.site) : siteEn; UI = lang === 'es' ? Object.assign({}, UI_EN, ES.ui) : UI_EN; }
const altPath = (canonical) => (L === 'es' ? canonical : '/es' + canonical); // the same page in the other language

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
const SPRITE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">${SPRITE_ICONS.map(symbol).join('')}</svg>`;
// Every page starts with the skip link (first focusable element) and the icon sprite.
const SPRITE = { toString() { return `<a class="skip" href="#main">${t('skip')}</a>${SPRITE_SVG}`; } };
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
const offerFor = (store) => { const o = Object.assign({}, site.offer, (store && store.offer) || {}); if (L === 'es') Object.assign(o, ES.site.offer, ES.offers[o.code] || {}); return o; };

/* ---------- partials ---------- */
function head(title, desc, canonical, extra = '', phone = null) {
  const adsCall = (phone && site.analytics.google_ads_id && site.analytics.google_ads_call_label) ? `gtag('config','${site.analytics.google_ads_call_label}',{'phone_conversion_number':'${phone}'});` : '';
  // GA4, loaded after the page has finished loading so it never competes with content.
  // Events fired before the library arrives are queued in dataLayer and sent once it loads.
  // Consent Mode v2: ads consent denied when the browser sends Global Privacy Control or the visitor opted out on /privacy/; no banner.
  const consent = `(function(){var o=navigator.globalPrivacyControl===true||/(^|;\\s*)jlc_optout=1/.test(document.cookie);gtag('consent','default',{ad_storage:o?'denied':'granted',ad_user_data:o?'denied':'granted',ad_personalization:o?'denied':'granted',analytics_storage:'granted',wait_for_update:0});window.JL_OPTOUT=o;})();`;
  const ga = site.analytics.ga4_id ? `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}${consent}gtag('js',new Date());gtag('config','${site.analytics.ga4_id}',{send_page_view:true});${site.analytics.google_ads_id ? `gtag('config','${site.analytics.google_ads_id}');` : ''}${adsCall}(function(){var d=false;function l(){if(d)return;d=true;var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${site.analytics.ga4_id}';document.head.appendChild(s);}if(document.readyState==='complete')setTimeout(l,0);else window.addEventListener('load',function(){setTimeout(l,0);});['pointerdown','keydown','touchstart'].forEach(function(e){window.addEventListener(e,l,{once:true,passive:true});});})();</script>` : '';
  const alts = (canonical === '/404.html' || LEGAL.pages.some((pg) => canonical === `/${pg.slug}/`)) ? '' : `<link rel="alternate" hreflang="en" href="${site.domain}${canonical}">
<link rel="alternate" hreflang="es" href="${site.domain}/es${canonical}">
<link rel="alternate" hreflang="x-default" href="${site.domain}${canonical}">`;
  const i18n = L === 'es' ? `<script>window.JL_I18N=${JSON.stringify(ES.js)};</script>` : '';
  return `<!doctype html>
<html lang="${L}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${site.domain}${P}${canonical}">
${alts}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="${L === 'es' ? 'es_US' : 'en_US'}">
<meta property="og:url" content="${site.domain}${P}${canonical}">
<meta property="og:image" content="${site.domain}/assets/img/team.jpg">
<meta name="theme-color" content="#700000">
<script>window.JL_ATTR=${JSON.stringify({ params: site.attribution.params, days: site.attribution.days, codes: site.attribution.codes, defaultCode: site.offer.code })};window.JL_ADS=${JSON.stringify(Object.fromEntries(Object.entries(site.analytics.google_ads_conversions || {}).filter(([k]) => !k.startsWith('_'))))};</script>
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/Poppins-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/Poppins-400.woff2" as="font" type="font/woff2" crossorigin>
<style>${CSS}</style>
${i18n}${extra}${ga}
</head>`;
}

function nav(store, canonical = '/') {
  const lang = `<a class="nav__lang" href="${altPath(canonical)}" hreflang="${L === 'es' ? 'en' : 'es'}" lang="${L === 'es' ? 'en' : 'es'}">${t('lang_switch')}</a>`;
  const right = store ? `
    <div class="nav__right">
      <div class="nav__status js-status"><span class="dot"></span><span class="js-status-text">${t('nav_open')}</span></div>
      <div class="nav__btns">
        ${store.phone ? `<a class="btn btn--primary btn--sm" href="${tel(store.phone)}">${PHONE}${esc(store.phone)}</a>` : ''}
        <a class="btn btn--inverse btn--sm" href="${dirUrl(store)}" target="_blank" rel="noopener">${CARET_RIGHT}${t('nav_directions')}</a>
      </div>${lang}
    </div>` : `<div class="nav__right">${lang}</div>`;
  return `<header class="nav" role="banner"><div class="wrap nav__inner">
    <a class="nav__logo" href="${P}/" aria-label="${t('logo_aria')}">${svg('logo')}</a>${right}
  </div></header>`;
}

function trust(store) {
  const rating = store ? `
    <div class="trust__item rating">
      <span class="rating__num">${store.rating.toFixed(1)}</span>${icon('icon-star', '#fc2b22', 'rating__star')}
      <div><a class="rating__link" href="${store.maps_url}" target="_blank" rel="noopener">${t('reviews', { n: store.review_count.toLocaleString('en-US') })}</a>
      <div class="rating__sub">${t('rating_asof', { date: site.rating_as_of })}</div></div>
    </div>` : '';
  return `<section class="trust"><div class="wrap trust__inner${store ? '' : ' trust__inner--single'}">
    <div class="trust__item">
      <picture><source type="image/webp" srcset="/assets/img/newsweek-badge-160.webp 160w, /assets/img/newsweek-badge.webp 175w" sizes="72px"><img class="trust__badge" src="/assets/img/newsweek-badge-160.png" srcset="/assets/img/newsweek-badge-160.png 160w, /assets/img/newsweek-badge.png 175w" sizes="72px" alt="${t('badge_alt')}" width="72" height="80" decoding="async"></picture>
      <div><div class="trust__title">${t('trust_title')}<span class="sup">*</span></div>
      <div class="trust__sub">${t('trust_sub', { year: site.trust_year })}</div></div>
    </div>${rating}
  </div></section>`;
}

const offAmount = (o) => (L === 'es' && o.off) ? o.off : o.amount.replace(/\s*OFF$/i, ' off'); // "$22 OFF" -> "$22 off" / "$22 de descuento"
// Ad landing page variants: one free service each, plus the store's oil change coupon.
const FREE_VARIANTS = {
  air: { path: 'free-air', h1: 'Free air for your tires.', titleWord: 'Free air for tires', sub: "we'll check and fill your tire pressure, free.", feature: 'Free tire pressure check and fill', cardTitle: 'Tire air check and fill', cta: 'Get My Free Air Coupon', show: 'free air', sticky: 'Get Free Air Coupon', desc: 'Free tire pressure check and fill, no purchase necessary.' },
  battery: { path: 'free-battery', h1: 'Free battery test.', titleWord: 'Free battery test', sub: "we'll test your battery, free.", feature: 'Free battery test', cardTitle: 'Battery test', cta: 'Get My Free Battery Test Coupon', show: 'a free battery test', sticky: 'Get Free Battery Coupon', desc: 'Free battery test, no purchase necessary.' }
};
const freeVariant = (key) => (L === 'es' ? Object.assign({}, FREE_VARIANTS[key], ES.free[key]) : FREE_VARIANTS[key]);
function couponCard(store, extraCls = '', variant = '') {
  const o = offerFor(store);
  const fixed = store && store.offer && store.offer.code ? ' data-fixed-code="1"' : '';
  const fv = variant ? freeVariant(variant) : null;
  const free = !!fv;
  const qs = [store ? 'store=' + esc(store.slug) : '', free ? 'variant=' + variant : '', L === 'es' ? 'lang=es' : ''].filter(Boolean).join('&');
  const walletQs = qs ? '?' + qs : '';
  const cid = 'coupon-body-' + (store ? esc(store.slug) : 'region') + (variant ? '-' + variant : '');
  return `<div class="coupon ${extraCls}${free ? ' coupon--free' : ''}" data-code="${esc(o.code)}"${fixed}>
    ${free ? `<div class="coupon__store coupon__store--free">${t('coupon_free')}</div>` : store ? `<div class="coupon__store">Jiffy Lube ${esc(store.city)}</div>` : `<div class="coupon__store">${t('coupon_any')}</div>`}
    ${free ? `<div class="coupon__amount coupon__amount--text">${fv.cardTitle}</div>` : `<div class="coupon__amount">${esc(o.amount)}</div>`}
    <p class="coupon__desc">${free ? esc(t('free_desc', { off: offAmount(o) })) : esc(o.description)}</p>
    <hr class="coupon__divider">
    <button class="btn btn--primary btn--block coupon__cta" type="button" aria-expanded="false" aria-controls="${cid}">${free ? fv.cta : t('get_coupon')}</button>
    <div class="coupon__reveal" id="${cid}">
      <div class="coupon__code js-code" aria-label="${esc(t('coupon_code_aria', { code: o.code }))}">${esc(o.code)}</div>
      ${free ? `<p class="coupon__show">${esc(t('free_show', { show: fv.show, off: offAmount(o) }))}</p>` : ''}
      <button class="btn btn--primary btn--block js-copy" type="button">${t('copy_code')}</button>
      <div class="coupon__copied" role="status" aria-live="polite">${t('copied')}</div>
      ${site.wallet && site.wallet.enabled ? `<div class="coupon__wallet" data-store="${store ? esc(store.slug) : ''}">
        ${site.wallet.apple ? `<a class="coupon__wallet-btn coupon__wallet-btn--apple" href="/api/wallet/apple/${walletQs}" aria-label="${t('apple_aria')}">${svg('badge-apple-wallet')}</a>` : ''}
        ${site.wallet.google ? `<a class="coupon__wallet-btn coupon__wallet-btn--google" href="/api/wallet/google/${walletQs}" aria-label="${t('google_aria')}">${svg('badge-google-wallet')}</a>` : ''}
      </div>` : ''}
      <p class="coupon__fine">${esc(o.copy_instructions)} ${esc(t('expires', { date: o.expires }))}${free ? ' ' + esc(t('free_fine')) : ''}</p>
    </div>
  </div>`;
}

function offerBand(store) {
  const title = store ? t('offer_title_store') : t('offer_title_region', { region: site.region_name });
  return `<section class="section section--gray" id="coupon"><div class="wrap offer">
    <h2 class="h2 h2--dark offer__title">${esc(title)}</h2>
    ${couponCard(store)}
  </div></section>`;
}

function how() {
  const steps = ['step-hood-up', 'step-review', 'step-oil-change', 'step-hood-down'].map((f, i) => [f, t('steps')[i]]);
  return `<section class="how"><div class="wrap how__inner">
    <div>
      <h2 class="h2 how__title">${t('how_title')}<span class="sup">*</span></h2>
      <div class="how__checks"><span class="check">${CHECK}${t('no_appt')}</span><span class="check">${CHECK}${t('open7')}</span></div>
      <div class="steps">${steps.map(([f, l]) => `<div class="step"><div class="step__icon">${svg(f)}</div><div class="step__label">${l}</div></div>`).join('')}</div>
      <div class="how__toggle"><button class="btn btn--text" type="button" aria-expanded="false" aria-controls="included"><span>${t('see_included')}</span>${CARET_DOWN}</button></div>
    </div>
    <div class="included" id="included">
      <div class="included__title">${t('included_title')}</div>
      <ul class="included__list">${site.included.map((i) => `<li>${CHECK}${esc(i)}</li>`).join('')}</ul>
    </div>
  </div></section>`;
}

const TEAM_IMG = () => `<picture><source type="image/webp" srcset="/assets/img/team-450.webp 450w, /assets/img/team-600.webp 600w, /assets/img/team-900.webp 900w" sizes="(min-width: 900px) 450px, calc(100vw - 32px)"><img src="/assets/img/team-900.jpg" srcset="/assets/img/team-450.jpg 450w, /assets/img/team-600.jpg 600w, /assets/img/team-900.jpg 900w" sizes="(min-width: 900px) 450px, calc(100vw - 32px)" width="900" height="675" alt="${t('team_alt')}" loading="lazy" decoding="async"></picture>`;
function team(store) {
  let heading, body, photos, cls = '';
  if (store) {
    heading = site.store_copy.team_heading.replace('{city}', store.city);
    body = store.manager_name ? site.store_copy.team_body_with_manager.replace('{manager}', store.manager_name) : site.store_copy.team_body;
    if (store.manager_photo) {
      cls = ' team__grid--manager';
      photos = `<div class="team__photos team__photos--two"><img src="/assets/img/${esc(store.manager_photo)}" width="284" height="254" alt="${esc(store.manager_name || t('manager_alt'))}" loading="lazy" decoding="async">${TEAM_IMG()}</div>`;
    } else {
      photos = `<div class="team__photos">${TEAM_IMG()}</div>`;
    }
  } else {
    heading = site.region_copy.team_heading; body = site.region_copy.team_body;
    photos = `<div class="team__photos">${TEAM_IMG()}</div>`;
  }
  return `<section class="section team"><div class="wrap team__grid${cls}">
    <div><h2 class="h2">${esc(heading)}</h2><p class="team__body desktop-only">${esc(body)}</p></div>
    ${photos}
    <p class="team__body mobile-only">${esc(body)}</p>
  </div></section>`;
}

const lounge = () => `<section class="lounge section--maroon"><div class="wrap">
  <h2 class="h2">${t('lounge_title')}</h2><p>${t('lounge_body')}</p>
</div></section>`;

function findUs(store) {
  const hoursRows = [];
  const h = store.hours;
  // Today row is filled by JS; render Mon–Fri collapsed when identical, else each day.
  const wk = [1, 2, 3, 4, 5].map((d) => JSON.stringify(h[d]));
  const same = wk.every((x) => x === wk[0]);
  const row = (label, hh, day) => `<tr${day !== undefined ? ` data-day="${day}"` : ''}><td>${label}</td><td>${hh ? `${fmtTime(hh.open)} – ${fmtTime(hh.close)}` : t('closed')}</td></tr>`;
  const todayRows = DAY_NAMES.map((n, d) => `<tr data-day="${d}" class="hours__today" hidden><td class="js-today-label">${t('today')}</td><td>${h[d] ? `${fmtTime(h[d].open)} – ${fmtTime(h[d].close)}` : t('closed')}</td></tr>`).join('');
  if (same) hoursRows.push(row(t('mon_fri'), h[1]));
  else [1, 2, 3, 4, 5].forEach((d) => hoursRows.push(row(t('days_long')[DAY_NAMES[d]], h[d])));
  hoursRows.push(row(t('saturday'), h[6]), row(t('sunday'), h[0]));

  const pt = site.popular_times;
  const popular = pt.enabled ? `<div class="popular" data-popular='${JSON.stringify(pt.days)}' data-start="${pt.hours_start}">
      <h3 class="h3">${t('popular')}</h3>
      <div class="popular__days" role="group" aria-label="${esc(t('popular'))}">${t('day_short').map((n, d) => `<button class="popular__day" type="button" data-day="${d}" aria-pressed="false">${n}</button>`).join('')}</div>
      <div class="popular__chart" aria-hidden="true"></div>
      <p class="visually-hidden popular__summary" aria-live="polite"></p>
      <div class="popular__axis"><span style="left:7.1%">8a</span><span style="left:39.3%">12p</span><span style="left:67.9%">4p</span><span style="left:96.4%">8p</span></div>
      <p class="popular__now"></p>
      ${store.phone ? `<p class="popular__call"><a href="${tel(store.phone)}">${t('call_wait')}</a></p>` : ''}
    </div>` : '';

  return `<section class="section find" id="find-us"><div class="wrap">
    <h2 class="h2 desktop-only">${t('find_us')}</h2>
    <div class="find__grid" style="margin-top:24px">
      <div class="mobile-only"><h2 class="h2">${t('hours')}</h2>
        <table class="hours"><tbody>${todayRows}${hoursRows.join('')}</tbody></table>${popular}</div>
      <div class="desktop-only">
        <div class="map js-map" data-src="https://maps.google.com/maps?q=${store.lat},${store.lng}&z=15&output=embed" data-title="${esc(t('map_title', { city: store.city }))}">
          <a class="map__placeholder" href="${store.maps_url}" target="_blank" rel="noopener">${icon('icon-mappin', '#fc2b22', 'map__pin')}<span>${t('view_maps')}</span></a>
        </div>
        <div class="map__name">Jiffy Lube® ${esc(store.city)}</div>
        <div class="map__addr">${esc(store.street)}, ${esc(store.city)}</div>
        <a class="btn btn--secondary btn--block map__btn" href="${dirUrl(store)}" target="_blank" rel="noopener">${CARET_RIGHT.replace('#ffffff', '#700000')}${t('nav_directions')}</a>
      </div>
      <div class="desktop-only"><h3 class="h3">${t('hours')}</h3>
        <table class="hours"><tbody>${todayRows}${hoursRows.join('')}</tbody></table>${popular}</div>
    </div>
  </div></section>`;
}

const services = () => `<section class="section services" id="services"><div class="wrap">
  <h2 class="h2">${t('services_title')}</h2>
  <ul class="services__list">${site.services.map((s) => `<li>${CHECK}${esc(s)}</li>`).join('')}</ul>
</div></section>`;

function footer(franchisee, store = null) {
  const links = store
    ? [[`${P}/store/${store.slug}/`, t('footer_store', { city: store.city, street: store.street_name })], [`${P}/coupon/${store.slug}/`, t('footer_coupon', { off: offAmount(offerFor(store)) })], ...(store.free_pages ? [[`${P}/free-air/${store.slug}/`, t('footer_air')], [`${P}/free-battery/${store.slug}/`, t('footer_battery')]] : []), [`${P}/`, t('footer_all')]]
    : [[`${P}/`, t('footer_find')], [`${P}/#all-locations`, t('footer_all')]];
  const legal = [['/privacy/', t('footer_privacy')], ['/privacy/#choices', t('footer_dns')], ['/terms/', t('footer_terms')], ['/accessibility/', t('footer_a11y')]];
  return `<footer class="footer section--dark" role="contentinfo"><div class="wrap">
    <nav class="footer__links" aria-label="${esc(t('site_links'))}">${links.map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join('')}</nav>
    <nav class="footer__links" aria-label="${esc(t('legal_links'))}">${legal.map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join('')}</nav>
    <div class="footer__heading">${esc(site.legal.privacy_heading)}</div>
    ${legalLines(franchisee).map((l) => `<p>${esc(l)}</p>`).join('')}
  </div></footer>`;
}

const sticky = (store, label = '') => `<nav class="sticky mobile-only" aria-label="${esc(t('quick_actions'))}">
  ${store.phone ? `<a class="btn btn--primary" href="${tel(store.phone)}">${PHONE}${t('sticky_call')}</a>` : `<a class="btn btn--primary" href="${dirUrl(store)}" target="_blank" rel="noopener">${PIN}${t('sticky_dir')}</a>`}
  <a class="btn btn--secondary js-goto-coupon" href="#coupon">${TICKET.replace(/#ffffff/g, '#700000')}${label || t('sticky_coupon')}</a>
</nav>`;

function allLocations() {
  const sorted = [...stores].sort((a, b) => a.city.localeCompare(b.city) || a.street_name.localeCompare(b.street_name));
  return `<section class="section locations" id="all-locations"><div class="wrap">
    <h2 class="h2">${t('all_locations')}</h2>
    <ul class="locations__list">${sorted.map((s) => `<li><a href="${P}/store/${s.slug}/">${esc(s.city)}, ${esc(s.street_name)}</a></li>`).join('')}</ul>
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
    telephone: store.phone || undefined, url: `${site.domain}${P}/store/${store.slug}/`, inLanguage: L, openingHoursSpecification: spec
    // No aggregateRating: Google's review-snippet rules require ratings collected on this site, not copied from Google. The rating still shows as page text.
  })}</script>`;
}

const linkify = (str) => esc(str).replace(/(https?:\/\/[^\s]+?)([.,;)]?)(?=\s|$)/g, (m, u, tail) => `<a href="${u}">${u.replace(/^https?:\/\/(www\.)?/, '')}</a>${tail}`);
function faqItems(s) {
  const o = offerFor(s);
  const vars = { city: s.city, addr: s.street, phone: s.phone || '', off: offAmount(o), coupon_url: `${site.domain}${P}/coupon/${s.slug}/`, lang_url: L === 'es' ? `${site.domain}/store/${s.slug}/` : `${site.domain}/es/store/${s.slug}/` };
  const fill = (str) => str.replace(/\{(\w+)\}/g, (m, n) => (vars[n] !== undefined ? vars[n] : m));
  return t('faq').map((x) => {
    let a = fill(x.a);
    if (x.k === 'services') { if (s.multicare) a += t('faq_multicare'); if (s.tires) a += t('faq_tires'); }
    if (x.k === 'holiday' && !s.phone) a = a.replace(/ or call\s*\{?phone\}?/i, '').replace(/ o llama al\s*/i, '');
    return { q: fill(x.q), a };
  });
}
// Store-page FAQ: visible answers (details/summary) plus FAQPage structured data. Answers confirmed by Greg McGivney and Karl Krutsch, October 2026.
const faqSection = (s) => `<section class="section section--gray faq" aria-labelledby="faq-h"><div class="wrap">
  <h2 class="h2" id="faq-h">${esc(t('faq_title', { city: s.city }))}</h2>
  <div class="faq__list">${faqItems(s).map((f) => `<details class="faq__item"><summary>${esc(f.q)}</summary><p>${linkify(f.a)}</p></details>`).join('')}</div>
</div></section>`;
const faqJsonLd = (s) => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: L, mainEntity: faqItems(s).map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) })}</script>`;

/* ---------- pages ---------- */
function regionPage() {
  const title = t('region_title', { region: site.region_name });
  const desc = t('region_desc', { n: stores.length });
  return `${head(title, desc, '/', L === 'en' ? '<meta name="google-site-verification" content="U3tLAynZUkEMmaz5xKYES6V3tN6ElHLO9mZ8Ek5KoTw">' : '')}
<body>
${SPRITE}
${nav(null, '/')}
<main id="main" tabindex="-1">
<section class="hero hero--center"><div class="hero__graphic">${svg('j-graphic')}</div><div class="wrap hero__inner">
  <h1 class="h1 hero__title--region">${esc(t('region_h1', { region: site.region_name }))}</h1>
  <p class="hero__sub">${esc(t('region_sub', { n: stores.length }))}</p>
  <form class="search js-search" data-base="${P}/" action="${P}/" method="get" role="search" aria-label="${esc(t('zip_label'))}">
    <label class="visually-hidden" for="zip">${t('zip_label')}</label>
    <input class="search__field" id="zip" name="zip" type="text" inputmode="numeric" autocomplete="postal-code" pattern="[0-9]{5}" maxlength="5" placeholder="${esc(t('zip_ph'))}" aria-describedby="zip-err">
    <button class="btn btn--inverse" type="submit">${t('search')}</button>
    <div class="search__geo"><button class="btn btn--inverse js-geo" type="button">${PIN}${t('use_location')}</button><button class="search__geo-link js-geo" type="button">${t('use_location')}</button></div>
  </form>
  <p class="search__error" id="zip-err" role="alert"></p>
  <p class="visually-hidden js-search-status" role="status" aria-live="polite"></p>
  <div class="results" aria-live="polite">
    <div class="results__title"></div>
    <div class="results__list"></div>
    <div class="results__more"><button class="btn btn--text" type="button">${t('show_more')}</button></div>
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
  const title = t('store_title', { city: s.city, street: s.street_name });
  const desc = t('store_desc', { addr: s.street, city: s.city, state: s.state, off: offAmount(offerFor(s)) });
  return `${head(title, desc, `/store/${s.slug}/`, storeJsonLd(s) + faqJsonLd(s), s.phone)}
<body data-hours='${JSON.stringify(s.hours)}' data-store="${esc(s.slug)}">
${SPRITE}
${nav(s, `/store/${s.slug}/`)}
<main id="main" tabindex="-1" class="page page--store">
<section class="hero hero--store"><div class="hero__graphic">${svg('j-graphic')}</div><div class="wrap hero__inner">
  <h1 class="h1">Jiffy Lube® ${esc(s.city)},<br>${esc(s.street_name)}</h1>
  <p class="hero__sub">${esc(t('store_sub', { addr: s.street }))}</p>
  <div class="hero__actions">
    ${s.phone ? `<a class="btn btn--primary" href="${tel(s.phone)}">${PHONE}${esc(t('call_phone', { phone: s.phone }))}</a>` : ''}
    <a class="btn btn--inverse" href="${dirUrl(s)}" target="_blank" rel="noopener">${PIN}${t('nav_directions')}</a>
  </div>
</div></section>
${findUs(s)}
${trust(s)}
${offerBand(s)}
${how()}
${lounge()}
${team(s)}
${services()}
${faqSection(s)}
</main>
${footer(s.group, s)}
${sticky(s)}
${scripts()}
</body></html>`;
}

function couponPage(s) {
  const o = offerFor(s);
  const title = t('coupon_title', { hero: o.hero_title, city: s.city, street: s.street_name });
  const desc = t('coupon_desc', { amount: o.amount, desc: o.description, addr: s.street, city: s.city });
  return `${head(title, desc, `/coupon/${s.slug}/`, storeJsonLd(s), s.phone)}
<body data-hours='${JSON.stringify(s.hours)}' data-store="${esc(s.slug)}">
${SPRITE}
${nav(s, `/coupon/${s.slug}/`)}
<main id="main" tabindex="-1" class="page page--coupon">
<section class="hero hero--split"><div class="wrap hero__inner">
  <div>
    <h1 class="h1">${esc(o.hero_title)}<br>${esc(t('coupon_h1_in', { city: s.city }))}</h1>
    <p class="hero__sub">${esc(t('coupon_sub', { addr: s.street }))}</p>
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
  const v = freeVariant(key);
  const o = offerFor(s);
  const off = offAmount(o);
  const title = t('free_title', { word: v.titleWord, street: s.street_name, city: s.city });
  const desc = t('free_meta', { desc: v.desc, addr: s.street, city: s.city, off });
  return `${head(title, desc, `/${v.path}/${s.slug}/`, storeJsonLd(s), s.phone)}
<body data-hours='${JSON.stringify(s.hours)}' data-store="${esc(s.slug)}">
${SPRITE}
${nav(s, `/${v.path}/${s.slug}/`)}
<main id="main" tabindex="-1" class="page page--coupon page--free">
<section class="hero hero--split"><div class="wrap hero__inner">
  <div>
    <h1 class="h1">${v.h1} ${t('free_h1_tail')}</h1>
    <p class="hero__sub">${esc(t('free_sub', { addr: s.street, sub: v.sub, off }))}</p>
    <ul class="freefeat">
      <li class="freefeat__item">${icon('icon-check', '#ffffff', 'freefeat__ic')}<div><strong class="freefeat__title">${v.feature}</strong><span class="freefeat__sub">${t('free_feat_sub')}</span></div></li>
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

/* Legal and accessibility pages (English only; Spanish footers link here). */
function legalPage(pg) {
  const optout = pg.slug === 'privacy' ? `<script>(function(){var b=document.querySelector('.js-optout'),s=document.getElementById('optout-status');if(!b)return;function set(msg){s.textContent=msg;b.setAttribute('aria-disabled','true');b.textContent='Opted out';}
if(window.JL_OPTOUT)set(navigator.globalPrivacyControl===true?'Your browser sends the Global Privacy Control signal, so you are already opted out of targeted advertising on this site.':'You are opted out of targeted advertising on this site in this browser.');
b.addEventListener('click',function(){if(b.getAttribute('aria-disabled')==='true')return;document.cookie='jlc_optout=1; max-age=31536000; path=/; SameSite=Lax; Secure';if(typeof gtag==='function')gtag('consent','update',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});window.JL_OPTOUT=true;set('Done. This site will no longer send your visit data to advertising platforms for targeted ads in this browser.');});})();</script>` : '';
  return `${head(`${pg.title} | Jiffy Lube Chicagoland`, pg.desc, `/${pg.slug}/`)}
<body>
${SPRITE}
${nav(null, `/${pg.slug}/`)}
<main id="main" tabindex="-1" class="page page--legal">
<section class="section"><div class="wrap legal">
  <h1>${esc(pg.title)}</h1>
  <p class="legal__updated">Last updated: ${esc(pg.updated)}</p>
  ${pg.body}
</div></section>
</main>
${footer(site.legal.region_franchisee)}
${scripts()}${optout}
</body></html>`;
}

/* Fleet lead page: one shared QR code for every store and the lounges; unlisted (noindex, not in sitemap or llms). */
function fleetPage() {
  const sorted = [...stores].sort((a, b) => a.city.localeCompare(b.city) || a.street_name.localeCompare(b.street_name));
  const opts = sorted.map((st) => `<option value="${st.id}">${esc(st.city)}, ${esc(st.street_name)} (#${st.id})</option>`).join('');
  const field = (id, label, attrs = '', help = '') => `<div class="ff"><label for="${id}">${label}</label><input id="${id}" name="${id}" ${attrs}>${help ? `<small>${help}</small>` : ''}</div>`;
  const title = 'Fleet Service Sign-Up | Jiffy Lube Chicagoland';
  const desc = 'Tell us about your fleet and the Jiffy Lube Chicagoland fleet team will reach out.';
  return `${head(title, desc, '/fleet/', '<meta name="robots" content="noindex,nofollow">')}
<body data-store="fleet">
${SPRITE}
<header class="nav" role="banner"><div class="wrap nav__inner"><a class="nav__logo" href="/" aria-label="Jiffy Lube Chicagoland home">${svg('logo')}</a><div class="nav__right"><span class="fleet__badge">FLEET CARE</span></div></div></header>
<main id="main" tabindex="-1" class="page page--fleet">
<section class="hero hero--center"><div class="wrap hero__inner">
  <h1 class="h1">Fleet Service Made Simple</h1>
  <p class="hero__sub"><strong>Minimize</strong> vehicle down time. <strong>Maximize</strong> your bottom line. Cars, vans and trucks serviced at ${stores.length} Jiffy Lube locations across Chicagoland. Tell us about your fleet and our fleet team will reach out.</p>
</div></section>
<section class="section"><div class="wrap fleet">
  <form class="fleet__form js-fleet" novalidate>
    <h2 class="h2 fleet__h2">Fleet contact info</h2>
    <p class="fleet__req"><span aria-hidden="true">*</span> Required</p>
    ${field('company', 'Company name <span aria-hidden="true">*</span>', 'type="text" required autocomplete="organization"')}
    <div class="fleet__row">${field('first', 'Fleet contact first name <span aria-hidden="true">*</span>', 'type="text" required autocomplete="given-name"')}${field('last', 'Fleet contact last name <span aria-hidden="true">*</span>', 'type="text" required autocomplete="family-name"')}</div>
    ${field('title', 'Title', 'type="text" placeholder="e.g. Fleet Manager, Owner" autocomplete="organization-title"')}
    <div class="fleet__row">${field('email', 'Email address', 'type="email" autocomplete="email" inputmode="email"', 'So we can send you the fleet program details')}${field('phone', 'Phone number <span aria-hidden="true">*</span>', 'type="tel" required autocomplete="tel" inputmode="tel" placeholder="(708) 555-0123"')}</div>
    ${field('address', 'Company address <span aria-hidden="true">*</span>', 'type="text" required autocomplete="street-address"')}
    <div class="fleet__row fleet__row--3">${field('city', 'City <span aria-hidden="true">*</span>', 'type="text" required autocomplete="address-level2"')}
      <div class="ff"><label for="state">State <span aria-hidden="true">*</span></label><select id="state" name="state" required autocomplete="address-level1"><option value="IL" selected>IL</option><option value="IN">IN</option><option value="WI">WI</option><option value="MI">MI</option><option value="IA">IA</option></select></div>
      ${field('zip', 'ZIP <span aria-hidden="true">*</span>', 'type="text" required inputmode="numeric" autocomplete="postal-code" pattern="[0-9]{5}" maxlength="5"')}</div>
    <h2 class="h2 fleet__h2">About your fleet <span class="fleet__opt">Optional</span></h2>
    ${field('vehicles', 'Number of vehicles in your fleet', 'type="number" min="1" max="99999" inputmode="numeric"')}
    <div class="fleet__store">
      <h2 class="h2 fleet__h2 fleet__h2--light">Store use only</h2>
      <div class="ff"><label for="store">Jiffy Lube location <span aria-hidden="true">*</span></label><select id="store" name="store" required><option value="">Choose the store</option>${opts}</select></div>
      <div class="fleet__row">${field('emp_first', 'Employee first name', 'type="text" autocomplete="off"')}${field('emp_last', 'Employee last name', 'type="text" autocomplete="off"')}</div>
    </div>
    <div class="ff fleet__hp" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
    <p class="fleet__fine">We use this information only to contact you about Jiffy Lube fleet service. See our <a href="/privacy/">privacy policy</a>.</p>
    <p class="fleet__error" id="fleet-error" role="alert"></p>
    <button class="btn btn--primary btn--block fleet__submit" type="submit">Submit</button>
  </form>
  <div class="fleet__done" id="fleet-done" hidden tabindex="-1">
    <div class="fleet__check" aria-hidden="true">${icon('icon-check', '#ffffff')}</div>
    <h2 class="h2">Thanks, we got it</h2>
    <p>Your fleet information was sent to the Jiffy Lube Chicagoland fleet team. We'll contact you soon to talk about service for your vehicles.</p>
    <div class="fleet__talk"><strong>Want to talk sooner?</strong><br>Matt Regan, Fleet Development Manager<br><a href="tel:7082323455">708-232-3455</a><br><a href="mailto:fleet@jiffylubechicagoland.com">fleet@jiffylubechicagoland.com</a></div>
    <button class="btn btn--secondary btn--block js-fleet-again" type="button">Submit another fleet</button>
  </div>
  <section class="fleet__about">
    <h2 class="h2">Are you a fleet manager?</h2>
    <p>Jiffy Lube helps take a little of the worry out of managing your fleet with a customizable program, including options for control over services, billing, payments and scheduling, so you can get a fleet solution built for your company's needs.</p>
    <p>Most locations are also able to provide preventive maintenance for larger vehicles, such as medium duty trucks, diesels and limousines. See how Jiffy Lube Fleet Program can customize a program for you and help keep your company's business running smoothly.</p>
    <p class="fleet__contact">Questions? Contact Matt Regan, Fleet Development Manager<br><a href="tel:7082323455">708-232-3455</a> · <a href="mailto:fleet@jiffylubechicagoland.com">fleet@jiffylubechicagoland.com</a></p>
  </section>
</div></section>
</main>
${footer(site.legal.region_franchisee)}
${scripts()}
<script>
(function(){
var f=document.querySelector('.js-fleet'),err=document.getElementById('fleet-error'),done=document.getElementById('fleet-done'),btn=f.querySelector('.fleet__submit');
var q=new URLSearchParams(location.search),pre=q.get('store');if(pre){var sel=document.getElementById('store');if([].some.call(sel.options,function(o){return o.value===pre}))sel.value=pre;}
function fail(m){err.textContent=m;err.classList.add('is-visible');btn.disabled=false;btn.textContent='Submit';}
f.addEventListener('submit',function(e){e.preventDefault();err.classList.remove('is-visible');err.textContent='';
  var req=['company','first','last','phone','address','city','state','zip','store'];for(var i=0;i<req.length;i++){var el=f.elements[req[i]];if(!el.value.trim()){fail('Please fill in '+f.querySelector('label[for="'+req[i]+'"]').textContent.replace('*','').trim()+'.');el.focus();return;}}
  if(!/^\\d{5}$/.test(f.elements.zip.value.trim())){fail('Please enter a 5-digit ZIP code.');f.elements.zip.focus();return;}
  var body={};['company','first','last','title','email','phone','address','city','state','zip','vehicles','store','emp_first','emp_last','website'].forEach(function(k){body[k]=f.elements[k]?f.elements[k].value:''});body.source=q.get('src')||(pre?'store-qr':'qr');
  btn.disabled=true;btn.textContent='Sending…';
  fetch('/api/fleet/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(j){
    if(!j.ok){fail(j.error||'Something went wrong. Please try again.');return;}
    if(typeof gtag==='function'){gtag('event','fleet_lead',{store:f.elements.store.value,source:body.source});}
    f.hidden=true;done.hidden=false;done.focus();window.scrollTo({top:0,behavior:'smooth'});
  }).catch(function(){fail('We could not send that. Please call Matt at 708-232-3455 and he will take your details.');});
});
document.querySelector('.js-fleet-again').addEventListener('click',function(){f.reset();if(pre)document.getElementById('store').value=pre;btn.disabled=false;btn.textContent='Submit';done.hidden=true;f.hidden=false;f.elements.company.focus();});
})();
</script>
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
const urls = [];
for (const lang of ['en', 'es']) {
  setLang(lang);
  const dir = lang === 'es' ? 'es/' : '';
  if (lang === 'es') write('es/data/stores.json', JSON.stringify(publicStores)); // the search script loads data relative to the page's base
  write(`${dir}index.html`, regionPage());
  urls.push(`${P}/`);
  for (const s of stores) {
    write(`${dir}store/${s.slug}/index.html`, storePage(s));
    write(`${dir}coupon/${s.slug}/index.html`, couponPage(s));
    urls.push(`${P}/store/${s.slug}/`, `${P}/coupon/${s.slug}/`);
    if (s.free_pages) for (const key of Object.keys(FREE_VARIANTS)) { // free-service ad pages: only stores flagged in stores.json
      write(`${dir}${FREE_VARIANTS[key].path}/${s.slug}/index.html`, freePage(s, key));
      urls.push(`${P}/${FREE_VARIANTS[key].path}/${s.slug}/`);
    }
  }
}
setLang('en');
for (const pg of LEGAL.pages) { write(`${pg.slug}/index.html`, legalPage(pg)); urls.push(`/${pg.slug}/`); }
write('fleet/index.html', fleetPage()); // unlisted: not in urls (sitemap), excluded from llms-full below
write('404.html', `${head('Page not found | Jiffy Lube Chicagoland', 'Page not found', '/404.html')}<body>${nav(null, '/')}<main><section class="section"><div class="wrap" style="text-align:center"><h1 class="h2">We couldn’t find that page.</h1><p class="body" style="margin-top:12px"><a href="/">Find a Jiffy Lube location near you</a></p></div></section></main>${footer(site.legal.region_franchisee)}</body></html>`);
// Sitemap: every URL in both languages, each entry listing its en / es / x-default alternates (Google reads hreflang from here too).
const EN_ONLY = new Set(LEGAL.pages.map((pg) => `/${pg.slug}/`));
const sitemapEntry = (u) => { const base = u.replace(/^\/es/, ''); if (EN_ONLY.has(base)) return `  <url><loc>${site.domain}${u}</loc></url>`; const en = `${site.domain}${base}`, es = `${site.domain}/es${base}`; return `  <url><loc>${site.domain}${u}</loc><xhtml:link rel="alternate" hreflang="en" href="${en}"/><xhtml:link rel="alternate" hreflang="es" href="${es}"/><xhtml:link rel="alternate" hreflang="x-default" href="${en}"/></url>`; };
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.map(sitemapEntry).join('\n')}\n</urlset>\n`);
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
- [Sitio en español](${site.domain}/es/): every page is also available in Spanish under /es/ (same stores, same coupon codes).

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
  const walk = (dir) => { for (const f of fs.readdirSync(dir)) { const p = path.join(dir, f); if (dir === OUT && (f === 'private' || f === 'fleet')) continue; if (fs.statSync(p).isDirectory()) walk(p); else if (f === 'index.html') pages.push(p); } };
  walk(OUT);
  const order = (p) => (p.includes('/es/') ? 10 : 0) + (p.includes('/store/') ? 1 : p.includes('/coupon/') ? 2 : p.includes('/free-') ? 3 : 0);
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
// IndexNow key file (Bing, Yandex, DuckDuckGo instant indexing); scripts/indexnow.mjs pings with the sitemap URLs after a deploy.
{ const kf = path.join(ROOT, 'data/indexnow.key'); if (fs.existsSync(kf)) { const k = fs.readFileSync(kf, 'utf8').trim(); write(`${k}.txt`, k); } }
write('CNAME', site.domain.replace(/^https?:\/\//, '') + '\n');
write('.nojekyll', '');
console.log(`Built ${urls.length} pages into docs/`);
