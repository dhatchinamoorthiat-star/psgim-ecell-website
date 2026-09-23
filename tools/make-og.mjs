/**
 * Renders tools/og-card.html to src/public/og.png (1200×630) and the
 * apple-touch icon, using the headless Chrome that is already on this machine.
 *
 *   node tools/make-og.mjs
 *
 * Re-run after editing og-card.html. The PNG is committed, so a normal build
 * never needs Chrome — this is a one-off asset step, not part of `npm run build`.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, rename, readdir, access } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Find the newest cached headless Chrome, whatever version it is. */
async function findChrome() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ];
  for (const c of candidates) {
    try { await access(c); return c; } catch {}
  }
  const base = join(homedir(), ".cache", "puppeteer", "chrome-headless-shell");
  const versions = (await readdir(base)).sort().reverse();
  for (const v of versions) {
    const dir = join(base, v);
    for (const inner of await readdir(dir)) {
      const bin = join(dir, inner, "chrome-headless-shell");
      try { await access(bin); return bin; } catch {}
    }
  }
  throw new Error("no Chrome found — install Chrome, or run `npx puppeteer browsers install chrome-headless-shell`");
}

const chrome = await findChrome();
const tmp = await mkdtemp(join(tmpdir(), "og-"));

async function shoot(source, out, w, h) {
  const shot = join(tmp, out);
  await run(chrome, [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-color-profile=srgb",
    `--window-size=${w},${h}`,
    "--screenshot=" + shot,
    // Webfonts come off the network; give them time to arrive or the card
    // renders in Times and looks nothing like the site.
    "--virtual-time-budget=6000",
    pathToFileURL(join(ROOT, "tools", source)).href,
  ]);
  await rename(shot, join(ROOT, "src", "public", out));
  console.log(`wrote src/public/${out} (${w}×${h})`);
}

await shoot("og-card.html", "og.png", 1200, 630);
await shoot("icon-card.html", "icon-180.png", 180, 180);
await shoot("icon-card.html", "icon-32.png", 32, 32);
console.log("via", chrome.split("/").slice(-1)[0]);
