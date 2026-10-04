import React from 'react';
import { Building2, LayoutGrid, Calendar, Radio } from 'lucide-react';

export const ManagerDashboardPage: React.FC = () => {
  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <Building2 className="w-7 h-7 text-sky-600" />
            <span>Parking Manager Portal</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Assigned locations, slot management, dynamic pricing & telemetry</p>
        </div>
        <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full uppercase">
          Role: PARKING_MANAGER
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <LayoutGrid className="w-10 h-10 text-sky-600 bg-sky-50 p-2 rounded-lg" />
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Assigned Slots</p>
            <p className="text-xl font-bold text-slate-900">Configured</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <Calendar className="w-10 h-10 text-emerald-600 bg-emerald-50 p-2 rounded-lg" />
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Active Reservations</p>
            <p className="text-xl font-bold text-slate-900">Live</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <Radio className="w-10 h-10 text-purple-600 bg-purple-50 p-2 rounded-lg" />
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Sensor Feed</p>
            <p className="text-xl font-bold text-slate-900">Connected</p>
          </div>
        </div>
      </div>
    </div>
  );
};
