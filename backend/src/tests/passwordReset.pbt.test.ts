/**
 * Feature: ai-surplus-food-management, Property 12: Password Reset Token Lifecycle
 * Validates: Requirements 14.1, 14.3, 14.4, 14.5, 14.7
 */

import * as fc from 'fast-check';
import crypto from 'crypto';

jest.mock('../models/User');
jest.mock('../services/emailService');

import { UserModel } from '../models/User';
import { resetPassword } from '../services/authService';

const mockFindOne = UserModel.findOne as jest.Mock;

function sha256(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

const rawTokenArb = fc.hexaString({ minLength: 64, maxLength: 64 });
const validPasswordArb = fc.string({ minLength: 8, maxLength: 64 }).filter((s) => s.length >= 8);
const shortPasswordArb = fc.string({ minLength: 0, maxLength: 7 });
const differentTokenArb = fc.hexaString({ minLength: 64, maxLength: 64 });

describe('Feature: ai-surplus-food-management, Property 12: Password Reset Token Lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates password and invalidates token when valid token and password ≥ 8 chars submitted within 1 hour', async () => {
    await fc.assert(
      fc.asyncProperty(rawTokenArb, validPasswordArb, async (rawToken, newPassword) => {
        const tokenHash = sha256(rawToken);
        const futureExpiry = new Date(Date.now() + 30 * 60 * 1000);
        const mockUser = {
          _id: 'user123', resetToken: tokenHash, resetTokenExpiry: futureExpiry,
          passwordHash: 'old-hash', save: jest.fn().mockResolvedValue(undefined),
        };
        mockFindOne.mockResolvedValueOnce(mockUser);
        await resetPassword(rawToken, newPassword);
        expect(mockUser.passwordHash).not.toBe('old-hash');
        expect(mockUser.resetToken).toBeNull();
        expect(mockUser.resetTokenExpiry).toBeNull();
        expect(mockUser.save).toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it('rejects expired reset tokens and does not update the password', async () => {
    await fc.assert(
      fc.asyncProperty(rawTokenArb, validPasswordArb, async (rawToken, newPassword) => {
        const tokenHash = sha256(rawToken);
        const pastExpiry = new Date(Date.now() - 5 * 60 * 1000);
        const mockUser = {
          _id: 'user123', resetToken: tokenHash, resetTokenExpiry: pastExpiry,
          passwordHash: 'old-hash', save: jest.fn().mockResolvedValue(undefined),
        };
        mockFindOne.mockResolvedValueOnce(mockUser);
        await expect(resetPassword(rawToken, newPassword)).rejects.toMatchObject({ message: 'Invalid or expired reset token', statusCode: 400 });
        expect(mockUser.passwordHash).toBe('old-hash');
        expect(mockUser.save).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it('rejects invalid (unrecognised) tokens and does not update the password', async () => {
    await fc.assert(
      fc.asyncProperty(rawTokenArb, differentTokenArb, validPasswordArb, async (storedRaw, submittedRaw, newPassword) => {
        fc.pre(storedRaw !== submittedRaw);
        mockFindOne.mockResolvedValueOnce(null);
        await expect(resetPassword(submittedRaw, newPassword)).rejects.toMatchObject({ message: 'Invalid or expired reset token', statusCode: 400 });
        expect(mockFindOne).toHaveBeenCalledWith({ resetToken: sha256(submittedRaw) });
      }),
      { numRuns: 100 }
    );
  });

  it('rejects passwords shorter than 8 characters regardless of token validity', async () => {
    await fc.assert(
      fc.asyncProperty(rawTokenArb, shortPasswordArb, async (rawToken, shortPassword) => {
        await expect(resetPassword(rawToken, shortPassword)).rejects.toMatchObject({ message: 'Password must be at least 8 characters', statusCode: 400 });
        expect(mockFindOne).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });

  it('rejects reuse of a reset token after a successful password reset', async () => {
    await fc.assert(
      fc.asyncProperty(rawTokenArb, validPasswordArb, async (rawToken, newPassword) => {
        const tokenHash = sha256(rawToken);
        const futureExpiry = new Date(Date.now() + 30 * 60 * 1000);
        const mockUser = {
          _id: 'user123', resetToken: tokenHash, resetTokenExpiry: futureExpiry,
          passwordHash: 'old-hash', save: jest.fn().mockResolvedValue(undefined),
        };
        mockFindOne.mockResolvedValueOnce(mockUser);
        await resetPassword(rawToken, newPassword);
        mockFindOne.mockResolvedValueOnce(null);
        await expect(resetPassword(rawToken, newPassword)).rejects.toMatchObject({ statusCode: 400 });
      }),
      { numRuns: 100 }
    );
  });
});
