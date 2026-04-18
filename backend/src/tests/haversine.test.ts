import * as fc from 'fast-check';
import { haversine, ValidationError } from '../utils/haversine';

describe('haversine', () => {
  // Unit tests
  describe('known distances', () => {
    it('returns ~0 for identical coordinates', () => {
      expect(haversine(0, 0, 0, 0)).toBeCloseTo(0, 5);
    });

    it('returns ~111.19 km for 1 degree latitude difference at equator', () => {
      expect(haversine(0, 0, 1, 0)).toBeCloseTo(111.19, 0);
    });

    it('returns ~10007 km from equator to north pole', () => {
      expect(haversine(0, 0, 90, 0)).toBeCloseTo(10007.5, 0);
    });
  });

  describe('input validation', () => {
    it('throws ValidationError for lat1 > 90', () => {
      expect(() => haversine(91, 0, 0, 0)).toThrow(ValidationError);
    });

    it('throws ValidationError for lat1 < -90', () => {
      expect(() => haversine(-91, 0, 0, 0)).toThrow(ValidationError);
    });

    it('throws ValidationError for lat2 > 90', () => {
      expect(() => haversine(0, 0, 91, 0)).toThrow(ValidationError);
    });

    it('throws ValidationError for lng1 > 180', () => {
      expect(() => haversine(0, 181, 0, 0)).toThrow(ValidationError);
    });

    it('throws ValidationError for lng1 < -180', () => {
      expect(() => haversine(0, -181, 0, 0)).toThrow(ValidationError);
    });

    it('throws ValidationError for lng2 > 180', () => {
      expect(() => haversine(0, 0, 0, 181)).toThrow(ValidationError);
    });

    it('accepts boundary values without throwing', () => {
      expect(() => haversine(-90, -180, 90, 180)).not.toThrow();
    });
  });

  // Feature: ai-surplus-food-management, Property 1: Haversine Symmetry
  // Validates: Requirements 6.5
  describe('Property 1: Haversine Symmetry', () => {
    it('h(A, B) === h(B, A) for all valid coordinate pairs', () => {
      const validLat = fc.float({ min: -90, max: 90, noNaN: true });
      const validLng = fc.float({ min: -180, max: 180, noNaN: true });

      fc.assert(
        fc.property(validLat, validLng, validLat, validLng, (lat1, lng1, lat2, lng2) => {
          const d1 = haversine(lat1, lng1, lat2, lng2);
          const d2 = haversine(lat2, lng2, lat1, lng1);
          expect(d1).toBeCloseTo(d2, 8);
        }),
        { numRuns: 100 }
      );
    });
  });

  // Feature: ai-surplus-food-management, Property 2: Haversine Coordinate Validation
  // Validates: Requirements 6.4
  describe('Property 2: Haversine Coordinate Validation', () => {
    it('throws ValidationError for out-of-range coordinates', () => {
      const outOfRangeLat = fc.oneof(
        fc.float({ min: Math.fround(90.001), max: 1000, noNaN: true }),
        fc.float({ min: -1000, max: Math.fround(-90.001), noNaN: true })
      );
      const outOfRangeLng = fc.oneof(
        fc.float({ min: Math.fround(180.001), max: 1000, noNaN: true }),
        fc.float({ min: -1000, max: Math.fround(-180.001), noNaN: true })
      );
      const validLat = fc.float({ min: -90, max: 90, noNaN: true });
      const validLng = fc.float({ min: -180, max: 180, noNaN: true });

      // Invalid lat1
      fc.assert(
        fc.property(outOfRangeLat, validLng, validLat, validLng, (lat1, lng1, lat2, lng2) => {
          expect(() => haversine(lat1, lng1, lat2, lng2)).toThrow(ValidationError);
        }),
        { numRuns: 100 }
      );

      // Invalid lng1
      fc.assert(
        fc.property(validLat, outOfRangeLng, validLat, validLng, (lat1, lng1, lat2, lng2) => {
          expect(() => haversine(lat1, lng1, lat2, lng2)).toThrow(ValidationError);
        }),
        { numRuns: 100 }
      );
    });
  });
});
