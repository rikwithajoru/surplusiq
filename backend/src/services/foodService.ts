import mongoose from 'mongoose';
import { FoodListingModel } from '../models/FoodListing';
import { FoodRequestModel } from '../models/FoodRequest';
import { NotificationModel } from '../models/Notification';
import { rankListings, ListingRecord } from './matchingEngine';

export interface CreateListingBody {
  foodName: string;
  quantity: number;
  expiryDatetime: string | Date;
  location: { lat: number; lng: number };
  foodType?: string;
}

export class FoodServiceError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = 'FoodServiceError';
  }
}

function validateListingBody(body: CreateListingBody): void {
  if (!body.foodName || body.foodName.trim() === '') {
    throw new FoodServiceError("Field 'foodName' is required", 400);
  }
  if (body.quantity === undefined || body.quantity === null) {
    throw new FoodServiceError("Field 'quantity' is required", 400);
  }
  if (body.quantity <= 0) {
    throw new FoodServiceError('Quantity must be a positive number', 400);
  }
  if (!body.expiryDatetime) {
    throw new FoodServiceError("Field 'expiryDatetime' is required", 400);
  }
  const expiry = new Date(body.expiryDatetime);
  if (isNaN(expiry.getTime())) {
    throw new FoodServiceError('expiryDatetime is not a valid date', 400);
  }
  if (expiry <= new Date()) {
    throw new FoodServiceError('Expiry time must be in the future', 400);
  }
  if (!body.location || body.location.lat === undefined || body.location.lng === undefined) {
    throw new FoodServiceError("Field 'location' is required", 400);
  }
}

export async function createListing(restaurantId: string, body: CreateListingBody) {
  validateListingBody(body);
  return FoodListingModel.create({
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
    foodName: body.foodName.trim(),
    quantity: body.quantity,
    expiryDatetime: new Date(body.expiryDatetime),
    location: body.location,
    foodType: body.foodType ?? '',
    status: 'available',
  });
}

export async function getAvailableListings(ngoLat: number, ngoLng: number) {
  const listings = await FoodListingModel.find({ status: 'available' }).lean();
  if (listings.length === 0) return [];

  const records: ListingRecord[] = listings.map((l) => ({
    _id: l._id,
    restaurantId: l.restaurantId,
    foodName: l.foodName,
    quantity: l.quantity,
    expiryDatetime: l.expiryDatetime,
    location: l.location,
    status: l.status,
    foodType: l.foodType ?? '',
    createdAt: l.createdAt,
  }));

  return rankListings({ listings: records, ngoLat, ngoLng });
}

export async function acceptRequest(ngoId: string, listingId: string) {
  const listing = await FoodListingModel.findById(listingId);
  if (!listing) throw new FoodServiceError('Listing not found', 404);
  if (listing.status === 'claimed' || listing.status === 'delivered') {
    throw new FoodServiceError('Listing is no longer available', 409);
  }

  const request = await FoodRequestModel.create({
    listingId: listing._id,
    ngoId: new mongoose.Types.ObjectId(ngoId),
    restaurantId: listing.restaurantId,
    status: 'requested',
  });

  listing.status = 'claimed';
  await listing.save();

  await NotificationModel.create({
    userId: listing.restaurantId,
    message: `A new food request has been made for your listing "${listing.foodName}".`,
    type: 'request_created',
  });

  return request;
}

export async function updateRequestStatus(
  restaurantId: string,
  requestId: string,
  status: 'accepted' | 'delivered'
) {
  const request = await FoodRequestModel.findOne({
    _id: requestId,
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
  });
  if (!request) throw new FoodServiceError('Food request not found', 404);

  request.status = status;
  await request.save();

  const listing = await FoodListingModel.findById(request.listingId).lean();
  const foodName = listing?.foodName ?? 'a food listing';
  const message =
    status === 'accepted'
      ? `Your food request for "${foodName}" has been accepted.`
      : `Your food request for "${foodName}" has been marked as delivered.`;

  await NotificationModel.create({ userId: request.ngoId, message, type: 'status_updated' });

  return request;
}

export async function getMyListings(restaurantId: string) {
  return FoodListingModel.find({ restaurantId: new mongoose.Types.ObjectId(restaurantId) })
    .sort({ createdAt: -1 })
    .lean();
}
