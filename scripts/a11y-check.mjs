#!/usr/bin/env node
// Build-time WCAG 2.2 AA check: runs axe-core (via jsdom) on a representative set of built pages.
// Exits non-zero on any violation so a broken build does not ship.   node scripts/a11y-check.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const axeSource = fs.readFileSync(path.join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
const pages = ['index.html', 'store/evanston-dempster-st/index.html', 'coupon/evanston-dempster-st/index.html', 'free-air/evanston-dempster-st/index.html', 'free-battery/joliet-n-larkin-ave/index.html',
  'es/index.html', 'es/coupon/joliet-w-jefferson-st/index.html', 'es/store/joliet-n-larkin-ave/index.html', 'privacy/index.html', 'terms/index.html', 'accessibility/index.html', '404.html'];
let failed = 0;
for (const rel of pages) {
  const html = fs.readFileSync(path.join(ROOT, 'docs', rel), 'utf8').replace(/<script[\s\S]*?<\/script>/gi, ''); // static HTML only; runtime behavior is tested in the browser
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
  dom.window.eval(axeSource);
  const results = await dom.window.axe.run(dom.window.document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] }, rules: { 'color-contrast': { enabled: false } } }); // jsdom has no layout; contrast is checked in the browser
  const v = results.violations;
  if (v.length) { failed++; console.log(`FAIL ${rel}`); for (const x of v) console.log(`  [${x.impact}] ${x.id}: ${x.help} (${x.nodes.length}) e.g. ${x.nodes[0].target[0]}`); }
  else console.log(`ok   ${rel} (${results.passes.length} rules passed)`);
}
if (failed) { console.error(`\n${failed} page(s) with accessibility violations`); process.exit(1); }
console.log('\nAccessibility check passed');
