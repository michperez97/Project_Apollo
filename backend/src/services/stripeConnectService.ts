import Stripe from 'stripe';
import { findUserById, updateUserStripeConnect } from '../models/userModel';
import { UserRecord } from '../types/user';
import { getStripeClient } from './stripeService';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const STRIPE_CONNECT_COUNTRY = (process.env.STRIPE_CONNECT_COUNTRY || 'US').toUpperCase();
const STRIPE_CONNECT_ONBOARDING_RETURN_URL =
  process.env.STRIPE_CONNECT_ONBOARDING_RETURN_URL ||
  `${FRONTEND_URL}/instructor/payments?connect=return`;
const STRIPE_CONNECT_ONBOARDING_REFRESH_URL =
  process.env.STRIPE_CONNECT_ONBOARDING_REFRESH_URL ||
  `${FRONTEND_URL}/instructor/payments?connect=refresh`;

export class StripeConnectError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, StripeConnectError.prototype);
  }
}

export interface StripeConnectStatus {
  connected: boolean;
  account_id: string | null;
  account_type: Stripe.Account['type'] | null;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requires_information: boolean;
  currently_due: string[];
  pending_verification: string[];
  eventually_due: string[];
  onboarding_complete: boolean;
  dashboard_available: boolean;
  onboarding_completed_at: Date | null;
}

const isPayoutEligibleRole = (role: UserRecord['role']): boolean =>
  role === 'instructor' || role === 'admin';

const isMissingStripeAccount = (error: unknown): boolean => {
  if (!(error instanceof Stripe.errors.StripeError)) {
    return false;
  }

  if (error.type !== 'StripeInvalidRequestError') {
    return false;
  }

  return error.message.toLowerCase().includes('no such account');
};

const disconnectedStatus = (
  accountId: string | null,
  onboardedAt: Date | null
): StripeConnectStatus => ({
  connected: false,
  account_id: accountId,
  account_type: null,
  details_submitted: false,
  charges_enabled: false,
  payouts_enabled: false,
  requires_information: false,
  currently_due: [],
  pending_verification: [],
  eventually_due: [],
  onboarding_complete: false,
  dashboard_available: false,
  onboarding_completed_at: onboardedAt
});

const assertInstructorExists = async (instructorId: number): Promise<UserRecord> => {
  const user = await findUserById(instructorId);
  if (!user) {
    throw new StripeConnectError(404, 'Instructor not found');
  }

  if (!isPayoutEligibleRole(user.role)) {
    throw new StripeConnectError(400, 'Target user must be an instructor');
  }

  return user;
};

const createExpressAccountForUser = async (user: UserRecord): Promise<string> => {
  const stripe = getStripeClient();

  const account = await stripe.accounts.create({
    type: 'express',
    country: STRIPE_CONNECT_COUNTRY,
    email: user.email,
    business_type: 'individual',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    },
    metadata: {
      user_id: String(user.id),
      role: user.role
    }
  });

  await updateUserStripeConnect(user.id, {
    stripe_connect_account_id: account.id
  });

  return account.id;
};

const resolveOrCreateAccountId = async (user: UserRecord): Promise<string> => {
  const stripe = getStripeClient();
  const existingAccountId = user.stripe_connect_account_id;

  if (!existingAccountId) {
    return createExpressAccountForUser(user);
  }

  try {
    await stripe.accounts.retrieve(existingAccountId);
    return existingAccountId;
  } catch (error) {
    if (!isMissingStripeAccount(error)) {
      throw error;
    }

    await updateUserStripeConnect(user.id, {
      stripe_connect_account_id: null,
      stripe_connect_onboarded_at: null
    });

    return createExpressAccountForUser(user);
  }
};

export const getInstructorStripeConnectStatus = async (
  instructorId: number
): Promise<StripeConnectStatus> => {
  const user = await assertInstructorExists(instructorId);
  const accountId = user.stripe_connect_account_id;
  if (!accountId) {
    return disconnectedStatus(null, user.stripe_connect_onboarded_at ?? null);
  }

  const stripe = getStripeClient();
  let account: Stripe.Account;

  try {
    account = await stripe.accounts.retrieve(accountId);
  } catch (error) {
    if (isMissingStripeAccount(error)) {
      await updateUserStripeConnect(user.id, {
        stripe_connect_account_id: null,
        stripe_connect_onboarded_at: null
      });
      return disconnectedStatus(null, null);
    }
    throw error;
  }

  const currentlyDue = account.requirements?.currently_due ?? [];
  const pendingVerification = account.requirements?.pending_verification ?? [];
  const eventuallyDue = account.requirements?.eventually_due ?? [];
  const detailsSubmitted = Boolean(account.details_submitted);
  const chargesEnabled = Boolean(account.charges_enabled);
  const payoutsEnabled = Boolean(account.payouts_enabled);
  const onboardingComplete = detailsSubmitted && chargesEnabled && payoutsEnabled;
  const dashboardAvailable = account.type === 'express';

  let onboardingCompletedAt = user.stripe_connect_onboarded_at ?? null;
  if (onboardingComplete && !onboardingCompletedAt) {
    onboardingCompletedAt = new Date();
    await updateUserStripeConnect(user.id, {
      stripe_connect_onboarded_at: onboardingCompletedAt
    });
  }

  return {
    connected: true,
    account_id: account.id,
    account_type: account.type ?? null,
    details_submitted: detailsSubmitted,
    charges_enabled: chargesEnabled,
    payouts_enabled: payoutsEnabled,
    requires_information: currentlyDue.length > 0,
    currently_due: currentlyDue,
    pending_verification: pendingVerification,
    eventually_due: eventuallyDue,
    onboarding_complete: onboardingComplete,
    dashboard_available: dashboardAvailable,
    onboarding_completed_at: onboardingCompletedAt
  };
};

export const createInstructorConnectOnboardingLink = async (
  instructorId: number
): Promise<{ url: string; accountId: string }> => {
  const user = await assertInstructorExists(instructorId);
  const accountId = await resolveOrCreateAccountId(user);
  const stripe = getStripeClient();

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    type: 'account_onboarding',
    refresh_url: STRIPE_CONNECT_ONBOARDING_REFRESH_URL,
    return_url: STRIPE_CONNECT_ONBOARDING_RETURN_URL
  });

  return {
    url: accountLink.url,
    accountId
  };
};

export const createInstructorConnectDashboardLink = async (
  instructorId: number
): Promise<string> => {
  const user = await assertInstructorExists(instructorId);
  const accountId = user.stripe_connect_account_id;

  if (!accountId) {
    throw new StripeConnectError(409, 'Stripe Connect account is not set up yet');
  }

  const stripe = getStripeClient();
  const account = await stripe.accounts.retrieve(accountId);

  if (account.type !== 'express') {
    throw new StripeConnectError(409, 'Dashboard login links are only available for Express accounts');
  }

  const loginLink = await stripe.accounts.createLoginLink(accountId);

  return loginLink.url;
};
