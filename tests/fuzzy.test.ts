import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { levenshteinDistance, correctQuery, APPAREL_DICTIONARY } from '../src/utils/fuzzySearch';

describe('Fuzzy Spell Checking & Autocorrection', () => {
  it('calculates levenshtein distance accurately', () => {
    assert.equal(levenshteinDistance('jacket', 'jacket'), 0);
    assert.equal(levenshteinDistance('jacktet', 'jacket'), 1);
    assert.equal(levenshteinDistance('jaket', 'jacket'), 1);
    assert.equal(levenshteinDistance('jacet', 'jacket'), 1);
    assert.equal(levenshteinDistance('diamond', 'dimond'), 1);
    assert.equal(levenshteinDistance('backpack', 'bakpack'), 1);
    assert.equal(levenshteinDistance('cotton', 'coton'), 1);
  });

  it('autocorrects "jacktet" to "jacket"', () => {
    const { correctedQuery, tokens } = correctQuery('jacktet');
    assert.equal(correctedQuery, 'jacket');
    assert.ok(tokens.includes('jacket'));
  });

  it('autocorrects other common typos: "sweter", "bakpack", "diamnd", "coton"', () => {
    assert.equal(correctQuery('sweter').correctedQuery, 'sweater');
    assert.equal(correctQuery('bakpack').correctedQuery, 'backpack');
    assert.equal(correctQuery('diamnd').correctedQuery, 'diamond');
    assert.equal(correctQuery('coton').correctedQuery, 'cotton');
  });

  it('preserves perfectly spelled words without spurious corrections', () => {
    assert.equal(correctQuery('jacket').correctedQuery, null);
    assert.equal(correctQuery('gold ring').correctedQuery, null);
    assert.equal(correctQuery('mens cotton jacket').correctedQuery, null);
  });

  it('corrects misspelled word in multi-word query: "mens jacktet"', () => {
    const { correctedQuery } = correctQuery('mens jacktet');
    assert.equal(correctedQuery, 'mens jacket');
  });
});
