/**
 * PSGIM E-Cell — static site build.
 *
 * Zero dependencies on purpose. The output is plain HTML, one stylesheet and
 * one small script: exactly what the site was before, except the header,
 * footer, navigation and every piece of content now come from one place
 * instead of being copy-pasted across eight hand-edited files.
 *
 *   node build.mjs           build once into dist/
 *   node build.mjs --serve   build, then serve dist/ on :4321 for previewing
 */

import { mkdir, rm, writeFile, readFile, readdir, stat, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "dist");

/** Stylesheets are concatenated in this order — cascade depends on it. */
const STYLE_ORDER = [
  "tokens.css",   // design tokens: colour, type scale, spacing, motion
  "base.css",     // reset, document defaults, typography primitives
  "layout.css",   // containers, grid, section rhythm
  "components.css", // buttons, chips, cards, nav, footer — the reusable parts
  "sections.css", // page-specific compositions
  "motion.css",   // reveal/scroll animation, reduced-motion overrides
];

/**
 * Strip comments and collapse whitespace.
 *
 * The stylesheets are heavily commented because the next person to edit them
 * needs to know *why* a rule exists — but none of that belongs on the wire.
 * This is deliberately conservative: it removes `/* … *\/` blocks and squeezes
 * runs of whitespace, and does nothing else. It does not reorder, merge or
 * rewrite anything, so it cannot change what the CSS means.
 *
 * Pass --dev to keep the comments when you are debugging the built file.
 */
function squeezeCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .replace(/\s*([{}:;,])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

async function buildCss({ dev = false } = {}) {
  const parts = [];
  for (const name of STYLE_ORDER) {
    const path = join(SRC, "styles", name);
    if (!existsSync(path)) throw new Error(`missing stylesheet: src/styles/${name}`);
    parts.push(`/* ── ${name} ${"─".repeat(Math.max(0, 66 - name.length))} */\n` + (await readFile(path, "utf8")));
  }
  const css = parts.join("\n\n");
  return dev ? css : squeezeCss(css);
}

/** Recursively copy src/public/** into dist/. */
async function copyPublic(from = join(SRC, "public"), to = OUT) {
  if (!existsSync(from)) return;
  await mkdir(to, { recursive: true });
  for (const entry of await readdir(from, { withFileTypes: true })) {
    const s = join(from, entry.name);
    const d = join(to, entry.name);
    if (entry.isDirectory()) await copyPublic(s, d);
    else await copyFile(s, d);
  }
}

/**
 * Which of the files a page references actually exist on disk.
 *
 * Templates use this to decide between a real <img> and an honest placeholder,
 * so a missing photograph is never rendered as a broken image — and the
 * old site's trick of shipping every <img hidden> and un-hiding it from
 * JavaScript is no longer needed.
 */
async function manifest() {
  const found = new Set();
  const walk = async (dir, prefix = "") => {
    if (!existsSync(dir)) return;
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) await walk(join(dir, entry.name), `${prefix}${entry.name}/`);
      else found.add(prefix + entry.name);
    }
  };
  await walk(join(SRC, "public"));
  return found;
}

async function build() {
  const t0 = Date.now();
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  const assets = await manifest();
  // Imported after the manifest exists so pages can ask what images are real.
  const { pages } = await import(`./src/pages/index.js?t=${Date.now()}`);
  const { site } = await import(`./src/data/site.js?t=${Date.now()}`);
  const { layout } = await import(`./src/templates/layout.js?t=${Date.now()}`);

  const built = [];
  for (const page of pages) {
    const ctx = { assets, page };
    const html = layout({ ...page, body: page.render(ctx) });
    const dir = page.slug === "/" ? OUT : join(OUT, page.slug.replace(/^\/|\/$/g, ""));
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), html);
    built.push({ slug: page.slug, bytes: Buffer.byteLength(html) });
  }

  await mkdir(join(OUT, "assets"), { recursive: true });
  const css = await buildCss({ dev: process.argv.includes("--dev") });
  await writeFile(join(OUT, "assets", "site.css"), css);
  // Every file in src/scripts becomes /assets/<name>.js. app.js ships on every
  // page from the layout; the rest are opted into per page via `scripts`.
  let js = "";
  for (const name of (await readdir(join(SRC, "scripts"))).sort()) {
    if (!name.endsWith(".js")) continue;
    const body = await readFile(join(SRC, "scripts", name), "utf8");
    await writeFile(join(OUT, "assets", name), body);
    if (name === "app.js") js = body;
  }

  await copyPublic();

  // robots.txt + sitemap.xml
  const disallow = pages
    .filter((p) => p.noindex)
    .map((p) => `Disallow: ${p.slug}`)
    .join("\n");
  await writeFile(
    join(OUT, "robots.txt"),
    `User-agent: *\nAllow: /\n${disallow ? disallow + "\n" : ""}\nSitemap: ${site.url}/sitemap.xml\n`
  );
  // A page marked `noindex` is a team tool, not public content — it stays out
  // of the sitemap as well as carrying a robots meta tag.
  const urls = pages
    .filter((p) => !p.noindex)
    .map((p) => `  <url><loc>${site.url}${p.slug}</loc><changefreq>${p.changefreq ?? "monthly"}</changefreq><priority>${p.priority ?? "0.6"}</priority></url>`)
    .join("\n");
  await writeFile(
    join(OUT, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  );

  const total = built.reduce((n, b) => n + b.bytes, 0);
  console.log(
    `built ${built.length} pages  ·  html ${(total / 1024).toFixed(1)} kB  ·  css ${(Buffer.byteLength(css) / 1024).toFixed(1)} kB  ·  js ${(Buffer.byteLength(js) / 1024).toFixed(1)} kB  ·  ${Date.now() - t0} ms`
  );
  for (const b of built) console.log(`  ${b.slug.padEnd(16)} ${(b.bytes / 1024).toFixed(1)} kB`);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
};

function serve(port = 4321) {
  createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
      let file = join(OUT, path);
      // Directory URLs ("/about/") map to that directory's index.html, which is
      // exactly how Cloudflare Pages serves this output in production.
      if (!extname(path)) file = join(file, "index.html");
      if (!existsSync(file) || !(await stat(file)).isFile()) {
        res.writeHead(404, { "content-type": "text/plain" });
        return res.end("404");
      }
      // Never serve outside dist/.
      if (relative(OUT, file).startsWith("..")) {
        res.writeHead(403); return res.end("403");
      }
      res.writeHead(200, {
        "content-type": MIME[extname(file)] ?? "application/octet-stream",
        // Preview only. Without this the browser serves a stale index.html
        // after a rebuild and you debug markup that is no longer on disk.
        "cache-control": "no-store",
      });
      res.end(await readFile(file));
    } catch (err) {
      res.writeHead(500, { "content-type": "text/plain" });
      res.end(String(err));
    }
  }).listen(port, () => console.log(`preview → http://localhost:${port}`));
}

await build();
if (process.argv.includes("--serve")) serve();
