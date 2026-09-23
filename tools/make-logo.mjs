/**
 * Builds the transparent logo PNGs from src/logo.jpeg.
 *
 *   node tools/make-logo.mjs
 *
 * Writes src/public/logo.png (512px) and src/public/logo@2x.png (1024px),
 * both tightly cropped with a real alpha channel. Re-run only if the source
 * artwork changes; the PNGs are committed, so a normal build never needs
 * Chrome.
 *
 * Two passes: the first reads the artwork's bounding box out of the page, the
 * second screenshots at exactly that aspect so there is no transparent padding
 * around the mark. `--default-background-color=00000000` is what makes the
 * screenshot keep its alpha instead of flattening onto white.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rename, readdir, access } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

async function findChrome() {
  for (const c of [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ]) {
    try { await access(c); return c; } catch {}
  }
  const base = join(homedir(), ".cache", "puppeteer", "chrome-headless-shell");
  for (const v of (await readdir(base)).sort().reverse()) {
    for (const inner of await readdir(join(base, v))) {
      const bin = join(base, v, inner, "chrome-headless-shell");
      try { await access(bin); return bin; } catch {}
    }
  }
  throw new Error("no Chrome found — install Chrome, or run `npx puppeteer browsers install chrome-headless-shell`");
}

const chrome = await findChrome();
const tmp = await mkdtemp(join(tmpdir(), "logo-"));
const page = pathToFileURL(join(ROOT, "tools", "key-logo.html")).href;

const base = [
  "--headless",
  "--disable-gpu",
  "--hide-scrollbars",
  "--force-color-profile=srgb",
  "--allow-file-access-from-files", // canvas reads a file:// image
  "--default-background-color=00000000",
  "--virtual-time-budget=6000",
];

// Pass 1 — measure.
const { stdout } = await run(chrome, [...base, "--dump-dom", `${page}?probe=1`], {
  maxBuffer: 64 * 1024 * 1024,
});
const bbox = /data-bbox="([\d,]+)"/.exec(stdout);
if (!bbox) throw new Error("could not measure the artwork — is src/logo.jpeg present?");
const [, , bw, bh] = bbox[1].split(",").map(Number);
console.log(`artwork bounding box: ${bw}×${bh}`);

// Pass 2 — render at each size.
for (const [size, name] of [[512, "logo.png"], [1024, "logo@2x.png"]]) {
  const scale = size / Math.max(bw, bh);
  const w = Math.round(bw * scale), h = Math.round(bh * scale);
  const shot = join(tmp, name);
  await run(chrome, [...base, `--window-size=${w},${h}`, `--screenshot=${shot}`, `${page}?size=${size}`]);
  await rename(shot, join(ROOT, "src", "public", name));
  console.log(`wrote src/public/${name} (${w}×${h}, transparent)`);
}
