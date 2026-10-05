import React, { useEffect, useState } from 'react';
import { Building2, LayoutGrid, Car, CalendarCheck, Radio, Loader2 } from 'lucide-react';
import { managerService } from '../../services/managerService.js';

interface Summary {
  totalSlots: number;
  availableSlots: number;
  occupiedSlots: number;
  reservedSlots: number;
  activeSessions: number;
  todayReservations: number;
  locationsCount: number;
}

export const ManagerDashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<Summary | null>(null);
  useEffect(() => { managerService.getDashboard().then(setSummary).catch(console.error); }, []);
  if (!summary) return <div className="min-h-[400px] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  const cards = [
    ['Total Slots', summary.totalSlots, LayoutGrid, 'text-indigo-600'],
    ['Available', summary.availableSlots, Car, 'text-emerald-600'],
    ['Occupied', summary.occupiedSlots, Car, 'text-rose-600'],
    ['Reserved', summary.reservedSlots, CalendarCheck, 'text-amber-600'],
    ['Active Sessions', summary.activeSessions, Radio, 'text-purple-600'],
    ["Today's Reservations", summary.todayReservations, CalendarCheck, 'text-sky-600'],
  ] as const;
  return <div className="space-y-6 py-6"><div className="border-b pb-4"><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Building2 className="w-7 h-7 text-sky-600" />Parking Operations Dashboard</h1><p className="text-slate-500 text-sm mt-1">Live operational data for {summary.locationsCount} assigned {summary.locationsCount === 1 ? 'facility' : 'facilities'}.</p></div><div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{cards.map(([label, value, Icon, color]) => <div key={label} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4"><Icon className={`w-10 h-10 p-2 rounded-lg bg-slate-50 ${color}`} /><div><p className="text-xs text-slate-500 font-semibold uppercase">{label}</p><p className="text-2xl font-bold text-slate-900">{value}</p></div></div>)}</div></div>;
};
