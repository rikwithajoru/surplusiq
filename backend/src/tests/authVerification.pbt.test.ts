/**
 * Feature: ai-surplus-food-management, Property 11: Email Verification Code Lifecycle
 * Validates: Requirements 13.1, 13.2, 13.3, 13.4, 13.7
 */

import * as fc from 'fast-check';
import bcrypt from 'bcryptjs';

jest.mock('../models/User');
jest.mock('../services/emailService');

import { UserModel } from '../models/User';
import { verifyEmail } from '../services/authService';

const mockFindOne = UserModel.findOne as jest.Mock;

const emailArb = fc.emailAddress();
const validCodeArb = fc.integer({ min: 100000, max: 999999 }).map((n) => n.toString());
const wrongCodeArb = fc.integer({ min: 100000, max: 999999 }).map((n) => n.toString());

describe('Feature: ai-surplus-food-management, Property 11: Email Verification Code Lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('verifies account and returns a token when correct code is submitted within 15 minutes', async () => {
    await fc.assert(
      fc.asyncProperty(emailArb, validCodeArb, async (email, code) => {
        const codeHash = await bcrypt.hash(code, 10);
        const futureExpiry = new Date(Date.now() + 10 * 60 * 1000);
        const mockUser = {
          _id: 'user123', email, role: 'ngo',
          verificationCode: codeHash, verificationCodeExpiry: futureExpiry,
          isVerified: false, save: jest.fn().mockResolvedValue(undefined),
        };
        mockFindOne.mockResolvedValueOnce(mockUser);
        const token = await verifyEmail(email, code);
        expect(typeof token).toBe('string');
        expect(token.length).toBeGreaterThan(0);
        expect(mockUser.isVerified).toBe(true);
        expect(mockUser.verificationCode).toBeNull();
        expect(mockUser.verificationCodeExpiry).toBeNull();
        expect(mockUser.save).toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it('rejects expired verification codes and does not verify the account', async () => {
    await fc.assert(
      fc.asyncProperty(emailArb, validCodeArb, async (email, code) => {
        const codeHash = await bcrypt.hash(code, 10);
        const pastExpiry = new Date(Date.now() - 1 * 60 * 1000);
        const mockUser = {
          _id: 'user123', email, role: 'ngo',
          verificationCode: codeHash, verificationCodeExpiry: pastExpiry,
          isVerified: false, save: jest.fn().mockResolvedValue(undefined),
        };
        mockFindOne.mockResolvedValueOnce(mockUser);
        await expect(verifyEmail(email, code)).rejects.toMatchObject({ message: 'Verification code has expired', statusCode: 400 });
        expect(mockUser.isVerified).toBe(false);
        expect(mockUser.save).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it('rejects wrong verification codes and does not verify the account', async () => {
    await fc.assert(
      fc.asyncProperty(emailArb, validCodeArb, wrongCodeArb, async (email, correctCode, wrongCode) => {
        fc.pre(correctCode !== wrongCode);
        const codeHash = await bcrypt.hash(correctCode, 10);
        const futureExpiry = new Date(Date.now() + 10 * 60 * 1000);
        const mockUser = {
          _id: 'user123', email, role: 'ngo',
          verificationCode: codeHash, verificationCodeExpiry: futureExpiry,
          isVerified: false, save: jest.fn().mockResolvedValue(undefined),
        };
        mockFindOne.mockResolvedValueOnce(mockUser);
        await expect(verifyEmail(email, wrongCode)).rejects.toMatchObject({ message: 'Invalid verification code', statusCode: 400 });
        expect(mockUser.isVerified).toBe(false);
        expect(mockUser.save).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it('rejects reuse of a verification code after successful verification', async () => {
    await fc.assert(
      fc.asyncProperty(emailArb, validCodeArb, async (email, code) => {
        const codeHash = await bcrypt.hash(code, 10);
        const futureExpiry = new Date(Date.now() + 10 * 60 * 1000);
        const mockUser = {
          _id: 'user123', email, role: 'ngo',
          verificationCode: codeHash, verificationCodeExpiry: futureExpiry,
          isVerified: false, save: jest.fn().mockResolvedValue(undefined),
        };
        mockFindOne.mockResolvedValueOnce(mockUser);
        await verifyEmail(email, code);
        // After verification, code is cleared
        const verifiedUser = {
          _id: 'user123', email, role: 'ngo',
          verificationCode: null, verificationCodeExpiry: null,
          isVerified: true, save: jest.fn().mockResolvedValue(undefined),
        };
        mockFindOne.mockResolvedValueOnce(verifiedUser);
        await expect(verifyEmail(email, code)).rejects.toMatchObject({ statusCode: 400 });
      }),
      { numRuns: 100 }
    );
  });
});
