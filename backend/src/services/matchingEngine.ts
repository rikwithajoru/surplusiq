import { haversine } from '../utils/haversine';

export interface ListingRecord {
  _id: any;
  restaurantId: any;
  foodName: string;
  quantity: number;
  expiryDatetime: Date;
  location: { lat: number; lng: number };
  status: string;
  foodType: string;
  createdAt: Date;
}

export interface MatchInput {
  listings: ListingRecord[];
  ngoLat: number;
  ngoLng: number;
}

export interface RankedListing extends ListingRecord {
  score: number;
  distance: number;
}

/**
 * Normalizes x to [0,1] within [min, max].
 * When max === min (all values identical), returns 0.5.
 */
function normalize(x: number, min: number, max: number): number {
  if (max === min) return 0.5;
  const clamped = Math.max(min, Math.min(max, x));
  return (clamped - min) / (max - min);
}

export function rankListings(input: MatchInput): RankedListing[] {
  const { listings, ngoLat, ngoLng } = input;

  if (listings.length === 0) return [];

  const now = new Date();

  // Pre-compute per-listing derived values
  const derived = listings.map((listing) => {
    const distance = haversine(ngoLat, ngoLng, listing.location.lat, listing.location.lng);
    const hoursUntilExpiry = Math.max(
      0,
      (listing.expiryDatetime.getTime() - now.getTime()) / (1000 * 60 * 60)
    );
    return { distance, hoursUntilExpiry, quantity: listing.quantity };
  });

  // Compute max values for normalization
  const maxDist = Math.max(...derived.map((d) => d.distance));
  const maxHours = Math.max(...derived.map((d) => d.hoursUntilExpiry));
  const maxQty = Math.max(...derived.map((d) => d.quantity));

  const ranked: RankedListing[] = listings.map((listing, i) => {
    const { distance, hoursUntilExpiry, quantity } = derived[i];

    const distanceScore = 1 - normalize(distance, 0, maxDist);
    const urgencyScore = 1 - normalize(hoursUntilExpiry, 0, maxHours);
    const quantityScore = normalize(quantity, 0, maxQty);

    const score = 0.4 * distanceScore + 0.4 * urgencyScore + 0.2 * quantityScore;

    return { ...listing, distance, score };
  });

  return ranked.sort((a, b) => b.score - a.score);
}
