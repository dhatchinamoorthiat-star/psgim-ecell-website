// The canonical origin for build-time tooling (postbuild), read from the same
// web/site.config.json the Angular app imports. See src/app/core/config/site-origin.ts.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ORIGIN_TOKEN = '__SITE_ORIGIN__';
const CONFIG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'site.config.json');

/** Validated origin: https, host only, no path/query/fragment, no trailing slash. */
export function parseOrigin(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`site.config.json origin is not a URL: ${raw}`);
  }
  if (url.protocol !== 'https:') throw new Error(`site.config.json origin must be https: ${raw}`);
  if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error(`site.config.json origin must be a bare origin (no path, query or credentials): ${raw}`);
  }
  if (raw.endsWith('/')) throw new Error(`site.config.json origin must not end with "/": ${raw}`);
  return url.origin;
}

export function readSiteOrigin(file = CONFIG) {
  return parseOrigin(JSON.parse(readFileSync(file, 'utf8')).origin);
}

/** Replace the build-time token (index.html structured data) with the origin. */
export function injectOrigin(html, origin) {
  return html.split(ORIGIN_TOKEN).join(origin);
}
