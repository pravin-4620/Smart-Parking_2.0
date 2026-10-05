import { PageHeader } from '../../components/ui/MobilityUI';
import React, { useState, useEffect } from 'react';
import { managerService } from '../../services/managerService.js';

export const ManagerReservationsPage: React.FC = () => {
  const [reservations, setReservations] = useState<any[]>([]);

  useEffect(() => {
    managerService.getReservations().then(setReservations).catch(console.error);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader eyebrow="Daily operations" title="Facility reservations" description="Upcoming arrivals, assigned spaces, and booking details." />
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="responsive-table w-full text-left text-xs">
          <thead className="bg-slate-50 border-b font-bold text-slate-700">
            <tr>
              <th className="p-3">Reservation Code</th>
              <th className="p-3">User / Slot</th>
              <th className="p-3">Status</th>
              <th className="p-3">Start Time</th>
              <th className="p-3">End Time</th>
              <th className="p-3">Total Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reservations.map((r) => (
              <tr key={r._id}>
                <td data-label="Reservation Code" className="p-3 font-mono font-bold">{r.reservationCode}</td>
                <td data-label="User / Slot" className="p-3"><span className="font-semibold">{r.userId?.name ?? 'User'}</span><span className="block text-slate-400">{r.slotId?.slotNumber ?? '—'}</span></td>
                <td data-label="Status" className="p-3"><span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded">{r.status}</span></td>
                <td data-label="Start Time" className="p-3">{new Date(r.startTime).toLocaleString()}</td>
                <td data-label="End Time" className="p-3">{new Date(r.endTime).toLocaleString()}</td>
                <td data-label="Total Price" className="p-3 font-bold">₹{r.pricingSnapshot?.totalAmount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
