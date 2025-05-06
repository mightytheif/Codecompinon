import nodemailer from 'nodemailer';

// Create a test account for development
const createTestAccount = async () => {
  const testAccount = await nodemailer.createTestAccount();
  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

let transporter: nodemailer.Transporter;

export const initializeEmailService = async () => {
  // For development, use ethereal email (fake SMTP service)
  transporter = await createTestAccount();
  console.log('Email service initialized');
};

export const sendVerificationCode = async (to: string, code: string) => {
  if (!transporter) {
    await initializeEmailService();
  }

  const info = await transporter.sendMail({
    from: '"SAKANY Security" <security@sakany.com>',
    to,
    subject: "Your Two-Factor Authentication Code",
    text: `Your verification code is: ${code}\n\nThis code will expire in 5 minutes.\n\nIf you didn't request this code, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Two-Factor Authentication Code</h2>
        <p style="font-size: 24px; font-weight: bold; color: #333; padding: 20px; background-color: #f5f5f5; text-align: center; letter-spacing: 5px;">
          ${code}
        </p>
        <p>This code will expire in 5 minutes.</p>
        <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
      </div>
    `,
  });

  // Log the test email URL (only in development)
  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log("Preview URL: %s", previewUrl);

  return {
    ...info,
    previewUrl
  };
};

export const sendPropertyReportFeedback = async (
  to: string, 
  propertyTitle: string, 
  adminNotes: string, 
  reportReason: string,
  status: string
) => {
  if (!transporter) {
    await initializeEmailService();
  }

  const statusText = status === 'resolved' ? 'resolved' : 'pending review';

  const info = await transporter.sendMail({
    from: '"SAKANY Admin" <admin@sakany.com>',
    to,
    subject: `Important: Feedback on Your Property Listing - ${propertyTitle}`,
    text: `
Dear Property Owner,

Your property listing "${propertyTitle}" has been reported for the following reason:
${reportReason}

Admin Feedback:
${adminNotes}

Current Status: ${statusText}

Please review these notes and make any necessary changes to your property listing. Addressing these issues will help maintain the quality of our platform and ensure your listing complies with our guidelines.

If you have any questions or need assistance, please contact our support team.

Thank you,
SAKANY Admin Team
    `,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #333;">Property Report Feedback</h2>
        </div>
        
        <p style="margin-bottom: 15px;">Dear Property Owner,</p>
        
        <p style="margin-bottom: 15px;">Your property listing "<strong>${propertyTitle}</strong>" has been reported for the following reason:</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-left: 4px solid #ccc; margin-bottom: 20px;">
          <p style="margin: 0; color: #666;"><em>${reportReason}</em></p>
        </div>
        
        <p style="margin-bottom: 15px;"><strong>Admin Feedback:</strong></p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #2c98f0; margin-bottom: 20px;">
          <p style="margin: 0; white-space: pre-line;">${adminNotes}</p>
        </div>
        
        <p style="margin-bottom: 20px;">
          <strong>Current Status:</strong> 
          <span style="padding: 5px 10px; border-radius: 15px; font-size: 14px; display: inline-block; 
          ${status === 'resolved' 
            ? 'background-color: #e7f7ed; color: #28a745;' 
            : 'background-color: #fff3cd; color: #856404;'}">
            ${statusText}
          </span>
        </p>
        
        <p style="margin-bottom: 15px;">Please review these notes and make any necessary changes to your property listing. Addressing these issues will help maintain the quality of our platform and ensure your listing complies with our guidelines.</p>
        
        <p style="margin-bottom: 15px;">If you have any questions or need assistance, please contact our support team.</p>
        
        <p style="margin-bottom: 15px;">Thank you,<br>SAKANY Admin Team</p>
      </div>
    `,
  });

  // Log the test email URL (only in development)
  const previewUrl = nodemailer.getTestMessageUrl(info);
  console.log("Property Report Feedback Email Preview URL: %s", previewUrl);

  return {
    ...info,
    previewUrl
  };
};