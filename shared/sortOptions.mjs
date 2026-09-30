/**
 * The sort values the UI emits, the proxy accepts, and openapi.yaml documents.
 * One definition, because these three drifted: the UI sent price-asc while the
 * proxy matched price-low, so live-mode searches silently dropped orderBy and
 * only the client-side simulation appeared to sort correctly.
 */
export const DEFAULT_SORT = 'featured';

export const SORT_VALUES = Object.freeze([
  'featured',
  'price-low',
  'price-high',
  'rating',
  'newest',
]);

/** Vertex Retail orderBy for a sort value, or '' when the default ordering applies. */
export const ORDER_BY = Object.freeze({
  featured: '',
  'price-low': 'price asc',
  'price-high': 'price desc',
  rating: 'attributes.rating_rate desc',
  newest: '',
});

export function isSortValue(value) {
  return SORT_VALUES.includes(value);
}
