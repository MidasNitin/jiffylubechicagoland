# Jiffy Lube Chicagoland website

Static website for jiffylubechicagoland.com, cut from the Figma "Jiffy" design.
One home page (location finder), one store page and one coupon page for each of the
104 Chicagoland Jiffy Lube locations. No framework, no server: plain HTML, CSS and JavaScript.

## How it is put together

| Folder / file | What it is |
| --- | --- |
| `data/stores.json` | The 104 stores: address, phone, hours, Google rating, map link. Phone + hours came from Google Places. |
| `data/site.json` | Everything else you might want to change: the offer ($16 OFF), coupon code, expiration, copy text, services list, legal lines, analytics ID. |
| `assets/` | Fonts, CSS, JavaScript, logo/icons (SVG) and photos exported from Figma. |
| `build.js` | Reads the two data files and writes every page into `docs/`. |
| `docs/` | The finished site. This is what GitHub Pages publishes. Never edit files here by hand; they get overwritten. |
| `figma/` | Raw export from Figma (renders, JSON) kept for reference. Not published. |

## Making a change (the whole workflow)

1. Edit `data/site.json` or `data/stores.json` (or the CSS/JS in `assets/`).
2. Rebuild the site:

```bash
cd ~/PerezClaude/jiffy-site && node build.js
```

3. Preview locally (then open http://localhost:8787 in your browser):

```bash
cd ~/PerezClaude/jiffy-site && python3 -m http.server 8787 --directory docs
```

4. Publish:

```bash
cd ~/PerezClaude/jiffy-site && git add -A && git commit -m "Update site" && git push
```

GitHub Pages picks up the push and the live site updates in about a minute.

## Common edits

- **Change the offer or coupon code:** `data/site.json` → `offer`.
- **Change the expiration date:** `data/site.json` → `offer.expires` (used in the coupon and the legal footer).
- **Add a store manager to a store page:** in `data/stores.json` set `manager_name` (for example `"Brian Olson"`) and `manager_photo` (a file in `assets/img/`, for example `"manager-brian.jpg"`). The page then shows the manager photo and the "Led by …" copy.
- **Different coupon code per store:** set `coupon_code` on that store in `data/stores.json`. (Not wired up yet; all stores use `offer.code`.)
- **Turn on Google Analytics:** `data/site.json` → `analytics.ga4_id`.
- **Hide the Popular times chart:** `data/site.json` → `popular_times.enabled: false`.

## Things that are placeholders

- **Popular times** bars are a generic pattern, not real data. Google doesn't provide this through its API. Replace the numbers in `data/site.json` or turn the section off.
- **Franchisee legal entity** in the footer uses each store's franchise group name from the store list on store pages, and "participating independent Jiffy Lube® franchisees" on the home page. Check this with legal.
- **Regional offer** on the home page: the Figma design showed `<generic offer>`. The site currently shows the same $16 OFF offer as the store pages.

## Refreshing phone numbers, hours and ratings from Google

The store data was pulled from the Google Places API using the key in
`../jiffy-lube-competitor-map/.env`. To refresh it, ask Claude to re-run the
Places lookup; it costs well under $5 for all 104 stores.

## Lighthouse

Built for top Lighthouse scores: self-hosted fonts, inline CSS, deferred JavaScript, SVG icon sprite,
lazy-loaded Google Map that only loads when scrolled into view, responsive photos, structured data (schema.org),
sitemap, robots.txt, canonical URLs and WCAG AA colour contrast. Last local run: 99–100 across
Performance, Accessibility, Best Practices and SEO on mobile.
