/**
 * Feature: ai-surplus-food-management, Property 10: Notification Lifecycle
 * Validates: Requirements 10.1, 10.2, 10.4
 */

import * as fc from 'fast-check';

jest.mock('../models/Notification');

import { NotificationModel } from '../models/Notification';
import {
  createNotification,
  getUnreadNotifications,
  markAsRead,
} from '../services/notificationService';

function makeObjectId(): string {
  return [...Array(24)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

let store: Array<{
  _id: string;
  userId: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: Date;
}> = [];

const mockCreate = NotificationModel.create as jest.Mock;
const mockFind = NotificationModel.find as jest.Mock;
const mockFindByIdAndUpdate = NotificationModel.findByIdAndUpdate as jest.Mock;

function setupMocks() {
  mockCreate.mockImplementation(async (data: { userId: string; message: string; type: string }) => {
    const doc = { _id: makeObjectId(), userId: data.userId, message: data.message, type: data.type, read: false, createdAt: new Date() };
    store.push(doc);
    return doc;
  });
  mockFind.mockImplementation((query: { userId?: string; read?: boolean }) => {
    const results = store.filter((n) => {
      if (query.userId !== undefined && n.userId !== query.userId) return false;
      if (query.read !== undefined && n.read !== query.read) return false;
      return true;
    });
    return { sort: () => ({ lean: () => Promise.resolve(results) }) };
  });
  mockFindByIdAndUpdate.mockImplementation(async (id: string) => {
    const doc = store.find((n) => n._id === id);
    if (doc) doc.read = true;
    return doc ?? null;
  });
}

beforeEach(() => {
  store = [];
  jest.clearAllMocks();
  setupMocks();
});

const userIdArb = fc.hexaString({ minLength: 24, maxLength: 24 });
const messageArb = fc.string({ minLength: 1, maxLength: 200 });
const typeArb = fc.constantFrom('request_created', 'status_updated');
const statusArb = fc.constantFrom<'accepted' | 'delivered'>('accepted', 'delivered');

describe('Feature: ai-surplus-food-management, Property 10: Notification Lifecycle', () => {
  it('creates exactly one unread notification for the restaurant when a FoodRequest is created', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, messageArb, async (restaurantId, message) => {
        store = [];
        jest.clearAllMocks();
        setupMocks();
        await createNotification(restaurantId, message, 'request_created');
        const unread = await getUnreadNotifications(restaurantId);
        expect(unread).toHaveLength(1);
        expect(unread[0].read).toBe(false);
        expect(unread[0].userId).toBe(restaurantId);
      }),
      { numRuns: 100 }
    );
  });

  it('creates exactly one unread notification for the NGO when status transitions to accepted or delivered', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, messageArb, statusArb, async (ngoId, message, _status) => {
        store = [];
        jest.clearAllMocks();
        setupMocks();
        await createNotification(ngoId, message, 'status_updated');
        const unread = await getUnreadNotifications(ngoId);
        expect(unread).toHaveLength(1);
        expect(unread[0].read).toBe(false);
        expect(unread[0].userId).toBe(ngoId);
      }),
      { numRuns: 100 }
    );
  });

  it('does not return a notification in unread results after it has been marked as read', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, messageArb, typeArb, async (userId, message, type) => {
        store = [];
        jest.clearAllMocks();
        setupMocks();
        const notification = await createNotification(userId, message, type);
        const before = await getUnreadNotifications(userId);
        expect(before).toHaveLength(1);
        await markAsRead((notification as { _id: string })._id);
        const after = await getUnreadNotifications(userId);
        expect(after).toHaveLength(0);
      }),
      { numRuns: 100 }
    );
  });
});
