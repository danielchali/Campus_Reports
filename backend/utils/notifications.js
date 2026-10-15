import NotificationModel from '../models/notification.js';
import UserModel from '../models/user.js';
import StudentModel from '../models/student.js';
import StaffModel from '../models/staff.js';
import { sendEmail } from './emailService.js';

export async function getNotificationEmail(userId) {
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

export async function notifyWardensOfNewReport({ report, anonymous = false }) {
    if (!report) return { sent: 0, failed: 0 };

    try {
        const wardens = await UserModel.find({ role: 'warden' }).select('_id').lean();
        const resolvedEmails = await Promise.all(wardens.map((warden) => getNotificationEmail(warden._id)));
        const recipients = [...new Set(
            resolvedEmails
                .map((email) => String(email || '').trim().toLowerCase())
                .filter(Boolean),
        )];
        if (recipients.length === 0) return { sent: 0, failed: 0 };

        const frontendUrl = String(process.env.FRONTEND_URL || process.env.APP_URL || '').replace(/\/$/, '');
        const reportTitle = String(report.title || 'Untitled report').trim();
        const reportType = anonymous ? 'anonymous report' : 'report';
        const category = String(report.category || 'other').replace(/_/g, ' ');
        const location = String(report.location || 'Not provided').trim();
        const trackingCode = String(report.tracking_code || 'Not available').trim();
        const linkUrl = frontendUrl ? `${frontendUrl}/inbox` : '';
        const subject = `New ${reportType}: ${reportTitle}`;
        const text = [
            `A new ${reportType} has been submitted to Campus Reports.`,
            '',
            `Title: ${reportTitle}`,
            `Category: ${category}`,
            `Location: ${location}`,
            `Tracking code: ${trackingCode}`,
            linkUrl ? `Open the staff inbox: ${linkUrl}` : '',
        ].filter(Boolean).join('\n');
        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #059669; padding: 20px;">
                    <h1 style="color: white; margin: 0; font-size: 22px;">New ${escapeHtml(reportType)}</h1>
                </div>
                <div style="padding: 30px; color: #1e293b;">
                    <p>A new ${escapeHtml(reportType)} has been submitted to Campus Reports.</p>
                    <p><strong>Title:</strong> ${escapeHtml(reportTitle)}</p>
                    <p><strong>Category:</strong> ${escapeHtml(category)}</p>
                    <p><strong>Location:</strong> ${escapeHtml(location)}</p>
                    <p><strong>Tracking code:</strong> ${escapeHtml(trackingCode)}</p>
                    ${linkUrl ? `<p><a href="${escapeHtml(linkUrl)}" style="color: #059669; font-weight: 700;">Open the staff inbox</a></p>` : ''}
                </div>
            </div>
        `;

        const results = await Promise.allSettled(
            recipients.map((to) => sendEmail({ to, subject, text, html })),
        );
        const failed = results.filter((result) => result.status === 'rejected');
        failed.forEach((result) => console.error('Failed to send new-report email to warden:', result.reason));
        return { sent: recipients.length - failed.length, failed: failed.length };
    } catch (error) {
        console.error('Failed to notify wardens of new report:', error);
        return { sent: 0, failed: 1 };
    }
}
