import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle, RefreshCw, ArrowLeft } from 'lucide-react';

export const PaymentFailurePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const reservationId = searchParams.get('reservationId');
  const errorMsg = searchParams.get('error') || 'Payment processing was cancelled or signature verification failed.';

  return (
    <div className="payment-result flex items-center justify-center py-8">
      <div className="bg-white max-w-md w-full rounded-2xl border border-slate-200 p-8 shadow-xl text-center space-y-6">
        <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto">
          <XCircle className="w-10 h-10 text-rose-600" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Unsuccessful</h1>
          <p className="text-sm text-slate-500 mt-2">{errorMsg}</p>
        </div>

        <div className="space-y-3 pt-2">
          {reservationId && (
            <button
              onClick={() => navigate(`/checkout/${reservationId}`)}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition"
            >
              <RefreshCw className="w-4 h-4" /> Retry Payment
            </button>
          )}

          <button
            onClick={() => navigate('/nearby')}
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Search
          </button>
        </div>
      </div>
    </div>
  );
};
