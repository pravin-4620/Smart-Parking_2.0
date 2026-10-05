import { PageHeader } from '../../components/ui/MobilityUI';
import React, { useState, useEffect } from 'react';
import { managerService } from '../../services/managerService.js';

export const ManagerSessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    managerService.getSessions().then(setSessions).catch(console.error);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader eyebrow="Arrivals & departures" title="Parking sessions" description="Track check-in, check-out, and parking duration across your facilities." />
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="responsive-table w-full text-left text-xs">
          <thead className="bg-slate-50 border-b font-bold text-slate-700">
            <tr>
              <th className="p-3">Session ID</th>
              <th className="p-3">Status</th>
              <th className="p-3">Slot</th>
              <th className="p-3">Check In</th>
              <th className="p-3">Check Out</th>
              <th className="p-3">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.map((s) => (
              <tr key={s._id}>
                <td data-label="Session ID" className="p-3 font-mono font-bold">{s._id}</td>
                <td data-label="Status" className="p-3"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded">{s.status}</span></td>
                <td data-label="Slot" className="p-3 font-bold">{s.slotId?.slotNumber ?? '—'}</td>
                <td data-label="Check In" className="p-3">{new Date(s.checkInTime).toLocaleString()}</td>
                <td data-label="Check Out" className="p-3">{s.checkOutTime ? new Date(s.checkOutTime).toLocaleString() : 'In Session'}</td>
                <td data-label="Duration" className="p-3">
                  {s.status === 'COMPLETED' && typeof s.durationMinutes === 'number'
                    ? `${s.durationMinutes} min`
                    : 'In progress'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
