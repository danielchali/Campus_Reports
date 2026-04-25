import express from 'express';
import { authenticate } from '../middleware/auth.js';
import NotificationModel from '../models/notification.js';

const router = express.Router();

router.use(authenticate);

// Get user's notifications
router.get('/', async (req, res) => {
    try {
        const notifications = await NotificationModel.find({ userId: req.user.id })
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(notifications);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

// Mark single notification as read
router.patch('/:id/read', async (req, res) => {
    try {
        const notification = await NotificationModel.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id },
            { isRead: true },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        res.json(notification);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Mark all as read
router.post('/mark-all-read', async (req, res) => {
    try {
        await NotificationModel.updateMany(
            { userId: req.user.id, isRead: false },
            { isRead: true }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update notifications' });
    }
});

export default router;
