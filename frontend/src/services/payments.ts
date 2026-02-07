import { api } from './http';
import { Enrollment, PaymentIntentSession, StudentBalance, Transaction, FinancialSummary, StudentBalanceDetail, InstructorEarningsSummary, CourseRevenueBreakdown, InstructorTransaction } from '../types';

export interface CheckoutSessionResponse {
  checkoutType?: 'payment' | 'subscription';
  checkout?: { id: string; url: string };
  enrollment?: Enrollment;
}

export interface InstructorStripeConnectStatus {
  connected: boolean;
  account_id: string | null;
  account_type: 'standard' | 'express' | 'custom' | 'none' | null;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requires_information: boolean;
  currently_due: string[];
  pending_verification: string[];
  eventually_due: string[];
  onboarding_complete: boolean;
  dashboard_available: boolean;
  onboarding_completed_at: string | null;
}

export const createPaymentIntent = async (
  enrollmentId: number
): Promise<PaymentIntentSession> => {
  const { data } = await api.post<PaymentIntentSession>('/payments/intents', {
    enrollmentId
  });
  return data;
};

export const createCheckoutSession = async (
  payload: { mode: 'payment'; courseId: number; studentId?: number } | { mode: 'subscription'; studentId?: number }
): Promise<CheckoutSessionResponse> => {
  const body: { mode: 'payment' | 'subscription'; courseId?: number; student_id?: number } = {
    mode: payload.mode
  };

  if (payload.mode === 'payment') {
    body.courseId = payload.courseId;
  }

  if (payload.studentId) {
    body.student_id = payload.studentId;
  }

  const { data } = await api.post<CheckoutSessionResponse>('/payments/checkout', body);
  return data;
};

export const getBalance = async (studentId?: number): Promise<StudentBalance> => {
  const path = studentId ? `/finance/balance/${studentId}` : '/finance/balance';
  const { data } = await api.get<{ balance: StudentBalance }>(path);
  return data.balance;
};

export const getTransactions = async (studentId?: number): Promise<Transaction[]> => {
  const { data } = await api.get<{ transactions: Transaction[] }>('/finance/transactions', {
    params: studentId ? { studentId } : undefined
  });
  return data.transactions;
};

export const getFinancialSummary = async (): Promise<FinancialSummary> => {
  const { data } = await api.get<{ summary: FinancialSummary }>('/finance/summary');
  return data.summary;
};

export const getAllStudentBalances = async (): Promise<StudentBalanceDetail[]> => {
  const { data } = await api.get<{ students: StudentBalanceDetail[] }>('/finance/students');
  return data.students;
};

export const getInstructorEarnings = async (): Promise<InstructorEarningsSummary> => {
  const { data } = await api.get<{ earnings: InstructorEarningsSummary }>('/finance/instructor/earnings');
  return data.earnings;
};

export const getInstructorCourseRevenue = async (): Promise<CourseRevenueBreakdown[]> => {
  const { data } = await api.get<{ courses: CourseRevenueBreakdown[] }>('/finance/instructor/courses');
  return data.courses;
};

export const getInstructorTransactions = async (): Promise<InstructorTransaction[]> => {
  const { data } = await api.get<{ transactions: InstructorTransaction[] }>('/finance/instructor/transactions');
  return data.transactions;
};

export const getInstructorStripeConnectStatus = async (): Promise<InstructorStripeConnectStatus> => {
  const { data } = await api.get<{ status: InstructorStripeConnectStatus }>('/finance/instructor/connect/status');
  return data.status;
};

export const createInstructorStripeConnectOnboarding = async (): Promise<{ url: string; account_id: string }> => {
  const { data } = await api.post<{ onboarding: { url: string; account_id: string } }>(
    '/finance/instructor/connect/onboard'
  );
  return data.onboarding;
};

export const createInstructorStripeConnectDashboardLink = async (): Promise<{ url: string }> => {
  const { data } = await api.post<{ dashboard: { url: string } }>(
    '/finance/instructor/connect/dashboard'
  );
  return data.dashboard;
};
