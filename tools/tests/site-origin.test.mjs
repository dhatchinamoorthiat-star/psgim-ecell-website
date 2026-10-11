// The canonical site origin has exactly one source: web/site.config.json.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { ORIGIN_TOKEN, injectOrigin, parseOrigin, readSiteOrigin } from '../../web/tools/site-origin.mjs';

const WEB = path.resolve('web');

function files(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(ts|html|mjs|js|json)$/.test(e)) out.push(p);
  }
  return out;
}

test('the configured origin is the verified pages.dev origin until the domain decision (B3) is made', () => {
  assert.equal(readSiteOrigin(), 'https://psgim-ecell.pages.dev');
});

test('only bare https origins are accepted', () => {
  assert.equal(parseOrigin('https://ecellpsgim.in'), 'https://ecellpsgim.in');
  for (const bad of ['http://ecellpsgim.in', 'https://ecellpsgim.in/', 'https://ecellpsgim.in/x', 'https://a@ecellpsgim.in', 'https://ecellpsgim.in?x=1', 'ecellpsgim.in', 'javascript:alert(1)']) {
    assert.throws(() => parseOrigin(bad), /site\.config\.json origin/, bad);
  }
});

test('the origin is never hardcoded outside site.config.json', () => {
  const origin = readSiteOrigin();
  const offenders = [...files(path.join(WEB, 'src')), ...files(path.join(WEB, 'tools'))].filter((f) => readFileSync(f, 'utf8').includes(origin.replace('https://', '')));
  assert.deepEqual(offenders.map((f) => path.relative(WEB, f)), []);
});

test('index.html carries the build-time token, and postbuild replaces every occurrence', () => {
  const html = readFileSync(path.join(WEB, 'src', 'index.html'), 'utf8');
  assert.ok(html.includes(`"url": "${ORIGIN_TOKEN}"`));
  const out = injectOrigin(`${ORIGIN_TOKEN} and ${ORIGIN_TOKEN}`, 'https://x.example');
  assert.equal(out, 'https://x.example and https://x.example');
});
