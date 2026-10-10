/* Jiffy Lube Chicagoland — shared behaviour */
(function () {
  'use strict';

  var TZ = 'America/Chicago';
  var DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function chicagoNow() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ, weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false
    }).formatToParts(new Date());
    var out = {};
    parts.forEach(function (p) { out[p.type] = p.value; });
    var hour = parseInt(out.hour, 10) % 24;
    return { day: DAY_NAMES.indexOf(out.weekday), minutes: hour * 60 + parseInt(out.minute, 10) };
  }

  function fmtTime(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    var suffix = h >= 12 ? 'pm' : 'am';
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return h12 + (m ? ':' + (m < 10 ? '0' : '') + m : '') + suffix;
  }

  /* ---- Analytics: one helper, GA4 events (no-op until a measurement ID is configured) ---- */
  function track(name, params) {
    try {
      var p = params || {};
      var store = document.body.getAttribute('data-store');
      if (store && !p.store) p.store = store;
      var saved = JSON.parse(localStorage.getItem('jl_attr') || 'null');
      if (saved && saved.k) p.campaign_key = saved.k;
      if (typeof window.gtag === 'function') window.gtag('event', name, p);
      // Vercel Web Analytics custom event (max 2 properties on the included plan)
      if (typeof window.va === 'function') window.va('event', { name: name, data: { store: p.store || '', campaign_key: p.campaign_key || '' } });
      // Google Ads conversion alongside the GA4 event (labels come from data/site.json)
      if (window.JL_ADS && window.JL_ADS[name] && typeof window.gtag === 'function') window.gtag('event', 'conversion', { send_to: window.JL_ADS[name] });
      if (window.dataLayer && typeof window.gtag !== 'function') window.dataLayer.push(Object.assign({ event: name }, p));
    } catch (e) { /* never break the page for analytics */ }
  }
  function initTracking() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a, button');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (href.indexOf('tel:') === 0) track('call_click', { phone: href.slice(4), location: a.closest('.sticky') ? 'sticky_bar' : a.closest('.nav') ? 'nav' : 'page' });
      else if (href.indexOf('google.com/maps') >= 0) track('get_directions', { location: a.closest('.loc-card') ? 'search_result' : a.closest('.nav') ? 'nav' : 'page' });
      else if (a.classList.contains('coupon__cta')) track('get_coupon', { code: (a.closest('.coupon') || {}).getAttribute ? a.closest('.coupon').getAttribute('data-code') : '' });
      else if (a.classList.contains('js-copy')) track('copy_code', { code: a.closest('.coupon').getAttribute('data-code') });
      else if (a.classList.contains('coupon__wallet-btn--apple')) track('wallet_add', { wallet: 'apple', code: a.closest('.coupon').getAttribute('data-code') });
      else if (a.classList.contains('coupon__wallet-btn--google')) track('wallet_add', { wallet: 'google', code: a.closest('.coupon').getAttribute('data-code') });
      else if (a.classList.contains('js-goto-coupon')) track('get_coupon', { location: 'sticky_bar' });
      else if (a.classList.contains('js-geo')) track('use_location');
      else if (a.classList.contains('loc-card__name') || (a.closest('.loc-card') && href.indexOf('/coupon/') >= 0)) track('select_store', { store: (href.match(/\/(store|coupon)\/([^/?]+)/) || [])[2] || '', via: href.indexOf('/coupon/') >= 0 ? 'coupon_button' : 'name' });
    }, true);
  }

  /* ---- Open / closed status (store + coupon pages) ---- */
  function initStatus() {
    var el = document.querySelector('[data-hours]');
    if (!el) return;
    var hours;
    try { hours = JSON.parse(el.getAttribute('data-hours')); } catch (e) { return; }
    var now = chicagoNow();
    var today = hours[now.day];
    var text, open = false;
    if (today && now.minutes >= today.open && now.minutes < today.close) {
      open = true; text = 'Open until ' + fmtTime(today.close);
    } else if (today && now.minutes < today.open) {
      text = 'Opens at ' + fmtTime(today.open);
    } else {
      var next = null;
      for (var i = 1; i <= 7; i++) { var d = hours[(now.day + i) % 7]; if (d) { next = { d: (now.day + i) % 7, h: d }; break; } }
      text = next ? 'Opens ' + (next.d === (now.day + 1) % 7 ? 'tomorrow' : DAY_NAMES[next.d]) + ' at ' + fmtTime(next.h.open) : 'Closed';
    }
    document.querySelectorAll('.js-status').forEach(function (s) {
      s.querySelector('.js-status-text').textContent = text;
      s.classList.toggle('is-closed', !open);
    });
    document.querySelectorAll('.hours tr.hours__today[data-day="' + now.day + '"]').forEach(function (todayRow) {
      todayRow.hidden = false;
      todayRow.classList.add('is-today');
      var lbl = todayRow.querySelector('.js-today-label');
      if (lbl) lbl.textContent = 'Today (' + DAY_NAMES[now.day] + ')';
    });
  }

  /* ---- Popular times ---- */
  function initPopular() {
    document.querySelectorAll('.popular').forEach(initPopularBlock);
  }
  function initPopularBlock(root) {
    var data;
    try { data = JSON.parse(root.getAttribute('data-popular')); } catch (e) { return; }
    var start = parseInt(root.getAttribute('data-start'), 10) || 7;
    var now = chicagoNow();
    var chart = root.querySelector('.popular__chart');
    var nowEl = root.querySelector('.popular__now');
    var days = root.querySelectorAll('.popular__day');

    function label(v) {
      if (v >= 75) return 'usually very busy';
      if (v >= 50) return 'usually a little busy';
      if (v >= 25) return 'usually not too busy';
      return 'usually quiet';
    }
    function render(day) {
      days.forEach(function (b) { b.classList.toggle('is-active', parseInt(b.getAttribute('data-day'), 10) === day); });
      chart.innerHTML = '';
      var vals = data[day] || [];
      var curIdx = Math.floor(now.minutes / 60) - start;
      vals.forEach(function (v, i) {
        var bar = document.createElement('div');
        bar.className = 'popular__bar' + (day === now.day && i === curIdx ? ' is-now' : '');
        bar.style.setProperty('--v', Math.max(v, 8));
        bar.title = fmtTime((start + i) * 60) + ': ' + label(v);
        chart.appendChild(bar);
      });
      if (nowEl) {
        if (day === now.day && curIdx >= 0 && curIdx < vals.length) {
          nowEl.innerHTML = 'Right now: <b>' + label(vals[curIdx]) + '</b>';
          nowEl.style.display = '';
        } else {
          nowEl.style.display = 'none';
        }
      }
    }
    days.forEach(function (b) {
      b.addEventListener('click', function () { render(parseInt(b.getAttribute('data-day'), 10)); });
    });
    render(now.day);
  }

  /* ---- Coupon reveal + copy ---- */
  function initCoupons() {
    document.querySelectorAll('.coupon').forEach(function (c) {
      var cta = c.querySelector('.coupon__cta');
      var copy = c.querySelector('.js-copy');
      var code = c.getAttribute('data-code');
      if (cta) cta.addEventListener('click', function () {
        c.classList.add('is-revealed');
        c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      });
      if (copy) copy.addEventListener('click', function () {
        var done = function () { c.classList.add('is-copied'); copy.textContent = 'Copied!'; };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(done, done);
        } else { done(); }
      });
    });
    // "Get Coupon" buttons elsewhere on the page scroll to the coupon and reveal it
    document.querySelectorAll('.js-goto-coupon').forEach(function (b) {
      b.addEventListener('click', function (e) {
        var target = document.querySelector('.coupon');
        if (!target) return;
        e.preventDefault();
        target.classList.add('is-revealed');
        target.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    });
  }

  /* ---- "See what's included" toggle (mobile) ---- */
  function initHow() {
    var how = document.querySelector('.how');
    var btn = how && how.querySelector('.how__toggle button');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var open = how.classList.toggle('is-open');
      btn.querySelector('span').textContent = open ? 'Hide' : "See what's included";
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---- Sticky footer appears after hero ---- */
  function initSticky() {
    var bar = document.querySelector('.sticky');
    var hero = document.querySelector('.hero');
    if (!bar || !hero) return;
    document.body.classList.add('has-sticky');
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        bar.classList.toggle('is-visible', !entries[0].isIntersecting);
      }, { threshold: 0 }).observe(hero);
    } else {
      bar.classList.add('is-visible');
    }
  }

  /* ---- Location search (region page) ---- */
  function initSearch() {
    var form = document.querySelector('.js-search');
    if (!form) return;
    var input = form.querySelector('input');
    var errEl = document.querySelector('.search__error');
    var results = document.querySelector('.results');
    var list = results.querySelector('.results__list');
    var title = results.querySelector('.results__title');
    var moreWrap = results.querySelector('.results__more');
    var moreBtn = moreWrap.querySelector('button');
    var geoBtns = document.querySelectorAll('.js-geo');
    var stores = [];
    var base = form.getAttribute('data-base') || '';
    var shown = 0, sorted = [];
    var PAGE = 3, MORE = 20;

    fetch(base + 'data/stores.json').then(function (r) { return r.json(); }).then(function (d) {
      stores = d;
      var q = new URLSearchParams(location.search).get('zip');
      if (q) { input.value = q; searchZip(q); }
    });

    function err(msg) { errEl.textContent = msg; errEl.classList.toggle('is-visible', !!msg); }

    function dist(a, b, c, d) {
      var R = 3958.8, toR = Math.PI / 180;
      var dLat = (c - a) * toR, dLng = (d - b) * toR;
      var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a * toR) * Math.cos(c * toR) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      return 2 * R * Math.asin(Math.sqrt(h));
    }

    function stars(r) {
      var html = '<span class="stars" aria-label="' + r + ' out of 5 stars">';
      for (var i = 0; i < 5; i++) {
        var w = Math.max(0, Math.min(1, r - i)) * 100;
        html += '<span class="star"><svg class="star__bg" viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.7l-6.1 3.4 1.4-6.8L2.2 9.6l6.9-.8z"/></svg><span class="star__fg" style="--w:' + w + '%"><svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.7l-6.1 3.4 1.4-6.8L2.2 9.6l6.9-.8z"/></svg></span></span>';
      }
      return html + '</span>';
    }

    function attrSuffix() {
      try { var cfg = window.JL_ATTR, saved = JSON.parse(localStorage.getItem('jl_attr') || 'null'); if (cfg && saved && saved.k && cfg.codes[saved.k]) return '?' + (saved.p || (cfg.params || ['utm_term'])[0]) + '=' + encodeURIComponent(saved.k); } catch (e) { /* ignore */ }
      return '';
    }
    function card(s) {
      var url = base + 'store/' + s.slug + '/' + attrSuffix();
      return '<article class="loc-card">' +
        '<div class="loc-card__top"><a class="loc-card__name" href="' + url + '">' + s.card_title + '</a><span class="loc-card__dist">' + s.d.toFixed(1) + ' mi</span></div>' +
        '<p class="loc-card__addr">' + s.street + ', ' + s.city + '</p>' +
        (s.phone ? '<a class="loc-card__phone" href="tel:' + s.phone.replace(/\D/g, '') + '">' + s.phone + '</a>' : '') +
        '<div class="loc-card__rating">' + s.rating.toFixed(1) + ' ' + stars(s.rating) + '</div>' +
        '<div class="loc-card__btns"><a class="btn btn--secondary" href="' + base + 'coupon/' + s.slug + '/' + attrSuffix() + '">Coupon</a>' +
        '<a class="btn btn--secondary" href="https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(s.street + ', ' + s.city + ', ' + s.state + ' ' + s.zip) + '&destination_place_id=' + s.place_id + '" target="_blank" rel="noopener">Get Directions</a></div>' +
        '</article>';
    }

    function show(lat, lng, placeLabel) {
      sorted = stores.map(function (s) { s.d = dist(lat, lng, s.lat, s.lng); return s; })
        .sort(function (a, b) { return a.d - b.d; });
      var near = sorted.filter(function (s) { return s.d <= 30; });
      if (near.length === 0) near = sorted.slice(0, 5);
      sorted = near;
      list.innerHTML = '';
      shown = 0;
      title.textContent = sorted.length + ' location' + (sorted.length === 1 ? '' : 's') + ' near ' + placeLabel;
      track('search_results', { results: sorted.length, nearest: sorted[0] ? sorted[0].slug : '', nearest_miles: sorted[0] ? Math.round(sorted[0].d * 10) / 10 : null });
      results.classList.add('is-visible');
      more(PAGE);
      results.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    function more(n) {
      var next = sorted.slice(shown, shown + n);
      list.insertAdjacentHTML('beforeend', next.map(card).join(''));
      shown += next.length;
      var left = sorted.length - shown;
      moreWrap.style.display = left > 0 ? '' : 'none';
      moreBtn.textContent = 'Show ' + Math.min(left, MORE) + ' more';
    }
    moreBtn.addEventListener('click', function () { more(MORE); });

    function searchZip(zip) {
      zip = (zip || '').trim();
      if (!/^\d{5}$/.test(zip)) { err('Please enter a 5-digit zip code.'); return; }
      err('');
      // Zippopotam is a free, keyless zip lookup. Fallback: nearest store by zip prefix.
      fetch('https://api.zippopotam.us/us/' + zip).then(function (r) {
        if (!r.ok) throw new Error('nozip');
        return r.json();
      }).then(function (d) {
        var p = d.places[0];
        show(parseFloat(p.latitude), parseFloat(p.longitude), p['place name'] + ', ' + p['state abbreviation'] + ' ' + zip);
      }).catch(function () {
        var m = stores.filter(function (s) { return s.zip === zip; })[0];
        if (m) show(m.lat, m.lng, m.city + ', ' + m.state + ' ' + zip);
        else err("We couldn't find that zip code. Try another or use your location.");
      });
      try { history.replaceState(null, '', '?zip=' + zip); } catch (e) { /* ignore */ }
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); track('search_zip', { zip: input.value.trim() }); searchZip(input.value); });

    geoBtns.forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        if (!navigator.geolocation) { err('Location is not available in this browser.'); return; }
        err('');
        var orig = b.textContent;
        b.textContent = 'Finding you…';
        navigator.geolocation.getCurrentPosition(function (pos) {
          b.textContent = orig;
          show(pos.coords.latitude, pos.coords.longitude, 'you');
        }, function () {
          b.textContent = orig;
          err("We couldn't get your location. Please enter a zip code.");
        }, { timeout: 10000, maximumAge: 300000 });
      });
    });
  }

  /* ---- Map: load the Google Maps iframe only when it scrolls into view ---- */
  function initMap() {
    var maps = document.querySelectorAll('.js-map');
    if (!maps.length) return;
    function load(m) {
      if (m.getAttribute('data-loaded')) return;
      m.setAttribute('data-loaded', '1');
      var f = document.createElement('iframe');
      f.src = m.getAttribute('data-src');
      f.title = m.getAttribute('data-title');
      f.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
      f.setAttribute('allowfullscreen', '');
      m.appendChild(f);
    }
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { load(e.target); io.unobserve(e.target); } });
      }, { rootMargin: '200px' });
      maps.forEach(function (m) { io.observe(m); });
    } else { maps.forEach(load); }
  }

  /* ---- Platform class for wallet buttons ---- */
  function initPlatform() {
    var ua = navigator.userAgent || '';
    var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var isAndroid = /Android/.test(ua);
    if (isIOS) document.body.classList.add('is-ios');
    else if (isAndroid) document.body.classList.add('is-android');
  }

  /* ---- Campaign attribution: ?utm_term=<key> picks the coupon code ---- */
  function initAttribution() {
    var cfg = window.JL_ATTR;
    if (!cfg || !cfg.codes) return;
    var KEY = 'jl_attr';
    var params = cfg.params || [cfg.param || 'utm_term'];
    var key = null, param = params[0];
    try {
      var qs = new URLSearchParams(location.search);
      for (var i = 0; i < params.length && !key; i++) {
        var v = qs.get(params[i]);
        if (v && cfg.codes[v.toLowerCase()]) { key = v.toLowerCase(); param = params[i]; }
      }
      if (key) {
        localStorage.setItem(KEY, JSON.stringify({ k: key, p: param, t: Date.now() }));
      } else {
        var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
        if (saved && saved.k && cfg.codes[saved.k] && Date.now() - saved.t < cfg.days * 864e5) { key = saved.k; param = saved.p || param; }
      }
    } catch (e) { /* storage unavailable: fall back to default code */ }
    if (!key) return;
    var code = cfg.codes[key];
    document.querySelectorAll('.coupon').forEach(function (c) {
      if (c.getAttribute('data-fixed-code')) return; // this store has its own code; campaign codes don't override it
      c.setAttribute('data-code', code);
      c.querySelectorAll('.js-code').forEach(function (el) { el.textContent = code; el.setAttribute('aria-label', 'Coupon code ' + code); });
      c.querySelectorAll('.coupon__wallet-btn').forEach(function (a) {
        var href = a.getAttribute('href');
        a.setAttribute('href', href + (href.indexOf('?') >= 0 ? '&' : '?') + 'code=' + encodeURIComponent(key));
      });
    });
    // keep the key on internal links so store/coupon pages opened in a fresh browser still get it
    document.querySelectorAll('a[href^="/"]').forEach(function (a) {
      if (a.classList.contains('coupon__wallet-btn')) return;
      var href = a.getAttribute('href');
      if (href.indexOf(param + '=') === -1) a.setAttribute('href', href + (href.indexOf('?') >= 0 ? '&' : '?') + param + '=' + encodeURIComponent(key));
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initAttribution();
    initPlatform();
    initTracking();
    initMap();
    initStatus();
    initPopular();
    initCoupons();
    initHow();
    initSticky();
    initSearch();
  });
})();
