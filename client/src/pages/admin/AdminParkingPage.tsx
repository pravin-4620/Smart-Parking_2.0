import React, { useState, useEffect } from 'react';
import { parkingService } from '../../services/parkingService.js';

export const AdminParkingPage: React.FC = () => {
  const [parking, setParking] = useState<any[]>([]);

  useEffect(() => {
    parkingService.getNearbyParking({ lat: 12.9716, lng: 77.5946, radius: 100 }).then(setParking).catch(console.error);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Global Parking Facilities Directory</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {parking.map((p) => (
          <div key={p.parkingId} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900">{p.name}</h3>
            <p className="text-xs text-slate-500">{p.address}</p>
            <div className="mt-2 text-xs font-semibold text-emerald-600">Available: {p.availableSlots} / {p.totalSlots}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

