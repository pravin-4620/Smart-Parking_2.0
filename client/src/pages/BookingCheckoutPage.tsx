import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api.js';
import { paymentService } from '../services/payment.service.js';
import { BookingSummaryCard } from '../components/BookingSummaryCard.js';
import { PriceBreakdownCard } from '../components/PriceBreakdownCard.js';
import { PricingCalculationResult } from '@smart-parking/shared';
import { CreditCard, Lock, AlertCircle, Loader2 } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const BookingCheckoutPage: React.FC = () => {
  const { reservationId } = useParams<{ reservationId: string }>();
  const navigate = useNavigate();

  const [reservation, setReservation] = useState<any>(null);
  const [pricing, setPricing] = useState<PricingCalculationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReservationAndPricing();
    loadRazorpayScript();
  }, [reservationId]);

  const loadRazorpayScript = () => {
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  };

  const fetchReservationAndPricing = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/reservations/${reservationId}`);
      const data = res.data.data;
      setReservation(data);

      const pricingRes = await apiClient.post('/pricing/calculate', {
        parkingLocationId: data.parkingLocationId._id || data.parkingLocationId,
        slotId: data.slotId._id || data.slotId,
        startTime: data.startTime,
        endTime: data.endTime,
      });

      setPricing(pricingRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load booking checkout');
    } finally {
      setLoading(false);
    }
  };

  const handlePayWithRazorpay = async () => {
    if (!reservationId) return;

    try {
      setIsProcessing(true);
      setError(null);

      // Step 1: Create Razorpay Order
      const order = await paymentService.createPaymentOrder({ reservationId });
      if (!order.orderId) {
        throw new Error('Payment order ID is missing');
      }

      // Step 2: Open Razorpay Checkout Modal
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Smart Parking System',
        description: `Reservation #${reservationId.substring(18)}`,
        order_id: order.orderId,
        handler: async (response: any) => {
          try {
            // Step 3: Verify Payment Signature on Backend
            const receipt = await paymentService.verifyPayment({
              reservationId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            navigate(`/payment/success?receiptId=${receipt.receiptId}&transactionId=${receipt.transactionId}`);
          } catch (verifyErr: any) {
            navigate(`/payment/failure?reservationId=${reservationId}&error=${encodeURIComponent(verifyErr.message)}`);
          }
        },
        prefill: {
          name: 'Driver User',
          email: 'user@smartpark.com',
        },
        theme: {
          color: '#4f46e5',
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const hasConfiguredGateway = !order.keyId.startsWith('rzp_test_mock');
      if (window.Razorpay && hasConfiguredGateway) {
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        // Mock Sandbox Fallback for local testing without script load
        const mockPaymentId = `pay_mock_${Date.now()}`;
        const mockSignature = `mock_sig_${order.orderId}_${mockPaymentId}`;

        const receipt = await paymentService.verifyPayment({
          reservationId,
          razorpayOrderId: order.orderId,
          razorpayPaymentId: mockPaymentId,
          razorpaySignature: mockSignature,
        });

        navigate(`/payment/success?receiptId=${receipt.receiptId}&transactionId=${receipt.transactionId}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Payment initiation failed');
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error || !reservation || !pricing) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-xl shadow border border-slate-200 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800 mb-2">Checkout Error</h2>
        <p className="text-sm text-slate-600 mb-4">{error || 'Booking details not found'}</p>
        <button
          onClick={() => navigate('/nearby')}
          className="px-4 py-2 bg-slate-900 text-white font-medium rounded-lg text-sm"
        >
          Return to Search
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Checkout & Payment</h1>
          <p className="text-sm text-slate-500">Review your slot reservation details and proceed to secure checkout.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <BookingSummaryCard
            parkingName={reservation.parkingLocationId?.name || 'Smart Parking Facility'}
            address={reservation.parkingLocationId?.address || 'City Junction'}
            slotNumber={reservation.slotId?.slotNumber || 'A-101'}
            slotType={reservation.slotId?.slotType || 'REGULAR'}
            startTime={reservation.startTime}
            endTime={reservation.endTime}
            durationHours={Math.max(1, Math.round(reservation.duration / 60))}
          />

          <PriceBreakdownCard pricing={pricing} />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
              <Lock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 block">Encrypted Razorpay Sandbox</span>
              <span className="text-xs text-slate-400">100% Secure PCI-DSS Compliant Gateway</span>
            </div>
          </div>

          <button
            onClick={handlePayWithRazorpay}
            disabled={isProcessing}
            className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Processing Order...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" /> Pay ₹{pricing.finalAmount} via Razorpay
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
