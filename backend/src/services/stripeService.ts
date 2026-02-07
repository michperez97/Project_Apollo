import Stripe from 'stripe';
import dotenv from 'dotenv';
import { SUBSCRIPTION_PRICE_ID } from '../config/pricing';

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

export interface CheckoutSessionParams {
  amountCents: number;
  courseId: number;
  courseTitle: string;
  studentId: number;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface SubscriptionCheckoutSessionParams {
  studentId: number;
  customerId?: string | null;
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

export const createCourseCheckoutSession = async (params: CheckoutSessionParams) => {
  const {
    amountCents,
    courseId,
    courseTitle,
    studentId,
    customerEmail,
    successUrl,
    cancelUrl
  } = params;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: STRIPE_CURRENCY,
          unit_amount: amountCents,
          product_data: {
            name: courseTitle
          }
        },
        quantity: 1
      }
    ],
    metadata: {
      course_id: String(courseId),
      student_id: String(studentId)
    },
    success_url: successUrl,
    cancel_url: cancelUrl
  };

  if (customerEmail) {
    sessionParams.customer_email = customerEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return {
    id: session.id,
    url: session.url
  };
};

export const createSubscriptionCheckoutSession = async (
  params: SubscriptionCheckoutSessionParams
) => {
  const {
    studentId,
    customerId,
    customerEmail,
    successUrl,
    cancelUrl
  } = params;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [
      {
        price: SUBSCRIPTION_PRICE_ID,
        quantity: 1
      }
    ],
    metadata: {
      student_id: String(studentId)
    },
    subscription_data: {
      metadata: {
        student_id: String(studentId)
      }
    },
    success_url: successUrl,
    cancel_url: cancelUrl
  };

  if (customerId) {
    sessionParams.customer = customerId;
  } else if (customerEmail) {
    sessionParams.customer_email = customerEmail;
  }

  const session = await stripe.checkout.sessions.create(sessionParams);

  return {
    id: session.id,
    url: session.url
  };
};
