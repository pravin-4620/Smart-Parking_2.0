import { apiClient } from './api.js';
import {
  CreatePaymentOrderInput,
  VerifyPaymentInput,
  RazorpayOrderResponse,
  PaymentReceipt,
} from '@smart-parking/shared';

export const paymentService = {
  async createPaymentOrder(input: CreatePaymentOrderInput): Promise<RazorpayOrderResponse> {
    const res = await apiClient.post('/payments/create-order', input);
    return res.data.data;
  },

  async verifyPayment(input: VerifyPaymentInput): Promise<PaymentReceipt> {
    const res = await apiClient.post('/payments/verify', input);
    return res.data.data;
  },

  async getPaymentReceipt(transactionId: string): Promise<PaymentReceipt> {
    const res = await apiClient.get(`/payments/${transactionId}`);
    return res.data.data;
  },
};
