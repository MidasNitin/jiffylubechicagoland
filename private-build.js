#!/usr/bin/env node
// Builds the password-protected dashboard under private/ (served at /private/ by middleware.js).
//   node private-build.js
// Inputs: ../jiffy-lube-competitor-map/data/{stores,competitors,meta}.json (August snapshot + competitors),
//         ../jiffy-lube-competitor-map/dist/index.html (the map), data/stores.json (latest ratings).
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const MAP = path.join(ROOT, '..', 'jiffy-lube-competitor-map');
const OUT = path.join(ROOT, 'private');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const write = (rel, c) => { const p = path.join(OUT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c); };

const augStores = JSON.parse(fs.readFileSync(path.join(MAP, 'data/stores.json'), 'utf8'));
const competitors = JSON.parse(fs.readFileSync(path.join(MAP, 'data/competitors.json'), 'utf8'));
const meta = JSON.parse(fs.readFileSync(path.join(MAP, 'data/meta.json'), 'utf8'));
const siteStores = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/stores.json'), 'utf8'));
const site = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/site.json'), 'utf8'));
const radius = meta.radius_miles || 3;
const bf = meta.brand_fetched || {};
const augDate = meta.store_ratings_as_of || (meta.fetched_at || '').slice(0, 10);
const compDate = bf.firestone && bf.take5 && bf.firestone !== bf.take5 ? `${bf.take5} (Firestone ${bf.firestone})` : augDate;
const BRANDS = 'Take 5, Valvoline, Strickland Brothers and Firestone';
const GROUPS = [...new Set(augStores.map((s) => s.group))].sort();
const latestLabel = site.rating_as_of || 'latest';

/* ---------- shared chrome ---------- */
const CSS = `
:root{--maroon:#700000;--red:#fc2b22;--ink:#1a1a1a;--muted:#5d5d5d;--line:#e3e3e3;--bg:#f6f6f6;--white:#fff;--q-strong:#008300;--q-battle:#2a78d6;--q-open:#eda100;--q-risk:#e34948}
*{box-sizing:border-box}body{margin:0;font-family:Poppins,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--ink);background:var(--bg);line-height:1.5}
a{color:var(--maroon)}.top{background:var(--maroon);color:#fff;padding:14px 0}.top .wrap{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.top a{color:#fff;text-decoration:none;font-weight:700}.top nav a{font-weight:400;margin-left:18px;opacity:.9}.top nav a.on{text-decoration:underline;opacity:1}
.top .gsel{font-size:13px;display:flex;align-items:center;gap:8px}.top .gsel select{font:inherit;padding:5px 8px;border-radius:6px;border:0;max-width:240px}
.wrap{max-width:1180px;margin:0 auto;padding:0 20px}h1{font-size:26px;margin:28px 0 6px}h2{font-size:18px;margin:28px 0 10px}.sub{color:var(--muted);margin:0 0 20px}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px;margin:20px 0}
.card{background:var(--white);border:1px solid var(--line);border-radius:12px;padding:20px;text-decoration:none;color:var(--ink);display:block}
.card:hover{border-color:var(--maroon)}.card h3{margin:0 0 6px;font-size:17px}.card p{margin:0;color:var(--muted);font-size:14px}.card .tag{display:inline-block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-top:10px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:16px 0}.stat{background:var(--white);border:1px solid var(--line);border-radius:10px;padding:14px}
.stat b{display:block;font-size:26px;line-height:1.1}.stat span{font-size:12px;color:var(--muted)}
.panel{background:var(--white);border:1px solid var(--line);border-radius:12px;padding:20px;margin:16px 0}
.ctl{display:flex;gap:16px;flex-wrap:wrap;align-items:center;font-size:14px;margin-bottom:12px}.ctl label{display:flex;gap:8px;align-items:center}select{font:inherit;padding:4px 8px}
.legend{display:flex;gap:18px;flex-wrap:wrap;font-size:13px;margin:10px 0}.legend span{display:inline-flex;align-items:center;gap:6px}.legend i{width:10px;height:10px;border-radius:50%;display:inline-block}
svg.plot{width:100%;height:auto;display:block}.plot text{font-family:inherit}.plot .grid{stroke:#e9e9e9;stroke-width:1}.plot .axis{stroke:#bbb;stroke-width:1}.plot .lbl{fill:#5d5d5d;font-size:11px}.plot .qlbl{font-size:12px;font-weight:700;fill:#333;opacity:.85}
.plot .pt{stroke:#fff;stroke-width:2;cursor:pointer}.plot .pt:hover{stroke:#111}
.tip{position:absolute;pointer-events:none;background:#111;color:#fff;font-size:12px;padding:8px 10px;border-radius:8px;max-width:260px;display:none;z-index:5;line-height:1.4}
table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);cursor:pointer;white-space:nowrap}
td.num,th.num{text-align:right}.q{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;color:#fff}
.q-strong{background:var(--q-strong)}.q-battle{background:var(--q-battle)}.q-open{background:var(--q-open);color:#1a1a1a}.q-risk{background:var(--q-risk)}
.muted{color:var(--muted)}.foot{color:var(--muted);font-size:12px;margin:30px 0}
details{margin:10px 0}summary{cursor:pointer;font-weight:700}
@media (max-width:720px){.top nav a{margin-left:12px}th,td{padding:6px}}
`;
// Franchise group filter lives in the top bar on every page. The choice is kept in localStorage (jl_group) and
// passed to the map as ?group=. Pages listen for the 'jl-group' event and read window.JL_GROUP.
const GROUP_NAV = () => `<label class="gsel">Franchise group <select id="gsel"><option value="">All groups</option>${GROUPS.map((g) => `<option>${esc(g)}</option>`).join('')}</select></label>`;
const GROUP_JS = `<script>(function(){var k='jl_group',sel=document.getElementById('gsel'),u=new URLSearchParams(location.search),g=u.get('group');try{if(g!==null)localStorage.setItem(k,g);else g=localStorage.getItem(k)||''}catch(e){g=g||''}
if(![].some.call(sel.options,function(o){return o.value===g}))g='';sel.value=g;window.JL_GROUP=g;
function link(){document.querySelectorAll('nav a[data-nav]').forEach(function(a){a.href=a.getAttribute('data-nav')+(window.JL_GROUP?'?group='+encodeURIComponent(window.JL_GROUP):'')})}
sel.addEventListener('change',function(){window.JL_GROUP=sel.value;try{localStorage.setItem(k,sel.value)}catch(e){}link();window.dispatchEvent(new Event('jl-group'))});link();})();</script>`;
const page = (title, body, active) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)} | Jiffy Lube Chicagoland dashboard</title><style>${CSS}</style></head>
<body><header class="top"><div class="wrap"><a href="/private/">Jiffy Lube Chicagoland · Owner dashboard</a><nav>
<a data-nav="/private/" href="/private/"${active === 'home' ? ' class="on"' : ''}>Home</a><a data-nav="/private/competitor-map/" href="/private/competitor-map/"${active === 'map' ? ' class="on"' : ''}>Competitor map</a><a data-nav="/private/quadrants/" href="/private/quadrants/"${active === 'quad' ? ' class="on"' : ''}>Rating quadrants</a><a data-nav="/private/ratings/" href="/private/ratings/"${active === 'ratings' ? ' class="on"' : ''}>Ratings over time</a>
</nav>${GROUP_NAV()}</div></header><main class="wrap">${body}</main>${GROUP_JS}</body></html>`;

/* ---------- data: join August map data with latest site ratings ---------- */
const latestById = new Map(siteStores.map((s) => [String(s.id), s]));
const rows = augStores.map((s) => {
  const near = competitors.filter((c) => (c.near_stores || []).some((n) => n.store === s.store)).map((c) => ({ ...c, miles: (c.near_stores.find((n) => n.store === s.store) || {}).miles }));
  const rated = near.filter((c) => typeof c.rating === 'number');
  const compAvg = rated.length ? rated.reduce((a, c) => a + c.rating, 0) / rated.length : null;
  const compMax = rated.length ? Math.max(...rated.map((c) => c.rating)) : null;
  const latest = latestById.get(String(s.store));
  return {
    store: s.store, group: s.group, street: s.street, city: s.city, slug: latest ? latest.slug : null,
    rating: latest && typeof latest.rating === 'number' ? latest.rating : s.live_rating,
    reviews: latest && latest.review_count ? latest.review_count : s.review_count,
    ratingAug: s.live_rating, reviewsAug: s.review_count,
    comps: near.length, compAvg, compMax, near: near.sort((a, b) => a.miles - b.miles)
  };
});

/* ---------- quadrants page ---------- */
function quadrantsPage() {
  const withComps = rows.filter((r) => r.compAvg !== null);
  const without = rows.filter((r) => r.compAvg === null);
  const data = JSON.stringify(rows.map((r) => ({ s: r.store, g: r.group, a: `${r.street}, ${r.city}`, slug: r.slug, x: r.rating, n: r.reviews, y: r.compAvg === null ? null : +r.compAvg.toFixed(2), m: r.compMax, c: r.comps, near: r.near.map((c) => ({ b: c.brand_label, r: c.rating, n: c.review_count, mi: +c.miles.toFixed(1) })) })));
  const body = `
<h1>Rating quadrants</h1>
<p class="sub">Each dot is one Jiffy Lube store. Left to right: the store's Google rating (${esc(latestLabel)}). Bottom to top: the average Google rating of ${BRANDS} locations within ${radius} miles (${esc(compDate)}). The lines split the chart into four groups.</p>
<div class="stats">
  <div class="stat"><b id="n-strong">0</b><span>Strongholds: we rate higher, competitors rate lower</span></div>
  <div class="stat"><b id="n-battle">0</b><span>Battlegrounds: both rate high</span></div>
  <div class="stat"><b id="n-open">0</b><span>Open field: both rate lower, easy to pull ahead</span></div>
  <div class="stat"><b id="n-risk">0</b><span>At risk: competitors rate higher than we do</span></div>
</div>
<div class="panel">
  <div class="ctl">
    <label>Our rating line <select id="tx"><option>4.3</option><option>4.4</option><option selected>4.5</option><option>4.6</option><option>4.7</option></select></label>
    <label>Competitor line <select id="ty"><option>4.3</option><option>4.4</option><option selected>4.5</option><option>4.6</option><option>4.7</option></select></label>
    <label>Find store <input id="q" type="search" placeholder="store #, city, street, group" style="font:inherit;padding:4px 8px;width:220px"></label>
    <span class="muted">${withComps.length} stores plotted, ${without.length} with no competitor within ${radius} miles (listed below).</span>
  </div>
  <div class="legend"><span><i style="background:var(--q-strong)"></i>Stronghold</span><span><i style="background:var(--q-battle)"></i>Battleground</span><span><i style="background:var(--q-open)"></i>Open field</span><span><i style="background:var(--q-risk)"></i>At risk</span><span class="muted">Dot size = number of competitors nearby. Hover a dot for details.</span></div>
  <div style="position:relative"><svg class="plot" id="plot" viewBox="0 0 900 560" role="img" aria-label="Scatter plot of store rating versus nearby competitor rating"></svg><div class="tip" id="tip"></div></div>
</div>
<h2>Store list</h2>
<p class="sub">Click a column heading to sort. "Gap" is our rating minus the nearby competitor average; negative means they rate higher.</p>
<div class="panel" style="overflow:auto"><table id="tbl"><thead><tr><th data-k="s">Store</th><th data-k="g">Group</th><th data-k="a">Address</th><th class="num" data-k="x">Our rating</th><th class="num" data-k="n">Reviews</th><th class="num" data-k="c">Competitors</th><th class="num" data-k="y">Comp. avg</th><th class="num" data-k="gap">Gap</th><th data-k="q">Quadrant</th></tr></thead><tbody></tbody></table></div>
<h2>No competitor within ${radius} miles</h2>
<p class="sub">${without.length} stores. These have none of ${BRANDS} in their trade area, so there is nothing to compare against yet.</p>
<div class="panel" style="overflow:auto"><table><thead><tr><th>Store</th><th>Group</th><th>Address</th><th class="num">Our rating</th><th class="num">Reviews</th></tr></thead><tbody>
${without.sort((a, b) => a.rating - b.rating).map((r) => `<tr><td>#${r.store}</td><td>${esc(r.group)}</td><td>${esc(r.street)}, ${esc(r.city)}</td><td class="num">${r.rating.toFixed(1)}</td><td class="num">${r.reviews.toLocaleString('en-US')}</td></tr>`).join('')}
</tbody></table></div>
<p class="foot">Our ratings: Google Places, ${esc(latestLabel)}. Competitor ratings and distances: Google Places, ${esc(compDate)}, ${radius}-mile straight-line radius. Rebuild with <code>node private-build.js</code> after refreshing either data set.</p>
<script>
(function(){
var D=${data};
var svg=document.getElementById('plot'),tip=document.getElementById('tip');
var W=900,H=560,P={l:56,r:20,t:20,b:52},X0=3.4,X1=5.0,Y0=3.4,Y1=5.0;
var sx=function(v){return P.l+(v-X0)/(X1-X0)*(W-P.l-P.r)},sy=function(v){return H-P.b-(v-Y0)/(Y1-Y0)*(H-P.t-P.b)};
var Q={strong:['Stronghold','var(--q-strong)'],battle:['Battleground','var(--q-battle)'],open:['Open field','var(--q-open)'],risk:['At risk','var(--q-risk)']};
function quad(d,tx,ty){if(d.y==null)return null;var hi=d.x>=tx,ch=d.y>=ty;return hi?(ch?'battle':'strong'):(ch?'risk':'open')}
function render(){
  var tx=+document.getElementById('tx').value,ty=+document.getElementById('ty').value,g=window.JL_GROUP||'',q=(document.getElementById('q').value||'').toLowerCase();
  var rows=D.filter(function(d){return d.y!=null&&(!g||d.g===g)&&(!q||(('#'+d.s+' '+d.a+' '+d.g).toLowerCase().indexOf(q)>=0))});
  var counts={strong:0,battle:0,open:0,risk:0};rows.forEach(function(d){counts[quad(d,tx,ty)]++});
  Object.keys(counts).forEach(function(k){document.getElementById('n-'+k).textContent=counts[k]});
  var s='';
  for(var v=3.4;v<=5.001;v+=0.2){var vv=+v.toFixed(1);s+='<line class="grid" x1="'+sx(vv)+'" x2="'+sx(vv)+'" y1="'+P.t+'" y2="'+(H-P.b)+'"/><line class="grid" y1="'+sy(vv)+'" y2="'+sy(vv)+'" x1="'+P.l+'" x2="'+(W-P.r)+'"/>';
    s+='<text class="lbl" x="'+sx(vv)+'" y="'+(H-P.b+18)+'" text-anchor="middle">'+vv.toFixed(1)+'</text><text class="lbl" x="'+(P.l-8)+'" y="'+(sy(vv)+4)+'" text-anchor="end">'+vv.toFixed(1)+'</text>';}
  s+='<line class="axis" x1="'+P.l+'" x2="'+(W-P.r)+'" y1="'+(H-P.b)+'" y2="'+(H-P.b)+'"/><line class="axis" x1="'+P.l+'" x2="'+P.l+'" y1="'+P.t+'" y2="'+(H-P.b)+'"/>';
  s+='<text class="lbl" x="'+((P.l+W-P.r)/2)+'" y="'+(H-10)+'" text-anchor="middle">Our Google rating →</text><text class="lbl" transform="translate(14 '+((P.t+H-P.b)/2)+') rotate(-90)" text-anchor="middle">Nearby competitor average rating →</text>';
  s+='<line x1="'+sx(tx)+'" x2="'+sx(tx)+'" y1="'+P.t+'" y2="'+(H-P.b)+'" stroke="#700000" stroke-dasharray="4 4"/><line y1="'+sy(ty)+'" y2="'+sy(ty)+'" x1="'+P.l+'" x2="'+(W-P.r)+'" stroke="#700000" stroke-dasharray="4 4"/>';
  s+='<text class="qlbl" x="'+(P.l+10)+'" y="'+(P.t+16)+'">At risk</text><text class="qlbl" x="'+(W-P.r-10)+'" y="'+(P.t+16)+'" text-anchor="end">Battleground</text><text class="qlbl" x="'+(P.l+10)+'" y="'+(H-P.b-10)+'">Open field</text><text class="qlbl" x="'+(W-P.r-10)+'" y="'+(H-P.b-10)+'" text-anchor="end">Stronghold</text>';
  // deterministic jitter so stores with identical ratings don't stack exactly
  rows.forEach(function(d,i){var q=quad(d,tx,ty),h=0;for(var k=0;k<String(d.s).length;k++)h=(h*31+String(d.s).charCodeAt(k))%997;var jx=((h%7)-3)*1.6,jy=(((h/7|0)%7)-3)*1.6;var r=5+Math.min(d.c,6)*1.1;
    s+='<circle class="pt" data-i="'+D.indexOf(d)+'" cx="'+(sx(d.x)+jx)+'" cy="'+(sy(d.y)+jy)+'" r="'+r+'" fill="'+Q[q][1]+'" fill-opacity=".85"/>'});
  svg.innerHTML=s;
  var tb=document.querySelector('#tbl tbody');var list=rows.map(function(d){var q=quad(d,tx,ty);return Object.assign({},d,{q:q,qn:Q[q][0],gap:+(d.x-d.y).toFixed(2)})});
  var k=tb.getAttribute('data-k')||'gap',dir=+(tb.getAttribute('data-dir')||1);
  list.sort(function(a,b){var va=a[k],vb=b[k];if(typeof va==='string')return va.localeCompare(vb)*dir;return (va-vb)*dir});
  tb.innerHTML=list.map(function(d){return '<tr><td>#'+d.s+(d.slug?' <a href="/store/'+d.slug+'/" target="_blank" rel="noopener">page</a>':'')+'</td><td>'+d.g+'</td><td>'+d.a+'</td><td class="num">'+d.x.toFixed(1)+'</td><td class="num">'+d.n.toLocaleString()+'</td><td class="num">'+d.c+'</td><td class="num">'+d.y.toFixed(2)+'</td><td class="num">'+(d.gap>0?'+':'')+d.gap.toFixed(2)+'</td><td><span class="q q-'+d.q+'">'+d.qn+'</span></td></tr>'}).join('');
}
svg.addEventListener('mousemove',function(e){var t=e.target.closest('.pt');if(!t){tip.style.display='none';return}var d=D[+t.getAttribute('data-i')];
  tip.innerHTML='<b>#'+d.s+' '+d.a+'</b><br>'+d.g+'<br>Our rating '+d.x.toFixed(1)+' ('+d.n.toLocaleString()+' reviews)<br>'+d.c+' competitor'+(d.c===1?'':'s')+' within ${radius} mi, avg '+d.y.toFixed(2)+'<br>'+d.near.map(function(c){return c.b+' '+c.r.toFixed(1)+' ('+c.n.toLocaleString()+'), '+c.mi+' mi'}).join('<br>');
  var box=svg.parentNode.getBoundingClientRect();tip.style.display='block';tip.style.left=Math.min(e.clientX-box.left+14,box.width-270)+'px';tip.style.top=(e.clientY-box.top+14)+'px'});
svg.addEventListener('mouseleave',function(){tip.style.display='none'});
['tx','ty'].forEach(function(id){document.getElementById(id).addEventListener('change',render)});document.getElementById('q').addEventListener('input',render);window.addEventListener('jl-group',render);
document.querySelectorAll('#tbl th').forEach(function(th){th.addEventListener('click',function(){var tb=document.querySelector('#tbl tbody');var k=th.getAttribute('data-k');var dir=tb.getAttribute('data-k')===k?-(+(tb.getAttribute('data-dir')||1)):1;tb.setAttribute('data-k',k);tb.setAttribute('data-dir',dir);render()})});
render();
})();
</script>`;
  return page('Rating quadrants', body, 'quad');
}

/* ---------- ratings over time: built from data/history/*.json in the map project ---------- */
function ratingsPage() {
  const histDir = path.join(MAP, 'data/history');
  const snaps = fs.existsSync(histDir) ? fs.readdirSync(histDir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().map((f) => JSON.parse(fs.readFileSync(path.join(histDir, f), 'utf8'))) : [];
  const dates = snaps.map((h) => h.date);
  const brandLabel = { jl: 'Jiffy Lube', take5: 'Take 5', valvoline: 'Valvoline', strickland: 'Strickland Brothers', firestone: 'Firestone' };
  const brandColor = { jl: '#c8102e', take5: '#7a3fd1', valvoline: '#1f6fd1', strickland: '#2e9e5b', firestone: '#e07b1a' };
  const storeInfo = new Map(augStores.map((s) => [s.store, s]));
  const ent = new Map();
  for (const h of snaps) {
    for (const r of h.stores || []) { const s = storeInfo.get(r.store); if (!s) continue; const k = 'jl:' + r.store; if (!ent.has(k)) ent.set(k, { key: k, label: `#${r.store} ${s.street}, ${s.city}`, brand: 'jl', group: s.group, groups: [s.group], series: {} }); ent.get(k).series[h.date] = { r: r.rating, n: r.reviews }; }
    for (const c of h.competitors || []) { const k = 'c:' + c.id; if (!ent.has(k)) ent.set(k, { key: k, label: `${brandLabel[c.brand] || c.brand}, ${c.address}`, brand: c.brand, group: '', groups: [...new Set((c.near_stores || []).map((n) => (storeInfo.get(n.store) || {}).group).filter(Boolean))], series: {} }); ent.get(k).series[h.date] = { r: c.rating, n: c.reviews }; }
  }
  const data = JSON.stringify({ dates, brands: Object.keys(brandLabel), brandLabel, brandColor, entities: [...ent.values()] });
  const body = `
<h1>Ratings over time</h1>
<p class="sub">Google rating and review count for every Jiffy Lube store and every tracked competitor, recorded on each snapshot date. ${dates.length} snapshot${dates.length === 1 ? '' : 's'} so far (${esc(dates.join(', '))}). A new one is taken automatically on the 1st of each month.</p>
<div class="panel">
  <div class="ctl"><label>Show <select id="rmode"><option value="avg">Average rating by brand</option><option value="reviews">Total reviews by brand</option></select></label><span class="muted" id="rnote"></span></div>
  <div class="legend" id="rlegend"></div>
  <div style="position:relative"><svg class="plot" id="rplot" viewBox="0 0 900 420" role="img" aria-label="Rating trend by brand"></svg><div class="tip" id="rtip"></div></div>
</div>
<h2>Jiffy Lube stores</h2>
<div class="ctl"><label>Find store <input id="rq" type="search" placeholder="store #, city, street" style="font:inherit;padding:4px 8px;width:220px"></label><span class="muted">Sorted by biggest change. Click a heading to sort.</span></div>
<div class="panel" style="overflow:auto"><table id="rtbl"><thead></thead><tbody></tbody></table></div>
<h2>Competitors</h2>
<div class="ctl"><label>Brand <select id="rbrand"><option value="">All brands</option>${['take5', 'valvoline', 'strickland', 'firestone'].map((b) => `<option value="${b}">${brandLabel[b]}</option>`).join('')}</select></label><label>Find <input id="rcq" type="search" placeholder="brand, address" style="font:inherit;padding:4px 8px;width:220px"></label></div>
<div class="panel" style="overflow:auto"><table id="ctbl"><thead></thead><tbody></tbody></table></div>
<p class="foot">Google rounds ratings to one decimal, so a store's rating often holds still for months while its review count moves every week; the review count is the earlier signal. Competitors are tied to a franchise group through the stores they sit within ${radius} miles of. Snapshots live in the competitor-map GitHub repo under data/history.</p>
<script>
(function(){
var D=${data},E=D.entities,dates=D.dates;
var mode=document.getElementById('rmode'),q=document.getElementById('rq'),cq=document.getElementById('rcq'),rb=document.getElementById('rbrand');
var gv=function(){return window.JL_GROUP||''};
function inGroup(e,g){return !g||e.groups.indexOf(g)>=0}
function last(e){for(var i=dates.length-1;i>=0;i--){var v=e.series[dates[i]];if(v&&v.r!=null)return v}return null}
function first(e){for(var i=0;i<dates.length;i++){var v=e.series[dates[i]];if(v&&v.r!=null)return v}return null}
function chart(){
  var g=gv(),m=mode.value,svg=document.getElementById('rplot');
  var W=900,H=420,P={l:56,r:20,t:16,b:44};
  var series=D.brands.map(function(b){var es=E.filter(function(e){return e.brand===b&&inGroup(e,g)});return {b:b,pts:dates.map(function(d){var vs=es.map(function(e){return e.series[d]}).filter(function(v){return v&&v.r!=null});if(!vs.length)return null;return m==='avg'?{d:d,v:vs.reduce(function(a,v){return a+v.r},0)/vs.length,n:vs.length}:{d:d,v:vs.reduce(function(a,v){return a+(v.n||0)},0),n:vs.length}})}}).filter(function(s){return s.pts.some(Boolean)});
  var vals=[].concat.apply([],series.map(function(s){return s.pts.filter(Boolean).map(function(p){return p.v})}));
  if(!vals.length){svg.innerHTML='';return}
  var y0=m==='avg'?Math.min(4.0,Math.floor(Math.min.apply(null,vals)*10)/10):0,y1=m==='avg'?5:Math.max.apply(null,vals)*1.08;
  var sx=function(i){return dates.length===1?(P.l+W-P.r)/2:P.l+i/(dates.length-1)*(W-P.l-P.r)},sy=function(v){return H-P.b-(v-y0)/(y1-y0)*(H-P.t-P.b)};
  var s='';var steps=5;for(var k=0;k<=steps;k++){var v=y0+(y1-y0)*k/steps;s+='<line class="grid" x1="'+P.l+'" x2="'+(W-P.r)+'" y1="'+sy(v)+'" y2="'+sy(v)+'"/><text class="lbl" x="'+(P.l-8)+'" y="'+(sy(v)+4)+'" text-anchor="end">'+(m==='avg'?v.toFixed(2):Math.round(v).toLocaleString())+'</text>'}
  dates.forEach(function(d,i){s+='<text class="lbl" x="'+sx(i)+'" y="'+(H-P.b+18)+'" text-anchor="middle">'+d+'</text>'});
  s+='<line class="axis" x1="'+P.l+'" x2="'+(W-P.r)+'" y1="'+(H-P.b)+'" y2="'+(H-P.b)+'"/>';
  series.forEach(function(sr){var c=D.brandColor[sr.b];var path='';sr.pts.forEach(function(p,i){if(!p)return;path+=(path?' L':'M')+sx(i)+' '+sy(p.v)});s+='<path d="'+path+'" fill="none" stroke="'+c+'" stroke-width="2.5" stroke-linejoin="round"/>';
    sr.pts.forEach(function(p,i){if(!p)return;s+='<circle class="pt" data-b="'+sr.b+'" data-i="'+i+'" cx="'+sx(i)+'" cy="'+sy(p.v)+'" r="6" fill="'+c+'"/>'});
    var lp=null,li=0;sr.pts.forEach(function(p,i){if(p){lp=p;li=i}});if(lp)s+='<text class="lbl" x="'+(sx(li)+10)+'" y="'+(sy(lp.v)+4)+'" style="fill:'+c+';font-weight:700">'+(m==='avg'?lp.v.toFixed(2):Math.round(lp.v).toLocaleString())+'</text>'});
  svg.innerHTML=s;svg._series=series;
  document.getElementById('rlegend').innerHTML=series.map(function(sr){var lp=null;sr.pts.forEach(function(p){if(p)lp=p});return '<span><i style="background:'+D.brandColor[sr.b]+'"></i>'+D.brandLabel[sr.b]+' <span class="muted">('+(lp?lp.n:0)+' location'+(lp&&lp.n===1?'':'s')+')</span></span>'}).join('');
  document.getElementById('rnote').textContent=g?'Competitors shown are those within ${radius} miles of a '+g+' store.':'';
}
var tip=document.getElementById('rtip'),svg=document.getElementById('rplot');
svg.addEventListener('mousemove',function(e){var t=e.target.closest('.pt');if(!t){tip.style.display='none';return}var sr=svg._series.filter(function(x){return x.b===t.getAttribute('data-b')})[0],p=sr.pts[+t.getAttribute('data-i')];tip.innerHTML='<b>'+D.brandLabel[sr.b]+'</b> '+p.d+'<br>'+(mode.value==='avg'?'Average rating '+p.v.toFixed(3):'Total reviews '+Math.round(p.v).toLocaleString())+'<br>'+p.n+' locations';var box=svg.parentNode.getBoundingClientRect();tip.style.display='block';tip.style.left=Math.min(e.clientX-box.left+14,box.width-200)+'px';tip.style.top=(e.clientY-box.top+14)+'px'});
svg.addEventListener('mouseleave',function(){tip.style.display='none'});
function table(id,rows,filterText){
  var tb=document.querySelector('#'+id+' tbody'),th=document.querySelector('#'+id+' thead');
  var k=tb.getAttribute('data-k')||'chg',dir=+(tb.getAttribute('data-dir')||-1);
  var list=rows.map(function(e){var f=first(e),l=last(e);return {e:e,label:e.label,group:e.group||e.groups.join(', '),chg:f&&l?+(l.r-f.r).toFixed(1):0,nchg:f&&l?(l.n||0)-(f.n||0):0,lr:l?l.r:0,ln:l?l.n:0}}).filter(function(r){return !filterText||r.label.toLowerCase().indexOf(filterText)>=0});
  list.sort(function(a,b){var va=a[k],vb=b[k];if(typeof va==='string')return va.localeCompare(vb)*dir;return (va-vb)*dir||Math.abs(b.nchg)-Math.abs(a.nchg)});
  th.innerHTML='<tr><th data-k="label">Location</th><th data-k="group">Group</th>'+dates.map(function(d){return '<th class="num">'+d+'</th>'}).join('')+'<th class="num" data-k="chg">Change</th><th class="num" data-k="ln">Reviews</th><th class="num" data-k="nchg">Reviews added</th></tr>';
  tb.innerHTML=list.map(function(r){return '<tr><td>'+r.label+'</td><td>'+r.group+'</td>'+dates.map(function(d){var v=r.e.series[d];return '<td class="num">'+(v&&v.r!=null?v.r.toFixed(1):'<span class="muted">·</span>')+'</td>'}).join('')+'<td class="num" style="color:'+(r.chg>0?'var(--q-strong)':r.chg<0?'var(--q-risk)':'inherit')+'">'+(r.chg>0?'+':'')+r.chg.toFixed(1)+'</td><td class="num">'+(r.ln||0).toLocaleString()+'</td><td class="num">'+(r.nchg>0?'+':'')+r.nchg.toLocaleString()+'</td></tr>'}).join('')||'<tr><td colspan="99" class="muted">Nothing matches.</td></tr>';
  th.querySelectorAll('th[data-k]').forEach(function(h){h.onclick=function(){var kk=h.getAttribute('data-k');tb.setAttribute('data-dir',tb.getAttribute('data-k')===kk?-(+(tb.getAttribute('data-dir')||-1)):(kk==='label'||kk==='group'?1:-1));tb.setAttribute('data-k',kk);render()}});
}
function render(){chart();var g=gv();table('rtbl',E.filter(function(e){return e.brand==='jl'&&inGroup(e,g)}),q.value.toLowerCase());table('ctbl',E.filter(function(e){return e.brand!=='jl'&&inGroup(e,g)&&(!rb.value||e.brand===rb.value)}),cq.value.toLowerCase())}
[mode,rb].forEach(function(el){el.addEventListener('change',render)});[q,cq].forEach(function(el){el.addEventListener('input',render)});
window.addEventListener('jl-group',render);render();
})();
</script>`;
  return page('Ratings over time', body, 'ratings');
}

/* ---------- home ---------- */
function homePage() {
  const avg = (rows.reduce((a, r) => a + r.rating, 0) / rows.length).toFixed(2);
  const body = `
<h1>Owner dashboard</h1>
<p class="sub">Private reporting for Jiffy Lube Chicagoland owners and the marketing team. Not linked from the public site. Pick your franchise group in the top bar and every section filters to your stores.</p>
<div class="stats">
  <div class="stat"><b>${rows.length}</b><span>Stores</span></div>
  <div class="stat"><b>${avg}</b><span>Average Google rating (${esc(latestLabel)})</span></div>
  <div class="stat"><b>${competitors.length}</b><span>Competitor locations within ${radius} miles of a store</span></div>
  <div class="stat"><b>${rows.filter((r) => r.comps === 0).length}</b><span>Stores with no competitor nearby</span></div>
</div>
<div class="cards">
  <a class="card" href="/private/competitor-map/"><h3>Competitor map</h3><p>Every store with ${BRANDS} locations inside its ${radius}-mile trade area. Filter by group, search by store, click a pin for ratings.</p><span class="tag">Competitors ${esc(compDate)}</span></a>
  <a class="card" href="/private/quadrants/"><h3>Rating quadrants</h3><p>Our rating against the nearby competitor average. Strongholds, battlegrounds, open field and at-risk stores, with adjustable cut lines and a sortable list.</p><span class="tag">Ours ${esc(latestLabel)}, competitors ${esc(compDate)}</span></a>
  <a class="card" href="/private/ratings/"><h3>Ratings over time</h3><p>How each store's Google rating and review count move snapshot to snapshot. Grows a trend line as monthly refreshes accumulate.</p><span class="tag">2 snapshots</span></a>
</div>
<h2>Coming next</h2>
<p class="muted">Monthly automatic rating refresh for stores and competitors. Campaign results from Google Analytics and Google Ads.</p>
<p class="foot">Questions or new sections: david.perez@neptuneventures.co</p>`;
  return page('Owner dashboard', body, 'home');
}

/* ---------- write ---------- */
fs.copyFileSync(path.join(MAP, 'dist/index.html'), path.join(OUT, 'competitor-map/index.html'));
write('index.html', homePage());
write('quadrants/index.html', quadrantsPage());
write('ratings/index.html', ratingsPage());
console.log(`Private dashboard built: ${rows.length} stores, ${competitors.length} competitors, ${rows.filter((r) => r.compAvg !== null).length} plotted in quadrants`);
