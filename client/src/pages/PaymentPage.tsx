import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../services/api.js';
import { CreditCard, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';

export const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryReservationId = searchParams.get('reservationId');

  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (queryReservationId) {
      navigate(`/checkout/${queryReservationId}`);
    } else {
      fetchPendingBookings();
    }
  }, [queryReservationId]);

  const fetchPendingBookings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/reservations?status=PENDING_PAYMENT');
      setPendingBookings(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-indigo-600" /> Pending Payments
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Select a pending slot reservation to complete payment authorization.
          </p>
        </div>

        {pendingBookings.length === 0 ? (
          <div className="bg-slate-50 p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            <ShieldCheck className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">No Pending Payments</p>
            <p className="text-xs text-slate-400 mt-1">All your active reservations are confirmed and paid.</p>
            <button
              onClick={() => navigate('/booking')}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs"
            >
              Make New Reservation
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingBookings.map((b) => (
              <div
                key={b._id}
                className="p-5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {b.parkingLocationId?.name || 'Smart Parking Facility'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Slot #{b.slotId?.slotNumber || 'Assigned'} • ₹{b.pricingSnapshot?.totalAmount || 60}
                  </p>
                </div>

                <button
                  onClick={() => navigate(`/checkout/${b._id}`)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md"
                >
                  Pay Now <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
