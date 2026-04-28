import NotificationModel from '../models/notification.js';

export async function createNotification({ userId, type, message, link = null }) {
    if (!userId || !type || !message) {
        return null;
    }

    try {
        return await NotificationModel.create({
            userId,
            type,
            message,
            link,
        });
    } catch (error) {
        console.error('Failed to create notification:', error);
        return null;
    }
}
