import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true }, // e.g., 'case_update', 'system_alert'
    message: { type: String, required: true },
    link: { type: String, default: null }, // URL to redirect when clicked
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

const NotificationModel = mongoose.models.Notification || mongoose.model('Notification', notificationSchema);

export default NotificationModel;
