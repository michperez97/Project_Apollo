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
import {
  findUserById,
  findUserByStripeCustomerId,
  updateUserSubscription
} from '../models/userModel';
import {
  constructStripeEvent,
  createCourseCheckoutSession,
  createPaymentIntent,
  createSubscriptionCheckoutSession,
  getStripeClient
} from '../services/stripeService';
import {
  createTransaction,
  findTransactionByStripePaymentId,
  updateTransactionStatusByStripeId
} from '../models/transactionModel';
import { notifyEnrollmentCreated, notifyPaymentSucceeded, notifyRefund } from '../services/notificationService';
import { hasActiveSubscription } from '../services/courseAccessService';
import { SubscriptionStatus } from '../types/user';

type CheckoutMode = 'payment' | 'subscription';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const CHECKOUT_SUCCESS_URL =
  process.env.STRIPE_CHECKOUT_SUCCESS_URL || `${FRONTEND_URL}/dashboard?checkout=success`;
const CHECKOUT_CANCEL_URL =
  process.env.STRIPE_CHECKOUT_CANCEL_URL || `${FRONTEND_URL}/dashboard?checkout=cancel`;
const SUBSCRIPTION_SUCCESS_URL =
  process.env.STRIPE_SUBSCRIPTION_SUCCESS_URL ||
  `${FRONTEND_URL}/dashboard?checkout=subscription_success`;
const SUBSCRIPTION_CANCEL_URL =
  process.env.STRIPE_SUBSCRIPTION_CANCEL_URL ||
  `${FRONTEND_URL}/dashboard?checkout=subscription_cancel`;

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

const parseCheckoutMode = (rawMode: unknown): CheckoutMode =>
  rawMode === 'subscription' ? 'subscription' : 'payment';

const mapStripeSubscriptionStatus = (status: Stripe.Subscription.Status): SubscriptionStatus => {
  if (status === 'active') return 'active';
  if (status === 'past_due') return 'past_due';
  if (status === 'canceled') return 'canceled';
  if (status === 'incomplete') return 'incomplete';
  if (status === 'trialing') return 'trialing';
  if (status === 'unpaid') return 'unpaid';
  return 'inactive';
};

const toCustomerId = (customer: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | null => {
  if (!customer) return null;
  return typeof customer === 'string' ? customer : customer.id;
};

const upsertSubscriptionStateByCustomer = async (subscription: Stripe.Subscription): Promise<void> => {
  const customerId = toCustomerId(subscription.customer);
  if (!customerId) {
    return;
  }

  const user = await findUserByStripeCustomerId(customerId);
  if (!user) {
    return;
  }

  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  await updateUserSubscription(user.id, {
    subscription_status: mapStripeSubscriptionStatus(subscription.status),
    current_period_end: periodEnd,
    stripe_customer_id: customerId
  });
};

const handleSubscriptionCheckoutCompleted = async (
  session: Stripe.Checkout.Session
): Promise<void> => {
  const customerId = toCustomerId(session.customer);
  const paymentIntentId =
    typeof session.payment_intent === 'string'
      ? session.payment_intent
      : session.payment_intent?.id ?? null;
  const amountDollars = toDollars(session.amount_total ?? 0);

  const metadataStudentId = parseMetadataNumber(session.metadata, 'student_id');
  let targetUserId = metadataStudentId;

  if (targetUserId === null && customerId) {
    const existingUser = await findUserByStripeCustomerId(customerId);
    targetUserId = existingUser?.id ?? null;
  }

  if (targetUserId === null) {
    console.error('Missing student metadata for subscription checkout session:', session.id);
    return;
  }

  const stripe = getStripeClient();
  const sessionSubscription = session.subscription;
  if (typeof sessionSubscription === 'string') {
    const subscription = await stripe.subscriptions.retrieve(sessionSubscription);
    const periodEnd = subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null;

    await updateUserSubscription(targetUserId, {
      subscription_status: mapStripeSubscriptionStatus(subscription.status),
      current_period_end: periodEnd,
      stripe_customer_id: customerId
    });
  } else {
    await updateUserSubscription(targetUserId, {
      subscription_status: 'active',
      current_period_end: null,
      stripe_customer_id: customerId
    });
  }

  if (paymentIntentId) {
    const existingTransaction = await findTransactionByStripePaymentId(paymentIntentId);
    if (!existingTransaction) {
      await createTransaction({
        student_id: targetUserId,
        amount: amountDollars,
        type: 'payment',
        stripe_payment_id: paymentIntentId,
        status: 'completed',
        description: 'All-access subscription activated'
      });
    }
  } else if (amountDollars > 0) {
    await createTransaction({
      student_id: targetUserId,
      amount: amountDollars,
      type: 'payment',
      stripe_payment_id: null,
      status: 'completed',
      description: 'All-access subscription activated'
    });
  }
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

    const checkoutMode = parseCheckoutMode(req.body.mode);
    const hasExplicitStudentTarget = user.role === 'admin' && req.body.student_id !== undefined;
    const studentId =
      user.role === 'admin' && req.body.student_id
        ? Number(req.body.student_id)
        : user.sub;

    if (!Number.isFinite(studentId) || studentId <= 0) {
      return res.status(400).json({ error: 'Invalid student_id' });
    }

    const targetStudent = await findUserById(studentId);
    if (!targetStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }
    if ((user.role === 'student' || hasExplicitStudentTarget) && targetStudent.role !== 'student') {
      return res.status(400).json({ error: 'Target user must have student role' });
    }

    if (checkoutMode === 'subscription') {
      if (hasActiveSubscription(targetStudent)) {
        return res.status(409).json({ error: 'Subscription is already active' });
      }

      const session = await createSubscriptionCheckoutSession({
        studentId,
        customerId: targetStudent.stripe_customer_id,
        customerEmail: targetStudent.email,
        successUrl: SUBSCRIPTION_SUCCESS_URL,
        cancelUrl: SUBSCRIPTION_CANCEL_URL
      });

      return res.status(201).json({
        checkoutType: 'subscription',
        checkout: {
          id: session.id,
          url: session.url
        }
      });
    }

    const courseId = Number(req.body.courseId);
    if (!courseId || !Number.isFinite(courseId)) {
      return res.status(400).json({ error: 'courseId is required for payment checkout' });
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
      await notifyEnrollmentCreated(enrollment);
      return res.status(201).json({ checkoutType: 'payment', enrollment, checkout: null });
    }

    const amountCents = toCents(price);
    const session = await createCourseCheckoutSession({
      amountCents,
      courseId,
      courseTitle: course.title || 'Course',
      studentId,
      customerEmail: targetStudent.email,
      successUrl: CHECKOUT_SUCCESS_URL,
      cancelUrl: CHECKOUT_CANCEL_URL
    });

    return res.status(201).json({
      checkoutType: 'payment',
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

      if (session.mode === 'subscription') {
        await handleSubscriptionCheckoutCompleted(session);
        return res.json({ received: true });
      }

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

      if (course) {
        await notifyPaymentSucceeded({
          studentId,
          course,
          amount: amountDollars
        });
      }

      return res.json({ received: true, transactionCreated });
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription;
      await upsertSubscriptionStateByCustomer(subscription);
      return res.json({ received: true });
    }

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const enrollmentId = parseMetadataNumber(intent.metadata, 'enrollment_id');
      const studentId = parseMetadataNumber(intent.metadata, 'student_id');
      const courseId = parseMetadataNumber(intent.metadata, 'course_id');
      const amountDollars = toDollars(intent.amount_received || intent.amount);

      const existingTransaction = await findTransactionByStripePaymentId(intent.id);
      const alreadyCompleted = existingTransaction?.status === 'completed';

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

      if (studentId !== null && !alreadyCompleted) {
        let course = courseId ? await getCourseById(courseId) : null;
        if (!course && enrollmentId) {
          const enrollment = await getEnrollmentById(enrollmentId);
          if (enrollment) {
            course = await getCourseById(enrollment.course_id);
          }
        }

        if (course) {
          await notifyPaymentSucceeded({
            studentId,
            course,
            amount: amountDollars
          });
        }
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
      const courseId = parseMetadataNumber(charge.metadata, 'course_id');
      const refundedAmount = charge.amount_refunded ?? charge.amount;
      const amountDollars = toDollars(refundedAmount);
      const isFullRefund = charge.amount_refunded >= charge.amount;

      let alreadyRefunded = false;
      if (paymentIntentId) {
        const existingTransaction = await findTransactionByStripePaymentId(paymentIntentId);
        alreadyRefunded = existingTransaction?.status === 'refunded';
      }

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

      if (studentId !== null && !alreadyRefunded) {
        let course = courseId ? await getCourseById(courseId) : null;
        if (!course && enrollmentId) {
          const enrollment = await getEnrollmentById(enrollmentId);
          if (enrollment) {
            course = await getCourseById(enrollment.course_id);
          }
        }

        if (course) {
          await notifyRefund({
            studentId,
            course,
            amount: amountDollars
          });
        }
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
