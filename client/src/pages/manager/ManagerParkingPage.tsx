import React, { useState, useEffect } from 'react';
import { managerService } from '../../services/managerService.js';
import { MapPin, Loader2 } from 'lucide-react';

export const ManagerParkingPage: React.FC = () => {
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchParking();
  }, []);

  const fetchParking = async () => {
    try {
      setLoading(true);
      const data = await managerService.getAssignedParking();
      setLocations(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
          <h1 className="text-2xl font-bold text-slate-900">Assigned Parking Facilities</h1>
          <p className="text-sm text-slate-500">Facilities where you are designated as active Parking Manager.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {locations.map((loc) => (
          <div key={loc._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">{loc.name}</h3>
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">
                {loc.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{loc.address}, {loc.city}</span>
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl">
              <div>Total Slots: <span className="font-bold text-slate-800">{loc.totalSlots}</span></div>
              <div>Available: <span className="font-bold text-emerald-600">{loc.availableSlots}</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

