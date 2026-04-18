import request from 'supertest';
import app from '../app';
import { sendVerificationEmail } from '../services/emailService';
import { UserModel } from '../models/User';
import { FoodListingModel } from '../models/FoodListing';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

jest.mock('../services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockSendVerification = sendVerificationEmail as jest.Mock;

async function createUserAndGetToken(role: 'restaurant' | 'ngo', email: string): Promise<string> {
  mockSendVerification.mockClear();
  await request(app).post('/auth/register').send({ email, password: 'password123', role, orgName: `${role} Org`, location: { lat: 40.7128, lng: -74.006 } }).expect(201);
  const code = mockSendVerification.mock.calls[0][1] as string;
  const verifyRes = await request(app).post('/auth/verify-email').send({ email, code });
  return verifyRes.body.token as string;
}

async function createAdminToken(): Promise<string> {
  const passwordHash = await bcrypt.hash('adminpass', 10);
  const admin = await UserModel.create({ email: `admin-${Date.now()}@example.com`, passwordHash, role: 'admin', orgName: 'Admin Org', location: { lat: 0, lng: 0 }, isVerified: true });
  return jwt.sign({ id: String(admin._id), role: 'admin' }, process.env.JWT_SECRET!);
}

describe('GET /analytics', () => {
  it('returns 200 with analytics object containing required fields', async () => {
    const token = await createAdminToken();
    const res = await request(app).get('/analytics').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalKgSaved');
    expect(res.body).toHaveProperty('totalDonations');
    expect(res.body).toHaveProperty('estimatedPeopleFed');
    expect(res.body).toHaveProperty('estimatedCO2Reduced');
  });

  it('returns filtered analytics for delivered listings within date range', async () => {
    const restToken = await createUserAndGetToken('restaurant', 'rest-analytics@example.com');
    const decoded = jwt.verify(restToken, process.env.JWT_SECRET!) as { id: string };
    const restaurantId = new mongoose.Types.ObjectId(decoded.id);

    const inRangeDate = new Date('2024-06-15T12:00:00Z');
    const outOfRangeDate = new Date('2024-01-01T12:00:00Z');

    await FoodListingModel.collection.insertOne({ restaurantId, foodName: 'Rice', quantity: 20, expiryDatetime: new Date(Date.now() + 3600 * 1000), location: { lat: 40.7128, lng: -74.006 }, status: 'delivered', foodType: 'cooked', createdAt: inRangeDate, updatedAt: inRangeDate });
    await FoodListingModel.collection.insertOne({ restaurantId, foodName: 'Bread', quantity: 10, expiryDatetime: new Date(Date.now() + 3600 * 1000), location: { lat: 40.7128, lng: -74.006 }, status: 'delivered', foodType: 'bakery', createdAt: outOfRangeDate, updatedAt: outOfRangeDate });

    const adminToken = await createAdminToken();
    const res = await request(app).get('/analytics').query({ from: '2024-06-01T00:00:00Z', to: '2024-06-30T23:59:59Z' }).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totalKgSaved).toBe(20);
    expect(res.body.totalDonations).toBe(1);
    expect(res.body.estimatedPeopleFed).toBe(40);
    expect(res.body.estimatedCO2Reduced).toBe(50);
  });
});

describe('GET /export/csr-report', () => {
  it('returns 200 with PDF attachment for admin role', async () => {
    const token = await createAdminToken();
    const res = await request(app).get('/export/csr-report').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/pdf/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
  });

  it('returns 403 for restaurant role', async () => {
    const token = await createUserAndGetToken('restaurant', 'rest-pdf@example.com');
    const res = await request(app).get('/export/csr-report').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns 403 for ngo role', async () => {
    const token = await createUserAndGetToken('ngo', 'ngo-pdf@example.com');
    const res = await request(app).get('/export/csr-report').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});
