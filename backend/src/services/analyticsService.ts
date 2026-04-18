import { FoodListingModel } from '../models/FoodListing';

export interface AnalyticsResult {
  totalKgSaved: number;
  totalDonations: number;
  estimatedPeopleFed: number;
  estimatedCO2Reduced: number;
}

export function computeAnalytics(deliveredListings: Array<{ quantity: number }>): AnalyticsResult {
  const totalKgSaved = deliveredListings.reduce((sum, l) => sum + l.quantity, 0);
  const totalDonations = deliveredListings.length;
  const estimatedPeopleFed = totalKgSaved * 2;
  const estimatedCO2Reduced = totalKgSaved * 2.5;
  return { totalKgSaved, totalDonations, estimatedPeopleFed, estimatedCO2Reduced };
}

export async function getAnalytics(from?: Date, to?: Date): Promise<AnalyticsResult> {
  const query: Record<string, unknown> = { status: 'delivered' };

  if (from || to) {
    const dateFilter: Record<string, Date> = {};
    if (from) dateFilter.$gte = from;
    if (to) dateFilter.$lte = to;
    query.updatedAt = dateFilter;
  }

  const listings = await FoodListingModel.find(query).select('quantity').lean();
  return computeAnalytics(listings as Array<{ quantity: number }>);
}
