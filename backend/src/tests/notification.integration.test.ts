import request from 'supertest';
import app from '../app';
import { sendVerificationEmail } from '../services/emailService';
import { NotificationModel } from '../models/Notification';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

jest.mock('../services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockSendVerification = sendVerificationEmail as jest.Mock;

async function createUserAndGetToken(role: 'restaurant' | 'ngo', email: string): Promise<{ token: string; userId: string }> {
  mockSendVerification.mockClear();
  await request(app).post('/auth/register').send({ email, password: 'password123', role, orgName: `${role} Org`, location: { lat: 40.7128, lng: -74.006 } }).expect(201);
  const code = mockSendVerification.mock.calls[0][1] as string;
  const verifyRes = await request(app).post('/auth/verify-email').send({ email, code });
  const token = verifyRes.body.token as string;
  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
  return { token, userId: decoded.id };
}

describe('GET /notifications', () => {
  it('returns 200 with only unread notifications for the authenticated user', async () => {
    const { token, userId } = await createUserAndGetToken('restaurant', 'rest-notif@example.com');
    const { userId: otherUserId } = await createUserAndGetToken('ngo', 'ngo-notif@example.com');

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const otherObjectId = new mongoose.Types.ObjectId(otherUserId);

    await NotificationModel.create({ userId: userObjectId, message: 'Unread 1', type: 'request_created', read: false });
    await NotificationModel.create({ userId: userObjectId, message: 'Unread 2', type: 'request_created', read: false });
    await NotificationModel.create({ userId: userObjectId, message: 'Already read', type: 'status_updated', read: true });
    await NotificationModel.create({ userId: otherObjectId, message: 'Other user notif', type: 'request_created', read: false });

    const res = await request(app).get('/notifications').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
    expect(res.body.every((n: { read: boolean }) => n.read === false)).toBe(true);
  });
});

describe('PATCH /notifications/:id/read', () => {
  it('marks a notification as read and excludes it from subsequent unread responses', async () => {
    const { token, userId } = await createUserAndGetToken('restaurant', 'rest-read@example.com');
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const notif1 = await NotificationModel.create({ userId: userObjectId, message: 'Notif A', type: 'request_created', read: false });
    await NotificationModel.create({ userId: userObjectId, message: 'Notif B', type: 'request_created', read: false });

    const patchRes = await request(app).patch(`/notifications/${notif1._id}/read`).set('Authorization', `Bearer ${token}`);
    expect(patchRes.status).toBe(200);

    const getRes = await request(app).get('/notifications').set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body).toHaveLength(1);
    expect(getRes.body[0].message).toBe('Notif B');
  });
});
