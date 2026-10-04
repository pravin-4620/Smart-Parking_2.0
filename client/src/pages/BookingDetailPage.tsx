import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api.js';
import { MapPin, Calendar, Clock, CreditCard, XCircle, ArrowLeft, QrCode, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

export const BookingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [booking, setBooking] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookingDetail();
  }, [id]);

  const fetchBookingDetail = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get(`/reservations/${id}`);
      setBooking(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch booking details');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!id || !window.confirm('Are you sure you want to cancel this reservation?')) return;

    try {
      setCancelling(true);
      await apiClient.patch(`/reservations/${id}/cancel`);
      fetchBookingDetail();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel reservation');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-xl shadow border border-slate-200 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Booking Not Found</h2>
        <p className="text-sm text-slate-500 mt-1">{error || 'Invalid booking ID'}</p>
        <button
          onClick={() => navigate('/my-bookings')}
          className="mt-4 px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg text-sm"
        >
          Return to My Bookings
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button
        onClick={() => navigate('/my-bookings')}
        className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Bookings
      </button>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6">
          <div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold border ${
                booking.status === 'CONFIRMED'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : booking.status === 'PENDING_PAYMENT'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {booking.status}
            </span>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">
              {booking.parkingLocationId?.name || 'Smart Parking Facility'}
            </h1>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-600" />
              {booking.parkingLocationId?.address}
            </p>
          </div>

          <div className="text-right sm:text-right">
            <span className="text-xs text-slate-400 font-bold block uppercase">Assigned Bay</span>
            <span className="text-2xl font-black text-indigo-600">
              #{booking.slotId?.slotNumber || 'A-101'}
            </span>
          </div>
        </div>

        {/* Entry Pass QR Code Mock */}
        {booking.status === 'CONFIRMED' && (
          <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs text-emerald-400 font-bold uppercase flex items-center gap-1 justify-center sm:justify-start">
                <ShieldCheck className="w-4 h-4" /> Digital Entry Pass
              </span>
              <h3 className="text-lg font-bold">Barrier Gate QR Token</h3>
              <p className="text-xs text-slate-400">
                Scan this code at the RFID/QR boom barrier entry gate.
              </p>
            </div>
            <div className="w-24 h-24 bg-white p-2 rounded-xl flex items-center justify-center shrink-0">
              <QrCode className="w-20 h-24 text-slate-900" />
            </div>
          </div>
        )}

        {/* Timing Grid */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase block">Start Time</span>
            <span className="text-sm font-semibold text-slate-800 flex items-center gap-1 mt-1">
              <Calendar className="w-4 h-4 text-indigo-600" />
              {new Date(booking.startTime).toLocaleString('en-IN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-400 font-bold uppercase block">End Time</span>
            <span className="text-sm font-semibold text-slate-800 flex items-center gap-1 mt-1">
              <Clock className="w-4 h-4 text-indigo-600" />
              {new Date(booking.endTime).toLocaleString('en-IN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Pricing Snapshot */}
        <div className="flex justify-between items-center pt-2">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase block">Amount Paid / Tariff</span>
            <span className="text-xl font-extrabold text-emerald-600">
              ₹{booking.pricingSnapshot?.totalAmount || 60} {booking.pricingSnapshot?.currency || 'INR'}
            </span>
          </div>

          {booking.status === 'PENDING_PAYMENT' && (
            <button
              onClick={() => navigate(`/checkout/${booking._id}`)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-2 transition"
            >
              <CreditCard className="w-4 h-4" /> Pay Now
            </button>
          )}

          {(booking.status === 'CONFIRMED' || booking.status === 'PENDING_PAYMENT') && (
            <button
              onClick={handleCancelBooking}
              disabled={cancelling}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl text-xs border border-rose-200 flex items-center gap-1.5 transition"
            >
              {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} Cancel Reservation
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
