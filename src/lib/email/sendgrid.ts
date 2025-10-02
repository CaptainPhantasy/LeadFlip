import * as sgMail from '@sendgrid/mail';

// Initialize SendGrid client
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: {
    email: string;
    name: string;
  };
}

/**
 * Send email via SendGrid
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Email not sent:', params.subject);
    return;
  }

  const fromEmail = params.from?.email || process.env.SENDGRID_FROM_EMAIL || 'invites@leadflip.com';
  const fromName = params.from?.name || process.env.SENDGRID_FROM_NAME || 'LeadFlip';

  await sgMail.send({
    to: params.to,
    from: {
      email: fromEmail,
      name: fromName,
    },
    subject: params.subject,
    text: params.text,
    html: params.html,
  });
}

export default sgMail;
