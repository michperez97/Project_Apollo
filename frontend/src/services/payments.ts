import { api } from './http';
import { PaymentIntentSession, StudentBalance, Transaction, FinancialSummary, StudentBalanceDetail } from '../types';

export const createPaymentIntent = async (
  enrollmentId: number
): Promise<PaymentIntentSession> => {
  const { data } = await api.post<PaymentIntentSession>('/payments/intents', {
    enrollmentId
  });
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
