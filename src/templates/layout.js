/** The document shell: head, header, footer. Every page goes through this. */

import { site, nav, primaryCta } from "../data/site.js";
import { esc, attr, cx, map, when } from "./html.js";
import { arrow, menu, close, sun, moon, social as socialIcons } from "./icons.js";

const YEAR = new Date().getFullYear();

// One family, per the brand sheet. Four weights: Light for the tracked-out
// lines, Medium for body, SemiBold/Bold for headings and the lockup.
const FONTS =
  "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&display=swap";

/**
 * Applies the stored theme before first paint.
 *
 * Inlined and render-blocking on purpose: the previous site set the theme from
 * a deferred script at the end of <body>, so a reader on dark mode got a white
 * flash on every navigation. Four lines here removes it.
 */
const THEME_BOOT = `(function(){var d=document.documentElement;d.classList.add("js");try{var t=localStorage.getItem("ecell-theme");if(t==="light"||t==="dark")d.dataset.theme=t}catch(e){}})()`;

/**
 * The horizontal lockup from the brand sheet: the symbol, a hairline divider,
 * then "E-CELL | PSGIM" over "PSG INSTITUTE OF MANAGEMENT".
 *
 * The symbol is the supplied artwork (src/logo.jpeg), matted off white into a
 * transparent PNG by `node tools/make-logo.mjs`. `alt` is empty on purpose:
 * the anchor already carries the organisation's name, so describing the image
 * as well would make a screen reader announce it twice.
 */
function brand() {
  return `<a class="brand" href="/" aria-label="${attr(site.name)} — home">
  <img class="brand__mark" src="/logo.png" srcset="/logo.png 1x, /logo@2x.png 2x"
       width="443" height="512" alt="" decoding="async">
  <span class="brand__lockup">
    <span class="brand__word"><b>E&#8209;CELL</b><i aria-hidden="true">|</i><em>PSGIM</em></span>
    <span class="brand__sub">PSG Institute of Management</span>
  </span>
</a>`;
}

function header(current) {
  return `<header class="site-header" id="siteHeader">
  <div class="wrap site-header__inner">
    ${brand()}
    <nav class="site-nav" id="siteNav" aria-label="Primary">
      <ul class="site-nav__list">
        ${map(nav, (item) => {
          const isCurrent = item.href === current;
          return `<li><a class="${cx("site-nav__link", item.highlight && "site-nav__link--flag")}" href="${attr(item.href)}"${isCurrent ? ' aria-current="page"' : ""}>${esc(item.label)}</a></li>`;
        })}
      </ul>
      <div class="site-nav__end">
        <a class="btn btn--primary btn--sm" href="${attr(primaryCta.href)}">
          <span class="btn__label">${esc(primaryCta.label)}</span><span class="btn__arr" aria-hidden="true">${arrow}</span>
        </a>
      </div>
    </nav>
    <div class="site-header__tools">
      <button class="icon-btn" type="button" id="themeBtn" aria-label="Switch to dark theme">
        <span class="icon-btn__sun" aria-hidden="true">${sun}</span>
        <span class="icon-btn__moon" aria-hidden="true">${moon}</span>
      </button>
      <button class="icon-btn nav-toggle" type="button" id="navBtn" aria-label="Open menu" aria-expanded="false" aria-controls="siteNav">
        <span class="nav-toggle__open" aria-hidden="true">${menu}</span>
        <span class="nav-toggle__close" aria-hidden="true">${close}</span>
      </button>
    </div>
  </div>
  <span class="site-header__progress" id="scrollProgress" aria-hidden="true"></span>
</header>`;
}

/**
 * A social link. When the account URL has not been confirmed the handle
 * renders as text rather than as a link to "#", which is what the previous
 * site shipped on all five icons.
 */
function socialItem(s) {
  const icon = socialIcons[s.icon] ?? "";
  if (!s.url) {
    return `<li class="social__item social__item--flat"><span class="social__icon" aria-hidden="true">${icon}</span><span>${esc(s.handle)}</span><span class="sr-only"> — ${esc(s.name)}, link to be confirmed</span></li>`;
  }
  return `<li class="social__item"><a href="${attr(s.url)}" target="_blank" rel="noopener noreferrer"><span class="social__icon" aria-hidden="true">${icon}</span><span>${esc(s.handle)}</span><span class="sr-only"> on ${esc(s.name)} (opens in a new tab)</span></a></li>`;
}

function footer() {
  const email = site.contact.email;
  return `<footer class="site-footer">
  <div class="wrap">
    <div class="site-footer__top">
      <p class="site-footer__say">${esc(site.tagline)}</p>
      <a class="site-footer__cta" href="${attr(primaryCta.href)}">
        <span>${esc(primaryCta.label)}</span><span aria-hidden="true">${arrow}</span>
      </a>
    </div>
    <div class="site-footer__cols">
      <div class="site-footer__about">
        ${brand()}
        <p>The student-run Entrepreneurship Cell of ${esc(site.institute)}, ${esc(site.city)}.</p>
      </div>
      <nav class="site-footer__col" aria-label="Footer">
        <h2>Explore</h2>
        <ul>${map(nav, (i) => `<li><a href="${attr(i.href)}">${esc(i.label)}</a></li>`)}<li><a href="/contact/">Contact</a></li><li><a href="/control/">Control</a></li></ul>
      </nav>
      <div class="site-footer__col">
        <h2>Find us</h2>
        <address>${map(site.address.lines, (l) => `<span>${esc(l)}</span>`)}</address>
        <p class="site-footer__mail">${
          email.pending
            ? `${esc(email.value)} ${`<span class="pending pending--inline"><span class="pending__dot" aria-hidden="true"></span>to be confirmed</span>`}`
            : `<a href="mailto:${attr(email.value)}">${esc(email.value)}</a>`
        }</p>
      </div>
      <div class="site-footer__col">
        <h2>Follow</h2>
        <ul class="social">${map(site.social, socialItem)}</ul>
      </div>
    </div>
    <div class="site-footer__legal">
      <span>&copy; ${YEAR} ${esc(site.name)}</span>
      <span>Built in-house by ${esc(site.credit.name)}</span>
    </div>
  </div>
</footer>`;
}

export function layout({ slug, title, description, body, bodyClass, ogType = "website", scripts = [], noindex = false }) {
  const pageTitle = slug === "/" ? site.title : `${title} — ${site.name}`;
  const desc = description ?? site.description;
  const canonical = `${site.url}${slug}`;
  const ogImage = `${site.url}/og.png`;

  return `<!doctype html>
<html lang="en" data-theme-default="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${attr(desc)}">
<link rel="canonical" href="${attr(canonical)}">
${when(noindex, '<meta name="robots" content="noindex, nofollow">')}
<meta name="theme-color" content="#05101f" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#f5f8fc" media="(prefers-color-scheme: light)">

<meta property="og:type" content="${attr(ogType)}">
<meta property="og:site_name" content="${attr(site.name)}">
<meta property="og:title" content="${attr(pageTitle)}">
<meta property="og:description" content="${attr(desc)}">
<meta property="og:url" content="${attr(canonical)}">
<meta property="og:image" content="${attr(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${attr(site.name)} — ${attr(site.tagline)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${attr(pageTitle)}">
<meta name="twitter:description" content="${attr(desc)}">
<meta name="twitter:image" content="${attr(ogImage)}">

<link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png">
<link rel="apple-touch-icon" href="/icon-180.png">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONTS}">
<link rel="stylesheet" href="/assets/site.css">
<script>${THEME_BOOT}</script>
<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: site.longName,
    alternateName: site.name,
    url: site.url,
    slogan: site.tagline,
    foundingDate: String(site.founded),
    parentOrganization: { "@type": "CollegeOrUniversity", name: site.institute },
    address: {
      "@type": "PostalAddress",
      streetAddress: "Avinashi Road, Peelamedu",
      addressLocality: site.city,
      addressRegion: "Tamil Nadu",
      postalCode: "641004",
      addressCountry: "IN",
    },
  })}</script>
</head>
<body${bodyClass ? ` class="${attr(bodyClass)}"` : ""}>
<a class="skip" href="#main">Skip to content</a>
${when(site.notice.show, `<div class="notice"><div class="wrap">${esc(site.notice.text)}</div></div>`)}
${header(slug)}
<main id="main">
${body}
</main>
${footer()}
<script src="/assets/app.js" defer></script>
${map(scripts, (s) => `<script src="${attr(s)}" defer></script>`)}
</body>
</html>
`;
}
