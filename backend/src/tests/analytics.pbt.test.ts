import * as fc from 'fast-check';
import { computeAnalytics } from '../services/analyticsService';

/**
 * Property 7: Analytics Formula Correctness
 * Validates: Requirements 7.2, 7.3, 7.4, 7.5
 */
describe('Feature: ai-surplus-food-management, Property 7: Analytics Formula Correctness', () => {
  const statusArb = fc.constantFrom<'available' | 'claimed' | 'delivered'>('available', 'claimed', 'delivered');
  const positiveQtyArb = fc.float({ min: Math.fround(0.1), max: Math.fround(1000), noNaN: true, noDefaultInfinity: true });

  const listingArb = fc.record({ quantity: positiveQtyArb, status: statusArb });

  it('only delivered listings contribute to the totals', () => {
    fc.assert(
      fc.property(
        fc.array(listingArb, { minLength: 0, maxLength: 50 }),
        (listings) => {
          const delivered = listings.filter((l) => l.status === 'delivered');
          const result = computeAnalytics(delivered);
          expect(result.totalDonations).toBe(delivered.length);
          const expectedKg = delivered.reduce((sum, l) => sum + l.quantity, 0);
          expect(result.totalKgSaved).toBeCloseTo(expectedKg, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('estimatedPeopleFed = totalKgSaved × 2', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ quantity: positiveQtyArb }), { minLength: 0, maxLength: 50 }),
        (deliveredListings) => {
          const result = computeAnalytics(deliveredListings);
          expect(result.estimatedPeopleFed).toBeCloseTo(result.totalKgSaved * 2, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('estimatedCO2Reduced = totalKgSaved × 2.5', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ quantity: positiveQtyArb }), { minLength: 0, maxLength: 50 }),
        (deliveredListings) => {
          const result = computeAnalytics(deliveredListings);
          expect(result.estimatedCO2Reduced).toBeCloseTo(result.totalKgSaved * 2.5, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns zero metrics when no delivered listings exist', () => {
    const result = computeAnalytics([]);
    expect(result.totalKgSaved).toBe(0);
    expect(result.totalDonations).toBe(0);
    expect(result.estimatedPeopleFed).toBe(0);
    expect(result.estimatedCO2Reduced).toBe(0);
  });
});
