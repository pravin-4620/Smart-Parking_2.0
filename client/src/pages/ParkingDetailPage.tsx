import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api.js';
import { MapPin, Clock, ShieldCheck, Zap, CalendarCheck, Loader2, AlertCircle } from 'lucide-react';
import { useSocket } from '../hooks/useSocket';

export const ParkingDetailPage: React.FC = () => {
  const { parkingId } = useParams<{ parkingId: string }>();
  const navigate = useNavigate();

  const [location, setLocation] = useState<any | null>(null);
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    joinParkingRoom,
    leaveParkingRoom,
    subscribeToSlotUpdated,
    subscribeToParkingUpdated,
  } = useSocket();

  useEffect(() => {
    fetchParkingDetail();
  }, [parkingId]);

  useEffect(() => {
    if (!parkingId) return;

    joinParkingRoom(parkingId);

    const unsubSlot = subscribeToSlotUpdated((data) => {
      if (data.parkingLocationId === parkingId || !data.parkingLocationId) {
        setSlots((prevSlots) =>
          prevSlots.map((s) =>
            s._id === data.slotId || s.slotNumber === data.slotNumber
              ? { ...s, status: data.status }
              : s
          )
        );
      }
    });

    const unsubParking = subscribeToParkingUpdated((data) => {
      if (data.parkingLocationId === parkingId || !data.parkingLocationId) {
        setLocation((prevLoc: any) =>
          prevLoc
            ? {
                ...prevLoc,
                totalSlots: data.totalSlots ?? prevLoc.totalSlots,
                availableSlots: data.availableSlots ?? prevLoc.availableSlots,
                occupancy: data.occupancyRate ?? prevLoc.occupancy,
              }
            : prevLoc
        );
      }
    });

    return () => {
      unsubSlot();
      unsubParking();
      leaveParkingRoom(parkingId);
    };
  }, [parkingId]);

  const fetchParkingDetail = async () => {
    try {
      setLoading(true);
      const [locRes, slotsRes] = await Promise.all([
        apiClient.get(`/parking-locations/${parkingId}`),
        apiClient.get(`/parking-locations/${parkingId}/slots`),
      ]);

      setLocation(locRes.data.data);
      setSlots(slotsRes.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load parking facility details');
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

  if (error || !location) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 bg-white rounded-xl shadow border border-slate-200 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Facility Not Found</h2>
        <p className="text-sm text-slate-500 mt-1">{error || 'Invalid parking facility ID'}</p>
        <button
          onClick={() => navigate('/nearby')}
          className="mt-4 px-4 py-2 bg-slate-900 text-white font-semibold rounded-lg text-sm"
        >
          Return to Nearby
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" /> Managed Smart Facility
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{location.name}</h1>
            <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
              {location.address}, {location.city}, {location.state} {location.postalCode}
            </p>
          </div>

          <button
            onClick={() => navigate(`/booking?parkingId=${location._id}`)}
            className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition"
          >
            <CalendarCheck className="w-5 h-5" /> Reserve Slot Now
          </button>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
          {location.description}
        </p>

        {/* Operating Hours & Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
            <Clock className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase block">Operating Hours</span>
              <span className="text-sm font-semibold text-slate-800">
                {location.operatingHours?.is24x7
                  ? 'Open 24 Hours x 7 Days'
                  : `${location.operatingHours?.openTime} - ${location.operatingHours?.closeTime}`}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
            <Zap className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase block">Features</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {location.features?.map((f: string, i: number) => (
                  <span key={i} className="text-[11px] bg-white text-slate-700 font-semibold px-2 py-0.5 rounded border border-slate-200">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Slot Grid Layout */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Live Slot Occupancy Map</h2>
            <p className="text-xs text-slate-500">
              Real-time IR telemetry status across all assigned bays.
            </p>
          </div>

          <div className="slot-legend flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500 rounded-full"></span> Available</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-rose-500 rounded-full"></span> Occupied</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-indigo-500 rounded-full"></span> Reserved</span>
          </div>
        </div>

        {slots.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">No slots configured for this location yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {slots.map((slot) => (
              <div
                key={slot._id}
                data-status={slot.status}
                onClick={() => {
                  if (slot.status === 'AVAILABLE') {
                    navigate(`/booking?parkingId=${location._id}&slotId=${slot._id}`);
                  }
                }}
                className={`slot-tile p-4 rounded-xl border text-center transition cursor-pointer ${
                  slot.status === 'AVAILABLE'
                    ? 'bg-emerald-50/50 border-emerald-300 hover:bg-emerald-100/60'
                    : slot.status === 'OCCUPIED'
                    ? 'bg-rose-50/50 border-rose-200 opacity-70 cursor-not-allowed'
                    : 'bg-indigo-50/50 border-indigo-200 opacity-80 cursor-not-allowed'
                }`}
              >
                <span className="text-xs font-mono text-slate-400 block font-bold">SLOT</span>
                <span className="text-lg font-black text-slate-800 block my-1">#{slot.slotNumber}</span>
                <span className="slot-type">{slot.slotType?.replaceAll("_", " ")}</span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full inline-block ${
                    slot.status === 'AVAILABLE'
                      ? 'bg-emerald-200 text-emerald-800'
                      : slot.status === 'OCCUPIED'
                      ? 'bg-rose-200 text-rose-800'
                      : 'bg-indigo-200 text-indigo-800'
                  }`}
                >
                  {slot.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
