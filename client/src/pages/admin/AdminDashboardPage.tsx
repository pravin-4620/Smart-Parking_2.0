import React, { useEffect, useState } from 'react';
import { ShieldCheck, Users, Database, LayoutGrid, CalendarCheck } from 'lucide-react';
import { adminService } from '../../services/adminService.js';

interface Summary { totalUsers: number; totalLocations: number; totalSlots: number; totalReservations: number; }
export const AdminDashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<Summary | null>(null);
  useEffect(() => { adminService.getDashboard().then(setSummary).catch(console.error); }, []);
  const cards = summary ? [['Users', summary.totalUsers, Users], ['Parking Facilities', summary.totalLocations, Database], ['Parking Slots', summary.totalSlots, LayoutGrid], ['Reservations', summary.totalReservations, CalendarCheck]] as const : [];
  return <div className="space-y-6 py-6"><div className="border-b pb-4"><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><ShieldCheck className="w-7 h-7 text-sky-600" />System Administration</h1><p className="text-slate-500 text-sm mt-1">Live platform inventory and access management.</p></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{cards.map(([label, value, Icon]) => <div key={label} className="bg-white p-5 rounded-xl border shadow-sm flex items-center gap-4"><Icon className="w-10 h-10 p-2 rounded-lg bg-indigo-50 text-indigo-600" /><div><p className="text-xs text-slate-500 font-semibold uppercase">{label}</p><p className="text-2xl font-bold">{value}</p></div></div>)}</div></div>;
};
