import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService.js';

export const AdminDevicesPage: React.FC = () => {
  const [devices, setDevices] = useState<Array<{ _id: string; deviceId: string; name: string; status: string; lastHeartbeat?: string; parkingLocationId?: { name: string } }>>([]);
  useEffect(() => { adminService.getDevices().then(setDevices).catch(console.error); }, []);
  return <div className="p-6 max-w-7xl mx-auto space-y-6"><h1 className="text-2xl font-bold">Platform IoT Devices</h1><div className="grid md:grid-cols-3 gap-4">{devices.map((device) => <article key={device._id} className="bg-white p-5 rounded-2xl border"><div className="flex justify-between"><strong>{device.deviceId}</strong><span className="text-xs font-bold">{device.status}</span></div><p className="text-xs text-slate-500 mt-2">{device.name}</p><p className="text-xs text-slate-500">Parking: {device.parkingLocationId?.name ?? 'Unassigned'}</p><p className="text-[10px] text-slate-400">Heartbeat: {device.lastHeartbeat ? new Date(device.lastHeartbeat).toLocaleString() : 'Not reported'}</p></article>)}</div></div>;
};
