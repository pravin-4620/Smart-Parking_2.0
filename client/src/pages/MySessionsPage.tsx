import { PageHeader } from '../components/ui/MobilityUI';
import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api.js';
import { MapPin, Clock, Loader2 } from 'lucide-react';

export const MySessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/parking-sessions');
      setSessions(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Your parking activity" title="Your parking sessions" description="Your arrivals, departures, and time spent parked." />
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Overstay fines are settled by an authorized facility operator. Online payment is not enabled.</div>

      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">No Parking Sessions Recorded</h3>
          <p className="text-xs text-slate-400 mt-1">
            Sessions trigger automatically when hardware IR sensors detect your vehicle at the entry barrier.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => (
            <div
              key={session._id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {session.parkingLocationId?.name || 'Smart Parking Facility'}
                  </h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Slot #{session.slotId?.slotNumber || 'A-101'}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    session.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {session.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Entry Time</span>
                  <span className="font-bold text-slate-800">
                    {new Date(session.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Exit Time</span>
                  <span className="font-bold text-slate-800">
                    {session.checkOutTime ? new Date(session.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Still Parked'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Duration</span>
                  <span className="font-bold text-slate-800">
                    {session.status === 'COMPLETED' && typeof session.durationMinutes === 'number'
                      ? `${session.durationMinutes} minutes`
                      : 'In progress'}
                  </span>
                </div>
              </div>
              {session.fine && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <div className="font-bold">Fine {session.fine.status}: ₹{session.fine.amount}</div>
                  <div>{session.fine.overstayMinutes} overstay minutes</div>
                  {['DUE', 'PAYMENT_PENDING'].includes(session.fine.status) && (
                    <div className="mt-2 font-semibold">Settlement requires an authorized facility operator; checkout remains blocked.</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
