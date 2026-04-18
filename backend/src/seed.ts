import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { UserModel } from './models/User';
import { FoodListingModel } from './models/FoodListing';
import { FoodRequestModel } from './models/FoodRequest';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/surplus-food';

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  await UserModel.deleteMany({});
  await FoodListingModel.deleteMany({});
  await FoodRequestModel.deleteMany({});
  console.log('Cleared existing data');

  const password = await bcrypt.hash('Password123!', 10);

  const restaurants = await UserModel.insertMany([
    { email: 'greenleaf@restaurant.com', passwordHash: password, role: 'restaurant', orgName: 'Green Leaf Bistro', location: { lat: 40.7128, lng: -74.006 }, isVerified: true, verificationCode: null, verificationCodeExpiry: null, resetToken: null, resetTokenExpiry: null },
    { email: 'sunrisecafe@restaurant.com', passwordHash: password, role: 'restaurant', orgName: 'Sunrise Café', location: { lat: 34.0522, lng: -118.2437 }, isVerified: true, verificationCode: null, verificationCodeExpiry: null, resetToken: null, resetTokenExpiry: null },
    { email: 'harvestkitchen@restaurant.com', passwordHash: password, role: 'restaurant', orgName: 'Harvest Kitchen', location: { lat: 41.8781, lng: -87.6298 }, isVerified: true, verificationCode: null, verificationCodeExpiry: null, resetToken: null, resetTokenExpiry: null },
  ]);

  const ngos = await UserModel.insertMany([
    { email: 'hopeharbor@ngo.org', passwordHash: password, role: 'ngo', orgName: 'Hope Harbor Foundation', location: { lat: 40.73, lng: -73.99 }, isVerified: true, verificationCode: null, verificationCodeExpiry: null, resetToken: null, resetTokenExpiry: null },
    { email: 'feedla@ngo.org', passwordHash: password, role: 'ngo', orgName: 'Feed LA', location: { lat: 34.06, lng: -118.25 }, isVerified: true, verificationCode: null, verificationCodeExpiry: null, resetToken: null, resetTokenExpiry: null },
    { email: 'chicagocares@ngo.org', passwordHash: password, role: 'ngo', orgName: 'Chicago Cares', location: { lat: 41.88, lng: -87.63 }, isVerified: true, verificationCode: null, verificationCodeExpiry: null, resetToken: null, resetTokenExpiry: null },
  ]);

  console.log('Inserted 3 restaurants and 3 NGOs');

  const now = new Date();
  const h = (n: number) => new Date(now.getTime() + n * 60 * 60 * 1000);

  const listings = await FoodListingModel.insertMany([
    { restaurantId: restaurants[0]._id, foodName: 'Vegetable Curry', quantity: 20, expiryDatetime: h(1), location: { lat: 40.7128, lng: -74.006 }, status: 'available', foodType: 'Vegetarian' },
    { restaurantId: restaurants[0]._id, foodName: 'Sourdough Bread Loaves', quantity: 15, expiryDatetime: h(2), location: { lat: 40.7128, lng: -74.006 }, status: 'available', foodType: 'Bakery' },
    { restaurantId: restaurants[1]._id, foodName: 'Grilled Chicken Plates', quantity: 30, expiryDatetime: h(5), location: { lat: 34.0522, lng: -118.2437 }, status: 'available', foodType: 'Non-Vegetarian' },
    { restaurantId: restaurants[1]._id, foodName: 'Mixed Fruit Salad', quantity: 25, expiryDatetime: h(6), location: { lat: 34.0522, lng: -118.2437 }, status: 'claimed', foodType: 'Vegan' },
    { restaurantId: restaurants[2]._id, foodName: 'Pasta Primavera', quantity: 40, expiryDatetime: h(12), location: { lat: 41.8781, lng: -87.6298 }, status: 'available', foodType: 'Vegetarian' },
    { restaurantId: restaurants[2]._id, foodName: 'Beef Stew', quantity: 18, expiryDatetime: h(12), location: { lat: 41.8781, lng: -87.6298 }, status: 'claimed', foodType: 'Non-Vegetarian' },
    { restaurantId: restaurants[0]._id, foodName: 'Assorted Sandwiches', quantity: 50, expiryDatetime: h(24), location: { lat: 40.7128, lng: -74.006 }, status: 'available', foodType: 'Mixed' },
    { restaurantId: restaurants[1]._id, foodName: 'Rice and Lentil Dal', quantity: 60, expiryDatetime: h(24), location: { lat: 34.0522, lng: -118.2437 }, status: 'delivered', foodType: 'Vegan' },
    { restaurantId: restaurants[2]._id, foodName: 'Cheese Pizza Slices', quantity: 35, expiryDatetime: h(48), location: { lat: 41.8781, lng: -87.6298 }, status: 'delivered', foodType: 'Vegetarian' },
    { restaurantId: restaurants[0]._id, foodName: 'Tomato Soup', quantity: 45, expiryDatetime: h(48), location: { lat: 40.7128, lng: -74.006 }, status: 'available', foodType: 'Vegan' },
  ]);

  console.log('Inserted 10 food listings');

  await FoodRequestModel.insertMany([
    { listingId: listings[3]._id, ngoId: ngos[1]._id, restaurantId: restaurants[1]._id, status: 'accepted' },
    { listingId: listings[5]._id, ngoId: ngos[2]._id, restaurantId: restaurants[2]._id, status: 'accepted' },
    { listingId: listings[7]._id, ngoId: ngos[1]._id, restaurantId: restaurants[1]._id, status: 'delivered' },
    { listingId: listings[8]._id, ngoId: ngos[2]._id, restaurantId: restaurants[2]._id, status: 'delivered' },
    { listingId: listings[0]._id, ngoId: ngos[0]._id, restaurantId: restaurants[0]._id, status: 'requested' },
  ]);

  console.log('Inserted 5 food requests');

  await mongoose.disconnect();
  console.log('Seeding complete. Disconnected from MongoDB.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
