import nodemailer from 'nodemailer';

/**
 * Email Service Utility
 * Uses Gmail with App Passwords for secure email delivery.
 */

const ANONYMOUS_CATEGORY_LABELS = {
  disciplinary_case: 'Disciplinary Case',
  maintenance_issue: 'Maintenance Issue',
  other: 'Other',
};

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    // Note: Use an "App Password" generated from Google Account settings, not your main password
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

function isEmailEnabled() {
  return process.env.EMAIL_ENABLED === 'true';
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidContactEmail(value) {
  const email = String(value || '').trim();
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeContactEmail(value) {
  const email = String(value || '').trim();
  return isValidContactEmail(email) ? email : '';
}

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || process.env.APP_URL || '').replace(/\/$/, '');
}

function emailShell(title, bodyHtml) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #059669; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">${escapeHtml(title)}</h1>
      </div>
      <div style="padding: 30px; color: #1e293b;">
        ${bodyHtml}
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="font-size: 12px; color: #64748b;">This is an automated notification from the Campus Reports System.</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email address
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body (optional)
 */
const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const mailOptions = {
      from: `"Campus Reports" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text,
      html: html || text,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

/**
 * Send a notification for a new anonymous report
 * @param {Object} report - The report data
 */
const sendAnonymousReportNotification = async (report) => {
  const subject = `New Anonymous Report: ${report.title}`;
  const text = `A new anonymous report has been submitted.\n\nCategory: ${report.category}\nTitle: ${report.title}\nDescription: ${report.description}\nLocation: ${report.location}\nTracking Code: ${report.tracking_code}`;
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background-color: #059669; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">New Anonymous Report</h1>
      </div>
      <div style="padding: 30px; color: #1e293b;">
        <p style="font-size: 16px; margin-bottom: 20px;">A new anonymous report has been submitted to the Campus Reports system.</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 120px;">Category:</td>
            <td style="padding: 8px 0;">${report.category}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Title:</td>
            <td style="padding: 8px 0;">${report.title}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Description:</td>
            <td style="padding: 8px 0;">${report.description}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Location:</td>
            <td style="padding: 8px 0;">${report.location}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Tracking Code:</td>
            <td style="padding: 8px 0; color: #059669; font-family: monospace; font-size: 18px;">${report.tracking_code}</td>
          </tr>
        </table>
        <div style="margin-top: 30px; padding-top: 20px; border-t: 1px solid #e2e8f0; text-align: center;">
          <p style="font-size: 12px; color: #64748b;">This is an automated notification from the Campus Reports System.</p>
        </div>
      </div>
    </div>
  `;

  // In a real scenario, you'd send this to an admin email or a list of staff
  // For now, we'll use the GMAIL_USER as the recipient if ADMIN_EMAIL isn't set
  const recipient = process.env.ADMIN_EMAIL || process.env.GMAIL_USER;
  
  return sendEmail({ to: recipient, subject, text, html });
};

/**
 * Confirmation email to an anonymous reporter who opted in with contact_email.
 */
const sendAnonymousReporterConfirmation = async (report) => {
  const to = normalizeContactEmail(report.contact_email);
  if (!to) return null;

  const frontendUrl = getFrontendUrl();
  const trackUrl = frontendUrl ? `${frontendUrl}/anonymous-report` : '';
  const categoryLabel = ANONYMOUS_CATEGORY_LABELS[report.category] || report.category;
  const subject = `Report received — tracking code ${report.tracking_code}`;
  const text = [
    'Your anonymous report has been received.',
    '',
    `Tracking code: ${report.tracking_code}`,
    `Title: ${report.title}`,
    `Category: ${categoryLabel}`,
    `Status: ${report.status}`,
    '',
    trackUrl
      ? `Track your report at: ${trackUrl}`
      : 'Use the Track Report tab on the Campus Reports anonymous reporting page with your tracking code.',
    '',
    'Keep this code safe. It is the only way to check your report status without logging in.',
  ].join('\n');

  const html = emailShell('Anonymous Report Received', `
    <p style="font-size: 16px; line-height: 1.6;">
      Thank you for submitting your report. We have received it and it will be reviewed by the relevant office.
    </p>
    <p style="font-size: 14px; line-height: 1.6; color: #475569;">
      Your identity remains anonymous. This email was sent only because you chose to provide a contact address for updates.
    </p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
      <tr>
        <td style="padding: 8px 0; font-weight: bold; width: 140px;">Tracking code:</td>
        <td style="padding: 8px 0; color: #059669; font-family: monospace; font-size: 18px;">${escapeHtml(report.tracking_code)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Title:</td>
        <td style="padding: 8px 0;">${escapeHtml(report.title)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Category:</td>
        <td style="padding: 8px 0;">${escapeHtml(categoryLabel)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Status:</td>
        <td style="padding: 8px 0;">${escapeHtml(report.status)}</td>
      </tr>
    </table>
    ${trackUrl
      ? `<p style="margin-top: 24px;"><a href="${escapeHtml(trackUrl)}" style="color: #059669; font-weight: 700;">Track your report</a></p>`
      : ''}
  `);

  return sendEmail({ to, subject, text, html });
};

/**
 * Status update email to an anonymous reporter who provided contact_email.
 */
const sendAnonymousReporterStatusUpdate = async (report, { previousStatus, newStatus } = {}) => {
  const to = normalizeContactEmail(report.contact_email);
  if (!to) return null;

  const frontendUrl = getFrontendUrl();
  const trackUrl = frontendUrl ? `${frontendUrl}/anonymous-report` : '';
  const subject = `Report update — ${report.tracking_code} is now ${newStatus || report.status}`;
  const text = [
    'Your anonymous report status has been updated.',
    '',
    `Tracking code: ${report.tracking_code}`,
    `Title: ${report.title}`,
    previousStatus && newStatus ? `Previous status: ${previousStatus}` : '',
    `Current status: ${newStatus || report.status}`,
    '',
    trackUrl ? `Track your report at: ${trackUrl}` : '',
  ].filter(Boolean).join('\n');

  const html = emailShell('Anonymous Report Status Update', `
    <p style="font-size: 16px; line-height: 1.6;">
      The status of your anonymous report has changed.
    </p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
      <tr>
        <td style="padding: 8px 0; font-weight: bold; width: 140px;">Tracking code:</td>
        <td style="padding: 8px 0; color: #059669; font-family: monospace; font-size: 18px;">${escapeHtml(report.tracking_code)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Title:</td>
        <td style="padding: 8px 0;">${escapeHtml(report.title)}</td>
      </tr>
      ${previousStatus && newStatus ? `
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Previous status:</td>
        <td style="padding: 8px 0;">${escapeHtml(previousStatus)}</td>
      </tr>` : ''}
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Current status:</td>
        <td style="padding: 8px 0;">${escapeHtml(newStatus || report.status)}</td>
      </tr>
    </table>
    ${trackUrl
      ? `<p style="margin-top: 24px;"><a href="${escapeHtml(trackUrl)}" style="color: #059669; font-weight: 700;">Track your report</a></p>`
      : ''}
  `);

  return sendEmail({ to, subject, text, html });
};

/**
 * Category reroute email to an anonymous reporter who provided contact_email.
 */
const sendAnonymousReporterCategoryUpdate = async (report, { previousCategory, newCategory } = {}) => {
  const to = normalizeContactEmail(report.contact_email);
  if (!to) return null;

  const previousLabel = ANONYMOUS_CATEGORY_LABELS[previousCategory] || previousCategory;
  const newLabel = ANONYMOUS_CATEGORY_LABELS[newCategory] || newCategory;
  const subject = `Report update — ${report.tracking_code} rerouted`;
  const text = [
    'Your anonymous report was rerouted to a different handling category.',
    '',
    `Tracking code: ${report.tracking_code}`,
    `Title: ${report.title}`,
    `Previous category: ${previousLabel}`,
    `Current category: ${newLabel}`,
  ].join('\n');

  const html = emailShell('Anonymous Report Category Update', `
    <p style="font-size: 16px; line-height: 1.6;">
      Your report has been rerouted so the correct office can handle it.
    </p>
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
      <tr>
        <td style="padding: 8px 0; font-weight: bold; width: 140px;">Tracking code:</td>
        <td style="padding: 8px 0; color: #059669; font-family: monospace; font-size: 18px;">${escapeHtml(report.tracking_code)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Title:</td>
        <td style="padding: 8px 0;">${escapeHtml(report.title)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Previous category:</td>
        <td style="padding: 8px 0;">${escapeHtml(previousLabel)}</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; font-weight: bold;">Current category:</td>
        <td style="padding: 8px 0;">${escapeHtml(newLabel)}</td>
      </tr>
    </table>
  `);

  return sendEmail({ to, subject, text, html });
};

export {
  sendEmail,
  isEmailEnabled,
  isValidContactEmail,
  normalizeContactEmail,
  sendAnonymousReportNotification,
  sendAnonymousReporterConfirmation,
  sendAnonymousReporterStatusUpdate,
  sendAnonymousReporterCategoryUpdate,
};
