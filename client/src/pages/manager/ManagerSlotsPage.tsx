import React, { useState, useEffect } from 'react';
import { managerService } from '../../services/managerService.js';
import { Loader2 } from 'lucide-react';

export const ManagerSlotsPage: React.FC = () => {
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const data = await managerService.getSlots();
      setSlots(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (slotId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'AVAILABLE' ? 'MAINTENANCE' : 'AVAILABLE';
    try {
      await managerService.updateSlotStatus(slotId, newStatus);
      fetchSlots();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Facility Parking Slots</h1>
          <p className="text-sm text-slate-500">Live slot occupancy states and maintenance control.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {slots.map((slot) => (
          <div
            key={slot._id}
            className={`p-4 rounded-xl border flex flex-col justify-between transition ${
              slot.status === 'AVAILABLE'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : slot.status === 'OCCUPIED'
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : slot.status === 'RESERVED'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}
          >
            <div>
              <p className="font-extrabold text-sm">{slot.slotNumber}</p>
              <p className="text-[10px] font-bold uppercase">{slot.slotType}</p>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white/80">{slot.status}</span>
              <button
                onClick={() => handleToggleStatus(slot._id, slot.status)}
                className="text-[10px] underline font-semibold"
              >
                Toggle
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

