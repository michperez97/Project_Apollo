import { api } from './http';
import { PaymentIntentSession } from '../types';

export const createPaymentIntent = async (
  enrollmentId: number
): Promise<PaymentIntentSession> => {
  const { data } = await api.post<PaymentIntentSession>('/payments/intents', {
    enrollmentId
  });
  return data;
};
