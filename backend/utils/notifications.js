import NotificationModel from '../models/notification.js';
import UserModel from '../models/user.js';
import StudentModel from '../models/student.js';
import StaffModel from '../models/staff.js';
import { sendEmail } from './emailService.js';

async function getNotificationEmail(userId) {
    try {
        const user = await UserModel.findById(userId, 'username role email');
        if (!user) return '';
        if (user.email) return user.email;

        if (user.role === 'student') {
            const student = await StudentModel.findOne({ studentId: user.username });
            return student?.addressInfo?.email || '';
        }

        const staff = await StaffModel.findOne({ staffId: user.username });
        return staff?.email || '';
    } catch (error) {
        console.error('Failed to resolve notification email:', error);
        return '';
    }
}

function escapeHtml(value = '') {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function sendNotificationEmail({ userId, type, message, link }) {
    const to = await getNotificationEmail(userId);
    if (!to) return;

    const appUrl = process.env.FRONTEND_URL || process.env.APP_URL || '';
    const linkUrl = link && appUrl ? `${appUrl.replace(/\/$/, '')}${link}` : '';
    const subject = `Campus Reports notification: ${type.replace(/_/g, ' ')}`;
    const text = `${message}${linkUrl ? `\n\nOpen: ${linkUrl}` : ''}`;
    const safeMessage = escapeHtml(message);
    const safeLinkUrl = escapeHtml(linkUrl);
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background-color: #059669; padding: 18px 24px;">
                <h1 style="color: #fff; margin: 0; font-size: 20px;">Campus Reports Notification</h1>
            </div>
            <div style="padding: 24px; color: #1e293b;">
                <p style="font-size: 15px; line-height: 1.6;">${safeMessage}</p>
                ${safeLinkUrl ? `<p><a href="${safeLinkUrl}" style="color: #059669; font-weight: 700;">Open in Campus Reports</a></p>` : ''}
                <p style="margin-top: 24px; font-size: 12px; color: #64748b;">This is an automated email notification.</p>
            </div>
        </div>
    `;

    try {
        await sendEmail({ to, subject, text, html });
    } catch (error) {
        console.error('Failed to send notification email:', error);
    }
}

export async function createNotification({ userId, type, message, link = null }) {
    if (!userId || !type || !message) {
        return null;
    }

    try {
        const notification = await NotificationModel.create({
            userId,
            type,
            message,
            link,
        });
        sendNotificationEmail({ userId, type, message, link });
        return notification;
    } catch (error) {
        console.error('Failed to create notification:', error);
        return null;
    }
}
