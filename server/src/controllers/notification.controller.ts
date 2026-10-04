import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { Notification } from '../models/notification.model.js';
import { Types } from 'mongoose';

export const getNotifications = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const notifications = await Notification.find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ data: notifications });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch notifications', message: err.message });
  }
};

export const markNotificationRead = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (id === 'read-all') {
      await Notification.updateMany(
        { userId: new Types.ObjectId(userId), isRead: false },
        { $set: { isRead: true } }
      );
      return res.status(200).json({ message: 'All notifications marked as read' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: new Types.ObjectId(userId) },
      { $set: { isRead: true } },
      { new: true }
    );

    res.status(200).json({ data: notification });
  } catch (err: any) {
    res.status(400).json({ error: 'Failed to mark notification read', message: err.message });
  }
};
