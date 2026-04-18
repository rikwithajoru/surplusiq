import * as fc from 'fast-check';
import { rankListings, ListingRecord, MatchInput } from '../services/matchingEngine';

// Arbitrary for a single ListingRecord
const listingArb = fc.record<ListingRecord>({
  _id: fc.uuid(),
  restaurantId: fc.constant('r1'),
  foodName: fc.constant('Food'),
  quantity: fc.integer({ min: 1, max: 1000 }),
  expiryDatetime: fc.date({
    min: new Date(Date.now() + 60000),
    max: new Date(Date.now() + 48 * 3600000),
  }),
  location: fc.record({
    lat: fc.float({ min: -90, max: 90, noNaN: true }),
    lng: fc.float({ min: -180, max: 180, noNaN: true }),
  }),
  status: fc.constant('available'),
  foodType: fc.constant('cooked'),
  createdAt: fc.constant(new Date()),
});

// Arbitrary for valid NGO coordinates
const ngoLatArb = fc.float({ min: -90, max: 90, noNaN: true });
const ngoLngArb = fc.float({ min: -180, max: 180, noNaN: true });

/**
 * Property 3: Matching Engine Preserves All Listings
 * Validates: Requirements 4.7
 */
describe('Feature: ai-surplus-food-management, Property 3: Matching Engine Preserves All Listings', () => {
  it('rankListings output length equals input length for any non-empty listing array', () => {
    fc.assert(
      fc.property(
        fc.array(listingArb, { minLength: 1, maxLength: 20 }),
        ngoLatArb,
        ngoLngArb,
        (listings, ngoLat, ngoLng) => {
          const input: MatchInput = { listings, ngoLat, ngoLng };
          const result = rankListings(input);
          return result.length === listings.length;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 4: Matching Engine Idempotence
 * Validates: Requirements 4.8
 */
describe('Feature: ai-surplus-food-management, Property 4: Matching Engine Idempotence', () => {
  it('applying rankListings twice produces the same ID order as applying it once', () => {
    fc.assert(
      fc.property(
        fc.array(listingArb, { minLength: 1, maxLength: 20 }),
        ngoLatArb,
        ngoLngArb,
        (listings, ngoLat, ngoLng) => {
          const input: MatchInput = { listings, ngoLat, ngoLng };
          const firstPass = rankListings(input);
          const secondPass = rankListings({ listings: firstPass, ngoLat, ngoLng });
          const firstIds = firstPass.map((l) => String(l._id));
          const secondIds = secondPass.map((l) => String(l._id));
          return JSON.stringify(firstIds) === JSON.stringify(secondIds);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 5: Score Normalization and Monotonicity
 * Validates: Requirements 4.3, 4.4, 4.5, 4.6
 */
describe('Feature: ai-surplus-food-management, Property 5: Matching Engine Score Normalization and Monotonicity', () => {
  it('every composite score is in [0, 1]', () => {
    fc.assert(
      fc.property(
        fc.array(listingArb, { minLength: 1, maxLength: 20 }),
        ngoLatArb,
        ngoLngArb,
        (listings, ngoLat, ngoLng) => {
          const result = rankListings({ listings, ngoLat, ngoLng });
          return result.every((r) => r.score >= 0 && r.score <= 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('closer listing scores strictly higher when only distance differs', () => {
    // Use a base listing and vary only location (distance to NGO).
    // Constrain ngoLat to [-80, 80] so there is room for both offsets without
    // hitting the ±90 clamp boundary and accidentally making the two listings
    // equidistant.
    const safeNgoLatArb = fc.float({ min: -80, max: 80, noNaN: true });

    const baseListing = fc.record<Omit<ListingRecord, 'location' | '_id'>>({
      restaurantId: fc.constant('r1'),
      foodName: fc.constant('Food'),
      quantity: fc.integer({ min: 1, max: 1000 }),
      expiryDatetime: fc.date({
        min: new Date(Date.now() + 60000),
        max: new Date(Date.now() + 48 * 3600000),
      }),
      status: fc.constant('available'),
      foodType: fc.constant('cooked'),
      createdAt: fc.constant(new Date()),
    });

    fc.assert(
      fc.property(
        baseListing,
        safeNgoLatArb,
        ngoLngArb,
        // nearDeg: small positive latitude offset (0.5–4 degrees)
        fc.integer({ min: 1, max: 4 }),
        // extraDeg: additional offset that makes far listing strictly farther (1–4 degrees)
        fc.integer({ min: 1, max: 4 }),
        (base, ngoLat, ngoLng, nearDeg, extraDeg) => {
          const nearLat = ngoLat + nearDeg;       // within [-76, 84] — safe range
          const farLat = ngoLat + nearDeg + extraDeg; // strictly farther

          const nearListing: ListingRecord = {
            ...base,
            _id: 'near',
            location: { lat: nearLat, lng: ngoLng },
          };
          const farListing: ListingRecord = {
            ...base,
            _id: 'far',
            location: { lat: farLat, lng: ngoLng },
          };

          const result = rankListings({ listings: [nearListing, farListing], ngoLat, ngoLng });
          const nearResult = result.find((r) => r._id === 'near')!;
          const farResult = result.find((r) => r._id === 'far')!;

          // near is always closer → higher distanceScore → higher composite score
          return nearResult.score > farResult.score;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('more urgent listing (sooner expiry) scores strictly higher when only expiry differs', () => {
    fc.assert(
      fc.property(
        ngoLatArb,
        ngoLngArb,
        fc.integer({ min: 1, max: 1000 }),
        // urgentHours: expiry in 1–23 hours
        fc.integer({ min: 1, max: 23 }),
        // laterHours: expiry in urgentHours+1 to 47 hours
        fc.integer({ min: 1, max: 24 }),
        (ngoLat, ngoLng, quantity, urgentHours, extraHours) => {
          const now = Date.now();
          const soonExpiry = new Date(now + urgentHours * 3600000);
          const laterExpiry = new Date(now + (urgentHours + extraHours) * 3600000);

          const sharedProps = {
            restaurantId: 'r1',
            foodName: 'Food',
            quantity,
            location: { lat: ngoLat, lng: ngoLng },
            status: 'available',
            foodType: 'cooked',
            createdAt: new Date(),
          };

          const urgentListing: ListingRecord = { ...sharedProps, _id: 'urgent', expiryDatetime: soonExpiry };
          const laterListing: ListingRecord = { ...sharedProps, _id: 'later', expiryDatetime: laterExpiry };

          const result = rankListings({ listings: [urgentListing, laterListing], ngoLat, ngoLng });
          const urgentResult = result.find((r) => r._id === 'urgent')!;
          const laterResult = result.find((r) => r._id === 'later')!;

          // urgent has fewer hours until expiry → higher urgencyScore → higher composite score
          return urgentResult.score > laterResult.score;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('larger quantity listing scores strictly higher when only quantity differs', () => {
    fc.assert(
      fc.property(
        ngoLatArb,
        ngoLngArb,
        fc.date({
          min: new Date(Date.now() + 60000),
          max: new Date(Date.now() + 48 * 3600000),
        }),
        // smallQty: 1–499
        fc.integer({ min: 1, max: 499 }),
        // largeQty: smallQty+1 to 1000
        fc.integer({ min: 1, max: 500 }),
        (ngoLat, ngoLng, expiryDatetime, smallQty, extraQty) => {
          const largeQty = smallQty + extraQty;

          const sharedProps = {
            restaurantId: 'r1',
            foodName: 'Food',
            expiryDatetime,
            location: { lat: ngoLat, lng: ngoLng },
            status: 'available',
            foodType: 'cooked',
            createdAt: new Date(),
          };

          const smallListing: ListingRecord = { ...sharedProps, _id: 'small', quantity: smallQty };
          const largeListing: ListingRecord = { ...sharedProps, _id: 'large', quantity: largeQty };

          const result = rankListings({ listings: [smallListing, largeListing], ngoLat, ngoLng });
          const smallResult = result.find((r) => r._id === 'small')!;
          const largeResult = result.find((r) => r._id === 'large')!;

          // largeQty > smallQty → higher quantityScore → higher composite score
          return largeResult.score > smallResult.score;
        }
      ),
      { numRuns: 100 }
    );
  });
});
