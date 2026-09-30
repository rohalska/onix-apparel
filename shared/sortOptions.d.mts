export declare const DEFAULT_SORT: 'featured';
export declare const SORT_VALUES: readonly [
  'featured',
  'price-low',
  'price-high',
  'rating',
  'newest',
];
export declare const ORDER_BY: Readonly<Record<(typeof SORT_VALUES)[number], string>>;
export declare function isSortValue(value: unknown): value is (typeof SORT_VALUES)[number];
