#!/usr/bin/env node
// Post-build step: emits sitemap.xml, robots.txt and _headers (if missing)
// into the prerendered static output directory. Runs after `ng build`.
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const SITE_URL = 'https://psgim-ecell.pages.dev';

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

const routes = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/about/', changefreq: 'monthly', priority: '0.8' },
  { path: '/initiatives/', changefreq: 'monthly', priority: '0.8' },
  { path: '/events/', changefreq: 'weekly', priority: '0.9' },
  { path: '/team/', changefreq: 'monthly', priority: '0.7' },
  { path: '/gallery/', changefreq: 'monthly', priority: '0.6' },
  { path: '/nec/', changefreq: 'weekly', priority: '0.9' },
  { path: '/contact/', changefreq: 'monthly', priority: '0.8' },
  { path: '/soon/', changefreq: 'monthly', priority: '0.5' },
];

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

Sitemap: ${SITE_URL}/sitemap.xml
`;
writeFileSync(path.join(outDir, 'robots.txt'), robots);

const headersPath = path.join(outDir, '_headers');
if (!existsSync(headersPath)) {
  const headers = `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: geolocation=(), camera=(), microphone=()

/*.js
  Cache-Control: public, max-age=3600, must-revalidate

/*.css
  Cache-Control: public, max-age=3600, must-revalidate

/*.html
  Cache-Control: public, max-age=0, must-revalidate

/og.png
  Cache-Control: public, max-age=86400
`;
  writeFileSync(headersPath, headers);
  console.log('[postbuild] wrote _headers (not copied from public/)');
} else {
  console.log('[postbuild] _headers already present from public/, leaving as-is');
}

console.log('[postbuild] done: sitemap.xml, robots.txt, _headers');
