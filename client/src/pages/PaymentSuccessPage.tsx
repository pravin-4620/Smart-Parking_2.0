import { BookingSteps } from '../components/ui/MobilityUI';
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { paymentService } from '../services/payment.service.js';
import { PaymentReceipt } from '@smart-parking/shared';
import { DigitalReceiptModal } from '../components/DigitalReceiptModal.js';
import { CheckCircle2, ArrowRight, FileText, Loader2 } from 'lucide-react';

export const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const transactionId = searchParams.get('transactionId');
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (transactionId) {
      fetchReceipt();
    } else {
      setLoading(false);
    }
  }, [transactionId]);

  const fetchReceipt = async () => {
    try {
      const data = await paymentService.getPaymentReceipt(transactionId!);
      setReceipt(data);
    } catch (err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="payment-result flex flex-col items-center justify-center py-8 gap-6">
      <BookingSteps current={2} />
      <div className="bg-white max-w-md w-full rounded-2xl border border-slate-200 p-8 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-emerald-600" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Confirmed!</h1>
          <p className="text-sm text-slate-500 mt-1">
            Your parking slot reservation is locked and confirmed in our system.
          </p>
        </div>

        {receipt && (
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Receipt No</span>
              <span className="font-bold text-slate-800">{receipt.receiptId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Reserved Slot</span>
              <span className="font-bold text-indigo-600">#{receipt.reservationDetails.slotNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Amount Paid</span>
              <span className="font-bold text-emerald-600">₹{receipt.amount}</span>
            </div>
          </div>
        )}

        <div className="space-y-3 pt-2">
          {receipt && (
            <button
              onClick={() => setShowModal(true)}
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition"
            >
              <FileText className="w-4 h-4" /> View Digital Receipt
            </button>
          )}

          <button
            onClick={() => navigate('/nearby')}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition"
          >
            Find Nearby Parking <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showModal && receipt && (
        <DigitalReceiptModal receipt={receipt} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
};
