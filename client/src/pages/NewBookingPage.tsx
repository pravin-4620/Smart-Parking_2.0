import { BookingSteps, PageHeader } from '../components/ui/MobilityUI';
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { apiClient } from '../services/api.js';
import { joinParkingRoom, leaveParkingRoom, subscribeToReservationUpdated, subscribeToSlotUpdated } from '../services/socket.js';
import { SlotType, PricingCalculationResult } from '@smart-parking/shared';
import { CalendarCheck, ShieldCheck, ArrowRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';

export const NewBookingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const defaultParkingId = searchParams.get('parkingId') || '';
  const defaultSlotId = searchParams.get('slotId') || '';

  const [parkingLocations, setParkingLocations] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [selectedParkingId, setSelectedParkingId] = useState(defaultParkingId);
  const [selectedSlotId, setSelectedSlotId] = useState(defaultSlotId);
  const [autoAssign, setAutoAssign] = useState(!defaultSlotId);
  const [slotType, setSlotType] = useState<SlotType>(SlotType.REGULAR);

  // Time & Duration
  const toLocalDateTimeInput = (date: Date) => {
    const offsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
  };
  const nowISO = toLocalDateTimeInput(new Date(Date.now() + 5 * 60 * 1000));
  const [startTime, setStartTime] = useState(nowISO);
  const [durationHours, setDurationHours] = useState(2);

  // Calculated Pricing
  const [pricing, setPricing] = useState<PricingCalculationResult | null>(null);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  useEffect(() => {
    if (selectedParkingId) {
      fetchSlots(selectedParkingId);
    }
  }, [selectedParkingId]);

  useEffect(() => {
    if (!selectedParkingId) return;
    joinParkingRoom(selectedParkingId);
    const refresh = (data: { parkingLocationId?: string }) => {
      if (data.parkingLocationId === selectedParkingId) void fetchSlots(selectedParkingId);
    };
    const unsubscribeSlot = subscribeToSlotUpdated(refresh);
    const unsubscribeReservation = subscribeToReservationUpdated(refresh);
    return () => {
      unsubscribeSlot();
      unsubscribeReservation();
      leaveParkingRoom(selectedParkingId);
    };
  }, [selectedParkingId]);

  useEffect(() => {
    if (selectedParkingId && startTime && durationHours > 0) {
      calculatePrice();
    }
  }, [selectedParkingId, selectedSlotId, autoAssign, slotType, startTime, durationHours]);

  const fetchLocations = async () => {
    try {
      const res = await apiClient.get('/parking-locations');
      const list = res.data.data || [];
      setParkingLocations(list);
      if (!selectedParkingId && list.length > 0) {
        setSelectedParkingId(list[0]._id);
      }
    } catch (err) {
      console.error('Failed to load parking locations:', err);
    }
  };

  const fetchSlots = async (locationId: string) => {
    try {
      const res = await apiClient.get(`/parking-locations/${locationId}/slots`);
      const list = res.data.data || [];
      setSlots(list.filter((s: any) => s.available === true));
    } catch (err) {
      console.error('Failed to load slots:', err);
    }
  };

  const calculateEndTimeISO = () => {
    const startMs = new Date(startTime).getTime();
    const endMs = startMs + durationHours * 60 * 60 * 1000;
    return new Date(endMs).toISOString();
  };

  const calculatePrice = async () => {
    try {
      setCalculatingPrice(true);
      setError(null);

      const startISO = new Date(startTime).toISOString();
      const endISO = calculateEndTimeISO();

      const res = await apiClient.post('/pricing/calculate', {
        parkingLocationId: selectedParkingId,
        slotId: !autoAssign ? selectedSlotId : undefined,
        slotType,
        startTime: startISO,
        endTime: endISO,
      });

      setPricing(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Price calculation failed');
    } finally {
      setCalculatingPrice(false);
    }
  };

  const handleCreateReservation = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const startISO = new Date(startTime).toISOString();
      const endISO = calculateEndTimeISO();

      const payload = {
        parkingLocationId: selectedParkingId,
        slotId: !autoAssign ? selectedSlotId : undefined,
        autoAssign,
        slotType,
        startTime: startISO,
        endTime: endISO,
      };

      const res = await apiClient.post('/reservations', payload);
      const reservationId = res.data.data._id;

      navigate(`/booking/${reservationId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Reservation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="booking-page space-y-6">
      <PageHeader eyebrow="Make room for your plans" title="Reserve your parking" description="Choose where and when. A facility manager confirms the reservation; no online payment is collected." />
      <BookingSteps current={0} />
      <div className="booking-form-panel bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-7 h-7 text-indigo-600" /> New Parking Reservation
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Complete the booking wizard to lock your guaranteed parking bay.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step 1: Parking Location */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            1. Select Parking Facility
          </label>
          <select
            value={selectedParkingId}
            onChange={(e) => setSelectedParkingId(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
          >
            {parkingLocations.map((loc) => (
              <option key={loc._id} value={loc._id}>
                {loc.name} — {loc.address}, {loc.city}
              </option>
            ))}
          </select>
        </div>

        {/* Step 2: Allocation Method */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
            2. Slot Assignment Mode
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setAutoAssign(true);
                setSelectedSlotId('');
              }}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between transition ${
                autoAssign
                  ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <span className="text-sm flex items-center gap-1.5 font-extrabold">
                <Sparkles className="w-4 h-4 text-indigo-600" /> Auto Assign (Recommended)
              </span>
              <span className="text-xs text-slate-500 mt-1 font-normal">
                Algorithm assigns nearest available bay automatically.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setAutoAssign(false)}
              className={`p-4 rounded-xl border text-left flex flex-col justify-between transition ${
                !autoAssign
                  ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <span className="text-sm font-extrabold">Choose Specific Bay</span>
              <span className="text-xs text-slate-500 mt-1 font-normal">
                Pick exact slot number manually.
              </span>
            </button>
          </div>

          {!autoAssign && (
            <div className="mt-3">
              <label className="text-xs text-slate-500 font-medium block mb-1">Select Available Bay</label>
              <select
                value={selectedSlotId}
                onChange={(e) => setSelectedSlotId(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
              >
                <option value="">-- Choose Slot --</option>
                {slots.map((s) => (
                  <option key={s._id} value={s._id}>
                    Slot #{s.slotNumber} ({s.slotType})
                  </option>
                ))}
              </select>
            </div>
          )}

          {autoAssign && (
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Preferred Slot Type</label>
              <select
                value={slotType}
                onChange={(e) => setSlotType(e.target.value as SlotType)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
              >
                {Object.values(SlotType).map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Step 3: Schedule Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              3. Start Date & Time
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-1">
              4. Duration (Hours)
            </label>
            <select
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
            >
              {[1, 2, 3, 4, 5, 6, 8, 12, 24].map((hr) => (
                <option key={hr} value={hr}>
                  {hr} {hr === 1 ? 'Hour' : 'Hours'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Tariff Summary Box */}
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-inner space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase text-slate-400">Guaranteed Amount</span>
            {calculatingPrice ? (
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            ) : (
              <span className="text-2xl font-black text-emerald-400">
                ₹{pricing ? pricing.finalAmount : '--'}
              </span>
            )}
          </div>

          {pricing && (
            <div className="text-xs text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span>Base Rate: ₹{pricing.baseAmount}</span>
                {pricing.peakAmount > 0 && <span className="text-amber-400">+ Peak Surcharge ₹{pricing.peakAmount}</span>}
              </div>
              <p className="text-[11px] text-slate-400 italic">
                Calculated by Tariff Engine v{pricing.pricingRuleVersion}. Finalized upon payment.
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleCreateReservation}
          disabled={submitting || calculatingPrice || !selectedParkingId}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 text-base"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Locking Slot...
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" /> Proceed to Lock Slot & Pay <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
