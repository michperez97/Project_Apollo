import sgMail from '@sendgrid/mail';

export interface EmailPayload {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const provider = (process.env.EMAIL_PROVIDER ?? 'log').toLowerCase();
const defaultFrom = process.env.EMAIL_FROM ?? 'no-reply@apollo.local';
const replyTo = process.env.EMAIL_REPLY_TO || undefined;
const sendgridKey = process.env.SENDGRID_API_KEY;

const ensureSendgridConfigured = () => {
  if (!sendgridKey) {
    console.warn('SENDGRID_API_KEY is not set; email will be logged instead.');
    return false;
  }
  sgMail.setApiKey(sendgridKey);
  return true;
};

export const sendEmail = async (payload: EmailPayload): Promise<void> => {
  if (provider === 'disabled') {
    return;
  }

  if (provider === 'sendgrid') {
    if (!ensureSendgridConfigured()) {
      console.log('[email:sendgrid->log]', { ...payload, from: defaultFrom });
      return;
    }
    await sgMail.send({
      to: payload.to,
      from: defaultFrom,
      replyTo,
      subject: payload.subject,
      text: payload.text,
      html: payload.html ?? payload.text
    });
    return;
  }

  console.log('[email:log]', { ...payload, from: defaultFrom });
};
