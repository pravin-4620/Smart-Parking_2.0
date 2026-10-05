import { PageHeader, Panel, SkeletonCards } from '../../components/ui/MobilityUI';
import React, { useEffect, useState } from 'react';
import { LayoutGrid, Car, CalendarCheck, Radio } from 'lucide-react';
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
  if (!summary) return <SkeletonCards count={6} label="Loading parking operations" />;
  const cards = [
    ['Total Slots', summary.totalSlots, LayoutGrid, 'text-indigo-600'],
    ['Available', summary.availableSlots, Car, 'text-emerald-600'],
    ['Occupied', summary.occupiedSlots, Car, 'text-rose-600'],
    ['Reserved', summary.reservedSlots, CalendarCheck, 'text-amber-600'],
    ['Active Sessions', summary.activeSessions, Radio, 'text-purple-600'],
    ["Today's Reservations", summary.todayReservations, CalendarCheck, 'text-sky-600'],
  ] as const;
  return <div className="operations-page">
    <PageHeader eyebrow="Parking operations" title="Your facilities, at a glance." description={`Operational data for ${summary.locationsCount} assigned ${summary.locationsCount === 1 ? 'facility' : 'facilities'}.`} />
    <div className="operations-stats">{cards.map(([label, value, Icon]) => <div key={label} className="operations-stat"><Icon /><p>{label}</p><strong key={value}>{value}</strong></div>)}</div>
    <Panel className="occupancy-panel"><div className="flex justify-between gap-4"><h2 className="text-lg font-semibold">Space to keep moving</h2><span className="text-sm text-slate-500">{summary.availableSlots} of {summary.totalSlots} available</span></div>
      <div className="occupancy-bar" aria-hidden="true"><span style={{ width: `${summary.totalSlots ? summary.availableSlots / summary.totalSlots * 100 : 0}%`, background: 'var(--sp-accent)' }} /><span style={{ width: `${summary.totalSlots ? summary.occupiedSlots / summary.totalSlots * 100 : 0}%`, background: 'var(--sp-danger)' }} /><span style={{ width: `${summary.totalSlots ? summary.reservedSlots / summary.totalSlots * 100 : 0}%`, background: 'var(--sp-warning)' }} /></div>
      <div className="flex flex-wrap gap-5 text-xs text-slate-500"><span>Available · {summary.availableSlots}</span><span>Occupied · {summary.occupiedSlots}</span><span>Reserved · {summary.reservedSlots}</span></div>
    </Panel>
  </div>;
};
