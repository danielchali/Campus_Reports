import nodemailer from 'nodemailer';

/**
 * Email Service Utility
 * Uses Gmail with App Passwords for secure email delivery.
 */

// Create a transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    // Note: Use an "App Password" generated from Google Account settings, not your main password
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

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

export {
  sendEmail,
  sendAnonymousReportNotification,
};
