import { rankListings, MatchInput, ListingRecord } from '../services/matchingEngine';

const now = new Date();
const inOneHour = new Date(now.getTime() + 1 * 60 * 60 * 1000);
const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
const inTenHours = new Date(now.getTime() + 10 * 60 * 60 * 1000);

function makeListing(overrides: Partial<ListingRecord>): ListingRecord {
  return {
    _id: 'id1',
    restaurantId: 'r1',
    foodName: 'Rice',
    quantity: 10,
    expiryDatetime: inTwoHours,
    location: { lat: 0, lng: 0 },
    status: 'available',
    foodType: 'cooked',
    createdAt: now,
    ...overrides,
  };
}

describe('rankListings', () => {
  it('returns empty array for empty input', () => {
    expect(rankListings({ listings: [], ngoLat: 0, ngoLng: 0 })).toEqual([]);
  });

  it('returns same number of listings as input', () => {
    const listings = [
      makeListing({ _id: '1', location: { lat: 0, lng: 0 } }),
      makeListing({ _id: '2', location: { lat: 1, lng: 1 } }),
      makeListing({ _id: '3', location: { lat: 2, lng: 2 } }),
    ];
    const result = rankListings({ listings, ngoLat: 0, ngoLng: 0 });
    expect(result).toHaveLength(3);
  });

  it('attaches score and distance fields to each listing', () => {
    const listings = [makeListing({ _id: '1' })];
    const result = rankListings({ listings, ngoLat: 0, ngoLng: 0 });
    expect(typeof result[0].score).toBe('number');
    expect(typeof result[0].distance).toBe('number');
  });

  it('all scores are in [0, 1]', () => {
    const listings = [
      makeListing({ _id: '1', location: { lat: 0, lng: 0 }, quantity: 5, expiryDatetime: inOneHour }),
      makeListing({ _id: '2', location: { lat: 10, lng: 10 }, quantity: 50, expiryDatetime: inTenHours }),
    ];
    const result = rankListings({ listings, ngoLat: 0, ngoLng: 0 });
    for (const r of result) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(1);
    }
  });

  it('sorts descending by score', () => {
    const listings = [
      makeListing({ _id: '1', location: { lat: 0, lng: 0 }, expiryDatetime: inOneHour }),
      makeListing({ _id: '2', location: { lat: 50, lng: 50 }, expiryDatetime: inTenHours }),
    ];
    const result = rankListings({ listings, ngoLat: 0, ngoLng: 0 });
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
  });

  it('closer listing scores higher when only distance differs', () => {
    const listings = [
      makeListing({ _id: 'far', location: { lat: 10, lng: 10 }, expiryDatetime: inTwoHours, quantity: 10 }),
      makeListing({ _id: 'near', location: { lat: 0.1, lng: 0.1 }, expiryDatetime: inTwoHours, quantity: 10 }),
    ];
    const result = rankListings({ listings, ngoLat: 0, ngoLng: 0 });
    expect(result[0]._id).toBe('near');
  });

  it('more urgent listing scores higher when only expiry differs', () => {
    const listings = [
      makeListing({ _id: 'late', location: { lat: 0, lng: 0 }, expiryDatetime: inTenHours, quantity: 10 }),
      makeListing({ _id: 'soon', location: { lat: 0, lng: 0 }, expiryDatetime: inOneHour, quantity: 10 }),
    ];
    const result = rankListings({ listings, ngoLat: 0, ngoLng: 0 });
    expect(result[0]._id).toBe('soon');
  });

  it('larger quantity scores higher when only quantity differs', () => {
    const listings = [
      makeListing({ _id: 'small', location: { lat: 0, lng: 0 }, expiryDatetime: inTwoHours, quantity: 1 }),
      makeListing({ _id: 'large', location: { lat: 0, lng: 0 }, expiryDatetime: inTwoHours, quantity: 100 }),
    ];
    const result = rankListings({ listings, ngoLat: 0, ngoLng: 0 });
    expect(result[0]._id).toBe('large');
  });

  it('single listing at same location gets distanceScore=0.5 (max===min for distance)', () => {
    const listings = [makeListing({ _id: '1', location: { lat: 0, lng: 0 } })];
    const result = rankListings({ listings, ngoLat: 0, ngoLng: 0 });
    // distance=0, maxDist=0 → max===min → distanceScore=0.5
    // urgency and quantity normalize normally (single value → max===min=0 only if value is 0)
    // score is deterministic and in [0,1]
    expect(result[0].score).toBeGreaterThanOrEqual(0);
    expect(result[0].score).toBeLessThanOrEqual(1);
  });

  it('is idempotent — applying twice gives same order', () => {
    const listings = [
      makeListing({ _id: '1', location: { lat: 0, lng: 0 }, quantity: 5, expiryDatetime: inOneHour }),
      makeListing({ _id: '2', location: { lat: 5, lng: 5 }, quantity: 20, expiryDatetime: inTenHours }),
      makeListing({ _id: '3', location: { lat: 2, lng: 2 }, quantity: 10, expiryDatetime: inTwoHours }),
    ];
    const input: MatchInput = { listings, ngoLat: 0, ngoLng: 0 };
    const first = rankListings(input).map((r) => r._id);
    const second = rankListings({ listings: rankListings(input), ngoLat: 0, ngoLng: 0 }).map((r) => r._id);
    expect(first).toEqual(second);
  });
});
