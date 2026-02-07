import { api } from './http';
import { Enrollment, PaymentIntentSession, StudentBalance, Transaction, FinancialSummary, StudentBalanceDetail, InstructorEarningsSummary, CourseRevenueBreakdown, InstructorTransaction } from '../types';

export interface CheckoutSessionResponse {
  checkout?: { id: string; url: string };
  enrollment?: Enrollment;
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
  courseId: number,
  studentId?: number
): Promise<CheckoutSessionResponse> => {
  const payload: { courseId: number; student_id?: number } = { courseId };
  if (studentId) {
    payload.student_id = studentId;
  }
  const { data } = await api.post<CheckoutSessionResponse>('/payments/checkout', payload);
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
