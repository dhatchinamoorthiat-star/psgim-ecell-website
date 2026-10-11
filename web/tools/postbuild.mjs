#!/usr/bin/env node
// Post-build step: emits sitemap.xml, robots.txt and _headers (if missing)
// into the prerendered static output directory. Runs after `ng build`.
import { copyFileSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ORIGIN_TOKEN, injectOrigin, readSiteOrigin } from './site-origin.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// The canonical origin comes from web/site.config.json (one source for the app and the build).
const SITE_URL = readSiteOrigin();

function findBrowserDir() {
  const candidates = [
    path.join(root, 'dist', 'web', 'browser'),
    path.join(root, 'dist', 'web'),
  ];
  for (const c of candidates) {
    if (existsSync(c) && existsSync(path.join(c, 'index.html'))) return c;
  }
  // fall back: search dist for a dir containing index.html
  const distDir = path.join(root, 'dist');
  if (existsSync(distDir)) {
    const stack = [distDir];
    while (stack.length) {
      const dir = stack.pop();
      const entries = readdirSync(dir);
      if (entries.includes('index.html')) return dir;
      for (const e of entries) {
        const p = path.join(dir, e);
        if (statSync(p).isDirectory()) stack.push(p);
      }
    }
  }
  throw new Error('Could not find prerendered browser output directory under dist/');
}

const outDir = findBrowserDir();
console.log(`[postbuild] writing SEO artifacts into ${outDir}`);

// Every prerendered route is a directory holding an index.html, so the
// sitemap is derived from the build output rather than a hand-kept list
// (which drifted: it had 9 of 18 routes). Routes that are noindex are
// excluded here and disallowed in robots.txt below.
const EXCLUDED = new Set(['/control/', '/platform/']);
const PRIORITY = { '/': ['weekly', '1.0'], '/events/': ['weekly', '0.9'], '/nec/': ['weekly', '0.9'], '/blogs/': ['weekly', '0.8'] };

function collectRoutes(dir, prefix = '/') {
  const found = [];
  if (existsSync(path.join(dir, 'index.html'))) found.push(prefix);
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) found.push(...collectRoutes(p, `${prefix}${e}/`));
  }
  return found;
}

const routes = collectRoutes(outDir)
  .filter((r) => !EXCLUDED.has(r))
  .sort()
  .map((r) => {
    const [changefreq, priority] = PRIORITY[r] ?? ['monthly', '0.7'];
    return { path: r, changefreq, priority };
  });

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) => `  <url>
    <loc>${SITE_URL}${r.path}</loc>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`;
writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap);

const robots = `User-agent: *
Allow: /
Disallow: /control/
Disallow: /platform/

Sitemap: ${SITE_URL}/sitemap.xml
`;
writeFileSync(path.join(outDir, 'robots.txt'), robots);

// index.html carries ORIGIN_TOKEN in its structured data (it is static and
// cannot import the config). Fill it in every emitted HTML file — the
// prerendered pages and the CSR shell — and in the SSR bundle's .mjs chunks,
// which embed the same templates as strings. Then refuse to finish if any
// token survives anywhere in dist, so a build can never ship the placeholder.
function htmlFiles(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) out.push(...htmlFiles(p));
    // .mjs: the SSR bundle (dist/web/server) embeds the HTML templates as JS strings.
    else if (e.endsWith('.html') || e.endsWith('.mjs')) out.push(p);
  }
  return out;
}
const distRoot = path.join(root, 'dist');
let injected = 0;
for (const file of htmlFiles(existsSync(distRoot) ? distRoot : outDir)) {
  const html = readFileSync(file, 'utf8');
  if (html.includes(ORIGIN_TOKEN)) {
    writeFileSync(file, injectOrigin(html, SITE_URL));
    injected++;
  }
}
const leftover = htmlFiles(existsSync(distRoot) ? distRoot : outDir).filter((f) => readFileSync(f, 'utf8').includes(ORIGIN_TOKEN));
if (leftover.length) {
  console.error(`[postbuild] ${ORIGIN_TOKEN} left in: ${leftover.join(', ')}`);
  process.exit(1);
}
console.log(`[postbuild] canonical origin ${SITE_URL} written into ${injected} file(s)`);

// web/public/_headers is the single source of truth and is copied into the
// output by the Angular build. If it is ever missing, copy it from source
// rather than writing a second, divergent copy (the old fallback here set
// X-Frame-Options: DENY while production served SAMEORIGIN).
const headersPath = path.join(outDir, '_headers');
if (!existsSync(headersPath)) {
  copyFileSync(path.join(root, 'public', '_headers'), headersPath);
  console.log('[postbuild] _headers was missing from the build; copied web/public/_headers');
} else {
  console.log('[postbuild] _headers already present from public/, leaving as-is');
}

console.log('[postbuild] done: sitemap.xml, robots.txt, _headers');
