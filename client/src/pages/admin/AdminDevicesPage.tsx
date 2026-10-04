import React, { useState, useEffect } from 'react';
import { iotService } from '../../services/iotService.js';

export const AdminDevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<any[]>([]);

  useEffect(() => {
    iotService.getDevices().then(setDevices).catch(console.error);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Platform IoT Hardware Inventory</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {devices.map((d) => (
          <div key={d._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm">{d.deviceId}</h3>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full">{d.status}</span>
            </div>
            <p className="text-xs text-slate-500">{d.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
