import { NotificationModel, INotification } from '../models/Notification';

export async function createNotification(
  userId: string,
  message: string,
  type: string
): Promise<INotification> {
  return NotificationModel.create({ userId, message, type });
}

export async function getUnreadNotifications(userId: string): Promise<INotification[]> {
  return NotificationModel.find({ userId, read: false }).sort({ createdAt: -1 }).lean() as Promise<INotification[]>;
}

export async function markAsRead(notificationId: string): Promise<void> {
  await NotificationModel.findByIdAndUpdate(notificationId, { read: true });
}
