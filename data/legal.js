'use strict';
// Legal and accessibility pages (English). Each entry: slug, title, meta description, last-updated date, body HTML.
// Rendered by build.js at /<slug>/ with the site chrome. Plain language on purpose; have counsel review before changes.
const UPDATED = 'October 17, 2026';
const CONTACT_EMAIL = 'jiffylubechicagoland@neptuneventures.co';
const CONTACT_PHONE = '(310) 801-4959';

const privacy = {
  slug: 'privacy',
  title: 'Privacy and Call Recording Policy',
  desc: 'How jiffylubechicagoland.com collects and uses information: store finder, coupons, wallet passes, analytics, ads, call tracking, and your choices.',
  updated: UPDATED,
  body: `
<p>This policy explains what information this website collects, how it is used, and the choices you have. It is written in plain language on purpose. If anything is unclear, email us at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>.</p>

<h2>Who operates this site</h2>
<p>jiffylubechicagoland.com is operated on behalf of participating independent Jiffy Lube® franchisees in the Chicago area (the "Chicagoland co-op," "we," "us"). The site is built and maintained for them by Neptune Ventures, LLC, a marketing agency in Hermosa Beach, California. It covers only the locations listed on this site. Jiffy Lube, LLC (the franchisor) runs its own websites and services under its own privacy policy at <a href="https://www.jiffylube.com/privacy-policy" rel="noopener">jiffylube.com/privacy-policy</a>. Each store is independently owned and is responsible for information it collects from you in person or on its own phone lines.</p>

<h2>Summary of what we collect and why</h2>
<table>
<thead><tr><th>What</th><th>Why</th><th>Shared with</th></tr></thead>
<tbody>
<tr><td>A ZIP code you type into the store finder</td><td>To list the nearest stores</td><td>A free ZIP lookup service (Zippopotam) receives the ZIP only, nothing else</td></tr>
<tr><td>Your approximate location, only if you tap "Use my location" and allow it</td><td>To list the nearest stores, once</td><td>Nobody. It is used in your browser and not stored</td></tr>
<tr><td>Pages you view and buttons you tap (get coupon, copy code, add to wallet, call, directions), your device type, browser, and IP address</td><td>To measure which pages and ads lead to coupon use, calls and visits, and to improve the site</td><td>Google Analytics, Google Ads, Vercel Web Analytics, Cloudflare (hosting and security)</td></tr>
<tr><td>Which campaign link brought you here (a code in the link such as jl= or utm_term=)</td><td>To show you the coupon for that campaign and credit the right ad</td><td>Stored in your browser for 30 days; reported to Google Analytics</td></tr>
<tr><td>Coupon pass data if you add a coupon to Apple Wallet or Google Wallet</td><td>To put the coupon on your phone</td><td>Apple or Google, under their own privacy policies. We receive no personal information back</td></tr>
<tr><td>When you call a store from this site, the call time, length and your area code (not the conversation)</td><td>To know which ads and pages lead to calls</td><td>Google Ads call reporting</td></tr>
</tbody>
</table>
<p>We do not ask for your name, email, payment details or vehicle information anywhere on this site. We do not use facial recognition or other biometric technology on this site. We do not sell your personal information for money.</p>

<h2>Information you give us</h2>
<p>The only thing this site asks you to type is a ZIP code. If you email or call us, we keep what you tell us for as long as needed to answer you and keep a record of the conversation.</p>

<h2>Information collected automatically</h2>
<p>Like most websites, this one uses analytics and advertising tools that set cookies and similar identifiers in your browser:</p>
<ul>
<li><strong>Google Analytics</strong> records pages viewed, the store pages you open, whether you reveal, copy or add a coupon to your wallet, and whether you tap to call or get directions, along with your IP address, device and browser type and the general area you are in.</li>
<li><strong>Google Ads</strong> records whether you arrived from one of our ads and whether you then took one of those actions, so we can see which ads work. Google may also use this to show you our ads on other sites ("targeted advertising") unless you opt out below.</li>
<li><strong>Vercel Web Analytics</strong> (our hosting company) counts page views and the same actions without cookies, using a short-lived hashed identifier.</li>
<li><strong>Cloudflare</strong> protects the site from attacks and logs IP addresses and request details for security.</li>
</ul>

<h2>Location</h2>
<p>If you tap "Use my location," your browser asks for permission and we use your approximate location one time, in your browser, to sort stores by distance. It is not sent to us or stored. The site never requests your location without you tapping that button.</p>

<h2>Calls and call recording</h2>
<p>Phone numbers on this site may be Google forwarding numbers. When you call one, the call rings through to the store as normal, and Google reports to us the date, time, length of the call and the caller's area code so we can tell which pages and ads lead to calls. This website does not record conversations.</p>
<p>Individual stores may record calls on their own lines for quality and training. Where a store records calls, you will hear a notice at the start of the call. Illinois law requires everyone on a call to consent to recording. If you do not want to be recorded, say so to the person who answers, or visit the store in person.</p>

<h2>Coupons and wallet passes</h2>
<p>Coupon codes on this site are the same for everyone who sees a given offer; they are not tied to you personally. If you add a coupon to Apple Wallet or Google Wallet, the pass is created on our server from the store and offer you chose and handed to Apple or Google. Apple and Google handle the pass on your phone under their own policies. If you allow it, the pass can appear on your lock screen when you are near the store; that uses your phone's location and never reaches us.</p>

<h2>How we use information</h2>
<ul>
<li>To show you nearby stores, hours and coupons.</li>
<li>To measure which ads, campaigns and pages lead to coupon use, calls and store visits, and to improve the site.</li>
<li>To show you our ads on Google and other sites after you visit, unless you opt out below.</li>
<li>To answer your email or call.</li>
<li>To keep the site secure and comply with law.</li>
</ul>

<h2>Who we share information with</h2>
<ul>
<li><strong>Service providers</strong> that run the site and our marketing: Google (Analytics, Ads, Maps, Wallet), Apple (Wallet), Vercel (hosting and analytics), Cloudflare (security and delivery), and Zippopotam (ZIP code lookup). They may use the information only to provide their service to us, except as described in their own policies for the parts they control.</li>
<li><strong>The franchisee</strong> that owns the store you contact or visit.</li>
<li><strong>Jiffy Lube, LLC</strong> may receive summary reporting and, at the counter, the coupon code you present. We do not send it your browsing data.</li>
<li><strong>Authorities</strong> when required by law, or to protect against fraud or abuse of the site.</li>
</ul>
<p>Sending visit data to advertising platforms so they can show you our ads may count as "selling" or "sharing" personal information, or "targeted advertising," under some state privacy laws. You can opt out below.</p>

<h2 id="choices">Your choices</h2>
<div class="choices">
<p><strong>Do Not Sell or Share My Personal Information.</strong> Press the button to stop this site from sending your visit data to advertising platforms for targeted ads. The choice is saved in this browser for one year. It applies to this browser and device; repeat it on other devices.</p>
<p><button class="btn btn--primary js-optout" type="button" aria-describedby="optout-status">Do Not Sell or Share My Personal Information</button></p>
<p id="optout-status" class="status-msg" role="status" aria-live="polite"></p>
<p>We also honor the <strong>Global Privacy Control</strong> signal. If your browser or an extension sends it, you are opted out automatically and the button above will say so.</p>
</div>
<ul>
<li><strong>Google Analytics:</strong> install Google's opt-out browser add-on at <a href="https://tools.google.com/dlpage/gaoptout" rel="noopener">tools.google.com/dlpage/gaoptout</a>.</li>
<li><strong>Google ads:</strong> manage ad personalization at <a href="https://adssettings.google.com" rel="noopener">adssettings.google.com</a>.</li>
<li><strong>Cookies:</strong> you can clear or block cookies in your browser settings. The site still works; the coupon code you were shown may reset.</li>
<li><strong>Call recording:</strong> tell the person who answers that you do not want to be recorded, or visit the store in person.</li>
<li><strong>Location:</strong> only shared when you tap "Use my location." You can revoke the permission in your browser at any time.</li>
</ul>

<h2>Your rights</h2>
<p>Depending on where you live, you may have the right to know what personal information we hold about you, to correct or delete it, to get a copy, and to opt out of targeted advertising. We honor these requests for everyone who contacts us, whether or not your state's law requires it. This site holds very little that can be tied to you personally; most of what we collect is identified only by a cookie in your browser, so the most effective step is usually the opt-out above and clearing your cookies.</p>
<p>To make a request, email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> with "Privacy request" in the subject line, or call ${CONTACT_PHONE}. We will respond within 45 days. We may ask for information to confirm the request is yours. If we decline a request, you may appeal by replying to our response, and we will answer the appeal within 45 days. You will not be treated differently for exercising these rights.</p>

<h2>How long we keep information</h2>
<ul>
<li>Google Analytics event data: 14 months, then aggregated.</li>
<li>Google Ads and call reporting: as set by Google, up to 24 months in our account reports.</li>
<li>Vercel and Cloudflare logs: 30 days or less.</li>
<li>Your campaign code and opt-out choice: stored in your browser for 30 days and one year respectively.</li>
<li>Emails and call notes: as long as needed to handle your request, then up to one year.</li>
</ul>

<h2>Children</h2>
<p>This site is for drivers and is not directed to children under 13. We do not knowingly collect information from children. If you believe a child has given us information, email us and we will delete it.</p>

<h2>Security</h2>
<p>The site is served only over HTTPS, hosted on infrastructure with modern security controls, and access to reporting data is limited to the people who need it. No website can promise perfect security.</p>

<h2>Changes to this policy</h2>
<p>When we change this policy we will update the date at the top. For a material change we will add a notice at the top of this page for 30 days.</p>

<h2>Contact</h2>
<p>Email: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a><br>Phone: ${CONTACT_PHONE}<br>Mail: Jiffy Lube Chicagoland co-op, c/o Neptune Ventures, LLC, 827 Sunset Drive, Hermosa Beach, CA 90254</p>
<p>For questions about a specific store visit, contact the store directly using the phone number on its page.</p>
<p>Jiffy Lube®, the Jiffy Lube design mark, and Jiffy Lube Signature Service® are registered trademarks of Jiffy Lube, LLC, used here by its franchisees.</p>
`
};

const terms = {
  slug: 'terms',
  title: 'Terms of Use',
  desc: 'The terms that apply to using jiffylubechicagoland.com, including coupons, store information, wallet passes, and limits on liability.',
  updated: UPDATED,
  body: `
<p>Welcome. By using jiffylubechicagoland.com (the "site") you agree to these terms. If you do not agree, please do not use the site. These terms are written in plain language; where a word has a special meaning we say so.</p>

<h2>Who we are</h2>
<p>The site is operated on behalf of participating independent Jiffy Lube® franchisees in the Chicago area (the "Chicagoland co-op," "we," "us"). It is built and maintained for them by Neptune Ventures, LLC. Each store listed on the site is independently owned and operated. Jiffy Lube, LLC, the franchisor, does not operate this site; its own websites are governed by its own terms at <a href="https://www.jiffylube.com/terms-of-use" rel="noopener">jiffylube.com/terms-of-use</a>.</p>

<h2>Coupons and offers</h2>
<ul>
<li>Coupons on this site are valid only at the participating locations shown, for the services described, until the expiration date printed on the coupon.</li>
<li>One coupon per vehicle per visit. Coupons cannot be combined with any other offer or discount and have no cash value.</li>
<li>Show the coupon code at the counter before service begins. A code shown on screen, printed, or saved to Apple Wallet or Google Wallet is accepted the same way.</li>
<li>The store applies the discount. If a store cannot honor a coupon for any reason, the store will tell you before work starts, and you may decline the service.</li>
<li>We may change, replace or withdraw an offer at any time. A coupon you have already saved remains valid until its printed expiration date at participating locations.</li>
<li>Coupon codes are for personal, non-commercial use. Do not resell, mass-distribute or misuse codes.</li>
</ul>

<h2>Store information</h2>
<p>Hours, phone numbers, addresses, services, wait-time guidance and Google ratings on the site come from the stores, from Google, and from public sources. We update them regularly but they can be out of date, and hours may change for holidays or weather. If a visit depends on it, call the store first. "About 15 minutes" and similar time statements are based on national averages for oil changes only and are not a promise for any particular visit.</p>

<h2>Wallet passes</h2>
<p>Adding a coupon to Apple Wallet or Google Wallet uses Apple's and Google's services under their own terms. The pass on your phone is a convenience; the coupon's terms are the ones above.</p>

<h2>Trademarks and content</h2>
<p>Jiffy Lube®, the Jiffy Lube design mark, Jiffy Lube Signature Service® and related marks are registered trademarks of Jiffy Lube, LLC and are used on this site by its franchisees under license. Other names and logos belong to their owners. The text, photos, graphics and code on this site belong to us or our licensors. You may view, print and save pages for your personal, non-commercial use. Any other use needs our written permission.</p>

<h2>Acceptable use</h2>
<p>Do not use the site to break the law, to interfere with or overload the site, to scrape or copy it in bulk, to impersonate anyone, to generate or redeem coupon codes fraudulently, or to introduce anything harmful. We may limit or block access for misuse.</p>

<h2>Links to other services</h2>
<p>The site links to Google Maps, Apple Wallet, Google Wallet and other third-party services. We do not control them and are not responsible for their content or practices. Their terms apply when you use them.</p>

<h2>Privacy</h2>
<p>Our <a href="/privacy/">Privacy and Call Recording Policy</a> explains what information the site collects and your choices, including how to opt out of targeted advertising. It is part of these terms.</p>

<h2>No warranties</h2>
<p>The site and its content are provided "as is" and "as available." To the fullest extent the law allows, we disclaim all warranties, express or implied, including that the site will be error-free, uninterrupted or free of harmful components, and any implied warranties of merchantability, fitness for a particular purpose and non-infringement. Nothing in these terms limits any warranty that applies to services you buy at a store; those are between you and the store.</p>

<h2>Limitation of liability</h2>
<p>To the fullest extent the law allows, we, the participating franchisees, Neptune Ventures, LLC, and our respective owners, employees and agents are not liable for any indirect, incidental, special, consequential or punitive damages arising from your use of the site, and our total liability for any claim related to the site is limited to one hundred dollars ($100). Some states do not allow some of these limits, so they may not apply to you. This section is about the website only; it does not limit a store's responsibility for services it performs on your vehicle.</p>

<h2>Indemnity</h2>
<p>If your misuse of the site or violation of these terms causes a claim against us, you agree to cover our reasonable costs, including legal fees, of defending it.</p>

<h2>Governing law and disputes</h2>
<p>These terms are governed by the laws of the State of Illinois, without regard to its conflict-of-law rules. If you have a dispute with us about the site, email us first at <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> and we will try to resolve it within 30 days. Any claim that cannot be resolved that way must be brought in the state or federal courts located in Cook County, Illinois, and you consent to their jurisdiction. Any claim must be filed within one year after it arises. Disputes about services performed at a store are between you and that store.</p>

<h2>Changes to these terms</h2>
<p>We may update these terms by posting a new version here with a new date. Using the site after a change means you accept the new terms.</p>

<h2>General</h2>
<p>If any part of these terms is found unenforceable, the rest still applies. Our not enforcing a term is not a waiver of it. These terms and the privacy policy are the entire agreement between you and us about the site.</p>

<h2>Contact</h2>
<p>Email: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a><br>Phone: ${CONTACT_PHONE}<br>Mail: Jiffy Lube Chicagoland co-op, c/o Neptune Ventures, LLC, 827 Sunset Drive, Hermosa Beach, CA 90254</p>
`
};

const accessibility = {
  slug: 'accessibility',
  title: 'Accessibility Statement',
  desc: 'Our commitment to making jiffylubechicagoland.com usable by everyone, what we have done, what we test, known limitations, and how to get help.',
  updated: UPDATED,
  body: `
<p>The Chicagoland Jiffy Lube® franchisees want everyone to be able to find a store, see its hours and use a coupon on this site, whatever device or assistive technology they use. We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at Level AA on every page.</p>

<h2>What we have done</h2>
<ul>
<li>Every page has a "Skip to main content" link, proper landmarks and a single logical heading outline, so screen reader users can move around quickly.</li>
<li>Every control is a real button or link, works with a keyboard, and shows a clear focus ring. The sticky bar on phones never covers a focused element.</li>
<li>The coupon reveal announces itself as expandable, moves focus to the next step, and confirms "copied" through a status message, not only a color change.</li>
<li>Text has at least 4.5:1 contrast against its background, and buttons and icons at least 3:1. Open or closed status is written in words, not only shown by color.</li>
<li>The popular-times chart has a text summary for screen readers. Maps and wallet buttons have text alternatives.</li>
<li>The store finder works with a keyboard, announces results, and reports errors next to the field.</li>
<li>Animations respect the "reduce motion" setting, and the site works at 200% zoom and on 320-pixel-wide screens without horizontal scrolling.</li>
<li>No accessibility overlay or widget is used. Accessibility is built into the pages themselves.</li>
</ul>

<h2>How we test</h2>
<ul>
<li>Automated WCAG 2.2 AA checks (axe-core) run on every build of the site, and a build with a violation does not ship.</li>
<li>Google Lighthouse accessibility audits on mobile.</li>
<li>Keyboard-only navigation of every page type.</li>
<li>Screen reader checks with VoiceOver on iPhone, which is how most of our visitors would use one.</li>
</ul>
<p>Last reviewed: ${UPDATED}.</p>

<h2>Known limitations</h2>
<ul>
<li>The embedded Google Map on store pages is provided by Google and is not fully accessible. The address, a "Get Directions" link and a link to the store on Google Maps are provided as alternatives.</li>
<li>Apple Wallet, Google Wallet and Google Maps open in those companies' apps or sites, whose accessibility we do not control.</li>
<li>Automated checks catch only part of what matters. If you find something that does not work for you, please tell us.</li>
</ul>

<h2>Get help or report a problem</h2>
<p>Email <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a> or call ${CONTACT_PHONE}. Tell us the page and what happened, and we will respond within two business days and work to fix it. Any coupon on this site can also be honored by phone or in person at the store: call the store, mention the offer, and the counter staff will apply it. Store phone numbers are on every store page.</p>
`
};

module.exports = { pages: [privacy, terms, accessibility], UPDATED, CONTACT_EMAIL, CONTACT_PHONE };
