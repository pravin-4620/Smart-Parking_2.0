import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api.js';
import { Clock, MapPin, CalendarCheck, Loader2, Filter, ArrowRight } from 'lucide-react';

export const MyBookingsPage: React.FC = () => {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/reservations?limit=50');
      setBookings(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'UPCOMING') return b.status === 'CONFIRMED' || b.status === 'PENDING_PAYMENT';
    return b.status === filterStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-7 h-7 text-indigo-600" /> My Booking History
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Track all upcoming, active, completed, and cancelled parking reservations.
          </p>
        </div>

        <button
          onClick={() => navigate('/booking')}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition"
        >
          <CalendarCheck className="w-4 h-4" /> New Booking
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        <Filter className="w-4 h-4 text-slate-400 shrink-0 mr-1" />
        {['ALL', 'UPCOMING', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterStatus(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
              filterStatus === tab
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No Reservations Found</h3>
          <p className="text-xs text-slate-400 mt-1">No bookings match the selected status filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredBookings.map((b) => (
            <div
              key={b._id}
              onClick={() => navigate(`/booking/${b._id}`)}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-slate-900 text-base">
                    {b.parkingLocationId?.name || 'Smart Parking Facility'}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      b.status === 'CONFIRMED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : b.status === 'PENDING_PAYMENT'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {b.status}
                  </span>
                </div>

                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {b.parkingLocationId?.address}
                </p>

                <div className="grid grid-cols-2 gap-2 my-3 bg-slate-50 p-3 rounded-xl text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Slot</span>
                    <span className="font-bold text-indigo-600">#{b.slotId?.slotNumber || 'A-101'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Date</span>
                    <span className="font-bold text-slate-700">{new Date(b.startTime).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                <span className="font-black text-slate-800 text-sm">
                  ₹{b.pricingSnapshot?.totalAmount || 60}
                </span>
                <span className="text-indigo-600 font-bold flex items-center gap-1">
                  View Pass <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
