import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isValidPreviewLabel } from '../validate-preview-label.mjs';

const ACCEPTED = ['preview', 'platform-preview', 'feature-123', 'pr-42', 'a', '123', 'ecell-preview', 'not-ecell'];

const REJECTED = [
  'ECell', // exact production label
  'ecell', // lowercase production label
  'ECELL',
  'eCell',
  'Ecell',
  'e-cell', // hyphenated variant of the production label
  'e--c-e-l-l',
  'E-Cell',
  '', // empty
  ' preview', // leading whitespace
  'preview ', // trailing whitespace
  'pre view', // internal whitespace
  'Preview', // uppercase
  'PREVIEW',
  'preview_123', // underscore not in grammar
  'preview.123', // dot not in grammar
  'préview', // non-ASCII
  'preview/../x', // path-like punctuation
  null,
  undefined,
  42,
];

for (const label of ACCEPTED) {
  test(`accepts '${label}'`, () => {
    assert.equal(isValidPreviewLabel(label), true);
  });
}

for (const label of REJECTED) {
  test(`rejects ${JSON.stringify(label)}`, () => {
    assert.equal(isValidPreviewLabel(label), false);
  });
}
