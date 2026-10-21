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
.muted{color:var(--muted)}
.rv-commentary p{font-size:15px;line-height:1.6;margin:0 0 12px}.rv-commentary details{margin-top:8px}.rv-commentary summary{cursor:pointer;font-weight:700;margin-bottom:8px}.rv-commentary h4{font-size:15px}.foot{color:var(--muted);font-size:12px;margin:30px 0}
details{margin:10px 0}summary{cursor:pointer;font-weight:700}
.tscroll{overflow-x:auto;-webkit-overflow-scrolling:touch}.tscroll table{min-width:640px}
.q-na{background:#9a9a9a}.alert{background:#fdecea;border:1px solid #f3b9b4;border-radius:10px;padding:10px 14px;margin:12px 0}.alert p{margin:4px 0;font-weight:700;color:#8a1c1c}
.bar{display:inline-block;width:90px;height:8px;background:#eee;border-radius:4px;vertical-align:middle;overflow:hidden}.bar i{display:block;height:100%;background:var(--q-risk)}
.h3{font-size:15px;margin:18px 0 8px}tr.grp td{background:var(--bg);font-weight:700;padding-top:12px}tr.na td{color:var(--muted)}.card-t td small{font-size:11px}
@media (prefers-color-scheme:dark){body.pg-listing{--ink:#ececec;--muted:#b3b3b3;--line:#3a3a3a;--bg:#161616;--white:#222}body.pg-listing .alert{background:#3a1f1f;border-color:#6b2e2e}body.pg-listing .alert p{color:#ffb4ad}body.pg-listing .bar{background:#333}body.pg-listing .q-open{color:#1a1a1a}body.pg-listing .stat b,body.pg-listing h1,body.pg-listing h2{color:var(--ink)}body.pg-listing input{background:#2a2a2a;color:var(--ink);border:1px solid var(--line)}body.pg-listing tr.grp td{background:#2a2a2a}}
@media (max-width:720px){.top nav a{margin-left:12px}th,td{padding:6px}}
`;
// Franchise group filter lives in the top bar on every page. The choice is kept in localStorage (jl_group) and
// passed to the map as ?group=. Pages listen for the 'jl-group' event and read window.JL_GROUP.
const GROUP_COUNT = augStores.reduce((m, s) => { m[s.group] = (m[s.group] || 0) + 1; return m; }, {});
const GROUP_NAV = () => `<label class="gsel">Franchise group <select id="gsel"><option value="">All groups (${augStores.length})</option>${GROUPS.map((g) => `<option value="${esc(g)}">${esc(g)} (${GROUP_COUNT[g]})</option>`).join('')}</select></label>`;
const GROUP_JS = `<script>(function(){var k='jl_group',sel=document.getElementById('gsel'),u=new URLSearchParams(location.search),g=u.get('group');try{if(g!==null)localStorage.setItem(k,g);else g=localStorage.getItem(k)||''}catch(e){g=g||''}
if(![].some.call(sel.options,function(o){return o.value===g}))g='';sel.value=g;window.JL_GROUP=g;
function link(){document.querySelectorAll('a[data-nav]').forEach(function(a){a.href=a.getAttribute('data-nav')+(window.JL_GROUP?'?group='+encodeURIComponent(window.JL_GROUP):'')})}
sel.addEventListener('change',function(){window.JL_GROUP=sel.value;try{localStorage.setItem(k,sel.value)}catch(e){}link();window.dispatchEvent(new Event('jl-group'))});link();if(g)window.dispatchEvent(new Event('jl-group'));})();</script>`;
const page = (title, body, active) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><link rel="icon" type="image/png" sizes="32x32" href="/assets/img/favicon-32.png"><link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/assets/img/favicon-180.png"><title>${esc(title)} | Jiffy Lube Chicagoland dashboard</title><style>${CSS}</style></head>
<body><header class="top"><div class="wrap"><a href="/private/">Jiffy Lube Chicagoland · Owner dashboard</a><nav>
<a data-nav="/private/" href="/private/"${active === 'home' ? ' class="on"' : ''}>Home</a><a data-nav="/private/competitor-map/" href="/private/competitor-map/"${active === 'map' ? ' class="on"' : ''}>Competitor map</a><a data-nav="/private/quadrants/" href="/private/quadrants/"${active === 'quad' ? ' class="on"' : ''}>Rating quadrants</a><a data-nav="/private/ratings/" href="/private/ratings/"${active === 'ratings' ? ' class="on"' : ''}>Ratings over time</a><a data-nav="/private/campaigns/" href="/private/campaigns/"${active === 'camp' ? ' class="on"' : ''}>Campaigns</a><a data-nav="/private/pos/" href="/private/pos/"${active === 'pos' ? ' class="on"' : ''}>Store results</a><a data-nav="/private/reviews/" href="/private/reviews/"${active === 'reviews' ? ' class="on"' : ''}>Reviews</a><a data-nav="/private/listing/" href="/private/listing/"${active === 'listing' ? ' class="on"' : ''}>Listing health</a><a data-nav="/private/fleet/" href="/private/fleet/"${active === 'fleet' ? ' class="on"' : ''}>Fleet</a>
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
<p class="sub">Each dot is one Jiffy Lube store. Left to right: the store's Google rating (${esc(latestLabel)}). Bottom to top: how far the store rates above or below the average of the ${BRANDS} locations within ${radius} miles (${esc(compDate)}). Top right is best: a high rating and a lead over the neighbors.</p>
<div class="stats">
  <div class="stat"><b id="n-strong">0</b><span>Strongholds: high rating and ahead of the neighbors</span></div>
  <div class="stat"><b id="n-battle">0</b><span>Battlegrounds: high rating but the neighbors match or beat it</span></div>
  <div class="stat"><b id="n-open">0</b><span>Open field: lower rating but still ahead of weak neighbors</span></div>
  <div class="stat"><b id="n-risk">0</b><span>At risk: lower rating and behind the neighbors</span></div>
</div>
<div class="panel">
  <div class="ctl">
    <label>Our rating line <select id="tx"><option>4.3</option><option>4.4</option><option selected>4.5</option><option>4.6</option><option>4.7</option></select></label>
    <label>Lead line <select id="ty"><option value="-0.2">-0.2</option><option value="-0.1">-0.1</option><option value="0" selected>0 (even with competitors)</option><option value="0.1">+0.1</option><option value="0.2">+0.2</option></select></label>
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
var W=900,H=560,P={l:56,r:20,t:20,b:52},X0=3.4,X1=5.0,Y0=-1.2,Y1=1.2;
var sx=function(v){return P.l+(v-X0)/(X1-X0)*(W-P.l-P.r)},sy=function(v){return H-P.b-(v-Y0)/(Y1-Y0)*(H-P.t-P.b)};
var Q={strong:['Stronghold','var(--q-strong)'],battle:['Battleground','var(--q-battle)'],open:['Open field','var(--q-open)'],risk:['At risk','var(--q-risk)']};
function lead(d){return d.y==null?null:d.x-d.y} // our rating minus the nearby competitor average
function quad(d,tx,ty){if(d.y==null)return null;var hi=d.x>=tx,ahead=lead(d)>=ty;return hi?(ahead?'strong':'battle'):(ahead?'open':'risk')}
function render(){
  var tx=+document.getElementById('tx').value,ty=+document.getElementById('ty').value,g=window.JL_GROUP||'',q=(document.getElementById('q').value||'').toLowerCase();
  var rows=D.filter(function(d){return d.y!=null&&(!g||d.g===g)&&(!q||(('#'+d.s+' '+d.a+' '+d.g).toLowerCase().indexOf(q)>=0))});
  var counts={strong:0,battle:0,open:0,risk:0};rows.forEach(function(d){counts[quad(d,tx,ty)]++});
  Object.keys(counts).forEach(function(k){document.getElementById('n-'+k).textContent=counts[k]});
  var s='';
  for(var v=3.4;v<=5.001;v+=0.2){var vv=+v.toFixed(1);s+='<line class="grid" x1="'+sx(vv)+'" x2="'+sx(vv)+'" y1="'+P.t+'" y2="'+(H-P.b)+'"/><text class="lbl" x="'+sx(vv)+'" y="'+(H-P.b+18)+'" text-anchor="middle">'+vv.toFixed(1)+'</text>';}
  for(var g=-1.2;g<=1.201;g+=0.4){var gg=+g.toFixed(1);s+='<line class="grid" y1="'+sy(gg)+'" y2="'+sy(gg)+'" x1="'+P.l+'" x2="'+(W-P.r)+'"/><text class="lbl" x="'+(P.l-8)+'" y="'+(sy(gg)+4)+'" text-anchor="end">'+(gg>0?'+':'')+gg.toFixed(1)+'</text>';}
  s+='<line class="axis" x1="'+P.l+'" x2="'+(W-P.r)+'" y1="'+(H-P.b)+'" y2="'+(H-P.b)+'"/><line class="axis" x1="'+P.l+'" x2="'+P.l+'" y1="'+P.t+'" y2="'+(H-P.b)+'"/>';
  s+='<text class="lbl" x="'+((P.l+W-P.r)/2)+'" y="'+(H-10)+'" text-anchor="middle">Our Google rating →</text><text class="lbl" transform="translate(14 '+((P.t+H-P.b)/2)+') rotate(-90)" text-anchor="middle">Our lead over nearby competitors →</text>';
  s+='<line x1="'+sx(tx)+'" x2="'+sx(tx)+'" y1="'+P.t+'" y2="'+(H-P.b)+'" stroke="#700000" stroke-dasharray="4 4"/><line y1="'+sy(ty)+'" y2="'+sy(ty)+'" x1="'+P.l+'" x2="'+(W-P.r)+'" stroke="#700000" stroke-dasharray="4 4"/>';
  s+='<text class="qlbl" x="'+(P.l+10)+'" y="'+(P.t+16)+'">Open field</text><text class="qlbl" x="'+(W-P.r-10)+'" y="'+(P.t+16)+'" text-anchor="end">Stronghold</text><text class="qlbl" x="'+(P.l+10)+'" y="'+(H-P.b-10)+'">At risk</text><text class="qlbl" x="'+(W-P.r-10)+'" y="'+(H-P.b-10)+'" text-anchor="end">Battleground</text>';
  // deterministic jitter so stores with identical ratings don't stack exactly
  rows.forEach(function(d,i){var q=quad(d,tx,ty),h=0;for(var k=0;k<String(d.s).length;k++)h=(h*31+String(d.s).charCodeAt(k))%997;var jx=((h%7)-3)*1.6,jy=(((h/7|0)%7)-3)*1.6;var r=5+Math.min(d.c,6)*1.1;
    s+='<circle class="pt" data-i="'+D.indexOf(d)+'" cx="'+(sx(d.x)+jx)+'" cy="'+(sy(Math.max(Y0,Math.min(Y1,lead(d))))+jy)+'" r="'+r+'" fill="'+Q[q][1]+'" fill-opacity=".85"/>'});
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
/* ---------- rating history: data/history/*.json in the map project ---------- */
const HIST = (() => {
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
  return { dates, brands: Object.keys(brandLabel), brandLabel, brandColor, entities: [...ent.values()] };
})();

function ratingsPage() {
  const { dates } = HIST;
  const brandLabel = HIST.brandLabel;
  const data = JSON.stringify(HIST);
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
  var W=900,H=420,P={l:56,r:80,t:16,b:44}; // room on the right for the end-of-line value labels
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
  const { dates } = HIST;
  const data = JSON.stringify({ dates, brandLabel: HIST.brandLabel, brandColor: HIST.brandColor, entities: HIST.entities.map((e) => ({ b: e.brand, g: e.groups, s: e.series })) });
  const body = `
<h1>Owner dashboard</h1>
<p class="sub">Private reporting for Jiffy Lube Chicagoland owners and the marketing team. Not linked from the public site. Pick your franchise group in the top bar and every section filters to your stores. Arrows compare the latest snapshot (<span id="h-latest"></span>) with the one before (<span id="h-prev"></span>).</p>
<div class="stats" id="h-stats"></div>
<h2>Average Google rating by brand</h2>
<div class="stats" id="h-brands"></div>
<div class="cards">
  <a class="card" href="/private/competitor-map/" data-nav="/private/competitor-map/"><h3>Competitor map</h3><p>Every store with ${BRANDS} locations inside its ${radius}-mile trade area. Search by store, click a pin for ratings.</p><span class="tag">Competitors ${esc(compDate)}</span></a>
  <a class="card" href="/private/quadrants/" data-nav="/private/quadrants/"><h3>Rating quadrants</h3><p>Our rating against the nearby competitor average. Strongholds, battlegrounds, open field and at-risk stores, with adjustable cut lines and a sortable list.</p><span class="tag">Ours ${esc(latestLabel)}, competitors ${esc(compDate)}</span></a>
  <a class="card" href="/private/ratings/" data-nav="/private/ratings/"><h3>Ratings over time</h3><p>Average rating and review totals by brand over time, with every store and every competitor listed snapshot by snapshot. Refreshed automatically on the 1st of each month.</p><span class="tag">${dates.length} snapshot${dates.length === 1 ? '' : 's'}</span></a>
</div>
<div class="cards"><a class="card" href="/private/reviews/" data-nav="/private/reviews/"><h3>Reviews</h3><p>Google review themes, ratings trend, response rates and review velocity, by store, by owner group, and for the competitors in each trade area.</p><span class="tag">Google reviews</span></a><a class="card" href="/private/campaigns/" data-nav="/private/campaigns/"><h3>Campaigns</h3><p>Website visits, conversions and conversion rate, plus Google Ads spend, clicks, cost per conversion and search terms, by campaign, store and campaign key.</p><span class="tag">Google Analytics + Google Ads</span></a><a class="card" href="/private/pos/" data-nav="/private/pos/"><h3>Store results</h3><p>What the registers saw at the JLO Group stores: coupon redemptions by code, store and day, ad spend per redeemed car, first-time versus repeat vehicles, and cars per day at the pilot stores against the prior four weeks.</p><span class="tag">GROW POS extracts</span></a><a class="card" href="/private/listing/" data-nav="/private/listing/"><h3>Listing health</h3><p>How complete each store's Google Business Profile is: website link, category, phone, hours, attributes, photos, rating, review replies. Scored out of 100 with a fix list per store.</p><span class="tag">Google Business Profile</span></a><a class="card" href="/private/fleet/" data-nav="/private/fleet/"><h3>Fleet</h3><p>Prospect call lists for every store: local service businesses that run cars and vans (plumbers, HVAC, pest control, couriers) plus car-and-van carriers from the federal census, and every lead from the QR sign-up form with its status.</p><span class="tag">Google Places + FMCSA census + Fleet Leads sheet</span></a></div>
<h2>Fleet leads</h2>
<div class="cards"><div class="card card--qr"><img src="/assets/fleet/fleet-qr.png" alt="QR code linking to the fleet sign-up form" width="160" height="160" style="float:right;margin:0 0 8px 12px;border:1px solid var(--line);border-radius:8px"><h3>Fleet sign-up QR code</h3><p>One code for every store and lounge. It opens <a href="/fleet/">jiffylubechicagoland.com/fleet/</a>, where the fleet contact fills in their details and the employee picks the store. Leads land in the <a href="https://docs.google.com/spreadsheets/d/1GMEE1CR-waI34QVZgwG7_PrbxsNwyVX-hu6_esnhW3A/edit" rel="noopener" target="_blank">Fleet Leads Google Sheet</a>.</p><p><a href="/assets/fleet/fleet-qr.png" download="jiffy-lube-fleet-qr.png">Download PNG</a> · <a href="/assets/fleet/fleet-qr.svg" download="jiffy-lube-fleet-qr.svg">Download SVG (print)</a></p><span class="tag">Fleet Development: Matt Regan, 708-232-3455</span></div></div>
<p class="foot">Questions or new sections: david.perez@neptuneventures.co</p>
<script>
(function(){
var D=${data},E=D.entities,dates=D.dates,L=dates[dates.length-1],P=dates.length>1?dates[dates.length-2]:null;
document.getElementById('h-latest').textContent=L||'none';document.getElementById('h-prev').textContent=P||'none';
function arrow(d,fmt,goodUp){if(d==null||P==null)return '<span class="muted" style="font-size:13px">no prior snapshot</span>';var up=d>0,down=d<0;var good=goodUp?up:down;var col=up||down?(good?'var(--q-strong)':'var(--q-risk)'):'var(--muted)';var sym=up?'&#9650;':down?'&#9660;':'&#9644;';return '<span style="color:'+col+';font-size:14px;font-weight:700">'+sym+' '+(d>0?'+':'')+fmt(d)+'</span>'}
function stat(big,label,arr){return '<div class="stat"><b>'+big+'</b>'+(arr?'<div>'+arr+'</div>':'')+'<span>'+label+'</span></div>'}
function render(){
  var g=window.JL_GROUP||'';var es=E.filter(function(e){return !g||e.g.indexOf(g)>=0});
  function agg(list,d){var vs=list.map(function(e){return e.s[d]}).filter(function(v){return v&&v.r!=null});return vs.length?{avg:vs.reduce(function(a,v){return a+v.r},0)/vs.length,n:vs.length,rev:vs.reduce(function(a,v){return a+(v.n||0)},0)}:null}
  var ours=es.filter(function(e){return e.b==='jl'}),comps=es.filter(function(e){return e.b!=='jl'});
  var oL=agg(ours,L),oP=P?agg(ours,P):null,cL=agg(comps,L),cP=P?agg(comps,P):null;
  var up=0,down=0;if(P)ours.forEach(function(e){var a=e.s[P],b=e.s[L];if(a&&b&&a.r!=null&&b.r!=null){if(b.r>a.r)up++;else if(b.r<a.r)down++}});
  var h='';
  h+=stat(oL?oL.n:0,'Jiffy Lube stores'+(g?' in '+g:''));
  h+=stat(oL?oL.avg.toFixed(2):'-','Our average Google rating',oL&&oP?arrow(oL.avg-oP.avg,function(d){return d.toFixed(3)},true):null);
  h+=stat(cL?cL.avg.toFixed(2):'-','Competitor average rating ('+(cL?cL.n:0)+' locations)',cL&&cP?arrow(cL.avg-cP.avg,function(d){return d.toFixed(3)},false):null);
  h+=stat(oL?oL.rev.toLocaleString():'-','Our Google reviews',oL&&oP?arrow(oL.rev-oP.rev,function(d){return Math.round(d).toLocaleString()},true):null);
  h+=stat('<span style="color:var(--q-strong)">&#9650; '+up+'</span> <span class="muted" style="font-size:16px">/</span> <span style="color:var(--q-risk)">&#9660; '+down+'</span>','Stores up / down since '+(P||'-'));
  h+=stat(oL&&cL?((oL.avg-cL.avg>0?'+':'')+(oL.avg-cL.avg).toFixed(2)):'-','Our rating minus competitor average',oL&&cL&&oP&&cP?arrow((oL.avg-cL.avg)-(oP.avg-cP.avg),function(d){return d.toFixed(3)},true):null);
  document.getElementById('h-stats').innerHTML=h;
  var b='';Object.keys(D.brandLabel).forEach(function(k){var list=es.filter(function(e){return e.b===k});var l=agg(list,L),p=P?agg(list,P):null;if(!l)return;b+='<div class="stat" style="border-top:4px solid '+D.brandColor[k]+'"><b>'+l.avg.toFixed(2)+'</b><div>'+(p?arrow(l.avg-p.avg,function(d){return d.toFixed(3)},k==='jl'):'<span class="muted" style="font-size:13px">first snapshot</span>')+'</div><span>'+D.brandLabel[k]+' ('+l.n+' location'+(l.n===1?'':'s')+', '+l.rev.toLocaleString()+' reviews)</span></div>'});
  document.getElementById('h-brands').innerHTML=b;
}
window.addEventListener('jl-group',render);render();
})();
</script>`;
  return page('Owner dashboard', body, 'home');
}

/* ---------- campaigns: Google Analytics pull (data/ga/latest.json from scripts/ga-pull.mjs) ---------- */
function campaignsPage() {
  const gaFile = path.join(ROOT, 'data', 'ga', 'latest.json');
  const ga = fs.existsSync(gaFile) ? JSON.parse(fs.readFileSync(gaFile, 'utf8')) : null;
  const slugGroup = Object.fromEntries(siteStores.map((st) => [st.slug, st.group]));
  const slugLabel = Object.fromEntries(siteStores.map((st) => [st.slug, `#${st.id} ${st.city}, ${st.street_name}`]));
  if (!ga) {
    return page('Campaigns', `<h1>Campaigns</h1><p class="sub">Google Analytics data has not been pulled yet. Once the service account has Viewer access to the GA property, run <code>node scripts/ga-pull.mjs</code> and rebuild.</p>`, 'camp');
  }
  // campaign name -> store: "JL Evanston | Core" matches the store whose city (and street word) appear in the name
  const campStore = {};
  const names = new Set([].concat(ga.ads_campaigns || [], ga.ads_daily || []).map((r) => r.sessionGoogleAdsCampaignName).filter(Boolean));
  for (const name of names) {
    const n = name.toLowerCase();
    const hits = siteStores.filter((st) => n.includes(st.city.toLowerCase()));
    const best = hits.length > 1 ? hits.filter((st) => st.street_name.toLowerCase().split(/\s+/).some((w) => w.length > 3 && n.includes(w))) : hits;
    if (best.length === 1) campStore[name] = { slug: best[0].slug, group: best[0].group, label: slugLabel[best[0].slug] };
  }
  const data = JSON.stringify({ ga, slugGroup, slugLabel, campStore });
  const evLabel = { get_coupon: 'Get coupon', copy_code: 'Copy code', wallet_add: 'Add to wallet', call_click: 'Call', get_directions: 'Directions' };
  const body = `
<h1>Campaigns</h1>
<p class="sub">Website traffic and conversions from Google Analytics for the last ${ga.days} days, through yesterday. Pulled ${esc(ga.pulled_at.slice(0, 16).replace('T', ' '))} UTC. Conversions are the five key events: get coupon, copy code, add to wallet, call, directions. Conversion rate is the share of sessions with at least one key event (one visit that taps Get coupon, adds to wallet and gets directions counts once, not three times). <b>Only visits from ${(ga.regions || ['Illinois', 'Indiana', 'Wisconsin']).join(', ')} count</b>; Google Ads spend, clicks and impressions are whole, since cost cannot be split by state. Excluded so far: ${(ga.out_of_region || []).reduce((t, r) => t + r.sessions, 0)} visits and ${(ga.out_of_region || []).reduce((t, r) => t + r.keyEvents, 0)} key events from other states, mostly our own testing${(ga.out_of_region || []).length ? ' (' + ga.out_of_region.slice(0, 4).map((r) => esc(r.region) + ' ' + r.keyEvents).join(', ') + ')' : ''}.</p>
<div class="ctl"><label>Range <select id="crange"><option value="7">Last 7 days</option><option value="28" selected>Last 28 days</option><option value="${ga.days}">Last ${ga.days} days</option></select></label><span class="muted" id="cnote"></span></div>
<div class="stats" id="c-stats"></div>
<div class="panel"><div class="ctl"><label>Chart <select id="cmetric"><option value="sessions">Sessions</option><option value="totalUsers">Users</option><option value="screenPageViews">Page views</option><option value="keyEvents" selected>Key events</option><option value="convRate">Conversion rate</option><option value="engagedSessions">Engaged sessions</option></select></label><label><input type="checkbox" id="cboth" checked> also show sessions</label></div><div class="legend" id="c-legend"></div><div style="position:relative"><svg class="plot" id="cplot" viewBox="0 0 900 360" role="img" aria-label="Daily chart"></svg><div class="tip" id="ctip"></div></div></div>
<h2>Google Ads</h2>
<p class="sub muted" id="a-note"></p>
<p class="sub">Redemptions at the register, ad spend per redeemed car and cars per day are on <a href="/private/pos/" data-nav="/private/pos/">Store results</a>.</p>
<div class="stats" id="a-stats"></div>
<div class="panel"><div class="ctl"><label>Chart <select id="ametric"><option value="s" selected>Spend</option><option value="c">Clicks</option><option value="i">Impressions</option><option value="v">Converting sessions</option><option value="k">Key events</option><option value="cpc">Cost per click</option><option value="cpv">Cost per converting session</option><option value="cpk">Cost per key event</option><option value="ctr">Click-through rate</option></select></label></div><div class="legend" id="a-legend"></div><div style="position:relative"><svg class="plot" id="aplot" viewBox="0 0 900 300" role="img" aria-label="Google Ads daily chart"></svg><div class="tip" id="atip"></div></div></div>
<div class="panel" style="overflow:auto"><table id="a-camp"><thead><tr><th>Campaign</th><th>Store</th><th class="num">Impr.</th><th class="num">Clicks</th><th class="num">CTR</th><th class="num">Spend</th><th class="num">CPC</th><th class="num">Sessions</th><th class="num">Converting sessions</th><th class="num">Conv. rate</th><th class="num">Cost / converting session</th><th class="num">Key events</th><th class="num">Cost / key event</th></tr></thead><tbody></tbody></table></div>
<h3 style="font-size:16px;margin:20px 0 8px">What people searched, and what to do about it</h3>
<p class="sub muted">Every search term that triggered an ad in the whole pull period, with a suggested action. <b>By campaign</b> lists a term once per store campaign; <b>Rolled up</b> adds the same term across campaigns, so a term that spends a little everywhere with no conversions, or converts once in each of several stores, shows its true weight. <b>Add as exact</b>: converted and is not yet a keyword. <b>Consider negative</b>: spent with no conversion, or looks like research, dealer, equipment or job intent. <b>Lower bid</b>: an existing keyword spending without a conversion yet. <b>Working</b>: converting on a keyword we already have. <b>Watch</b>: too little data. Brand, oil-change and competitor terms are never flagged negative. Suggestions are rules, not decisions; the ad group is known only for terms that produced a visit.</p>
<div class="stats" id="q-stats"></div>
<div class="panel"><div class="ctl"><label>View <select id="qview"><option value="camp">By campaign</option><option value="roll">Rolled up across campaigns</option></select></label><label>Show <select id="qflag"><option value="">All terms</option><option value="add">Add as exact</option><option value="neg">Consider negative</option><option value="low">Lower bid</option><option value="ok">Working</option><option value="watch">Watch</option></select></label><label>Find <input id="qfind" type="search" placeholder="term, campaign, ad group"></label></div>
<div style="overflow:auto"><table id="a-q"><thead><tr><th>Search term</th><th>Suggestion</th><th>Campaign</th><th>Ad group</th><th class="num">Impr.</th><th class="num">Clicks</th><th class="num">Spend</th><th class="num">Sessions</th><th class="num">Key events</th><th class="num">Cost / key event</th><th>Already a keyword</th></tr></thead><tbody></tbody></table></div></div>
<h2>Conversions by action</h2>
<div class="stats" id="c-events"></div>
<h2>Where visitors came from</h2>
<div class="panel" style="overflow:auto"><table id="c-src"><thead><tr><th>Source / medium</th><th class="num">Sessions</th><th class="num">Users</th><th class="num">Key events</th><th class="num">Conv. rate</th></tr></thead><tbody></tbody></table></div>
<h2>Google Ads campaigns</h2>
<div class="panel" style="overflow:auto"><table id="c-camp"><thead><tr><th>Campaign</th><th>Source</th><th class="num">Sessions</th><th class="num">Users</th><th class="num">Converting sessions</th><th class="num">Conv. rate</th><th class="num">Get coupon</th><th class="num">Wallet</th><th class="num">Call</th><th class="num">Directions</th><th class="num">Copy code</th><th class="num">Key events</th></tr></thead><tbody></tbody></table></div>
<h2>Conversions by store</h2>
<p class="sub muted" id="c-store-note"></p>
<div class="panel" style="overflow:auto"><table id="c-store"><thead><tr><th>Store</th><th>Group</th><th class="num">Get coupon</th><th class="num">Copy code</th><th class="num">Wallet</th><th class="num">Call</th><th class="num">Directions</th><th class="num">Total</th></tr></thead><tbody></tbody></table></div>
<h2>Conversions by campaign key (the jl= link parameter)</h2>
<div class="panel" style="overflow:auto"><table id="c-key"><thead><tr><th>Campaign key</th><th class="num">Get coupon</th><th class="num">Copy code</th><th class="num">Wallet</th><th class="num">Call</th><th class="num">Directions</th><th class="num">Total</th></tr></thead><tbody></tbody></table></div>
<h2>Top pages</h2>
<div class="panel" style="overflow:auto"><table id="c-pages"><thead><tr><th>Page</th><th class="num">Views</th><th class="num">Sessions</th><th class="num">Key events</th></tr></thead><tbody></tbody></table></div>
<p class="foot">The store and campaign-key tables need the custom dimensions "store" and "campaign_key" registered in GA (Admin, Custom definitions). Until then they stay empty. The franchise group picker filters the by-store table; the other numbers are site-wide because GA does not tag sessions with a group.</p>
<script>
(function(){
var X=${data},ga=X.ga,EV=${JSON.stringify(evLabel)},KE=ga.key_events;
var sel=document.getElementById('crange');
function cut(n){var ds=ga.daily.map(function(d){return d.date}).sort();return ds.slice(-n)}
function pct(a,b){return b?(100*a/b).toFixed(1)+'%':'-'}
function n(v){return (v||0).toLocaleString()}
function render(){
  var N=+sel.value,days=cut(N),dset={};days.forEach(function(d){dset[d]=1});
  var D=ga.daily.filter(function(d){return dset[d.date]});
  var CV=D.reduce(function(a,d){return a+(d.sessionKeyEventRate!=null?d.sessionKeyEventRate*d.sessions:Math.min(d.sessions,d.keyEvents))},0);var S=D.reduce(function(a,d){return a+d.sessions},0),U=D.reduce(function(a,d){return a+d.totalUsers},0),K=D.reduce(function(a,d){return a+d.keyEvents},0),E=D.reduce(function(a,d){return a+d.engagedSessions},0),V=D.reduce(function(a,d){return a+d.screenPageViews},0);
  var prevDays=ga.daily.map(function(d){return d.date}).sort().slice(-2*N,-N),pset={};prevDays.forEach(function(d){pset[d]=1});var P=ga.daily.filter(function(d){return pset[d.date]});
  var pS=P.reduce(function(a,d){return a+d.sessions},0),pK=P.reduce(function(a,d){return a+d.keyEvents},0),pCV=P.reduce(function(a,d){return a+(d.sessionKeyEventRate!=null?d.sessionKeyEventRate*d.sessions:Math.min(d.sessions,d.keyEvents))},0);
  function arrow(cur,prev,fmt){if(!prevDays.length||prevDays.length<N)return '';var d=cur-prev;var col=d>0?'var(--q-strong)':d<0?'var(--q-risk)':'var(--muted)';return '<div><span style="color:'+col+';font-size:13px;font-weight:700">'+(d>0?'&#9650; +':d<0?'&#9660; ':'&#9644; ')+fmt(d)+' vs prior '+N+' days</span></div>'}
  var st='';var stat=function(b,l,a){return '<div class="stat"><b>'+b+'</b>'+(a||'')+'<span>'+l+'</span></div>'};var td=function(v,num){return '<td'+(num?' class="num"':'')+'>'+v+'</td>'};
  st+=stat(n(S),'Sessions (visits)',arrow(S,pS,n));st+=stat(n(U),'Users');st+=stat(n(V),'Page views');
  st+=stat(n(Math.round(CV)),'Sessions with a conversion',arrow(Math.round(CV),Math.round(pCV),n));st+=stat(pct(CV,S),'Conversion rate',arrow(S?CV/S:0,pS?pCV/pS:0,function(d){return (100*d).toFixed(1)+' pts'}));st+=stat(n(K),'Key events (all actions)',arrow(K,pK,n));st+=stat(pct(E,S),'Engaged sessions');
  document.getElementById('c-stats').innerHTML=st;
  document.getElementById('cnote').textContent=days.length?days[0].replace(/(\\d{4})(\\d{2})(\\d{2})/,'$1-$2-$3')+' to '+days[days.length-1].replace(/(\\d{4})(\\d{2})(\\d{2})/,'$1-$2-$3'):'';
  // chart: one chosen metric per day (one axis), with sessions as an optional second line when the units match
  var M=document.getElementById('cmetric').value,ML={sessions:'Sessions',totalUsers:'Users',screenPageViews:'Page views',keyEvents:'Key events',convRate:'Conversion rate',engagedSessions:'Engaged sessions'};
  var val=function(d){return M==='convRate'?(d.sessionKeyEventRate!=null?100*d.sessionKeyEventRate:(d.sessions?100*Math.min(d.sessions,d.keyEvents)/d.sessions:0)):d[M]};
  var fmtv=function(v){return M==='convRate'?v.toFixed(1)+'%':Math.round(v).toLocaleString()};
  var both=document.getElementById('cboth').checked&&M!=='convRate'&&M!=='sessions';
  var svg=document.getElementById('cplot'),W=900,H=360,Pd={l:56,r:20,t:16,b:40};var mx=Math.max(1,Math.max.apply(null,D.map(function(d){return Math.max(val(d),both?d.sessions:0)})));
  var sx=function(i){return D.length===1?(Pd.l+W-Pd.r)/2:Pd.l+i/(D.length-1)*(W-Pd.l-Pd.r)},sy=function(v){return H-Pd.b-v/mx*(H-Pd.t-Pd.b)};
  var s='';for(var k=0;k<=4;k++){var v=mx*k/4;s+='<line class="grid" x1="'+Pd.l+'" x2="'+(W-Pd.r)+'" y1="'+sy(v)+'" y2="'+sy(v)+'"/><text class="lbl" x="'+(Pd.l-8)+'" y="'+(sy(v)+4)+'" text-anchor="end">'+Math.round(v)+'</text>'}
  var step=Math.max(1,Math.ceil(D.length/10));D.forEach(function(d,i){if(i%step===0||i===D.length-1)s+='<text class="lbl" x="'+sx(i)+'" y="'+(H-Pd.b+18)+'" text-anchor="middle">'+d.date.slice(4,6)+'/'+d.date.slice(6)+'</text>'});
  s+='<line class="axis" x1="'+Pd.l+'" x2="'+(W-Pd.r)+'" y1="'+(H-Pd.b)+'" y2="'+(H-Pd.b)+'"/>';
  var series=[[M,'#008300',val]];if(both)series.unshift(['sessions','#2a78d6',function(d){return d.sessions}]);
  series.forEach(function(sr){var p='';D.forEach(function(d,i){p+=(p?' L':'M')+sx(i)+' '+sy(sr[2](d))});s+='<path d="'+p+'" fill="none" stroke="'+sr[1]+'" stroke-width="2.5"/>';D.forEach(function(d,i){s+='<circle class="pt" data-i="'+i+'" data-k="'+sr[0]+'" cx="'+sx(i)+'" cy="'+sy(sr[2](d))+'" r="5" fill="'+sr[1]+'"/>'})});
  svg.innerHTML=s;svg._D=D;svg._M=M;svg._fmt=fmtv;svg._val=val;
  document.getElementById('c-legend').innerHTML=(both?'<span><i style="background:#2a78d6"></i>Sessions</span>':'')+'<span><i style="background:#008300"></i>'+ML[M]+'</span>';
  // Google Ads
  (function(){
    var g=window.JL_GROUP||'',CS=X.campStore||{};var inG=function(name){return !g||(CS[name]&&CS[name].group===g)};
    var money=function(v){return '$'+(v||0).toFixed(2)};
    var ad=(ga.ads_daily||[]).filter(function(r){return dset[r.date]&&inG(r.sessionGoogleAdsCampaignName)});
    var cvOf=function(r){return r.sessionKeyEventRate!=null?r.sessionKeyEventRate*r.sessions:Math.min(r.sessions,r.keyEvents)};var byDay={};ad.forEach(function(r){var d=byDay[r.date]=byDay[r.date]||{c:0,s:0,i:0,k:0,v:0};d.c+=r.advertiserAdClicks;d.s+=r.advertiserAdCost;d.i+=r.advertiserAdImpressions;d.k+=r.keyEvents;d.v+=cvOf(r)});
    var AD=days.map(function(d){return Object.assign({date:d},byDay[d]||{c:0,s:0,i:0,k:0,v:0})});
    var T=AD.reduce(function(a,d){a.c+=d.c;a.s+=d.s;a.i+=d.i;a.k+=d.k;a.v+=d.v;return a},{c:0,s:0,i:0,k:0,v:0});
    var pad=(ga.ads_daily||[]).filter(function(r){return pset[r.date]&&inG(r.sessionGoogleAdsCampaignName)}).reduce(function(a,r){a.c+=r.advertiserAdClicks;a.s+=r.advertiserAdCost;a.k+=r.keyEvents;return a},{c:0,s:0,k:0});
    var h='';h+=stat(money(T.s),'Spend',arrow(T.s,pad.s,function(d){return money(Math.abs(d))}));h+=stat(n(T.c),'Clicks',arrow(T.c,pad.c,n));h+=stat(n(T.i),'Impressions');
    h+=stat(T.i?(100*T.c/T.i).toFixed(1)+'%':'-','Click-through rate');h+=stat(T.c?money(T.s/T.c):'-','Cost per click');h+=stat(n(Math.round(T.v)),'Converting sessions from ads');h+=stat(T.v?money(T.s/T.v):'-','Cost per converting session');h+=stat(n(T.k),'Key events from ads',arrow(T.k,pad.k,n));h+=stat(T.k?money(T.s/T.k):'-','Cost per key event');
    document.getElementById('a-stats').innerHTML=h;
    var esc=function(v){return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')};
    var adGroups=[];Object.keys(CS).forEach(function(k){if(CS[k].group&&adGroups.indexOf(CS[k].group)<0)adGroups.push(CS[k].group)});
    var noAds=g&&!(ga.ads_daily||[]).some(function(r){return inG(r.sessionGoogleAdsCampaignName)});
    document.getElementById('a-note').innerHTML=noAds?'<b>No Google Ads are running for '+esc(g)+' stores yet.</b> Ads currently run for '+esc(adGroups.join(', ')||'no group')+' stores. Switch the franchise group in the top bar to "All groups" to see them.':esc((g?'Campaigns for '+g+' stores. ':'All campaigns. ')+'Spend, clicks and impressions come from the Google Ads account through its link to Analytics; key events are the conversions those visits produced on the site.');
    var AM=document.getElementById('ametric').value,AL={s:'Spend',c:'Clicks',i:'Impressions',v:'Converting sessions',k:'Key events',cpc:'Cost per click',cpv:'Cost per converting session',cpk:'Cost per key event',ctr:'Click-through rate'};
    var aval=function(d){return AM==='cpc'?(d.c?d.s/d.c:0):AM==='cpv'?(d.v?d.s/d.v:0):AM==='cpk'?(d.k?d.s/d.k:0):AM==='ctr'?(d.i?100*d.c/d.i:0):d[AM]};
    var afmt=function(v){return AM==='s'||AM==='cpc'||AM==='cpv'||AM==='cpk'?'$'+v.toFixed(2):AM==='ctr'?v.toFixed(1)+'%':Math.round(v).toLocaleString()};
    var svg=document.getElementById('aplot'),W=900,H=300,Pd={l:64,r:20,t:16,b:40};var mv=Math.max(0.01,Math.max.apply(null,AD.map(aval)));
    var sx=function(i){return AD.length===1?(Pd.l+W-Pd.r)/2:Pd.l+i/(AD.length-1)*(W-Pd.l-Pd.r)},syv=function(v){return H-Pd.b-v/mv*(H-Pd.t-Pd.b)};
    var s='';for(var k=0;k<=4;k++){s+='<line class="grid" x1="'+Pd.l+'" x2="'+(W-Pd.r)+'" y1="'+syv(mv*k/4)+'" y2="'+syv(mv*k/4)+'"/><text class="lbl" x="'+(Pd.l-8)+'" y="'+(syv(mv*k/4)+4)+'" text-anchor="end">'+afmt(mv*k/4)+'</text>'}
    var step=Math.max(1,Math.ceil(AD.length/10));AD.forEach(function(d,i){if(i%step===0||i===AD.length-1)s+='<text class="lbl" x="'+sx(i)+'" y="'+(H-Pd.b+18)+'" text-anchor="middle">'+d.date.slice(4,6)+'/'+d.date.slice(6)+'</text>'});
    s+='<line class="axis" x1="'+Pd.l+'" x2="'+(W-Pd.r)+'" y1="'+(H-Pd.b)+'" y2="'+(H-Pd.b)+'"/>';
    var bw=Math.max(4,(W-Pd.l-Pd.r)/Math.max(AD.length,1)*0.5);AD.forEach(function(d,i){var v=aval(d);s+='<rect class="pt" data-i="'+i+'" x="'+(sx(i)-bw/2)+'" y="'+syv(v)+'" width="'+bw+'" height="'+Math.max(0,H-Pd.b-syv(v))+'" rx="3" fill="#eda100" fill-opacity=".85"/>'});
    svg.innerHTML=s;svg._AD=AD;svg._afmt=afmt;svg._aval=aval;
    document.getElementById('a-legend').innerHTML='<span><i style="background:#eda100"></i>'+AL[AM]+' per day</span>';
    var camps=(ga.ads_campaigns||[]).filter(function(r){return inG(r.sessionGoogleAdsCampaignName)});
    document.querySelector('#a-camp tbody').innerHTML=camps.map(function(r){var cs=CS[r.sessionGoogleAdsCampaignName];return '<tr>'+td(r.sessionGoogleAdsCampaignName)+td(cs?cs.label:'<span class="muted">-</span>')+td(n(r.advertiserAdImpressions),1)+td(n(r.advertiserAdClicks),1)+td(r.advertiserAdImpressions?(100*r.advertiserAdClicks/r.advertiserAdImpressions).toFixed(1)+'%':'-',1)+td(money(r.advertiserAdCost),1)+td(r.advertiserAdClicks?money(r.advertiserAdCost/r.advertiserAdClicks):'-',1)+td(n(r.sessions),1)+td(n(Math.round(cvOf(r))),1)+td(pct(cvOf(r),r.sessions),1)+td(cvOf(r)?money(r.advertiserAdCost/cvOf(r)):'-',1)+td(n(r.keyEvents),1)+td(r.keyEvents?money(r.advertiserAdCost/r.keyEvents):'-',1)+'</tr>'}).join('')||'<tr><td colspan="13" class="muted">No ad data in this period.</td></tr>';
    // search terms with a suggested action (whole pull period, not the date range: GA reports them as totals)
    var AG={};(ga.ads_query_adgroups||[]).forEach(function(r){AG[r.sessionGoogleAdsQuery+'|'+r.sessionGoogleAdsCampaignName]=r.sessionGoogleAdsAdGroupName});
    var KW={};(ga.ads_keywords||[]).forEach(function(r){var k=(r.sessionGoogleAdsKeyword||'').toLowerCase().replace(/^[\[\"+]|[\]\"]$/g,'');if(k&&k!=='(not set)')KW[k+'|'+r.sessionGoogleAdsCampaignName]=1});
    var NEG=/\b(dealer|dealership|toyota|honda|ford|chevy|chevrolet|nissan|hyundai|kia|subaru|mazda|lexus|bmw|mercedes|audi|vw|volkswagen|how much|how often|how can|how do|how to|average price|at home|diy|gas station|\bgas\b|pump|semi|diesel|truck|groupon|job|jobs|hiring|salary|career|franchise|corporate|headquarters|lawsuit|complaint)\b/i;
    function flag(r){var k=(r.sessionGoogleAdsQuery||'').toLowerCase(),isKw=r._kw!==undefined?r._kw:!!KW[k+'|'+r.sessionGoogleAdsCampaignName],isBrand=/jiffy/.test(k),isCore=/oil change|cambios? de aceite|take ?5|take five|valvoline|strickland|firestone/.test(k);var conv=r.keyEvents||0,clk=r.advertiserAdClicks||0,cost=r.advertiserAdCost||0;
      if(NEG.test(k)&&conv===0&&!isBrand)return {f:'neg',t:'Consider negative',why:'matches a research, dealer, equipment or job pattern and has not converted'};
      if(conv>0&&!isKw)return {f:'add',t:'Add as exact',why:conv+' key event'+(conv===1?'':'s')+' and not yet a keyword in this campaign'};
      if(conv>0)return {f:'ok',t:'Working',why:'converting on an existing keyword'};
      if((isKw||isCore)&&(clk>=2||cost>=10))return {f:'low',t:'Lower bid',why:(isKw?'an existing keyword':'core oil-change or competitor intent')+': '+clk+' click'+(clk===1?'':'s')+', '+money(cost)+', no conversion yet. Trim the bid rather than block it'};
      if(isBrand||isCore)return {f:'watch',t:'Watch',why:isBrand?'brand term, never a negative':'core intent, never a negative'};
      if(clk>=2||cost>=10)return {f:'neg',t:'Consider negative',why:clk+' click'+(clk===1?'':'s')+', '+money(cost)+', no conversion yet'};
      return {f:'watch',t:'Watch',why:'one click or less, nothing to judge yet'}}
    var FC={add:'q-strong',neg:'q-risk',ok:'q-battle',low:'q-open',watch:'q-open'};
    var qsel=document.getElementById('qflag'),qfind=document.getElementById('qfind'),qview=document.getElementById('qview');var QS={col:null,dir:-1};
    function rollQ(rows){var m={};rows.forEach(function(r){var k=(r.sessionGoogleAdsQuery||'').toLowerCase();var o=m[k]=m[k]||{sessionGoogleAdsQuery:r.sessionGoogleAdsQuery,sessionGoogleAdsCampaignName:'',_camps:[],_kwIn:0,advertiserAdImpressions:0,advertiserAdClicks:0,advertiserAdCost:0,sessions:0,keyEvents:0,_ags:{}};o._camps.push(r.sessionGoogleAdsCampaignName);if(KW[k+'|'+r.sessionGoogleAdsCampaignName])o._kwIn++;['advertiserAdImpressions','advertiserAdClicks','advertiserAdCost','sessions','keyEvents'].forEach(function(f){o[f]+=r[f]||0});var ag=AG[r.sessionGoogleAdsQuery+'|'+r.sessionGoogleAdsCampaignName];if(ag)o._ags[ag]=1});
      return Object.keys(m).map(function(k){var o=m[k];o._kw=o._kwIn>0;o.sessionGoogleAdsCampaignName=o._camps.length+' campaign'+(o._camps.length===1?'':'s');o._ag=Object.keys(o._ags).join(', ');o._f=flag(o);return o})}
    function renderQ(){var roll=qview.value==='roll';var raw=(ga.ads_queries||[]).filter(function(r){return inG(r.sessionGoogleAdsCampaignName)&&r.sessionGoogleAdsQuery&&r.sessionGoogleAdsQuery!=='(not set)'});var all=roll?rollQ(raw):raw.map(function(r){r._f=flag(r);r._ag=AG[r.sessionGoogleAdsQuery+'|'+r.sessionGoogleAdsCampaignName]||'';return r});
      document.querySelector('#a-q thead').innerHTML='<tr><th>Search term</th><th>Suggestion</th><th>'+(roll?'Campaigns':'Campaign')+'</th><th>Ad group'+(roll?'s':'')+'</th><th class="num">Impr.</th><th class="num">Clicks</th><th class="num">Spend</th><th class="num">Sessions</th><th class="num">Key events</th><th class="num">Cost / key event</th><th>Already a keyword</th></tr>';
      var cnt={add:0,neg:0,ok:0,low:0,watch:0},negCost=0;all.forEach(function(r){cnt[r._f.f]++;if(r._f.f==='neg')negCost+=r.advertiserAdCost||0});
      document.getElementById('q-stats').innerHTML=stat(n(all.length),'search terms seen')+stat(n(cnt.add),'add as exact match')+stat(n(cnt.neg),'consider as negatives')+stat(money(negCost),'spent on terms flagged negative')+stat(n(cnt.ok),'working keywords')+stat(n(cnt.low),'existing keywords to bid down')+stat(n(cnt.watch),'watch');
      var f=qsel.value,t=(qfind.value||'').toLowerCase();var qs=all.filter(function(r){return (!f||r._f.f===f)&&(!t||(r.sessionGoogleAdsQuery+' '+r.sessionGoogleAdsCampaignName+' '+r._ag).toLowerCase().indexOf(t)>=0)});
      var ORD={add:0,neg:1,low:2,ok:3,watch:4};var COL=[function(r){return (r.sessionGoogleAdsQuery||'').toLowerCase()},function(r){return ORD[r._f.f]},function(r){return roll?r._camps.length:(r.sessionGoogleAdsCampaignName||'').toLowerCase()},function(r){return (r._ag||'').toLowerCase()},function(r){return r.advertiserAdImpressions||0},function(r){return r.advertiserAdClicks||0},function(r){return r.advertiserAdCost||0},function(r){return r.sessions||0},function(r){return r.keyEvents||0},function(r){return r.keyEvents?r.advertiserAdCost/r.keyEvents:(QS.dir<0?-1:1e9)},function(r){return roll?(r._kwIn||0):(KW[(r.sessionGoogleAdsQuery||'').toLowerCase()+'|'+r.sessionGoogleAdsCampaignName]?1:0)}];
      if(QS.col==null)qs.sort(function(a,b){return (ORD[a._f.f]-ORD[b._f.f])||(b.advertiserAdCost-a.advertiserAdCost)});
      else{var g=COL[QS.col];qs.sort(function(a,b){var x=g(a),y=g(b);var c=typeof x==='number'&&typeof y==='number'?x-y:String(x).localeCompare(String(y));return (c||(b.advertiserAdCost-a.advertiserAdCost))*(QS.col==null?1:QS.dir)})}
      document.querySelectorAll('#a-q thead th').forEach(function(th,i){th.style.cursor='pointer';th.title='Click to sort';if(i===QS.col)th.innerHTML+=QS.dir>0?' &#9650;':' &#9660;'});
      document.querySelector('#a-q tbody').innerHTML=qs.map(function(r){var k=(r.sessionGoogleAdsQuery||'').toLowerCase();var kw=roll?(r._kwIn?'In '+r._kwIn+' of '+r._camps.length:'<span class="muted">No</span>'):(KW[k+'|'+r.sessionGoogleAdsCampaignName]?'Yes':'<span class="muted">No</span>');return '<tr>'+td(esc(r.sessionGoogleAdsQuery))+td('<span class="q '+FC[r._f.f]+'" title="'+esc(r._f.why)+'">'+r._f.t+'</span>')+td(roll?'<span title="'+esc(r._camps.join(', '))+'">'+esc(r.sessionGoogleAdsCampaignName)+'</span>':esc(r.sessionGoogleAdsCampaignName))+td(r._ag?esc(r._ag):'<span class="muted">no visit</span>')+td(n(r.advertiserAdImpressions),1)+td(n(r.advertiserAdClicks),1)+td(money(r.advertiserAdCost),1)+td(n(r.sessions),1)+td(n(r.keyEvents),1)+td(r.keyEvents?money(r.advertiserAdCost/r.keyEvents):'-',1)+td(kw)+'</tr>'}).join('')||'<tr><td colspan="11" class="muted">No search terms match.</td></tr>';}
    if(!qsel._bound){qsel._bound=true;qsel.addEventListener('change',renderQ);qfind.addEventListener('input',renderQ);qview.addEventListener('change',renderQ);document.querySelector('#a-q thead').addEventListener('click',function(e){var th=e.target.closest('th');if(!th)return;var i=[].indexOf.call(th.parentNode.children,th);if(QS.col===i)QS.dir=-QS.dir;else{QS.col=i;QS.dir=(i<=3&&i!==1)?1:-1}renderQ()})}
    renderQ();
  })();
  // events by action
  var ev={};ga.daily_events.filter(function(r){return dset[r.date]}).forEach(function(r){ev[r.eventName]=(ev[r.eventName]||0)+r.eventCount});
  document.getElementById('c-events').innerHTML=KE.map(function(k){return stat(n(ev[k]),EV[k]||k)}).join('');
  // sources / campaigns / pages are whole-pull (GA aggregates don't split by day here)
  var rows=function(list,cols){return list.map(function(r){return '<tr>'+cols.map(function(c){return c(r)}).join('')+'</tr>'}).join('')||'<tr><td colspan="9" class="muted">No data</td></tr>'};
  document.querySelector('#c-src tbody').innerHTML=rows(ga.sources,[function(r){return td(r.sessionSource+' / '+r.sessionMedium)},function(r){return td(n(r.sessions),1)},function(r){return td(n(r.totalUsers),1)},function(r){return td(n(r.keyEvents),1)},function(r){return td(pct(r.sessionKeyEventRate!=null?r.sessionKeyEventRate*r.sessions:Math.min(r.sessions,r.keyEvents),r.sessions),1)}]);
  var cvR=function(r){return r.sessionKeyEventRate!=null?r.sessionKeyEventRate*r.sessions:Math.min(r.sessions,r.keyEvents)};var CE={};(ga.campaign_events||[]).forEach(function(r){var k=r.sessionCampaignName+'|'+r.sessionSource;CE[k]=CE[k]||{};CE[k][r.eventName]=(CE[k][r.eventName]||0)+r.eventCount});var ce=function(r,e){var x=CE[r.sessionCampaignName+'|'+r.sessionSource];return x?x[e]||0:0};
  document.querySelector('#c-camp tbody').innerHTML=rows(ga.campaigns.filter(function(r){return r.sessionCampaignName&&r.sessionCampaignName.charAt(0)!=='('}),[function(r){return td(r.sessionCampaignName)},function(r){return td(r.sessionSource)},function(r){return td(n(r.sessions),1)},function(r){return td(n(r.totalUsers),1)},function(r){return td(n(Math.round(cvR(r))),1)},function(r){return td(pct(cvR(r),r.sessions),1)},function(r){return td(n(ce(r,'get_coupon')),1)},function(r){return td(n(ce(r,'wallet_add')),1)},function(r){return td(n(ce(r,'call_click')),1)},function(r){return td(n(ce(r,'get_directions')),1)},function(r){return td(n(ce(r,'copy_code')),1)},function(r){return td(n(r.keyEvents),1)}]);
  document.querySelector('#c-pages tbody').innerHTML=rows(ga.pages.slice(0,40),[function(r){return td(r.pagePath)},function(r){return td(n(r.screenPageViews),1)},function(r){return td(n(r.sessions),1)},function(r){return td(n(r.keyEvents),1)}]);
  // by store (group-filtered) and by campaign key
  var g=window.JL_GROUP||'';var bs={};(ga.by_store||[]).forEach(function(r){var slug=r['customEvent:store'];if(!slug||slug==='(not set)')return;if(g&&X.slugGroup[slug]!==g)return;bs[slug]=bs[slug]||{};bs[slug][r.eventName]=(bs[slug][r.eventName]||0)+r.eventCount});
  var bsl=Object.keys(bs).map(function(k){var t=KE.reduce(function(a,e){return a+(bs[k][e]||0)},0);return {k:k,t:t}}).sort(function(a,b){return b.t-a.t});
  document.querySelector('#c-store tbody').innerHTML=rows(bsl,[function(r){return td(X.slugLabel[r.k]||r.k)},function(r){return td(X.slugGroup[r.k]||'')}].concat(KE.map(function(e){return function(r){return td(n(bs[r.k][e]),1)}})).concat([function(r){return td(n(r.t),1)}]));
  document.getElementById('c-store-note').textContent=ga.by_store_error?'Store breakdown unavailable: '+ga.by_store_error:(g?'Showing '+g+' stores only.':'All stores, whole pull period.');
  var bk={};(ga.by_campaign_key||[]).forEach(function(r){var k=r['customEvent:campaign_key'];if(!k||k==='(not set)')return;bk[k]=bk[k]||{};bk[k][r.eventName]=(bk[k][r.eventName]||0)+r.eventCount});
  var bkl=Object.keys(bk).map(function(k){return {k:k,t:KE.reduce(function(a,e){return a+(bk[k][e]||0)},0)}}).sort(function(a,b){return b.t-a.t});
  document.querySelector('#c-key tbody').innerHTML=rows(bkl,[function(r){return td(r.k)}].concat(KE.map(function(e){return function(r){return td(n(bk[r.k][e]),1)}})).concat([function(r){return td(n(r.t),1)}]));
}
var tip=document.getElementById('ctip'),svg=document.getElementById('cplot');
svg.addEventListener('mousemove',function(e){var t=e.target.closest('.pt');if(!t){tip.style.display='none';return}var d=svg._D[+t.getAttribute('data-i')];tip.innerHTML='<b>'+d.date.slice(0,4)+'-'+d.date.slice(4,6)+'-'+d.date.slice(6)+'</b><br>Sessions '+d.sessions+', users '+d.totalUsers+', page views '+d.screenPageViews+'<br>Key events '+d.keyEvents+' ('+pct(d.keyEvents,d.sessions)+'), engaged '+d.engagedSessions;var box=svg.parentNode.getBoundingClientRect();tip.style.display='block';tip.style.left=Math.min(e.clientX-box.left+14,box.width-200)+'px';tip.style.top=(e.clientY-box.top+14)+'px'});
svg.addEventListener('mouseleave',function(){tip.style.display='none'});
var atip=document.getElementById('atip'),asvg=document.getElementById('aplot');
asvg.addEventListener('mousemove',function(e){var t=e.target.closest('.pt');if(!t){atip.style.display='none';return}var d=asvg._AD[+t.getAttribute('data-i')];atip.innerHTML='<b>'+d.date.slice(0,4)+'-'+d.date.slice(4,6)+'-'+d.date.slice(6)+'</b><br>'+d.c+' clicks, '+d.i+' impressions<br>Spend $'+d.s.toFixed(2)+', key events '+d.k+(d.c?', CPC $'+(d.s/d.c).toFixed(2):'')+(d.k?', $'+(d.s/d.k).toFixed(2)+' per key event':'');var box=asvg.parentNode.getBoundingClientRect();atip.style.display='block';atip.style.left=Math.min(e.clientX-box.left+14,box.width-200)+'px';atip.style.top=(e.clientY-box.top+14)+'px'});
asvg.addEventListener('mouseleave',function(){atip.style.display='none'});
// Click any column heading to sort; the choice survives re-renders.
var SORT={};
function parseCell(td){var t=td.textContent.trim().replace(/[$,%]/g,'').replace(/,/g,'');var n=parseFloat(t);return isNaN(n)||!/^[-+]?[0-9.]+$/.test(t)?td.textContent.trim().toLowerCase():n}
function applySort(tbl){var st=SORT[tbl.id];if(!st)return;var tb=tbl.tBodies[0],rows=Array.prototype.slice.call(tb.rows);if(rows.length<2||rows[0].cells.length<=st.col)return;rows.sort(function(a,b){var va=parseCell(a.cells[st.col]),vb=parseCell(b.cells[st.col]);if(typeof va==='number'&&typeof vb==='number')return (va-vb)*st.dir;return String(va).localeCompare(String(vb))*st.dir});rows.forEach(function(r){tb.appendChild(r)});
  Array.prototype.forEach.call(tbl.tHead.rows[0].cells,function(th,i){th.setAttribute('aria-sort',i===st.col?(st.dir>0?'ascending':'descending'):'none');th.style.textDecoration=i===st.col?'underline':''})}
function sortableTables(){Array.prototype.forEach.call(document.querySelectorAll('main table'),function(tbl){if(!tbl.tHead||tbl._sortable)return;tbl._sortable=true;Array.prototype.forEach.call(tbl.tHead.rows[0].cells,function(th,i){th.title='Click to sort';th.addEventListener('click',function(){var st=SORT[tbl.id]||{col:-1,dir:1};var numeric=th.classList.contains('num');SORT[tbl.id]={col:i,dir:st.col===i?-st.dir:(numeric?-1:1)};applySort(tbl)})})});Array.prototype.forEach.call(document.querySelectorAll('main table'),applySort)}
var baseRender=render;render=function(){baseRender();sortableTables()};
sel.addEventListener('change',render);document.getElementById('cmetric').addEventListener('change',render);document.getElementById('cboth').addEventListener('change',render);document.getElementById('ametric').addEventListener('change',render);window.addEventListener('jl-group',render);render();
})();
</script>`;
  return page('Campaigns', body, 'camp');
}

/* ---------- reviews: data/reviews-summary.json from the competitor-map project ---------- */
function reviewsPage() {
  const f = path.join(MAP, 'data', 'reviews-summary.json');
  if (!fs.existsSync(f)) return page('Reviews', `<h1>Reviews</h1><p class="sub">No review data yet. Run scripts/reviews-pull.mjs and scripts/reviews-analyze.mjs in the competitor-map project, then rebuild.</p>`, 'reviews');
  const R = JSON.parse(fs.readFileSync(f, 'utf8'));
  const cf = path.join(MAP, 'data', 'reviews-commentary.json');
  const C = fs.existsSync(cf) ? JSON.parse(fs.readFileSync(cf, 'utf8')) : { overall: [], groups: {}, stores: {}, brands: {} };
  const storeInfo = new Map(augStores.map((st) => [st.store, st]));
  const slugById = Object.fromEntries(siteStores.map((st) => [String(st.id), st.slug]));
  const brandLabel = { jl: 'Jiffy Lube', take5: 'Take 5', valvoline: 'Valvoline', strickland: 'Strickland Brothers', firestone: 'Firestone' };
  const brandColor = { jl: '#c8102e', take5: '#7a3fd1', valvoline: '#1f6fd1', strickland: '#2e9e5b', firestone: '#e07b1a' };
  // slim the location records for the page: keep metrics, themes, months, quotes; add groups a competitor sits near
  const locs = R.locations.map((l) => ({ ...l, slug: l.store ? slugById[String(l.store)] : null, groups: l.kind === 'store' ? [l.group] : [...new Set((l.near_stores || []).map((n) => (storeInfo.get(n.store) || {}).group).filter(Boolean))], near_stores: undefined }));
  const data = JSON.stringify({ themes: R.themes, brandLabel, brandColor, locs, generated: R.generated, cutoff: R.cutoff, source: R.source, commentary: C }).replace(/</g, '\\u003c'); // review text can contain </script> or <!-- which would end the inline script
  const full = R.locations.filter((l) => l.source === 'outscraper').length, sampled = R.locations.length - full;
  const coverage = full && sampled ? `<strong>Partial data:</strong> ${full} locations have full review history since ${esc(R.cutoff || '2025')} (the pilot stores and their nearby competitors); ${sampled} others show only a 5-review sample from Google's API until the full pull runs.` : full ? `All reviews since ${esc(R.cutoff || '')}, refreshed monthly.` : `<strong>Sample data only:</strong> the newest 5 reviews per location from Google's API.`;
  const body = `
<h1>Reviews</h1>
<p class="sub">Google reviews for every Jiffy Lube store and every tracked competitor, tagged by theme. ${coverage} Last analyzed ${esc((R.generated || '').slice(0, 10))}. Negative = 1 to 3 stars. The franchise group picker filters our stores to that group and competitors to those within 3 miles of its stores.</p>
<div class="ctl"><label>Compare with <select id="rvcomp"><option value="">All competitors</option>${Object.keys(brandLabel).filter((b) => b !== 'jl').map((b) => `<option value="${b}">${brandLabel[b]}</option>`).join('')}</select></label><span class="muted" id="rvnote"></span></div>
<div class="stats" id="rv-stats"></div>
<h2>What the reviews say</h2>
<div class="panel rv-commentary" id="rv-commentary"></div>
<h2>What negative reviews are about</h2>
<p class="sub">Share of 1 to 3 star reviews that mention each theme. Ours versus the competitors in the same trade areas. A theme where our bar is longer is a weakness customers keep writing about.</p>
<div class="panel"><div class="legend"><span><i style="background:#c8102e"></i>Jiffy Lube</span><span><i style="background:#5d5d5d"></i>Competitors</span></div><svg class="plot" id="rvthemes" viewBox="0 0 900 340" role="img" aria-label="Negative review themes, ours versus competitors"></svg></div>
<h2>Trend by month</h2>
<div class="panel"><div class="ctl"><label>Chart <select id="rvmetric"><option value="avg">Average star rating</option><option value="n">Reviews per month</option><option value="negpct">Share of negative reviews</option></select></label></div><div class="legend"><span><i style="background:#c8102e"></i>Jiffy Lube</span><span><i style="background:#5d5d5d"></i>Competitors</span></div><div style="position:relative"><svg class="plot" id="rvtrend" viewBox="0 0 900 320" role="img" aria-label="Monthly review trend"></svg><div class="tip" id="rvtip"></div></div></div>
<h2>By owner group</h2>
<p class="sub">Every franchise group side by side. Click a heading to sort. "Top negative theme" is the complaint that appears most in that group's 1 to 3 star reviews.</p>
<div class="panel" style="overflow:auto"><table id="rv-groups"><thead><tr><th>Group</th><th class="num">Stores</th><th class="num">Reviews</th><th class="num">Avg rating</th><th class="num">Last 90 days</th><th class="num">Change</th><th class="num">Negative %</th><th class="num">Reply rate</th><th class="num">Reviews / mo</th><th>Top negative theme</th></tr></thead><tbody></tbody></table></div>
<h2>By store</h2>
<div class="ctl"><label>Find store <input id="rvq" type="search" placeholder="store #, city, street" style="font:inherit;padding:4px 8px;width:220px"></label><span class="muted">Click a store for its themes and example quotes.</span></div>
<div class="panel" style="overflow:auto"><table id="rv-stores"><thead><tr><th>Store</th><th>Group</th><th class="num">Reviews</th><th class="num">Avg rating</th><th class="num">Last 90 days</th><th class="num">Change</th><th class="num">Negative %</th><th class="num">Reply rate</th><th class="num">Reply days</th><th class="num">Reviews / mo</th><th>Top negative theme</th></tr></thead><tbody></tbody></table></div>
<div class="panel" id="rv-detail" hidden></div>
<h2>Competitors</h2>
<div class="panel rv-commentary" id="rv-brandnotes"></div>
<div class="panel" style="overflow:auto"><table id="rv-brands"><thead><tr><th>Brand</th><th class="num">Locations</th><th class="num">Reviews</th><th class="num">Avg rating</th><th class="num">Last 90 days</th><th class="num">Negative %</th><th class="num">Reply rate</th><th class="num">Reviews / mo</th><th>Top negative theme</th></tr></thead><tbody></tbody></table></div>
<div class="ctl"><label>Find competitor <input id="rvcq" type="search" placeholder="brand, address" style="font:inherit;padding:4px 8px;width:220px"></label><span class="muted">Click a row for its themes and quotes.</span></div>
<div class="panel" style="overflow:auto"><table id="rv-comps"><thead><tr><th>Location</th><th>Near groups</th><th class="num">Reviews</th><th class="num">Avg rating</th><th class="num">Last 90 days</th><th class="num">Negative %</th><th class="num">Reply rate</th><th class="num">Reviews / mo</th><th>Top negative theme</th></tr></thead><tbody></tbody></table></div>
<div class="panel" id="rv-cdetail" hidden></div>
<p class="foot">Themes are tagged by keyword rules (wait time, upsell pressure, price surprise, coupon problems, staff attitude, workmanship or damage, honesty and trust, cleanliness, communication); a review can carry several. Reply rate is the share of reviews with an owner response; reply days is the median time to respond. Raw reviews are kept outside the repo.</p>
<script>
(function(){
var D=${data},L=D.locs,TK=Object.keys(D.themes);
var gv=function(){return window.JL_GROUP||''},comp=document.getElementById('rvcomp'),metric=document.getElementById('rvmetric'),q=document.getElementById('rvq'),cq=document.getElementById('rvcq');
var n=function(v){return (v||0).toLocaleString()},f1=function(v){return v==null?'-':v.toFixed(2)},pc=function(v){return v==null?'-':(100*v).toFixed(0)+'%'};
function ours(){var g=gv();return L.filter(function(l){return l.kind==='store'&&(!g||l.group===g)})}
function comps(){var g=gv(),b=comp.value;return L.filter(function(l){return l.kind==='competitor'&&(!g||l.groups.indexOf(g)>=0)&&(!b||l.brand===b)})}
function roll(list){var pulled=0,sum=0,s90=0,n90=0,sp=0,np=0,neg=0,rep=0,vel=0,th={};TK.forEach(function(k){th[k]={neg:0,all:0}});
  list.forEach(function(l){pulled+=l.pulled;sum+=(l.avg_all||0)*l.pulled;if(l.avg_90!=null){s90+=l.avg_90*l.n_90;n90+=l.n_90}if(l.avg_prior_90!=null){sp+=l.avg_prior_90*l.n_prior_90;np+=l.n_prior_90}neg+=Math.round((l.neg_share||0)*l.pulled);rep+=Math.round((l.reply_rate||0)*l.pulled);vel+=l.velocity||0;TK.forEach(function(k){th[k].neg+=l.themes[k].neg;th[k].all+=l.themes[k].all})});
  return {locations:list.length,pulled:pulled,avg:pulled?sum/pulled:null,avg90:n90?s90/n90:null,avgp:np?sp/np:null,neg:pulled?neg/pulled:null,negN:neg,reply:pulled?rep/pulled:null,vel:vel,th:th}}
function topTheme(th,negN){var best=null;TK.forEach(function(k){if(!best||th[k].neg>th[best].neg)best=k});return best&&th[best].neg?D.themes[best]+' ('+(negN?Math.round(100*th[best].neg/negN):0)+'%)':'-'}
function arrow(cur,prev,fmt,goodUp){if(cur==null||prev==null)return '';var d=cur-prev;var col=d>0?(goodUp?'var(--q-strong)':'var(--q-risk)'):d<0?(goodUp?'var(--q-risk)':'var(--q-strong)'):'var(--muted)';return '<div><span style="color:'+col+';font-size:13px;font-weight:700">'+(d>0?'&#9650; +':d<0?'&#9660; ':'&#9644; ')+fmt(d)+' vs prior 90 days</span></div>'}
function stat(b,l,a){return '<div class="stat"><b>'+b+'</b>'+(a||'')+'<span>'+l+'</span></div>'}
function render(){
  var O=roll(ours()),C=roll(comps()),g=gv();
  document.getElementById('rvnote').textContent=(g?'Showing '+g+' stores and competitors within 3 miles of them.':'All stores and all competitors.')+' '+O.pulled.toLocaleString()+' of our reviews, '+C.pulled.toLocaleString()+' competitor reviews.';
  var h='';h+=stat(f1(O.avg),'Our average rating ('+n(O.pulled)+' reviews)');h+=stat(f1(O.avg90),'Our last 90 days',arrow(O.avg90,O.avgp,function(d){return Math.abs(d).toFixed(2)},true));h+=stat(pc(O.neg),'Our negative share');h+=stat(pc(O.reply),'Our reply rate');
  h+=stat(f1(C.avg),'Competitor average ('+n(C.pulled)+' reviews)');h+=stat(f1(C.avg90),'Competitor last 90 days',arrow(C.avg90,C.avgp,function(d){return Math.abs(d).toFixed(2)},false));h+=stat(pc(C.neg),'Competitor negative share');h+=stat(pc(C.reply),'Competitor reply rate');
  document.getElementById('rv-stats').innerHTML=h;
  var CM=D.commentary||{},cm='';
  if(g&&CM.groups&&CM.groups[g]){cm+='<h3 style="margin:0 0 8px">'+g+'</h3><p>'+CM.groups[g]+'</p><details><summary>Co-op wide read</summary>'+(CM.overall||[]).map(function(p){return '<p>'+p+'</p>'}).join('')+'</details>'}
  else{cm+=(CM.overall||[]).map(function(p){return '<p>'+p+'</p>'}).join('');if(CM.groups){cm+='<details><summary>Read on each owner group</summary>'+Object.keys(CM.groups).sort().map(function(k){return '<h4 style="margin:14px 0 4px">'+k+'</h4><p>'+CM.groups[k]+'</p>'}).join('')+'</details>'}}
  cm+='<p class="muted" style="font-size:12px;margin-top:12px">Written '+(CM.written||'')+'. '+(CM.basis||'')+'</p>';
  document.getElementById('rv-commentary').innerHTML=cm;
  var bn='';var bsel=comp.value;Object.keys(CM.brands||{}).forEach(function(b){if(bsel&&b!==bsel)return;bn+='<p><b style="color:'+D.brandColor[b]+'">'+D.brandLabel[b]+'.</b> '+CM.brands[b]+'</p>'});document.getElementById('rv-brandnotes').innerHTML=bn||'<p class="muted">No commentary for this brand yet.</p>';
  // theme bars
  var svg=document.getElementById('rvthemes'),W=900,rowH=34;var keys=TK.slice().sort(function(a,b){return (O.negN?O.th[b].neg/O.negN:0)-(O.negN?O.th[a].neg/O.negN:0)});
  var H=keys.length*rowH+20;svg.setAttribute('viewBox','0 0 '+W+' '+H);var lab=200,bw=W-lab-70,mx=0.01;keys.forEach(function(k){mx=Math.max(mx,O.negN?O.th[k].neg/O.negN:0,C.negN?C.th[k].neg/C.negN:0)});
  var s='';keys.forEach(function(k,i){var y=10+i*rowH,o=O.negN?O.th[k].neg/O.negN:0,c=C.negN?C.th[k].neg/C.negN:0;
    s+='<text class="lbl" x="'+(lab-10)+'" y="'+(y+15)+'" text-anchor="end" style="font-size:13px;fill:#1a1a1a">'+D.themes[k]+'</text>';
    s+='<rect x="'+lab+'" y="'+(y+2)+'" width="'+(bw*o/mx)+'" height="11" rx="3" fill="#c8102e"/><text class="lbl" x="'+(lab+bw*o/mx+6)+'" y="'+(y+12)+'">'+(100*o).toFixed(0)+'%</text>';
    s+='<rect x="'+lab+'" y="'+(y+16)+'" width="'+(bw*c/mx)+'" height="11" rx="3" fill="#5d5d5d"/><text class="lbl" x="'+(lab+bw*c/mx+6)+'" y="'+(y+26)+'">'+(100*c).toFixed(0)+'%</text>'});
  svg.innerHTML=s;
  // trend
  var tm=metric.value,months={};[[ours(),'o'],[comps(),'c']].forEach(function(pair){pair[0].forEach(function(l){Object.keys(l.months).forEach(function(m){months[m]=months[m]||{o:{n:0,sum:0,neg:0},c:{n:0,sum:0,neg:0}};var x=months[m][pair[1]],v=l.months[m];x.n+=v.n;x.sum+=v.avg*v.n;x.neg+=v.neg})})});
  var ms=Object.keys(months).sort().slice(-24);var val=function(x){return !x.n?null:tm==='avg'?x.sum/x.n:tm==='n'?x.n:100*x.neg/x.n};
  var tsvg=document.getElementById('rvtrend'),TW=900,TH=320,TP={l:56,r:20,t:16,b:44};var vals=[];ms.forEach(function(m){['o','c'].forEach(function(k){var v=val(months[m][k]);if(v!=null)vals.push(v)})});
  var y0=tm==='avg'?Math.max(1,Math.floor(Math.min.apply(null,vals.concat([5]))*2)/2-0.5):0,y1=tm==='avg'?5:Math.max(1,Math.max.apply(null,vals.concat([0]))*1.1);
  var sx=function(i){return ms.length===1?(TP.l+TW-TP.r)/2:TP.l+i/(ms.length-1)*(TW-TP.l-TP.r)},sy=function(v){return TH-TP.b-(v-y0)/(y1-y0)*(TH-TP.t-TP.b)};
  var t='';for(var k=0;k<=4;k++){var v=y0+(y1-y0)*k/4;t+='<line class="grid" x1="'+TP.l+'" x2="'+(TW-TP.r)+'" y1="'+sy(v)+'" y2="'+sy(v)+'"/><text class="lbl" x="'+(TP.l-8)+'" y="'+(sy(v)+4)+'" text-anchor="end">'+(tm==='avg'?v.toFixed(2):tm==='n'?Math.round(v):v.toFixed(0)+'%')+'</text>'}
  ms.forEach(function(m,i){if(i%Math.max(1,Math.ceil(ms.length/12))===0||i===ms.length-1)t+='<text class="lbl" x="'+sx(i)+'" y="'+(TH-TP.b+18)+'" text-anchor="middle">'+m+'</text>'});
  t+='<line class="axis" x1="'+TP.l+'" x2="'+(TW-TP.r)+'" y1="'+(TH-TP.b)+'" y2="'+(TH-TP.b)+'"/>';
  [['o','#c8102e'],['c','#5d5d5d']].forEach(function(sr){var p='';ms.forEach(function(m,i){var v=val(months[m][sr[0]]);if(v==null)return;p+=(p?' L':'M')+sx(i)+' '+sy(v)});t+='<path d="'+p+'" fill="none" stroke="'+sr[1]+'" stroke-width="2.5"/>';ms.forEach(function(m,i){var v=val(months[m][sr[0]]);if(v==null)return;t+='<circle class="pt" data-m="'+m+'" data-k="'+sr[0]+'" cx="'+sx(i)+'" cy="'+sy(v)+'" r="5" fill="'+sr[1]+'"/>'})});
  tsvg.innerHTML=t;tsvg._months=months;tsvg._tm=tm;
  // tables
  var td=function(v,num){return '<td'+(num?' class="num"':'')+'>'+v+'</td>'};
  var chg=function(l){if(l.avg_90==null||l.avg_prior_90==null)return '<span class="muted">-</span>';var d=l.avg_90-l.avg_prior_90;return '<span style="color:'+(d>0?'var(--q-strong)':d<0?'var(--q-risk)':'inherit')+'">'+(d>0?'+':'')+d.toFixed(2)+'</span>'};
  var byG={};ours().forEach(function(l){(byG[l.group]=byG[l.group]||[]).push(l)});
  document.querySelector('#rv-groups tbody').innerHTML=Object.keys(byG).sort().map(function(gk){var r=roll(byG[gk]);return '<tr>'+td(gk)+td(r.locations,1)+td(n(r.pulled),1)+td(f1(r.avg),1)+td(f1(r.avg90),1)+td(r.avg90!=null&&r.avgp!=null?((r.avg90-r.avgp>0?'+':'')+(r.avg90-r.avgp).toFixed(2)):'-',1)+td(pc(r.neg),1)+td(pc(r.reply),1)+td(r.vel.toFixed(1),1)+td(topTheme(r.th,r.negN))+'</tr>'}).join('')||'<tr><td colspan="10" class="muted">No data</td></tr>';
  var qs=q.value.toLowerCase();
  document.querySelector('#rv-stores tbody').innerHTML=ours().filter(function(l){return !qs||l.label.toLowerCase().indexOf(qs)>=0}).map(function(l){return '<tr data-id="'+l.id+'" style="cursor:pointer">'+td(l.label.replace('Jiffy Lube ',''))+td(l.group)+td(n(l.pulled)+(l.place_reviews?' <span class="muted">of '+n(l.place_reviews)+'</span>':''),1)+td(f1(l.avg_all),1)+td(f1(l.avg_90),1)+td(chg(l),1)+td(pc(l.neg_share),1)+td(pc(l.reply_rate),1)+td(l.reply_median_days==null?'-':l.reply_median_days,1)+td(l.velocity==null?'-':l.velocity,1)+td(topTheme(l.themes,Math.round((l.neg_share||0)*l.pulled)))+'</tr>'}).join('')||'<tr><td colspan="11" class="muted">No data</td></tr>';
  var byB={};comps().forEach(function(l){(byB[l.brand]=byB[l.brand]||[]).push(l)});
  document.querySelector('#rv-brands tbody').innerHTML=Object.keys(byB).map(function(b){var r=roll(byB[b]);return '<tr>'+td('<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:'+D.brandColor[b]+';margin-right:6px"></span>'+D.brandLabel[b])+td(r.locations,1)+td(n(r.pulled),1)+td(f1(r.avg),1)+td(f1(r.avg90),1)+td(pc(r.neg),1)+td(pc(r.reply),1)+td(r.vel.toFixed(1),1)+td(topTheme(r.th,r.negN))+'</tr>'}).join('')||'<tr><td colspan="9" class="muted">No data</td></tr>';
  var cqs=cq.value.toLowerCase();
  document.querySelector('#rv-comps tbody').innerHTML=comps().filter(function(l){return !cqs||l.label.toLowerCase().indexOf(cqs)>=0}).map(function(l){return '<tr data-id="'+l.id+'" style="cursor:pointer">'+td(l.label)+td(l.groups.join(', '))+td(n(l.pulled)+(l.place_reviews?' <span class="muted">of '+n(l.place_reviews)+'</span>':''),1)+td(f1(l.avg_all),1)+td(f1(l.avg_90),1)+td(pc(l.neg_share),1)+td(pc(l.reply_rate),1)+td(l.velocity==null?'-':l.velocity,1)+td(topTheme(l.themes,Math.round((l.neg_share||0)*l.pulled)))+'</tr>'}).join('')||'<tr><td colspan="9" class="muted">No data</td></tr>';
}
function detail(id,boxId){var l=L.filter(function(x){return x.id===id})[0],box=document.getElementById(boxId);if(!l){box.hidden=true;return}var negN=Math.round((l.neg_share||0)*l.pulled);
  var rows=TK.map(function(k){return [k,l.themes[k]]}).sort(function(a,b){return b[1].neg-a[1].neg});
  var note=(D.commentary&&D.commentary.stores&&l.store!=null)?D.commentary.stores[String(l.store)]:null;
  box.innerHTML='<h3 style="margin:0 0 6px">'+l.label+'</h3><p class="muted" style="margin:0 0 12px">'+n(l.pulled)+' reviews pulled, '+negN+' negative. Average '+f1(l.avg_all)+', last 90 days '+f1(l.avg_90)+'. Reply rate '+pc(l.reply_rate)+'.</p>'+(note?'<p style="margin:0 0 14px;font-size:15px;line-height:1.55">'+note+'</p>':'')+'<table><thead><tr><th>Theme</th><th class="num">In negative reviews</th><th class="num">In all reviews</th><th>Example</th></tr></thead><tbody>'+rows.map(function(r){var qt=(l.quotes[r[0]]||[])[0];return '<tr><td>'+D.themes[r[0]]+'</td><td class="num">'+r[1].neg+(negN?' ('+Math.round(100*r[1].neg/negN)+'%)':'')+'</td><td class="num">'+r[1].all+'</td><td class="muted" style="font-size:13px">'+(qt?'&#9733;'+qt.rating+' '+qt.date+': &ldquo;'+qt.text.replace(/</g,'&lt;')+'&rdquo;':'')+'</td></tr>'}).join('')+'</tbody></table>';box.hidden=false;box.scrollIntoView({block:'nearest',behavior:'smooth'})}
document.querySelector('#rv-stores tbody').addEventListener('click',function(e){var tr=e.target.closest('tr[data-id]');if(tr)detail(tr.getAttribute('data-id'),'rv-detail')});
document.querySelector('#rv-comps tbody').addEventListener('click',function(e){var tr=e.target.closest('tr[data-id]');if(tr)detail(tr.getAttribute('data-id'),'rv-cdetail')});
var tip=document.getElementById('rvtip'),tsvg=document.getElementById('rvtrend');
tsvg.addEventListener('mousemove',function(e){var t=e.target.closest('.pt');if(!t){tip.style.display='none';return}var m=t.getAttribute('data-m'),k=t.getAttribute('data-k'),x=tsvg._months[m][k];tip.innerHTML='<b>'+(k==='o'?'Jiffy Lube':'Competitors')+' '+m+'</b><br>'+x.n+' reviews, avg '+(x.n?(x.sum/x.n).toFixed(2):'-')+', '+x.neg+' negative';var box=tsvg.parentNode.getBoundingClientRect();tip.style.display='block';tip.style.left=Math.min(e.clientX-box.left+14,box.width-200)+'px';tip.style.top=(e.clientY-box.top+14)+'px'});
tsvg.addEventListener('mouseleave',function(){tip.style.display='none'});
// click-to-sort (same behavior as the Campaigns page)
var SORT={};function parseCell(td){var t=td.textContent.trim().replace(/[$,%]/g,'').replace(/ of .*$/,'');var m=t.match(/^[-+]?[0-9.]+/);return m?parseFloat(m[0]):t.toLowerCase()}
function applySort(tbl){var st=SORT[tbl.id];if(!st)return;var tb=tbl.tBodies[0],rows=Array.prototype.slice.call(tb.rows);if(rows.length<2)return;rows.sort(function(a,b){var va=parseCell(a.cells[st.col]),vb=parseCell(b.cells[st.col]);if(typeof va==='number'&&typeof vb==='number')return (va-vb)*st.dir;if(typeof va==='number')return -1;if(typeof vb==='number')return 1;return String(va).localeCompare(String(vb))*st.dir});rows.forEach(function(r){tb.appendChild(r)});Array.prototype.forEach.call(tbl.tHead.rows[0].cells,function(th,i){th.setAttribute('aria-sort',i===st.col?(st.dir>0?'ascending':'descending'):'none');th.style.textDecoration=i===st.col?'underline':''})}
function sortable(){Array.prototype.forEach.call(document.querySelectorAll('main table[id]'),function(tbl){if(tbl._s)return;tbl._s=true;Array.prototype.forEach.call(tbl.tHead.rows[0].cells,function(th,i){th.title='Click to sort';th.addEventListener('click',function(){var st=SORT[tbl.id]||{col:-1,dir:1};SORT[tbl.id]={col:i,dir:st.col===i?-st.dir:(th.classList.contains('num')?-1:1)};applySort(tbl)})})});Array.prototype.forEach.call(document.querySelectorAll('main table[id]'),applySort)}
function all(){render();sortable()}
[comp,metric].forEach(function(el){el.addEventListener('change',all)});[q,cq].forEach(function(el){el.addEventListener('input',all)});window.addEventListener('jl-group',all);all();
})();
</script>`;
  return page('Reviews', body, 'reviews');
}


/* ---------- Listing health: Google Business Profile audit (v2) per store ---------- */
function listingPage() {
  let gbp = { version: 2, stores: [], checks: [], fix_frequency: [], by_group: [], total_stores: rows.length, generated: null, weights: { setup: 55, activity: 15, reputation: 30 } };
  try { const g = JSON.parse(fs.readFileSync(path.join(MAP, 'data/gbp/latest.json'), 'utf8')); if (g.version === 2) gbp = g; } catch {}
  let yelp = { stores: {}, found: 0, pulled: 0, generated: null };
  try { yelp = JSON.parse(fs.readFileSync(path.join(MAP, 'data/yelp/latest.json'), 'utf8')); } catch {}
  const data = JSON.stringify({ ...gbp, yelp }).replace(/</g, '\\u003c');
  const body = `
<h1>Listing health</h1>
<p class="sub">How complete each store's Google Business Profile is, scored out of 100 in three groups: Profile setup (${gbp.weights.setup}), Content and activity (${gbp.weights.activity}), Reputation (${gbp.weights.reputation}). Checks Google does not expose from the outside are marked Not checked and left out of the score. ${gbp.pulled || 0} of ${gbp.total_stores} stores pulled so far${gbp.generated ? ' (' + esc(gbp.generated.slice(0, 10)) + ')' : ''}. Pick a franchise group in the top bar to filter. ${yelp.pulled ? '<a href="#other-listings">Jump to Yelp and other listings</a>.' : ''}</p>
<div class="stats" id="lh-stats"></div>
<div class="panel"><div class="ctl"><label>Search <input id="lq" type="search" placeholder="store, city, group"></label><span class="muted">Click a column to sort. Click a store for its scorecard.</span></div>
<div class="tscroll"><table id="lh-table"><thead><tr><th>Store</th><th>Group</th><th class="num">Score</th><th class="num">Setup</th><th class="num">Activity</th><th class="num">Reputation</th><th>Flags</th><th>Biggest fix</th></tr></thead><tbody></tbody></table></div></div>
<div class="panel" id="lh-detail" hidden></div>
<h2>Fix frequency</h2>
<p class="sub">How many of the pulled stores fail or partly fail each check. This is the co-op to-do list, biggest first.</p>
<div class="panel"><div class="tscroll"><table id="lh-fix"><thead><tr><th>Check</th><th>Group</th><th class="num">Points</th><th class="num">Fix</th><th class="num">Partial</th><th class="num">OK</th><th class="num">Not checked</th><th>Share needing work</th></tr></thead><tbody></tbody></table></div></div>
<h2>By franchise group</h2>
<div class="panel"><div class="tscroll"><table id="lh-groups"><thead><tr><th>Franchise group</th><th class="num">Stores pulled</th><th class="num">Average score</th><th>Top 3 failing checks</th></tr></thead><tbody></tbody></table></div></div>
${yelp.pulled ? `<div id="yelp"></div><h2 id="other-listings">Other listings (Yelp)</h2>
<p class="sub">The same store on the sites the AI assistants cite besides Google. Yelp is pulled for every store${yelp.generated ? ' (' + esc(yelp.generated.slice(0, 10)) + ')' : ''}. Apple Maps and Bing Places are not checked yet: Apple needs a MapKit key from the Apple Developer account and Bing needs access to the Bing Places account.</p>
<div class="stats" id="ol-stats"></div>
<div class="panel"><div class="tscroll"><table id="ol-table"><thead><tr><th>Store</th><th>Group</th><th class="num">Google</th><th class="num">Yelp</th><th class="num">Gap</th><th class="num">Yelp reviews</th><th>Claimed</th><th>Phone matches</th><th>Website on Yelp</th><th>Yelp listing</th></tr></thead><tbody></tbody></table></div>
<p class="muted" style="font-size:13px;margin-bottom:0">Gap is the Yelp rating minus the Google rating. Yelp ratings run lower everywhere, but a gap wider than a full star usually means unanswered Yelp reviews. "Not found" means no Yelp listing matched the store phone or street address; the store may have a listing under a different phone, or none.</p></div>
` : ''}
<h2>How the score works</h2>
<div class="panel"><p class="muted" style="margin-top:0">Points are computed, not all-or-nothing: a 4.0 rating earns half the rating points, a 60% reply rate earns 60% of the reply points. Rows marked Not checked are dropped from the denominator and the score is rescaled to 100.</p>
<div class="tscroll"><table id="lh-rules"><thead><tr><th>Group</th><th>Check</th><th class="num">Points</th><th>Scoring</th></tr></thead><tbody>
<tr><td>Setup</td><td>Name matches the standard listing name</td><td class="num">5</td><td>"Jiffy Lube Oil Change" (the chain standard, like "Valvoline Instant Oil Change") or the plain sign name = 5; a name with a city, keyword or slogan added = 0</td></tr>
<tr><td>Setup</td><td>Phone matches site</td><td class="num">5</td><td>Exact after normalization</td></tr>
<tr><td>Setup</td><td>Address matches site</td><td class="num">5</td><td>Street, city, state and ZIP compared separately; any difference = 0 with the diff shown</td></tr>
<tr><td>Setup</td><td>Website link points to this store's page</td><td class="num">10</td><td>Co-op store page or the corporate jiffylube.com page for this store number = 10 (JLI sets that link chain-wide, so it is not held against the store); co-op home page = 7; corporate home page = 4; wrong store number, unrelated site or missing = 0</td></tr>
<tr><td>Setup</td><td>Primary category is Oil change service</td><td class="num">10</td><td>Full or 0. Read from the Google Maps profile (Outscraper), not the Places API, which often reports a broader type</td></tr>
<tr><td>Setup</td><td>Secondary categories present</td><td class="num">3</td><td>Full with 2 or more of: Car repair and maintenance service, Tire shop, Brake shop, Auto air conditioning service</td></tr>
<tr><td>Setup</td><td>Regular hours set for all 7 days</td><td class="num">4</td><td>Full or 0</td></tr>
<tr><td>Setup</td><td>Holiday / special hours set</td><td class="num">3</td><td>Special hours exist for the next US holiday. Google only shows special hours 7 days ahead, so this is Not checked until the week before a holiday</td></tr>
<tr><td>Setup</td><td>Attributes filled</td><td class="num">3</td><td>Proportional to filled out of 7; missing ones listed</td></tr>
<tr><td>Setup</td><td>Owner description present and relevant</td><td class="num">3</td><td>3 if it mentions "oil change" and the town; 1 if present without those. Not checked when the pull cannot see it: Google shows the description only in the Search knowledge panel, so the audit never marks it missing</td></tr>
<tr><td>Setup</td><td>Services list filled</td><td class="num">2</td><td>Not checked until we have Business Profile manager access</td></tr>
<tr><td>Setup</td><td>Appointment / booking URL set</td><td class="num">2</td><td>Full if a booking or appointment link is on the listing</td></tr>
<tr><td>Activity</td><td>Google Posts in last 30 days</td><td class="num">6</td><td>4 or more posts = 6; 1 to 3 = 3; none = 0. Date of the last post shown</td></tr>
<tr><td>Activity</td><td>Owner photo uploaded recently</td><td class="num">4</td><td>Not checked: Google does not expose photo upload dates</td></tr>
<tr><td>Activity</td><td>Logo and cover photo set</td><td class="num">2</td><td>1 point each</td></tr>
<tr><td>Activity</td><td>Owner share of top photos</td><td class="num">3</td><td>Proportional: owner photos among the top 10 Google shows</td></tr>
<tr><td>Reputation</td><td>Google rating</td><td class="num">10</td><td>Linear from 3.5 (0 points) to 4.5 (10 points); gap to nearby competitor median shown</td></tr>
<tr><td>Reputation</td><td>New reviews in last 90 days</td><td class="num">7</td><td>Store count divided by the nearby competitor median, capped at 1 (target 30 if no competitor data)</td></tr>
<tr><td>Reputation</td><td>Owner reply rate</td><td class="num">6</td><td>Proportional; all reviews and 1 to 3 star shown separately</td></tr>
<tr><td>Reputation</td><td>Owner reply speed</td><td class="num">4</td><td>Not checked: the review source does not give reply dates</td></tr>
<tr><td>Reputation</td><td>Service and town keywords in recent reviews</td><td class="num">3</td><td>Share of last-90-day reviews mentioning oil change, quick, fast, tire, brake or the town; 20%+ = full, proportional below</td></tr>
</tbody></table></div>
<p class="muted" style="margin-bottom:0">Unscored flags shown on the scorecard: not verified, closed status, possible duplicate listing within 200 m (same name or phone). Not available yet: pin distance from the street address.</p></div>
<p class="foot">Sources: Google Places API (what Google shows publicly), the Outscraper Google Maps profile pull (category, description, posts, booking link, verified, logo), the scraped Google reviews, the competitor map, and the store data on jiffylubechicagoland.com. Refresh: node scripts/gbp-pull.mjs in the competitor-map project.</p>
<script>
(function(){
var D=${data},S=D.stores,q=document.getElementById('lq'),tb=document.querySelector('#lh-table tbody'),det=document.getElementById('lh-detail'),stats=document.getElementById('lh-stats');
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
var GL={setup:'Setup',activity:'Activity',reputation:'Reputation'};
function badge(st){var cls=st==='ok'?'q-strong':st==='partial'?'q-open':st==='na'?'q-na':'q-risk';var t=st==='ok'?'OK':st==='partial'?'Partial':st==='na'?'Not checked':'Fix';return '<span class="q '+cls+'">'+t+'</span>'}
function scoreCls(n){return n>=85?'q-strong':n>=70?'q-open':'q-risk'}
function pts(n){return (Math.round(n*10)/10).toString()}
function worst(s){var w=null;s.checks.forEach(function(c){if(c.status==='na'||c.status==='ok')return;var lost=c.max-c.points;if(!w||lost>w.lost)w={lost:lost,c:c}});return w?esc(w.c.label)+' (-'+pts(w.lost)+')':'<span class="muted">none</span>'}
function visible(){var g=window.JL_GROUP||'',t=(q.value||'').toLowerCase();return S.filter(function(s){if(g&&s.group!==g)return false;if(t&&(String(s.store)+' '+s.city+' '+s.street+' '+s.group).toLowerCase().indexOf(t)<0)return false;return true})}
function failN(L,key){return L.filter(function(s){var c=null;s.checks.forEach(function(x){if(x.key===key)c=x});return c&&c.status!=='ok'&&c.status!=='na'}).length}
function render(){var L=visible();var avg=L.length?Math.round(L.reduce(function(a,s){return a+(s.score||0)},0)/L.length):0;
stats.innerHTML='<div class="stat"><b>'+L.length+'</b><span>stores scored</span></div><div class="stat"><b>'+avg+'</b><span>average score of 100</span></div><div class="stat"><b>'+failN(L,'website')+'</b><span>website link missing or wrong</span></div><div class="stat"><b>'+failN(L,'category')+'</b><span>primary category not Oil change service</span></div><div class="stat"><b>'+failN(L,'rating')+'</b><span>rating under 4.5</span></div><div class="stat"><b>'+L.filter(function(s){return s.flags&&s.flags.length}).length+'</b><span>stores with flags</span></div>';
tb.innerHTML=L.map(function(s){var g=s.groups;return '<tr data-s="'+s.store+'" style="cursor:pointer"><td><b>#'+s.store+'</b> '+esc(s.city)+', '+esc(s.street)+'</td><td>'+esc(s.group)+'</td><td class="num"><span class="q '+scoreCls(s.score)+'">'+s.score+'</span></td><td class="num">'+pts(g.setup.points)+' / '+g.setup.checked+'</td><td class="num">'+pts(g.activity.points)+' / '+g.activity.checked+'</td><td class="num">'+pts(g.reputation.points)+' / '+g.reputation.checked+'</td><td>'+(s.flags&&s.flags.length?'<span class="q q-risk">'+s.flags.length+'</span>':'<span class="muted">none</span>')+'</td><td>'+worst(s)+'</td></tr>'}).join('')||'<tr><td colspan="8" class="muted">No stores pulled for this group yet.</td></tr>';
var fx=document.querySelector('#lh-fix tbody');var FF=D.checks.map(function(f){var rowsL=L.map(function(s){var c=null;s.checks.forEach(function(x){if(x.key===f.key)c=x});return c}).filter(Boolean);var ch=rowsL.filter(function(c){return c.status!=='na'});return {key:f.key,label:f.label,group:f.group,max:f.max,checked:ch.length,fix:ch.filter(function(c){return c.status==='fix'}).length,partial:ch.filter(function(c){return c.status==='partial'}).length,ok:ch.filter(function(c){return c.status==='ok'}).length,na:rowsL.length-ch.length}}).sort(function(a,b){return (b.fix+b.partial)-(a.fix+a.partial)});
fx.innerHTML=FF.map(function(f){var need=f.fix+f.partial,pct=f.checked?Math.round(100*need/f.checked):0;return '<tr><td>'+esc(f.label)+'</td><td>'+GL[f.group]+'</td><td class="num">'+f.max+'</td><td class="num">'+f.fix+'</td><td class="num">'+f.partial+'</td><td class="num">'+f.ok+'</td><td class="num">'+f.na+'</td><td>'+(f.checked?'<span class="bar"><i style="width:'+pct+'%"></i></span> '+pct+'%':'<span class="muted">not checked</span>')+'</td></tr>'}).join('');
var Y=D.yelp&&D.yelp.stores||{};var ol=document.querySelector('#ol-table tbody'),ols=document.getElementById('ol-stats');if(ol&&ols){
var yl=L.map(function(s){return {s:s,y:Y[s.store]}});var yf=yl.filter(function(x){return x.y&&x.y.found});
var gAvg=yf.length?yf.reduce(function(t,x){return t+(x.s.rating||0)},0)/yf.length:0,yAvg=yf.length?yf.reduce(function(t,x){return t+(x.y.rating||0)},0)/yf.length:0;
ols.innerHTML='<div class="stat"><b>'+yf.length+' / '+yl.length+'</b><span>stores with a Yelp listing found</span></div><div class="stat"><b>'+(yf.length?yAvg.toFixed(2):'-')+'</b><span>average Yelp rating (Google '+(yf.length?gAvg.toFixed(2):'-')+')</span></div><div class="stat"><b>'+yf.reduce(function(t,x){return t+(x.y.reviews||0)},0).toLocaleString()+'</b><span>Yelp reviews</span></div><div class="stat"><b>'+yf.filter(function(x){return (x.s.rating||0)-(x.y.rating||0)>=1}).length+'</b><span>stores a full star or more below Google on Yelp</span></div><div class="stat"><b>'+yf.filter(function(x){return x.y.is_claimed===false}).length+'</b><span>unclaimed Yelp listings</span></div><div class="stat"><b>'+yf.filter(function(x){return x.y.phone_match===false}).length+'</b><span>Yelp phone differs from site</span></div><div class="stat"><b>'+yf.filter(function(x){return x.y.website_status==='wrong'||x.y.website_status==='missing'}).length+'</b><span>Yelp website link wrong or missing</span></div><div class="stat"><b>'+yl.filter(function(x){return !x.y||!x.y.found}).length+'</b><span>no Yelp listing found</span></div>';
ol.innerHTML=yl.map(function(x){var s=x.s,y=x.y;if(!y||!y.found)return '<tr><td><b>#'+s.store+'</b> '+esc(s.city)+', '+esc(s.street)+'</td><td>'+esc(s.group)+'</td><td class="num">'+(s.rating||'')+'</td><td class="num"><span class="q q-risk">Not found</span></td><td class="num"></td><td class="num"></td><td></td><td></td><td></td><td><span class="muted">'+(y?'none of '+y.candidates+' candidates matched':'not pulled')+'</span></td></tr>';
var gap=(y.rating!=null&&s.rating)?(y.rating-s.rating):null;var gc=gap==null?'':gap<=-1?'q-risk':gap<=-0.5?'q-open':'q-strong';
return '<tr><td><b>#'+s.store+'</b> '+esc(s.city)+', '+esc(s.street)+'</td><td>'+esc(s.group)+'</td><td class="num">'+(s.rating||'')+'</td><td class="num">'+(y.rating==null?'':y.rating)+'</td><td class="num">'+(gap==null?'':'<span class="q '+gc+'">'+(gap>0?'+':'')+gap.toFixed(1)+'</span>')+'</td><td class="num">'+(y.reviews==null?'':y.reviews.toLocaleString())+'</td><td>'+(y.is_claimed===false?'<span class="q q-risk">Unclaimed</span>':y.is_claimed?'<span class="q q-strong">Yes</span>':'<span class="muted">n/a</span>')+(y.is_closed?' <span class="q q-risk">Marked closed</span>':'')+'</td><td>'+(y.phone_match===false?'<span class="q q-risk">No</span> <span class="muted">'+esc(y.phone)+'</span>':'<span class="q q-strong">Yes</span>')+'</td><td>'+(y.website_status==='ok'?'<span class="q q-strong">OK</span> <span class="muted">'+esc(y.website_note)+'</span>':y.website_status==='wrong'?'<span class="q q-risk">Wrong</span> <span class="muted">'+esc(y.website_note)+'</span>':y.website_status==='missing'?'<span class="q q-risk">Missing</span>':'<span class="muted">not checked</span>')+'</td><td><a href="'+esc(y.url)+'" target="_blank" rel="noopener">Open</a></td></tr>'}).join('')||'<tr><td colspan="10" class="muted">No Yelp data yet.</td></tr>';
}
var gb=document.querySelector('#lh-groups tbody');var groups={};L.forEach(function(s){(groups[s.group]=groups[s.group]||[]).push(s)});
gb.innerHTML=Object.keys(groups).sort().map(function(g){var list=groups[g],a=Math.round(list.reduce(function(t,s){return t+s.score},0)/list.length);var fails=D.checks.map(function(c){return {label:c.label,n:failN(list,c.key)}}).filter(function(x){return x.n>0}).sort(function(x,y){return y.n-x.n}).slice(0,3);return '<tr><td>'+esc(g)+'</td><td class="num">'+list.length+'</td><td class="num"><span class="q '+scoreCls(a)+'">'+a+'</span></td><td>'+fails.map(function(f){return esc(f.label)+' ('+f.n+' of '+list.length+')'}).join('<br>')+'</td></tr>'}).join('')||'<tr><td colspan="4" class="muted">No stores pulled yet.</td></tr>';
}
function detail(id){var s=null;S.forEach(function(x){if(String(x.store)===String(id))s=x});if(!s)return;det.hidden=false;var g=s.groups;
var h='<h2 style="margin-top:0">#'+s.store+' '+esc(s.city)+', '+esc(s.street)+' <span class="q '+scoreCls(s.score)+'">'+s.score+' of 100</span></h2>';
h+='<p class="muted">'+esc(s.group)+' · <a href="'+esc(s.maps_url)+'" target="_blank" rel="noopener">Open on Google Maps</a> · pulled '+esc((s.pulled_at||'').slice(0,10))+'</p>';
if(s.flags&&s.flags.length)h+='<div class="alert">'+s.flags.map(function(f){return '<p>'+esc(f.text)+'</p>'}).join('')+'</div>';
h+='<div class="stats">'+['setup','activity','reputation'].map(function(k){return '<div class="stat"><b>'+pts(g[k].points)+' / '+g[k].checked+'</b><span>'+GL[k]+(g[k].checked<g[k].max?' ('+g[k].max+' possible, '+(g[k].max-g[k].checked)+' not checked)':'')+'</span></div>'}).join('')+'</div>';
if(s.bench&&s.bench.list&&s.bench.list.length){h+='<h3 class="h3">Nearby competitors</h3><div class="tscroll"><table><thead><tr><th>Location</th><th class="num">Miles</th><th class="num">Rating</th><th class="num">Reviews</th><th class="num">New in 90 days</th><th class="num">Reply rate</th></tr></thead><tbody>';
h+='<tr><td><b>This store</b></td><td class="num"></td><td class="num">'+(s.rating||'')+'</td><td class="num">'+(s.reviews||'')+'</td><td class="num">'+(s.n_90==null?'<span class="muted">n/a</span>':s.n_90)+'</td><td class="num">'+(function(){var c=null;s.checks.forEach(function(x){if(x.key==='replies')c=x});return c&&c.status!=='na'?esc(c.shows.split(' of all')[0]):'<span class="muted">n/a</span>'})()+'</td></tr>';
h+=s.bench.list.map(function(b){return '<tr><td>'+esc(b.label)+' <span class="muted">'+esc(b.address.replace(/, USA$/,''))+'</span></td><td class="num">'+b.miles+'</td><td class="num">'+(b.rating==null?'':b.rating)+'</td><td class="num">'+(b.reviews==null?'':b.reviews)+'</td><td class="num">'+(b.n_90==null?'<span class="muted">n/a</span>':b.n_90)+'</td><td class="num">'+(b.reply_rate==null?'<span class="muted">n/a</span>':Math.round(b.reply_rate*100)+'%')+'</td></tr>'}).join('');
h+='<tr><td class="muted">Competitor median</td><td class="num"></td><td class="num">'+(s.bench.median_rating==null?'':s.bench.median_rating)+'</td><td class="num">'+(s.bench.median_reviews==null?'':s.bench.median_reviews)+'</td><td class="num">'+(s.bench.median_n90==null?'':s.bench.median_n90)+'</td><td class="num"></td></tr></tbody></table></div>';}
h+='<h3 class="h3">Scorecard</h3><div class="tscroll"><table class="card-t"><thead><tr><th>Check</th><th class="num">Points</th><th>Result</th><th>What Google shows</th><th>What to do</th></tr></thead><tbody>';
var lastG='';s.checks.forEach(function(c){if(c.group!==lastG){lastG=c.group;h+='<tr class="grp"><td colspan="5">'+GL[c.group]+' <span class="muted">'+pts(g[c.group].points)+' of '+g[c.group].checked+' checked points</span></td></tr>'}
h+='<tr'+(c.status==='na'?' class="na"':'')+'><td>'+esc(c.label)+'</td><td class="num">'+(c.status==='na'?'<span class="muted">'+c.max+'</span>':pts(c.points)+' / '+c.max)+'</td><td>'+badge(c.status)+'</td><td>'+esc(c.shows)+(c.source?'<br><small class="muted">'+esc(c.source)+'</small>':'')+'</td><td>'+esc(c.action)+'</td></tr>'});
h+='</tbody></table></div>';
if(s.not_checked&&s.not_checked.length)h+='<p class="muted" style="font-size:13px">Not checked for this store: '+s.not_checked.map(esc).join('; ')+'.</p>';
if(s.posts&&s.posts.length)h+='<details><summary>Recent Google Posts ('+s.posts.length+' most recent)</summary><ul>'+s.posts.map(function(x){return '<li><span class="muted">'+esc(x.date||'')+'</span> '+esc(x.body)+'</li>'}).join('')+'</ul></details>';if(s.reviews_tags&&s.reviews_tags.length)h+='<p class="muted" style="font-size:13px">What reviewers mention most: '+s.reviews_tags.map(esc).join(', ')+'</p>';if(s.summary)h+='<p><b>Google&#39;s summary of this listing:</b> '+esc(s.summary)+'</p>';if(s.review_summary)h+='<p><b>Google&#39;s review summary:</b> '+esc(s.review_summary)+'</p>';
h+='<details><summary>Hours as listed</summary><p>'+s.hours.map(esc).join('<br>')+'</p><p class="muted">Website: '+esc(s.website||'none')+'</p></details>';
det.innerHTML=h;det.scrollIntoView({behavior:'smooth',block:'start'})}
tb.addEventListener('click',function(e){var tr=e.target.closest('tr[data-s]');if(tr)detail(tr.getAttribute('data-s'))});
var SORT={};function parseCell(td){var t=td.textContent.trim().replace(/[$,%]/g,'');var m=t.match(/^[-+]?[0-9.]+/);return m?parseFloat(m[0]):t.toLowerCase()}
function applySort(tbl){var st=SORT[tbl.id];if(!st)return;var b=tbl.tBodies[0],rs=Array.prototype.slice.call(b.rows);if(rs.length<2)return;rs.sort(function(a,c){var va=parseCell(a.cells[st.col]),vb=parseCell(c.cells[st.col]);if(typeof va==='number'&&typeof vb==='number')return (va-vb)*st.dir;if(typeof va==='number')return -1;if(typeof vb==='number')return 1;return String(va).localeCompare(String(vb))*st.dir});rs.forEach(function(r){b.appendChild(r)});Array.prototype.forEach.call(tbl.tHead.rows[0].cells,function(th,i){th.setAttribute('aria-sort',i===st.col?(st.dir>0?'ascending':'descending'):'none');th.style.textDecoration=i===st.col?'underline':''})}
function sortable(){Array.prototype.forEach.call(document.querySelectorAll('main table[id]'),function(tbl){if(tbl._s)return;tbl._s=true;Array.prototype.forEach.call(tbl.tHead.rows[0].cells,function(th,i){th.title='Click to sort';th.addEventListener('click',function(){var st=SORT[tbl.id]||{col:-1,dir:1};SORT[tbl.id]={col:i,dir:st.col===i?-st.dir:(th.classList.contains('num')?-1:1)};applySort(tbl)})})});Array.prototype.forEach.call(document.querySelectorAll('main table[id]'),applySort)}
function all(){render();sortable()}q.addEventListener('input',all);window.addEventListener('jl-group',all);all();
var pre=new URLSearchParams(location.search).get('store');if(pre)detail(pre);
})();
</script>`;
  return page('Listing health', body, 'listing').replace('<body>', '<body class="pg-listing">');
}

/* ---------- Fleet: prospects by store and the lead pipeline ---------- */
function fleetPage() {
  let leads = { leads: [], pulled_at: null, sheet: '' };
  try { leads = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/fleet/leads.json'), 'utf8')); } catch {}
  let meta = { totals: {}, by_store: {}, reach_miles: 5, generated: null, source_note: '' };
  try { const pj = JSON.parse(fs.readFileSync(path.join(MAP, 'data/fleet/prospects.json'), 'utf8')); meta = { totals: pj.totals, by_store: pj.by_store, by_group: pj.by_group || {}, reach_miles: pj.reach_miles, generated: pj.generated, source_note: pj.source_note }; fs.mkdirSync(path.join(OUT, 'fleet'), { recursive: true }); fs.copyFileSync(path.join(MAP, 'data/fleet/prospects.json'), path.join(OUT, 'fleet/prospects.json')); } catch {}
  const data = JSON.stringify({ leads: leads.leads, sheet: leads.sheet, pulled_at: leads.pulled_at, meta, groups: Object.fromEntries(augStores.map((s) => [s.store, s.group])) }).replace(/</g, '\\u003c');
  const body = `
<h1>Fleet</h1>
<p class="sub">Who to call, and who has already raised a hand. Prospects come from three sources: local service businesses found with a Google Maps category search around each store (plumbers, HVAC, pest control, landscapers, electricians, couriers, cleaners, home health, security, appliance repair), car-and-van carriers from the FMCSA motor-carrier census, and a web-researched list of light-duty fleets. Each is linked to every store within ${meta.reach_miles} miles. Leads come from the QR sign-up form at <a href="/fleet/">/fleet/</a>, read from the <a href="${esc(leads.sheet || '#')}" target="_blank" rel="noopener">Fleet Leads sheet</a>${leads.pulled_at ? ' (' + esc(leads.pulled_at.slice(0, 16).replace('T', ' ')) + ' UTC)' : ''}. Pick a franchise group in the top bar to filter.</p>
<div class="stats" id="fl-stats"></div>
<h2>Lead pipeline</h2>
<p class="sub">Every form submission, newest first. Matt updates the Status column in the sheet (New, Contacted, Quoted, Won, Lost) and it shows here the next morning. Names, phones and emails stay in the sheet.</p>
<div class="stats" id="fl-funnel"></div>
<div class="panel"><div class="ctl"><label><input type="checkbox" id="fl-tests"> show test submissions</label></div>
<div class="tscroll"><table id="fl-leads"><thead><tr><th>Submitted</th><th>Store</th><th>Company</th><th>Title</th><th>City</th><th class="num">Vehicles</th><th>Status</th><th>Source</th><th>Taken by</th><th>Notes</th></tr></thead><tbody></tbody></table></div></div>
<h2>Prospects within ${meta.reach_miles} miles of each store <a href="/private/competitor-map/?fleet=1" data-nav="/private/competitor-map/" style="font-size:14px;font-weight:400;margin-left:8px">See them on the map</a></h2>
<div class="panel"><div class="ctl"><label>Search <input id="fl-q" type="search" placeholder="store, city, group"></label><span class="muted">Click a store for its call list. Service businesses = plumbers, HVAC, pest control and the like found near the store. Tier A = private fleets from the federal census.</span></div>
<div class="tscroll"><table id="fl-stores"><thead><tr><th>Store</th><th>Group</th><th class="num">Prospects</th><th class="num">Service businesses</th><th class="num">Tier A</th><th class="num">Light-duty list</th><th class="num">Leads</th><th>Top prospects</th></tr></thead><tbody></tbody></table></div></div>
<div class="panel" id="fl-call" hidden></div>
<h2>How the list is built</h2>
<div class="panel"><p class="muted" style="margin-top:0">${esc(meta.source_note || '')} Cars and vans only. A carrier qualifies when it reports at least one car or van and those are the majority of its fleet; truck and tractor fleets, and carriers with no vehicle breakdown, are left out. Each prospect is then scored 0 to 100: private fleet 40, passenger fleet 25, for-hire carrier 10; all cars and vans 25, mostly cars and vans 15; 10 to 100 of them 15; a fleet-heavy category (courier, landscaping, food, contractor, medical, utility) 10; a phone on file 5; within 2 miles of the store 10. Fleets whose reported size looks like a data error lose 30. Companies from the researched light-duty list start at 75. Local service businesses from the Google Maps search start at 45, plus up to 10 for the trade (plumbing, HVAC, pest control and couriers rank highest), up to 20 for review count (200 or more reviews 20, 50 to 199 reviews 14, 10 to 49 reviews 8), 5 for a phone, 3 for a website and 3 for a 4.5 rating or better.</p>
<p class="muted">The summary tiles count each company once. The stores table counts a company under every store within reach, so one plumber can appear on three stores' lists and those columns add up to more than the tiles.</p>
<p class="muted" style="margin-bottom:0">Coverage: the federal census only records vehicles over 10,000 lbs, so most pest-control cars and plumber vans never appear in it, and the pull covers Illinois' 7 metro counties only. That is why the Google Maps category search was added: it finds the plumbers, HVAC crews, pest-control routes and couriers that actually run cars and vans near each store. Review count is only a rough size signal, so a quick call still needs to confirm the fleet. Matt's existing fleet accounts are not marked; send the list and they will be.</p></div>
<p class="foot">Sources: Google Places category search (October 2026), FMCSA Motor Carrier Census via data.transportation.gov (pulled August 2026), light-duty list researched August 2026, Fleet Leads Google Sheet. Refresh prospects: node scripts/fleet-places.mjs then node scripts/fleet-prospects.mjs in the competitor-map project. Leads refresh daily.</p>
<script>
(function(){
var D=${data},L=D.leads||[],META=D.meta||{},BS=META.by_store||{},GR=D.groups||{};
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function n(v){return (v||0).toLocaleString()}
var stat=function(b,l){return '<div class="stat"><b>'+b+'</b><span>'+l+'</span></div>'};
var SC={New:'q-battle',Contacted:'q-open',Quoted:'q-open',Won:'q-strong',Lost:'q-risk'};
function gv(){return window.JL_GROUP||''}
function leadsVisible(){var g=gv(),t=document.getElementById('fl-tests').checked;return L.filter(function(l){return (t||!l.test)&&(!g||GR[l.store]===g)})}
function renderLeads(){var ls=leadsVisible();var byS={};ls.forEach(function(l){byS[l.status]=(byS[l.status]||0)+1});
  var wk=Date.now()-7*864e5,fresh=ls.filter(function(l){var d=Date.parse(l.when.replace(/, /,' '));return d&&d>=wk}).length;
  document.getElementById('fl-funnel').innerHTML=['New','Contacted','Quoted','Won','Lost'].map(function(s){return stat(n(byS[s]),s)}).join('')+stat(n(ls.reduce(function(t,l){return t+(l.vehicles||0)},0)),'vehicles across all leads');
  document.querySelector('#fl-leads tbody').innerHTML=ls.slice().sort(function(a,b){return b.when.localeCompare(a.when)}).map(function(l){return '<tr'+(l.test?' class="na"':'')+'><td>'+esc(l.when)+'</td><td>'+(l.store?'<b>#'+l.store+'</b> ':'')+esc(l.store_name)+'</td><td><b>'+esc(l.company)+'</b></td><td>'+esc(l.title)+'</td><td>'+esc(l.city)+(l.state?', '+esc(l.state):'')+'</td><td class="num">'+(l.vehicles||'')+'</td><td><span class="q '+(SC[l.status]||'q-na')+'">'+esc(l.status)+'</span></td><td>'+esc(l.source)+'</td><td>'+esc(l.employee)+'</td><td class="muted">'+esc(l.notes)+'</td></tr>'}).join('')||'<tr><td colspan="10" class="muted">No leads yet'+(gv()?' for this group':'')+'. The first scan of the QR code will show up here.</td></tr>';
  return {count:ls.length,fresh:fresh,won:byS.Won||0}}
function renderStores(){var g=gv(),t=(document.getElementById('fl-q').value||'').toLowerCase();var rows=Object.values(BS).filter(function(s){return (!g||s.group===g)&&(!t||(String(s.store)+' '+s.city+' '+s.group).toLowerCase().indexOf(t)>=0)});
  var ls=leadsVisible();var leadsBy={};ls.forEach(function(l){leadsBy[l.store]=(leadsBy[l.store]||0)+1});
  document.querySelector('#fl-stores tbody').innerHTML=rows.sort(function(a,b){return b.total-a.total}).map(function(s){return '<tr data-s="'+s.store+'" style="cursor:pointer"><td><b>#'+s.store+'</b> '+esc(s.city)+'</td><td>'+esc(s.group)+'</td><td class="num">'+n(s.total)+'</td><td class="num">'+n(s.service)+'</td><td class="num">'+n(s.tier_a)+'</td><td class="num">'+n(s.light)+'</td><td class="num">'+n(leadsBy[s.store])+'</td><td class="muted">'+esc((s.top||[]).join(', '))+'</td></tr>'}).join('');
  var lead=renderLeads();var T=META.totals||{};var tot=g&&(META.by_group||{})[g]?META.by_group[g]:{s:T.service_in_reach,a:T.tier_a_in_reach,l:T.light_in_reach,service:T.service_in_reach,tier_a:T.tier_a_in_reach,light:T.light_in_reach};
  document.getElementById('fl-stats').innerHTML=stat(n(rows.filter(function(s){return s.total}).length)+' / '+rows.length,'stores with a call list')+stat(n(tot.service),'local service businesses (unique companies)')+stat(n(tot.tier_a),'Tier A private fleets (unique companies)')+stat(n(tot.light),'light-duty list companies (unique companies)')+stat(n(lead.count),'leads from the QR form')+stat(n(lead.fresh),'new in the last 7 days')+stat(n(lead.won),'won');
}
var PROSPECTS=null;
function loadProspects(cb){if(PROSPECTS)return cb(PROSPECTS);fetch('/private/fleet/prospects.json',{credentials:'same-origin'}).then(function(r){return r.json()}).then(function(j){PROSPECTS=j.prospects||[];cb(PROSPECTS)}).catch(function(){cb([])})}
function callList(store){var box=document.getElementById('fl-call');box.hidden=false;box.innerHTML='<p class="muted">Loading the call list...</p>';box.scrollIntoView({behavior:'smooth',block:'start'});
  loadProspects(function(P){var s=BS[store];var list=P.filter(function(p){return p.stores.some(function(x){return x.store===store})}).map(function(p){p._mi=p.stores.filter(function(x){return x.store===store})[0].miles;return p}).sort(function(a,b){return b.score-a.score||a._mi-b._mi});
    var tierL={A:'Private fleet',B:'Passenger fleet',C:'For-hire carrier',L:'Light-duty company',S:'Local service business'};
    var csv='Score,Company,Category,Type,Google rating,Reviews,Vehicle mix,Serviceable vehicles,Cars and vans,Straight trucks,Tractors (not serviceable),Miles,City,Phone,Link\\n'+list.map(function(p){return [p.score,p.company,p.category,tierL[p.tier],p.rating==null?'':p.rating,p.reviews==null?'':p.reviews,p.fit_label,p.serviceable==null?'':p.serviceable,p.cars==null?'':(p.cars+p.vans),p.trucks==null?'':p.trucks,p.tractors==null?'':p.tractors,p._mi,p.city,p.phone,p.link].map(function(v){return '"'+String(v==null?'':v).replace(/"/g,'""')+'"'}).join(',')}).join('\\n');
    var h='<h2 style="margin-top:0">Call list: #'+store+' '+esc(s?s.city:'')+' <span class="muted" style="font-size:14px;font-weight:400">'+list.length+' prospects within '+META.reach_miles+' miles, best first</span></h2>';
    h+='<div class="ctl"><label>Find <input id="fl-cq" type="search" placeholder="company, category, city"></label><a class="q q-strong" style="text-decoration:none;cursor:pointer" id="fl-dl">Download CSV</a><span class="muted">Service businesses show their Google rating and review count (a stand-in for size: more reviews, more vans). Carrier phone numbers are the registered line; the USDOT link opens the federal record.</span></div>';
    h+='<div class="tscroll"><table id="fl-ct"><thead><tr><th class="num">Score</th><th>Company</th><th>Category</th><th>Type</th><th class="num">Google rating</th><th>Vehicle mix</th><th class="num">Serviceable vehicles</th><th class="num">Cars and vans</th><th class="num">Straight trucks</th><th class="num">Tractors (not serviceable)</th><th class="num">Miles</th><th>City</th><th>Phone</th><th>Record</th></tr></thead><tbody></tbody></table></div>';
    box.innerHTML=h;
    function draw(){var t=(document.getElementById('fl-cq').value||'').toLowerCase();var rows=list.filter(function(p){return !t||(p.company+' '+p.category+' '+p.city).toLowerCase().indexOf(t)>=0}).slice(0,300);
      document.querySelector('#fl-ct tbody').innerHTML=rows.map(function(p){return '<tr><td class="num"><span class="q '+(p.score>=85?'q-strong':p.score>=65?'q-open':'q-na')+'">'+p.score+'</span></td><td><b>'+esc(p.company)+'</b>'+(p.why?'<br><small class="muted">'+esc(p.why)+'</small>':'')+(p.suspect?'<br><small class="q q-risk">fleet size looks wrong, verify</small>':'')+'</td><td>'+esc(p.category||'')+'</td><td>'+esc(tierL[p.tier]||p.tier)+'</td><td class="num">'+(p.rating==null?'':p.rating+' <small class="muted">('+n(p.reviews)+')</small>')+'</td><td>'+esc(p.fit_label||'')+'</td><td class="num">'+(p.serviceable==null?(p.power_units?'<span class="muted">'+n(p.power_units)+' reported</span>':'<span class="muted">n/a</span>'):n(p.serviceable))+'</td><td class="num">'+(p.cars==null?'':(p.cars+p.vans))+'</td><td class="num">'+(p.trucks==null?'':p.trucks)+'</td><td class="num">'+(p.tractors==null?'':p.tractors)+'</td><td class="num">'+p._mi+'</td><td>'+esc(p.city)+'</td><td>'+(p.phone?'<a href="tel:'+esc(p.phone.replace(/[^0-9+]/g,''))+'">'+esc(p.phone)+'</a>':'<span class="muted">none</span>')+'</td><td><a href="'+esc(p.link)+'" target="_blank" rel="noopener">'+(p.tier==='L'||p.tier==='S'?'Site':'USDOT')+'</a></td></tr>'}).join('')||'<tr><td colspan="14" class="muted">No matches.</td></tr>'}
    document.getElementById('fl-cq').addEventListener('input',draw);
    document.getElementById('fl-dl').addEventListener('click',function(){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='fleet-call-list-'+store+'.csv';a.click()});
    draw()})}
document.querySelector('#fl-stores tbody').addEventListener('click',function(e){var tr=e.target.closest('tr[data-s]');if(tr)callList(Number(tr.getAttribute('data-s')))});
document.getElementById('fl-q').addEventListener('input',renderStores);document.getElementById('fl-tests').addEventListener('change',renderStores);window.addEventListener('jl-group',renderStores);renderStores();
var pre=new URLSearchParams(location.search).get('store');if(pre)callList(Number(pre));
})();
</script>`;
  return page('Fleet', body, 'fleet');
}

/* ---------- write ---------- */
fs.copyFileSync(path.join(MAP, 'dist/index.html'), path.join(OUT, 'competitor-map/index.html'));
/* ---------- Store results: GROW POS extracts (coupon redemptions, tickets, cars per day) ---------- */
function posPage() {
  const pf = path.join(ROOT, 'data/pos/promo.json'), inf = path.join(ROOT, 'data/pos/invoices.json');
  if (!fs.existsSync(pf) || !fs.existsSync(inf)) return page('Store results', `<h1>Store results</h1><p class="sub">No POS data yet. Download the GROW extracts into data/pos/raw/ and run <code>node scripts/pos-pull.mjs</code>, then rebuild.</p>`, 'pos');
  const P = JSON.parse(fs.readFileSync(pf, 'utf8')).rows, I = JSON.parse(fs.readFileSync(inf, 'utf8')).rows;
  const gaFile = path.join(ROOT, 'data', 'ga', 'latest.json'); const ga = fs.existsSync(gaFile) ? JSON.parse(fs.readFileSync(gaFile, 'utf8')) : null;
  const PILOT_START = '2026-10-15';
  const pilots = siteStores.filter((s) => s.offer && s.offer.code === 'GG1AD22').map((s) => s.id);
  const OUR = { GG1AD22: 'Pilot stores ($22 off, site and wallet)', YCGUF2: 'Other JLO stores ($10 off, site)', D1S6F3: 'Co-op code ($11 off, non-JLO pages)', M8W852: 'CHICOOP $10 (older online code)', Y8CPW2: 'Old SEM $15', YHFDE2: 'Old SEM $12', YEDUC2: 'Old SEM $7', YT88N2: 'Old SEM $5' };
  const storeLabel = Object.fromEntries(siteStores.map((s) => [s.id, `#${s.id} ${s.city}, ${s.street_name}`]));
  const dates = [...new Set(I.map((r) => r.date))].sort(); const first = dates[0], last = dates[dates.length - 1];
  const dow = (d) => new Date(d + 'T12:00:00').getDay();
  const addDays = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  // cars per store per day, and promo tickets
  const cars = {}; for (const r of I) { cars[r.date] = cars[r.date] || {}; cars[r.date][r.store] = (cars[r.date][r.store] || 0) + 1; }
  const sameDowAvg = (d, storeIds) => { let n = 0, t = 0; for (let k = 1; k <= 4; k++) { const p = addDays(d, -7 * k); if (!cars[p] || p < first) continue; n++; t += storeIds.reduce((a, s) => a + (cars[p][s] || 0), 0); } return n ? t / n : null; };
  // redemptions by code
  const byCode = {}; for (const r of P) { const k = r.code; byCode[k] = byCode[k] || { code: k, desc: r.desc.trim(), cat: r.category, pre: 0, pilot: 0, amt: 0, n: 0, last: '', stores: {} }; const b = byCode[k]; b.n++; b.amt += r.amount; if (r.date >= PILOT_START) b.pilot++; else b.pre++; if (r.date > b.last) b.last = r.date; if (r.date >= addDays(last, -13)) b.stores[r.store] = (b.stores[r.store] || 0) + 1; }
  const preDays = Math.max(1, (new Date(PILOT_START) - new Date(first)) / 864e5), pilotDays = Math.max(1, (new Date(last) - new Date(PILOT_START)) / 864e5 + 1);
  const codes = Object.values(byCode).map((b) => ({ ...b, avg: b.amt / b.n, pre_rate: b.pre / preDays, pilot_rate: b.pilot / pilotDays, ours: !!OUR[b.code], label: OUR[b.code] || '' })).sort((a, b) => b.n - a.n);
  // per-day pilot table
  const ourKeys = new Set(P.filter((r) => OUR[r.code]).map((r) => r.store + '|' + r.invoice));
  const campStore = {}; if (ga) for (const r of [].concat(ga.ads_daily || [])) { const n = (r.sessionGoogleAdsCampaignName || '').toLowerCase(); if (!n || campStore[r.sessionGoogleAdsCampaignName] !== undefined) continue; const hits = siteStores.filter((st) => n.includes(st.city.toLowerCase())); const best = hits.length > 1 ? hits.filter((st) => st.street_name.toLowerCase().split(/\s+/).some((w) => w.length > 3 && n.includes(w))) : hits; campStore[r.sessionGoogleAdsCampaignName] = best.length === 1 ? best[0].id : null; }
  const adsByDay = {}; if (ga) for (const r of ga.ads_daily || []) { const d = `${r.date.slice(0, 4)}-${r.date.slice(4, 6)}-${r.date.slice(6, 8)}`; if (!pilots.includes(campStore[r.sessionGoogleAdsCampaignName]) || d > last) continue; adsByDay[d] = adsByDay[d] || { cost: 0, clicks: 0, conv: 0 }; adsByDay[d].cost += r.advertiserAdCost || 0; adsByDay[d].clicks += r.advertiserAdClicks || 0; adsByDay[d].conv += r.keyEvents || 0; }
  const days = []; for (let d = addDays(PILOT_START, -7); d <= last; d = addDays(d, 1)) { const red = P.filter((r) => r.date === d && r.code === 'GG1AD22').length, chi = P.filter((r) => r.date === d && r.code === 'M8W852' && pilots.includes(r.store)).length; const c = pilots.reduce((a, s) => a + ((cars[d] || {})[s] || 0), 0); const base = sameDowAvg(d, pilots); const tix = I.filter((r) => r.date === d && pilots.includes(r.store)); const ours = tix.filter((r) => ourKeys.has(r.store + '|' + r.invoice)); days.push({ d, ads: adsByDay[d] || null, red, chi, cars: c, base, per: Object.fromEntries(pilots.map((s) => [s, (cars[d] || {})[s] || 0])), new_pct: ours.length ? ours.filter((r) => !r.repeat).length / ours.length : null, avg: ours.length ? ours.reduce((a, r) => a + r.total, 0) / ours.length : null }); }
  // pilot summary since Oct 15
  const since = (d) => d >= PILOT_START;
  const pilotTix = I.filter((r) => since(r.date) && pilots.includes(r.store)); const ourTix = pilotTix.filter((r) => ourKeys.has(r.store + '|' + r.invoice)); const otherTix = pilotTix.filter((r) => !ourKeys.has(r.store + '|' + r.invoice));
  const sum = { red: P.filter((r) => since(r.date) && r.code === 'GG1AD22').length, ads: Object.entries(adsByDay).filter(([d]) => since(d)).reduce((a, [, v]) => ({ cost: a.cost + v.cost, clicks: a.clicks + v.clicks, conv: a.conv + v.conv }), { cost: 0, clicks: 0, conv: 0 }), cars: pilotTix.length, base: days.filter((x) => since(x.d)).reduce((a, x) => a + (x.base || 0), 0), new_ours: ourTix.length ? ourTix.filter((r) => !r.repeat).length / ourTix.length : null, new_other: otherTix.length ? otherTix.filter((r) => !r.repeat).length / otherTix.length : null, avg_ours: ourTix.length ? ourTix.reduce((a, r) => a + r.total, 0) / ourTix.length : null, avg_other: otherTix.length ? otherTix.reduce((a, r) => a + r.total, 0) / otherTix.length : null, our_n: ourTix.length };
  // weekly, all 12 stores
  const weeks = {}; for (const r of I) { const w = addDays(r.date, -((dow(r.date) + 6) % 7)); weeks[w] = weeks[w] || { w, cars: 0, promo: 0, rev: 0, repeat: 0, days: new Set() }; const k = weeks[w]; k.cars++; if (r.promo_total > 0) k.promo++; k.rev += r.total; if (r.repeat) k.repeat++; k.days.add(r.date); }
  const weekly = Object.values(weeks).sort((a, b) => a.w.localeCompare(b.w)).map((k) => ({ w: k.w, cars: k.cars, promo: k.promo, avg: k.rev / k.cars, repeat: k.repeat / k.cars, days: k.days.size }));
  // flags: our codes that stopped
  const flags = codes.filter((c) => c.ours && c.pre_rate >= 1 && c.pilot === 0).map((c) => `${c.code} (${c.label}) averaged ${c.pre_rate.toFixed(1)} redemptions a day before ${PILOT_START} and has had none since; last seen ${c.last}.`);
  const stores12 = [...new Set(I.map((r) => r.store))].sort((a, b) => a - b);
  const data = JSON.stringify({ codes, days, pilots, storeLabel, stores12, PILOT_START, first, last, sum, weekly, flags });
  const fmt$ = (v) => '$' + Number(v).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const body = `
<h1>Store results</h1>
<p class="sub">What the registers saw, from the GROW back office for the ${stores12.length} JLO Group stores: every coupon code redeemed and every ticket, ${esc(first)} to ${esc(last)}. Registers sync to GROW with a delay, so the last two or three days are provisional and fill in with each daily pull. Other franchise groups are not in this feed yet.</p>
<div class="stats">
  <div class="stat"><b>${sum.red}</b><span>pilot code redemptions since ${esc(PILOT_START.slice(5))}</span></div>
  <div class="stat"><b>${sum.ads.cost ? fmt$(sum.ads.cost) : '–'}</b><span>Google Ads spend, pilot campaigns</span></div>
  <div class="stat"><b>${sum.red && sum.ads.cost ? fmt$(sum.ads.cost / sum.red) : '–'}</b><span>ad spend per redeemed car</span></div>
  <div class="stat"><b>${sum.new_ours == null ? '–' : Math.round(sum.new_ours * 100) + '%'}</b><span>first-time vehicles on our codes (others ${sum.new_other == null ? '–' : Math.round(sum.new_other * 100) + '%'})</span></div>
  <div class="stat"><b>${sum.avg_ours == null ? '–' : '$' + sum.avg_ours.toFixed(0)}</b><span>avg ticket on our codes (others $${sum.avg_other == null ? '–' : sum.avg_other.toFixed(0)})</span></div>
  <div class="stat"><b>${sum.cars}</b><span>cars at the 3 pilot stores since ${esc(PILOT_START.slice(5))}${sum.base ? ' (same weekdays, prior 4 weeks: ' + Math.round(sum.base) + ')' : ''}</span></div>
</div>
${flags.length ? `<div class="panel" style="border-left:4px solid #b45309"><b>Check with the stores:</b><ul style="margin:6px 0 0 18px">${flags.map((f) => `<li>${esc(f)}</li>`).join('')}</ul><p class="muted" style="margin:6px 0 0">Other codes kept redeeming on those days, so this is the register, not the data feed. If a code was switched off, customers showing it are being turned away or keyed under another code.</p></div>` : ''}
<h2>Pilot, day by day</h2>
<p class="sub">The three pilot stores: ${pilots.map((s) => esc(storeLabel[s] || '#' + s)).join('; ')}. Ad spend is the pilot campaigns only. "Same weekday" is the average for that weekday over the prior four weeks, so Saturday compares with Saturdays.</p>
<div class="panel" style="overflow:auto"><table id="p-days"><thead><tr><th>Day</th><th class="num">Ad spend</th><th class="num">Clicks</th><th class="num">Converting visits</th><th class="num">GG1AD22 redeemed</th><th class="num">CHICOOP redeemed</th><th class="num">Cars, 3 stores</th><th class="num">Same weekday</th><th class="num">Change</th><th class="num">New-car share on our codes</th></tr></thead><tbody></tbody></table></div>
<h2>Cars per day by pilot store</h2>
<div class="panel" style="overflow:auto"><table id="p-store"><thead><tr><th>Day</th>${pilots.map((s) => `<th class="num">${esc(storeLabel[s] || '#' + s)}</th>`).join('')}</tr></thead><tbody></tbody></table></div>
<h2>Every coupon code</h2>
<p class="sub">All codes redeemed at the ${stores12.length} stores. "Before" is ${esc(first)} to the day before the pilot; "Since" is ${esc(PILOT_START)} on. Per-day rates make the two periods comparable. Our codes are highlighted.</p>
<div class="panel"><div class="ctl"><label><input type="checkbox" id="p-ours"> our codes only</label><label>Find <input id="p-q" type="search" placeholder="code or description"></label></div>
<div class="tscroll"><table id="p-codes"><thead><tr><th>Code</th><th>Description</th><th>Category</th><th class="num">Before</th><th class="num">Per day</th><th class="num">Since</th><th class="num">Per day</th><th class="num">Avg off</th><th>Last seen</th><th>Stores, last 14 days</th></tr></thead><tbody></tbody></table></div></div>
<h2>Weekly, all ${stores12.length} stores</h2>
<div class="panel" style="overflow:auto"><table id="p-weeks"><thead><tr><th>Week of</th><th class="num">Cars</th><th class="num">With a coupon</th><th class="num">Avg ticket</th><th class="num">Repeat vehicles</th><th class="num">Days reported</th></tr></thead><tbody></tbody></table></div>
<p class="foot">Source: GROW POS Data Extractor (Neptune_Invoice_Promo and Neptune_Invoices, daily rolling 7 days, plus a one-time pull from Sept 1). No customer names, phones, emails or addresses are in the feed. Refresh: download the day's ZIPs from GROW into data/pos/raw/ and run node scripts/pos-pull.mjs.</p>
<script>
(function(){
var D=${data};function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function n(v){return v==null?'–':Number(v).toLocaleString()}function m(v){return v==null?'–':'$'+Number(v).toLocaleString('en-US',{maximumFractionDigits:0})}function pc(v){return v==null?'–':Math.round(v*100)+'%'}
var DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];function dl(d){var x=new Date(d+'T12:00:00');return DOW[x.getDay()]+' '+(x.getMonth()+1)+'/'+x.getDate()}
var prov=D.days.length?D.days.slice(-3).map(function(x){return x.d}):[];
document.querySelector('#p-days tbody').innerHTML=D.days.map(function(x){var ch=x.base?(x.cars-x.base)/x.base:null;var pilot=x.d>=D.PILOT_START;return '<tr'+(pilot?'':' class="na"')+'><td>'+dl(x.d)+(pilot?'':' <small class="muted">pre</small>')+(prov.indexOf(x.d)>=0?' <small class="muted">provisional</small>':'')+'</td><td class="num">'+(x.ads?m(x.ads.cost):'–')+'</td><td class="num">'+(x.ads?n(x.ads.clicks):'–')+'</td><td class="num">'+(x.ads?n(x.ads.conv):'–')+'</td><td class="num"><b>'+x.red+'</b></td><td class="num">'+x.chi+'</td><td class="num">'+n(x.cars)+'</td><td class="num">'+(x.base==null?'–':Math.round(x.base))+'</td><td class="num">'+(ch==null?'–':'<span class="q '+(ch>=0.1?'q-strong':ch<=-0.1?'q-risk':'q-na')+'">'+(ch>0?'+':'')+Math.round(ch*100)+'%</span>')+'</td><td class="num">'+pc(x.new_pct)+'</td></tr>'}).join('');
document.querySelector('#p-store tbody').innerHTML=D.days.map(function(x){return '<tr'+(x.d>=D.PILOT_START?'':' class="na"')+'><td>'+dl(x.d)+'</td>'+D.pilots.map(function(s){return '<td class="num">'+n(x.per[s])+'</td>'}).join('')+'</tr>'}).join('');
function codes(){var o=document.getElementById('p-ours').checked,q=(document.getElementById('p-q').value||'').toLowerCase();var rows=D.codes.filter(function(c){return (!o||c.ours)&&(!q||(c.code+' '+c.desc).toLowerCase().indexOf(q)>=0)});
  document.querySelector('#p-codes tbody').innerHTML=rows.map(function(c){return '<tr'+(c.ours?' style="background:var(--accent-soft,#fbe9ec)"':'')+'><td><b>'+esc(c.code)+'</b>'+(c.label?'<br><small class="muted">'+esc(c.label)+'</small>':'')+'</td><td>'+esc(c.desc)+'</td><td>'+esc(c.cat||'')+'</td><td class="num">'+n(c.pre)+'</td><td class="num">'+c.pre_rate.toFixed(1)+'</td><td class="num"><b>'+n(c.pilot)+'</b></td><td class="num">'+c.pilot_rate.toFixed(1)+'</td><td class="num">$'+c.avg.toFixed(2)+'</td><td>'+esc(c.last)+'</td><td class="muted">'+Object.keys(c.stores).sort(function(a,b){return c.stores[b]-c.stores[a]}).map(function(s){return '#'+s+' ('+c.stores[s]+')'}).join(', ')+'</td></tr>'}).join('')||'<tr><td colspan="10" class="muted">No matches.</td></tr>'}
document.getElementById('p-ours').addEventListener('change',codes);document.getElementById('p-q').addEventListener('input',codes);codes();
document.querySelector('#p-weeks tbody').innerHTML=D.weekly.map(function(w){return '<tr'+(w.days<7?' class="na"':'')+'><td>'+esc(w.w)+(w.days<7?' <small class="muted">partial</small>':'')+'</td><td class="num">'+n(w.cars)+'</td><td class="num">'+n(w.promo)+' <small class="muted">('+Math.round(100*w.promo/w.cars)+'%)</small></td><td class="num">$'+w.avg.toFixed(2)+'</td><td class="num">'+pc(w.repeat)+'</td><td class="num">'+w.days+'</td></tr>'}).join('');
})();
</script>`;
  return page('Store results', body, 'pos');
}

write('index.html', homePage());
write('quadrants/index.html', quadrantsPage());
write('ratings/index.html', ratingsPage());
write('campaigns/index.html', campaignsPage());
write('pos/index.html', posPage());
write('reviews/index.html', reviewsPage());
write('listing/index.html', listingPage());
write('fleet/index.html', fleetPage());
console.log(`Private dashboard built: ${rows.length} stores, ${competitors.length} competitors, ${rows.filter((r) => r.compAvg !== null).length} plotted in quadrants`);
