/**
 * Fuzzy search and spell correction utilities for Onix Apparel & Vertex AI simulation.
 * Calculates edit distances to autocorrect misspelled queries (e.g., "jacktet" -> "jacket").
 */

export const APPAREL_DICTIONARY: string[] = [
  'jacket',
  'jackets',
  'outerwear',
  'coat',
  'coats',
  'windbreaker',
  'parka',
  'shirt',
  'shirts',
  't-shirt',
  'henley',
  'tee',
  'blouse',
  'top',
  'tops',
  'sweater',
  'sweaters',
  'hoodie',
  'hoodies',
  'cardigan',
  'pullover',
  'backpack',
  'backpacks',
  'bag',
  'bags',
  'tote',
  'rucksack',
  'diamond',
  'jewelry',
  'jewelery',
  'ring',
  'rings',
  'gold',
  'silver',
  'bracelet',
  'bracelets',
  'necklace',
  'necklaces',
  'gemstone',
  'earrings',
  'cotton',
  'slim',
  'fit',
  'casual',
  'premium',
  'denim',
  'wool',
  'linen',
  'leather',
  'women',
  'womens',
  'men',
  'mens',
  'unisex',
  'apparel',
  'clothing',
  'sleeve',
  'sleeves',
  'white',
  'black',
  'navy',
  'rose',
  'red',
  'blue',
  'green',
];

/**
 * Computes Levenshtein edit distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      let val: number;
      if (a[i - 1] === b[j - 1]) {
        val = row[j - 1];
      } else {
        val = Math.min(row[j - 1] + 1, prev + 1, row[j] + 1);
      }
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }

  return row[b.length];
}

/**
 * Finds the closest dictionary term for a misspelled token.
 */
export function correctTypo(token: string): string | null {
  const clean = token.toLowerCase().trim();
  if (clean.length < 3) return null;

  // Exact match - no correction needed
  if (APPAREL_DICTIONARY.includes(clean)) {
    return null;
  }

  // Common quick aliases
  if (clean === 'jacet' || clean === 'jaket' || clean === 'jacktet' || clean === 'jakcet' || clean === 'jackt') {
    return 'jacket';
  }
  if (clean === 'shrt' || clean === 'tshirt' || clean === 't-shrt') {
    return 't-shirt';
  }
  if (clean === 'dimond' || clean === 'diamnd' || clean === 'daimond') {
    return 'diamond';
  }
  if (clean === 'hoodi' || clean === 'hoody') {
    return 'hoodie';
  }

  // Levenshtein threshold:
  // length <= 4: max distance 1
  // length >= 5: max distance 2
  const maxDistance = clean.length <= 4 ? 1 : 2;
  let bestMatch: string | null = null;
  let lowestDistance = maxDistance + 1;

  for (const dictWord of APPAREL_DICTIONARY) {
    // Avoid comparing words with huge length differences
    if (Math.abs(dictWord.length - clean.length) > maxDistance) continue;

    const dist = levenshteinDistance(clean, dictWord);
    if (dist <= maxDistance && dist < lowestDistance) {
      lowestDistance = dist;
      bestMatch = dictWord;
    }
  }

  return bestMatch;
}

/**
 * Autocorrects a full user search query and returns the corrected query and expanded search tokens.
 */
export function correctQuery(query: string): { correctedQuery: string | null; tokens: string[] } {
  const cleanQ = query.trim().toLowerCase();
  if (!cleanQ) {
    return { correctedQuery: null, tokens: [] };
  }

  const rawTokens = cleanQ.split(/\s+/).filter(Boolean);
  let hasCorrection = false;
  const correctedTokens: string[] = [];
  const expandedTokens = new Set<string>(rawTokens);

  for (const token of rawTokens) {
    const correction = correctTypo(token);
    if (correction && correction !== token) {
      hasCorrection = true;
      correctedTokens.push(correction);
      expandedTokens.add(correction);
    } else {
      correctedTokens.push(token);
    }
  }

  return {
    correctedQuery: hasCorrection ? correctedTokens.join(' ') : null,
    tokens: Array.from(expandedTokens),
  };
}
