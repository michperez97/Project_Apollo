import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { AuthenticatedRequest } from '../types/auth';
import { getEnrollmentById, updateEnrollmentPaymentStatus } from '../models/enrollmentModel';
import { constructStripeEvent, createPaymentIntent } from '../services/stripeService';
import { createTransaction, updateTransactionStatusByStripeId } from '../models/transactionModel';

const toCents = (amount: number): number => Math.round(amount * 100);
const toDollars = (amountCents: number): number => Math.round(amountCents) / 100;
const parseMetadataNumber = (metadata: Stripe.Metadata | undefined, key: string): number | null => {
  if (!metadata) {
    return null;
  }
  const value = metadata[key];
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
};

export const createPaymentIntentHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (user.role !== 'student' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only students or admins can create payments' });
    }

    const enrollmentId = Number(req.body.enrollmentId);
    if (!enrollmentId || Number.isNaN(enrollmentId)) {
      return res.status(400).json({ error: 'enrollmentId is required' });
    }

    const enrollment = await getEnrollmentById(enrollmentId);
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    if (user.role === 'student' && enrollment.student_id !== user.sub) {
      return res.status(403).json({ error: 'You are not allowed to pay for this enrollment' });
    }

    const tuitionAmount = Number(enrollment.tuition_amount);
    const amountCents = toCents(tuitionAmount);

    if (amountCents <= 0) {
      return res.status(400).json({ error: 'Tuition amount must be greater than zero' });
    }

    const paymentIntent = await createPaymentIntent({
      amountCents,
      metadata: {
        enrollment_id: String(enrollment.id),
        student_id: String(enrollment.student_id),
        course_id: String(enrollment.course_id)
      },
      customerEmail: user.email
    });

    const transaction = await createTransaction({
      student_id: enrollment.student_id,
      amount: tuitionAmount,
      type: 'payment',
      stripe_payment_id: paymentIntent.id,
      status: 'pending',
      description: `Tuition payment for enrollment ${enrollment.id}`
    });

    return res.status(201).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amountCents,
      currency: paymentIntent.currency,
      transaction
    });
  } catch (error) {
    return next(error);
  }
};

export const paymentWebhookHandler = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'];
    const event = constructStripeEvent(req.body as Buffer, signature);

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const enrollmentId = parseMetadataNumber(intent.metadata, 'enrollment_id');
      const studentId = parseMetadataNumber(intent.metadata, 'student_id');
      const amountDollars = toDollars(intent.amount_received || intent.amount);

      const transaction =
        (await updateTransactionStatusByStripeId(intent.id, 'completed', 'Payment succeeded')) ||
        (studentId !== null
          ? await createTransaction({
              student_id: studentId,
              amount: amountDollars,
              type: 'payment',
              stripe_payment_id: intent.id,
              status: 'completed',
              description: 'Payment succeeded'
            })
          : null);

      if (enrollmentId) {
        await updateEnrollmentPaymentStatus(enrollmentId, 'paid');
      }

      return res.json({ received: true, transaction });
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const enrollmentId = parseMetadataNumber(intent.metadata, 'enrollment_id');

      await updateTransactionStatusByStripeId(
        intent.id,
        'failed',
        intent.last_payment_error?.message || 'Payment failed'
      );

      if (enrollmentId) {
        await updateEnrollmentPaymentStatus(enrollmentId, 'pending');
      }

      return res.json({ received: true });
    }

    if (event.type === 'charge.refunded') {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId =
        typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id;

      const enrollmentId = parseMetadataNumber(charge.metadata, 'enrollment_id');
      const studentId = parseMetadataNumber(charge.metadata, 'student_id');
      const refundedAmount = charge.amount_refunded ?? charge.amount;
      const amountDollars = toDollars(refundedAmount);
      const isFullRefund = charge.amount_refunded >= charge.amount;

      if (paymentIntentId) {
        await updateTransactionStatusByStripeId(
          paymentIntentId,
          'refunded',
          'Payment refunded on Stripe'
        );
      } else if (studentId !== null) {
        await createTransaction({
          student_id: studentId,
          amount: amountDollars,
          type: 'refund',
          stripe_payment_id: null,
          status: 'refunded',
          description: 'Payment refunded on Stripe'
        });
      }

      if (enrollmentId) {
        await updateEnrollmentPaymentStatus(enrollmentId, isFullRefund ? 'pending' : 'partial');
      }

      return res.json({ received: true });
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    const message = error instanceof Error ? error.message : 'Webhook error';
    return res.status(400).json({ error: message });
  }
};
