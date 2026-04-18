import request from 'supertest';
import app from '../app';
import { sendVerificationEmail } from '../services/emailService';

jest.mock('../services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockSendVerification = sendVerificationEmail as jest.Mock;

const futureDate = new Date(Date.now() + 2 * 3600 * 1000).toISOString();
const listingBody = {
  foodName: 'Rice',
  quantity: 10,
  expiryDatetime: futureDate,
  location: { lat: 40.7128, lng: -74.006 },
  foodType: 'cooked',
};

async function createUserAndGetToken(role: 'restaurant' | 'ngo', email: string): Promise<string> {
  mockSendVerification.mockClear();
  await request(app).post('/auth/register').send({ email, password: 'password123', role, orgName: `${role} Org`, location: { lat: 40.7128, lng: -74.006 } }).expect(201);
  const code = mockSendVerification.mock.calls[0][1] as string;
  const verifyRes = await request(app).post('/auth/verify-email').send({ email, code });
  return verifyRes.body.token as string;
}

describe('POST /food/addFood', () => {
  it('201 — creates a listing for a restaurant', async () => {
    const token = await createUserAndGetToken('restaurant', 'rest1@example.com');
    const res = await request(app).post('/food/addFood').set('Authorization', `Bearer ${token}`).send(listingBody);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ foodName: 'Rice', quantity: 10 });
  });

  it('400 — rejects empty foodName', async () => {
    const token = await createUserAndGetToken('restaurant', 'rest2@example.com');
    const res = await request(app).post('/food/addFood').set('Authorization', `Bearer ${token}`).send({ ...listingBody, foodName: '' });
    expect(res.status).toBe(400);
  });

  it('400 — rejects quantity <= 0', async () => {
    const token = await createUserAndGetToken('restaurant', 'rest3@example.com');
    const res = await request(app).post('/food/addFood').set('Authorization', `Bearer ${token}`).send({ ...listingBody, quantity: 0 });
    expect(res.status).toBe(400);
  });

  it('400 — rejects past expiryDatetime', async () => {
    const token = await createUserAndGetToken('restaurant', 'rest4@example.com');
    const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();
    const res = await request(app).post('/food/addFood').set('Authorization', `Bearer ${token}`).send({ ...listingBody, expiryDatetime: pastDate });
    expect(res.status).toBe(400);
  });

  it('401 — rejects missing token', async () => {
    const res = await request(app).post('/food/addFood').send(listingBody);
    expect(res.status).toBe(401);
  });

  it('403 — rejects ngo role', async () => {
    const token = await createUserAndGetToken('ngo', 'ngo1@example.com');
    const res = await request(app).post('/food/addFood').set('Authorization', `Bearer ${token}`).send(listingBody);
    expect(res.status).toBe(403);
  });
});

describe('GET /food/availableFood', () => {
  it('200 — returns sorted listings for NGO', async () => {
    const restToken = await createUserAndGetToken('restaurant', 'rest5@example.com');
    await request(app).post('/food/addFood').set('Authorization', `Bearer ${restToken}`).send(listingBody).expect(201);
    const ngoToken = await createUserAndGetToken('ngo', 'ngo2@example.com');
    const res = await request(app).get('/food/availableFood').set('Authorization', `Bearer ${ngoToken}`).query({ lat: 40.7128, lng: -74.006 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });
});

describe('POST /food/acceptRequest', () => {
  it('201 — creates a food request (happy path)', async () => {
    const restToken = await createUserAndGetToken('restaurant', 'rest6@example.com');
    const listingRes = await request(app).post('/food/addFood').set('Authorization', `Bearer ${restToken}`).send(listingBody).expect(201);
    const ngoToken = await createUserAndGetToken('ngo', 'ngo3@example.com');
    const res = await request(app).post('/food/acceptRequest').set('Authorization', `Bearer ${ngoToken}`).send({ listingId: listingRes.body._id });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'requested' });
  });

  it('409 — rejects claiming an already-claimed listing', async () => {
    const restToken = await createUserAndGetToken('restaurant', 'rest7@example.com');
    const listingRes = await request(app).post('/food/addFood').set('Authorization', `Bearer ${restToken}`).send(listingBody).expect(201);
    const ngo1Token = await createUserAndGetToken('ngo', 'ngo4@example.com');
    await request(app).post('/food/acceptRequest').set('Authorization', `Bearer ${ngo1Token}`).send({ listingId: listingRes.body._id }).expect(201);
    const ngo2Token = await createUserAndGetToken('ngo', 'ngo5@example.com');
    const res = await request(app).post('/food/acceptRequest').set('Authorization', `Bearer ${ngo2Token}`).send({ listingId: listingRes.body._id });
    expect(res.status).toBe(409);
  });
});

describe('PATCH /food/requests/:id/status', () => {
  it('200 — updates request status', async () => {
    const restToken = await createUserAndGetToken('restaurant', 'rest8@example.com');
    const listingRes = await request(app).post('/food/addFood').set('Authorization', `Bearer ${restToken}`).send(listingBody).expect(201);
    const ngoToken = await createUserAndGetToken('ngo', 'ngo6@example.com');
    const requestRes = await request(app).post('/food/acceptRequest').set('Authorization', `Bearer ${ngoToken}`).send({ listingId: listingRes.body._id }).expect(201);
    const res = await request(app).patch(`/food/requests/${requestRes.body._id}/status`).set('Authorization', `Bearer ${restToken}`).send({ status: 'accepted' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'accepted' });
  });
});

describe('GET /food/myListings', () => {
  it('200 — returns only the authenticated restaurant\'s listings', async () => {
    const rest1Token = await createUserAndGetToken('restaurant', 'rest9@example.com');
    await request(app).post('/food/addFood').set('Authorization', `Bearer ${rest1Token}`).send(listingBody).expect(201);
    const rest2Token = await createUserAndGetToken('restaurant', 'rest10@example.com');
    await request(app).post('/food/addFood').set('Authorization', `Bearer ${rest2Token}`).send({ ...listingBody, foodName: 'Pasta' }).expect(201);
    const res = await request(app).get('/food/myListings').set('Authorization', `Bearer ${rest1Token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ foodName: 'Rice' });
  });
});
