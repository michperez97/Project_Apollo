import { Request, Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { AuthenticatedRequest } from '../types/auth';
import {
  createEnrollment,
  getEnrollmentById,
  getEnrollmentByStudentAndCourse,
  updateEnrollmentPaymentStatus
} from '../models/enrollmentModel';
import { getCourseById } from '../models/courseModel';
import { findUserById } from '../models/userModel';
import {
  constructStripeEvent,
  createPaymentIntent,
  createCheckoutSession
} from '../services/stripeService';
import {
  createTransaction,
  findTransactionByStripePaymentId,
  updateTransactionStatusByStripeId
} from '../models/transactionModel';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const CHECKOUT_SUCCESS_URL =
  process.env.STRIPE_CHECKOUT_SUCCESS_URL || `${FRONTEND_URL}/dashboard?checkout=success`;
const CHECKOUT_CANCEL_URL =
  process.env.STRIPE_CHECKOUT_CANCEL_URL || `${FRONTEND_URL}/dashboard?checkout=cancel`;

const toCents = (amount: number): number => Math.round(amount * 100);
const toDollars = (amountCents: number): number => Math.round(amountCents) / 100;
const parseMetadataNumber = (
  metadata: Stripe.Metadata | null | undefined,
  key: string
): number | null => {
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

export const createCheckoutSessionHandler = async (
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
      return res.status(403).json({ error: 'Only students or admins can create checkouts' });
    }

    const courseId = Number(req.body.courseId);
    if (!courseId || !Number.isFinite(courseId)) {
      return res.status(400).json({ error: 'courseId is required' });
    }

    const studentId =
      user.role === 'admin' && req.body.student_id
        ? Number(req.body.student_id)
        : user.sub;

    if (!Number.isFinite(studentId)) {
      return res.status(400).json({ error: 'Invalid student_id' });
    }

    const course = await getCourseById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.status !== 'approved') {
      return res.status(400).json({ error: 'Course is not available for purchase' });
    }

    const existingEnrollment = await getEnrollmentByStudentAndCourse(studentId, courseId);
    if (existingEnrollment) {
      return res.status(409).json({ error: 'Already enrolled in this course' });
    }

    const price = course.price ?? 0;

    if (price === 0) {
      const enrollment = await createEnrollment({
        student_id: studentId,
        course_id: courseId,
        tuition_amount: 0,
        payment_status: 'paid'
      });
      return res.status(201).json({ enrollment, checkout: null });
    }

    const amountCents = toCents(price);

    let customerEmail: string | undefined = user.email;
    if (user.role === 'admin' && studentId !== user.sub) {
      const student = await findUserById(studentId);
      if (!student) {
        return res.status(400).json({ error: 'Invalid student_id: user not found' });
      }
      if (student.role !== 'student') {
        return res.status(400).json({ error: 'Invalid student_id: user is not a student' });
      }
      customerEmail = student.email;
    }

    const session = await createCheckoutSession({
      amountCents,
      courseId,
      courseTitle: course.title || 'Course',
      studentId,
      customerEmail: customerEmail || '',
      successUrl: CHECKOUT_SUCCESS_URL,
      cancelUrl: CHECKOUT_CANCEL_URL
    });

    return res.status(201).json({
      checkout: {
        id: session.id,
        url: session.url
      }
    });
  } catch (error) {
    return next(error);
  }
};

export const paymentWebhookHandler = async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'];
    const event = constructStripeEvent(req.body as Buffer, signature);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const courseId = parseMetadataNumber(session.metadata, 'course_id');
      const studentId = parseMetadataNumber(session.metadata, 'student_id');
      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id ?? null;

      if (courseId === null || studentId === null) {
        console.error('Missing metadata in checkout session:', session.id);
        return res.json({ received: true });
      }

      const existingEnrollment = await getEnrollmentByStudentAndCourse(studentId, courseId);
      if (existingEnrollment) {
        return res.json({ received: true, message: 'Already enrolled' });
      }

      const course = await getCourseById(courseId);
      const amountDollars = session.amount_total ? toDollars(session.amount_total) : (course?.price ?? 0);

      let transactionCreated = false;
      if (paymentIntentId) {
        const existingTransaction = await findTransactionByStripePaymentId(paymentIntentId);
        if (!existingTransaction) {
          await createTransaction({
            student_id: studentId,
            amount: amountDollars,
            type: 'payment',
            stripe_payment_id: paymentIntentId,
            status: 'completed',
            description: `Course purchase: ${course?.title || 'Course'}`
          });
          transactionCreated = true;
        }
      } else {
        await createTransaction({
          student_id: studentId,
          amount: amountDollars,
          type: 'payment',
          stripe_payment_id: null,
          status: 'completed',
          description: `Course purchase: ${course?.title || 'Course'}`
        });
        transactionCreated = true;
      }

      await createEnrollment({
        student_id: studentId,
        course_id: courseId,
        tuition_amount: amountDollars,
        payment_status: 'paid'
      });

      return res.json({ received: true, transactionCreated });
    }

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
