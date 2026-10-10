import { PageHeader, Panel, SkeletonCards } from '../../components/ui/MobilityUI';
import React, { useEffect, useState } from 'react';
import { ShieldCheck, Users, Database, LayoutGrid, CalendarCheck, Radio, AlertTriangle } from 'lucide-react';
import { adminService } from '../../services/adminService.js';

interface Summary { totalUsers: number; totalLocations: number; totalSlots: number; totalReservations: number; totalManagers: number; totalDevices: number; onlineDevices: number; finesDue: number; revenue: Array<{ _id: string; amount: number }>; }
export const AdminDashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<Summary | null>(null);
  useEffect(() => { adminService.getDashboard().then(setSummary).catch(console.error); }, []);
  const cards = summary ? [['Users', summary.totalUsers, Users], ['Managers', summary.totalManagers, Users], ['Parking Facilities', summary.totalLocations, Database], ['Parking Slots', summary.totalSlots, LayoutGrid], ['Reservations', summary.totalReservations, CalendarCheck], ['Devices online', `${summary.onlineDevices}/${summary.totalDevices}`, Radio], ['Fines due', summary.finesDue, AlertTriangle]] as const : [];
  return <div className="operations-page">
    <PageHeader eyebrow="Platform administration" title="The bigger picture." description="Manage your parking network, people, and platform activity." />
    {summary ? <div className="operations-stats admin-stats">{cards.map(([label, value, Icon]) => <div key={label} className="operations-stat"><Icon /><p>{label}</p><strong key={value}>{value}</strong></div>)}</div> : <SkeletonCards count={4} label="Loading platform inventory" />}
    <Panel className="mt-6"><div className="flex items-start gap-4"><ShieldCheck className="text-slate-500 shrink-0" /><div><h2 className="text-lg font-semibold mb-2">Your network, connected.</h2><p className="text-sm text-slate-500 leading-relaxed">Use the navigation to manage facility access, review payments, and configure pricing across your parking locations.</p></div></div></Panel>
  </div>;
};
