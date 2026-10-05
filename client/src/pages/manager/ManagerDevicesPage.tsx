import { PageHeader } from '../../components/ui/MobilityUI';
import React, { useState, useEffect } from 'react';
import { managerService } from '../../services/managerService.js';

export const ManagerDevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);

  useEffect(() => {
    managerService.getDevices().then(setDevices).catch(console.error);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader eyebrow="Connected facilities" title="Your IoT devices" description="Review controllers, facility assignments, and reported heartbeats." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {devices.map((d) => (
          <div key={d._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm">{d.deviceId}</h3>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">{d.status}</span>
            </div>
            <p className="text-xs text-slate-500">{d.name}</p>
            <p className="text-xs text-slate-500">{d.parkingLocationId?.name ?? 'Assigned facility'}</p>
            <p className="text-[10px] text-slate-400 font-mono">Last Heartbeat: {d.lastHeartbeat ? new Date(d.lastHeartbeat).toLocaleString() : 'Not reported'}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
