import React, { useState, useEffect } from 'react';
import { managerService } from '../../services/managerService.js';

export const ManagerSessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    managerService.getSessions().then(setSessions).catch(console.error);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Active Entry/Exit Telemetry Sessions</h1>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b font-bold text-slate-700">
            <tr>
              <th className="p-3">Session ID</th>
              <th className="p-3">Status</th>
              <th className="p-3">Check In</th>
              <th className="p-3">Check Out</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.map((s) => (
              <tr key={s._id}>
                <td className="p-3 font-mono font-bold">{s._id}</td>
                <td className="p-3"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded">{s.status}</span></td>
                <td className="p-3">{new Date(s.checkInTime).toLocaleString()}</td>
                <td className="p-3">{s.checkOutTime ? new Date(s.checkOutTime).toLocaleString() : 'In Session'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

