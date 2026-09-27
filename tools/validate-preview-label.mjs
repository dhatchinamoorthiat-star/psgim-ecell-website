/**
 * Preview deployment label guard (review finding F13).
 *
 * deploy-preview.yml used to refuse only the exact, case-insensitive string
 * "ECell" (the production branch). That let through any other case, any
 * hyphenation of it, and any label containing whitespace, uppercase or
 * punctuation Cloudflare Pages might treat surprisingly. This enforces a
 * strict grammar plus an explicit block on the production label in any
 * spelling.
 */

const GRAMMAR = /^[a-z0-9-]+$/;

export function isValidPreviewLabel(label) {
  if (typeof label !== 'string' || label.length === 0) return false;
  if (!GRAMMAR.test(label)) return false; // lowercase letters, digits, hyphens only; no whitespace/punctuation
  const bare = label.toLowerCase().replaceAll('-', '');
  return bare !== 'ecell'; // reject every case/hyphenation of the production label
}

// CLI entry point: `node tools/validate-preview-label.mjs <label>`.
// Exits 0 and prints nothing when valid; exits 1 with a message otherwise.
if (import.meta.url === `file://${process.argv[1]}`) {
  const label = process.argv[2] ?? '';
  if (isValidPreviewLabel(label)) {
    process.exit(0);
  } else {
    console.error(
      `::error::'${label}' is not a valid preview label. ` +
        "Labels must match ^[a-z0-9-]+$ and must not be the production label 'ECell' in any case or hyphenation."
    );
    process.exit(1);
  }
}
