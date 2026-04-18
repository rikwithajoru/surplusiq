import * as fc from 'fast-check';

// Mock models before importing the service
jest.mock('../models/FoodListing');
jest.mock('../models/FoodRequest');
jest.mock('../models/Notification');

import { FoodListingModel } from '../models/FoodListing';
import { FoodRequestModel } from '../models/FoodRequest';
import { createListing, acceptRequest, FoodServiceError, CreateListingBody } from '../services/foodService';

const mockFoodListingCreate = FoodListingModel.create as jest.Mock;
const mockFoodListingFindById = FoodListingModel.findById as jest.Mock;
const mockFoodRequestCreate = FoodRequestModel.create as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

const emptyOrWhitespaceArb = fc.oneof(
  fc.constant(''),
  fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 1, maxLength: 10 })
);

const nonPositiveQuantityArb = fc.oneof(
  fc.constant(0),
  fc.integer({ min: -1000, max: -1 }),
  fc.float({ min: Math.fround(-100), max: Math.fround(-0.001), noNaN: true })
);

const pastDateArb = fc.date({
  min: new Date(Date.now() - 365 * 24 * 3600 * 1000),
  max: new Date(Date.now() - 1),
});

const validLocationArb = fc.record({
  lat: fc.float({ min: -90, max: 90, noNaN: true }),
  lng: fc.float({ min: -180, max: 180, noNaN: true }),
});

const restaurantIdArb = fc.hexaString({ minLength: 24, maxLength: 24 });

/**
 * Property 8: Food Posting Input Validation
 * Validates: Requirements 2.2, 2.3, 2.4
 */
describe('Feature: ai-surplus-food-management, Property 8: Food Posting Input Validation', () => {
  it('rejects empty or whitespace foodName with FoodServiceError 400 and does not create a listing', async () => {
    await fc.assert(
      fc.asyncProperty(
        restaurantIdArb,
        emptyOrWhitespaceArb,
        fc.integer({ min: 1, max: 1000 }),
        fc.date({ min: new Date(Date.now() + 60_000), max: new Date(Date.now() + 48 * 3600_000) }),
        validLocationArb,
        async (restaurantId, foodName, quantity, expiryDatetime, location) => {
          jest.clearAllMocks();
          const body: CreateListingBody = { foodName, quantity, expiryDatetime, location };
          await expect(createListing(restaurantId, body)).rejects.toMatchObject({
            name: 'FoodServiceError',
            statusCode: 400,
          });
          expect(mockFoodListingCreate).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects quantity <= 0 with FoodServiceError 400 and does not create a listing', async () => {
    await fc.assert(
      fc.asyncProperty(
        restaurantIdArb,
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        nonPositiveQuantityArb,
        fc.date({ min: new Date(Date.now() + 60_000), max: new Date(Date.now() + 48 * 3600_000) }),
        validLocationArb,
        async (restaurantId, foodName, quantity, expiryDatetime, location) => {
          jest.clearAllMocks();
          const body: CreateListingBody = { foodName, quantity, expiryDatetime, location };
          await expect(createListing(restaurantId, body)).rejects.toMatchObject({
            name: 'FoodServiceError',
            statusCode: 400,
          });
          expect(mockFoodListingCreate).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects past expiryDatetime with FoodServiceError 400 and does not create a listing', async () => {
    await fc.assert(
      fc.asyncProperty(
        restaurantIdArb,
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.integer({ min: 1, max: 1000 }),
        pastDateArb,
        validLocationArb,
        async (restaurantId, foodName, quantity, expiryDatetime, location) => {
          jest.clearAllMocks();
          const body: CreateListingBody = { foodName, quantity, expiryDatetime, location };
          await expect(createListing(restaurantId, body)).rejects.toMatchObject({
            name: 'FoodServiceError',
            statusCode: 400,
          });
          expect(mockFoodListingCreate).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});

const claimedOrDeliveredStatusArb = fc.constantFrom<'claimed' | 'delivered'>('claimed', 'delivered');
const ngoIdArb = fc.hexaString({ minLength: 24, maxLength: 24 });
const listingIdArb = fc.hexaString({ minLength: 24, maxLength: 24 });

/**
 * Property 9: Claiming an Already-Claimed Listing Is Rejected
 * Validates: Requirements 3.4
 */
describe('Feature: ai-surplus-food-management, Property 9: Claiming an Already-Claimed Listing Is Rejected', () => {
  it('throws FoodServiceError 409 and does not create a FoodRequest when listing is already claimed or delivered', async () => {
    await fc.assert(
      fc.asyncProperty(
        ngoIdArb,
        listingIdArb,
        claimedOrDeliveredStatusArb,
        async (ngoId, listingId, status) => {
          jest.clearAllMocks();
          mockFoodListingFindById.mockResolvedValueOnce({
            _id: listingId,
            restaurantId: 'someRestaurantId',
            foodName: 'Test Food',
            status,
          });
          await expect(acceptRequest(ngoId, listingId)).rejects.toMatchObject({
            name: 'FoodServiceError',
            statusCode: 409,
          });
          expect(mockFoodRequestCreate).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
