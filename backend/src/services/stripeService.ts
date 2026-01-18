import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
export const STRIPE_CURRENCY = (process.env.STRIPE_CURRENCY || 'usd').toLowerCase();

if (!STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16'
});

export const getStripeClient = (): Stripe => stripe;

export const createPaymentIntent = async (params: {
  amountCents: number;
  metadata?: Record<string, string>;
  customerEmail?: string;
}) => {
  const { amountCents, metadata, customerEmail } = params;

  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: STRIPE_CURRENCY,
    metadata,
    receipt_email: customerEmail,
    automatic_payment_methods: { enabled: true }
  });

  return intent;
};

export const constructStripeEvent = (payload: Buffer, signature: string | string[] | undefined) => {
  if (!STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  }

  if (!signature || Array.isArray(signature)) {
    throw new Error('Invalid Stripe signature');
  }

  return stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);
};
