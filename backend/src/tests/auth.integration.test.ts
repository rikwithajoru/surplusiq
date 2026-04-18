import request from 'supertest';
import app from '../app';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/emailService';

jest.mock('../services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const mockSendVerification = sendVerificationEmail as jest.Mock;
const mockSendReset = sendPasswordResetEmail as jest.Mock;

const BASE_USER = {
  email: 'test@example.com',
  password: 'password123',
  role: 'restaurant',
  orgName: 'Test Org',
  location: { lat: 40.7128, lng: -74.006 },
};

async function registerAndVerify(overrides: Partial<typeof BASE_USER> = {}) {
  const user = { ...BASE_USER, ...overrides };
  mockSendVerification.mockClear();
  await request(app).post('/auth/register').send(user).expect(201);
  const code = mockSendVerification.mock.calls[0][1];
  const verifyRes = await request(app).post('/auth/verify-email').send({ email: user.email, code });
  return { user, token: verifyRes.body.token };
}

describe('POST /auth/register', () => {
  beforeEach(() => mockSendVerification.mockClear());

  it('returns 201 with a message on success', async () => {
    const res = await request(app).post('/auth/register').send(BASE_USER);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message');
    expect(mockSendVerification).toHaveBeenCalledTimes(1);
  });

  it('returns 409 for duplicate email', async () => {
    await request(app).post('/auth/register').send(BASE_USER).expect(201);
    const res = await request(app).post('/auth/register').send(BASE_USER);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it('returns 400 when email is missing', async () => {
    const { email: _omit, ...body } = BASE_USER;
    const res = await request(app).post('/auth/register').send(body);
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const { password: _omit, ...body } = BASE_USER;
    const res = await request(app).post('/auth/register').send(body);
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('returns 200 with a token on valid credentials', async () => {
    await registerAndVerify();
    const res = await request(app).post('/auth/login').send({ email: BASE_USER.email, password: BASE_USER.password });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ role: BASE_USER.role });
  });

  it('returns 401 for wrong password', async () => {
    await registerAndVerify();
    const res = await request(app).post('/auth/login').send({ email: BASE_USER.email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'nobody@example.com', password: 'password123' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for unverified account', async () => {
    mockSendVerification.mockClear();
    await request(app).post('/auth/register').send(BASE_USER).expect(201);
    const res = await request(app).post('/auth/login').send({ email: BASE_USER.email, password: BASE_USER.password });
    expect(res.status).toBe(403);
  });
});

describe('POST /auth/verify-email', () => {
  beforeEach(() => mockSendVerification.mockClear());

  it('returns 200 with a token for the correct code', async () => {
    await request(app).post('/auth/register').send(BASE_USER).expect(201);
    const code = mockSendVerification.mock.calls[0][1];
    const res = await request(app).post('/auth/verify-email').send({ email: BASE_USER.email, code });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('returns 400 for a wrong code', async () => {
    await request(app).post('/auth/register').send(BASE_USER).expect(201);
    const res = await request(app).post('/auth/verify-email').send({ email: BASE_USER.email, code: '000000' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an expired code', async () => {
    const { UserModel } = await import('../models/User');
    await request(app).post('/auth/register').send(BASE_USER).expect(201);
    await UserModel.updateOne({ email: BASE_USER.email }, { verificationCodeExpiry: new Date(Date.now() - 1000) });
    const code = mockSendVerification.mock.calls[0][1];
    const res = await request(app).post('/auth/verify-email').send({ email: BASE_USER.email, code });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expired/i);
  });
});

describe('POST /auth/resend-verification', () => {
  it('invalidates old code and issues a new one', async () => {
    mockSendVerification.mockClear();
    await request(app).post('/auth/register').send(BASE_USER).expect(201);
    const oldCode = mockSendVerification.mock.calls[0][1];

    mockSendVerification.mockClear();
    const resendRes = await request(app).post('/auth/resend-verification').send({ email: BASE_USER.email });
    expect(resendRes.status).toBe(200);
    const newCode = mockSendVerification.mock.calls[0][1];
    expect(newCode).not.toBe(oldCode);

    const oldVerify = await request(app).post('/auth/verify-email').send({ email: BASE_USER.email, code: oldCode });
    expect(oldVerify.status).toBe(400);

    const newVerify = await request(app).post('/auth/verify-email').send({ email: BASE_USER.email, code: newCode });
    expect(newVerify.status).toBe(200);
  });
});

describe('POST /auth/forgot-password', () => {
  it('returns 200 for a registered email', async () => {
    await registerAndVerify();
    mockSendReset.mockClear();
    const res = await request(app).post('/auth/forgot-password').send({ email: BASE_USER.email });
    expect(res.status).toBe(200);
    expect(mockSendReset).toHaveBeenCalledTimes(1);
  });

  it('returns 200 for an unregistered email (no enumeration)', async () => {
    mockSendReset.mockClear();
    const res = await request(app).post('/auth/forgot-password').send({ email: 'nobody@example.com' });
    expect(res.status).toBe(200);
    expect(mockSendReset).not.toHaveBeenCalled();
  });
});

describe('POST /auth/reset-password', () => {
  async function getResetToken(): Promise<string> {
    await registerAndVerify();
    mockSendReset.mockClear();
    await request(app).post('/auth/forgot-password').send({ email: BASE_USER.email }).expect(200);
    const resetLink = mockSendReset.mock.calls[0][1] as string;
    return new URL(resetLink).searchParams.get('token')!;
  }

  it('returns 200 and updates the password with a valid token', async () => {
    const token = await getResetToken();
    const res = await request(app).post('/auth/reset-password').send({ token, newPassword: 'newpassword123' });
    expect(res.status).toBe(200);
    const loginRes = await request(app).post('/auth/login').send({ email: BASE_USER.email, password: 'newpassword123' });
    expect(loginRes.status).toBe(200);
  });

  it('returns 400 for an invalid token', async () => {
    await registerAndVerify();
    const res = await request(app).post('/auth/reset-password').send({ token: 'invalidtoken', newPassword: 'newpassword123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for an expired token', async () => {
    const { UserModel } = await import('../models/User');
    const token = await getResetToken();
    await UserModel.updateOne({ email: BASE_USER.email }, { resetTokenExpiry: new Date(Date.now() - 1000) });
    const res = await request(app).post('/auth/reset-password').send({ token, newPassword: 'newpassword123' });
    expect(res.status).toBe(400);
  });

  it('returns 400 for a password shorter than 8 characters', async () => {
    const token = await getResetToken();
    const res = await request(app).post('/auth/reset-password').send({ token, newPassword: 'short' });
    expect(res.status).toBe(400);
  });
});
