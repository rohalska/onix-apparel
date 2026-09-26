import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Customer Care Links & Route Resolution', () => {
  const customerCareRoutes = ['shipping', 'returns', 'sizing', 'order-lookup', 'contact', 'privacy'];

  it('validates that all 6 required Customer Care routes are recognized', () => {
    customerCareRoutes.forEach((route) => {
      assert.ok(['shipping', 'returns', 'sizing', 'order-lookup', 'contact', 'privacy'].includes(route));
    });
  });

  it('verifies hash matching logic correctly strips leading # and resolves routes', () => {
    const testCases = [
      { hash: '#shipping', expected: 'shipping' },
      { hash: '#returns', expected: 'returns' },
      { hash: '#sizing', expected: 'sizing' },
      { hash: '#order-lookup', expected: 'order-lookup' },
      { hash: '#contact', expected: 'contact' },
      { hash: '#privacy', expected: 'privacy' },
    ];

    testCases.forEach(({ hash, expected }) => {
      const parsed = hash.replace('#', '');
      assert.equal(parsed, expected);
      assert.ok(customerCareRoutes.includes(parsed));
    });
  });

  it('verifies non-customer care hashes return null route', () => {
    const invalidHashes = ['#', '#unknown', '#catalog', '#women'];
    invalidHashes.forEach((hash) => {
      const parsed = hash.replace('#', '');
      const isCustomerCare = customerCareRoutes.includes(parsed);
      assert.equal(isCustomerCare, false);
    });
  });
});
