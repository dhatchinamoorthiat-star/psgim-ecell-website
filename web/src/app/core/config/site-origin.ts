import config from '../../../../site.config.json';

/**
 * The site's canonical public origin — the ONE place it is configured
 * (`web/site.config.json`, also read by `tools/postbuild.mjs` for the sitemap,
 * robots.txt and the structured data in index.html).
 *
 * It stays the verified Cloudflare Pages origin until the custom
 * domain is confirmed (runbook blocker B3). Changing domains is then a
 * one-line edit to site.config.json — never a hardcoded origin elsewhere
 * (enforced by tools/tests/site-origin.test.mjs).
 */
export const SITE_ORIGIN: string = config.origin.replace(/\/+$/, '');

/** Absolute URL on the canonical origin for a site path such as `/events/demo-day`. */
export function absoluteUrl(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) {
    throw new Error(`absoluteUrl expects a site path starting with a single "/", got: ${path}`);
  }
  return SITE_ORIGIN + path;
}
