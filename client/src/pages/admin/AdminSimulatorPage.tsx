import React, { useState, useEffect } from 'react';
import { Cpu, Radio, ShieldCheck, Zap, RefreshCw, KeyRound, CheckCircle2, AlertTriangle } from 'lucide-react';
import { parkingService } from '../../services/parkingService';
import { iotService } from '../../services/iotService';
import { api } from '../../services/api';

export const AdminSimulatorPage: React.FC = () => {
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedSlot, setSelectedSlot] = useState<string>('A-101');
  const [isOccupied, setIsOccupied] = useState<boolean>(true);
  
  // RFID Simulator State
  const [rfidUid, setRfidUid] = useState<string>('A1B2C3D4');
  const [eventType, setEventType] = useState<'ENTRY' | 'EXIT'>('ENTRY');
  const [simulating, setSimulating] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<any>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const data = await parkingService.getAllParkingLocations();
      setLocations(data);
      if (data.length > 0) {
        setSelectedLocation(data[0].parkingId);
      }
    } catch (err) {
      console.error('Failed to load locations:', err);
    }
  };

  const handleSimulateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    setLastResult(null);
    try {
      const res = await iotService.publishTelemetry({
        deviceId: 'ESP32-001',
        parkingLocationId: selectedLocation,
        slotNumber: selectedSlot,
        occupied: isOccupied,
      });
      setLastResult({ type: 'slot', data: res });
    } catch (err: any) {
      setLastResult({ type: 'error', message: err.message || 'Simulation failed' });
    } finally {
      setSimulating(false);
    }
  };

  const handleSimulateRFID = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    setLastResult(null);
    try {
      const res = await api.post('/rfid/tap', {
        deviceId: 'ESP32-GATE-01',
        parkingLocationId: selectedLocation,
        rfidUid,
        eventType,
      });
      setLastResult({ type: 'rfid', data: res.data?.data || res.data });
    } catch (err: any) {
      setLastResult({ type: 'error', message: err.response?.data?.error || err.message || 'RFID simulation failed' });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <Cpu className="w-8 h-8 text-cyan-400 animate-pulse" />
            <h1 className="text-2xl font-extrabold tracking-tight">IoT & Hardware Gate Simulator</h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Simulate live ESP32 IR Sensor state updates & MFRC522 RFID Boom Barrier Gate Taps.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-xs font-semibold">
          <Zap className="w-4 h-4 animate-bounce" /> Software Hardware Bridge Active
        </div>
      </div>

      <div className="grid grid-[#100%] md:grid-cols-2 gap-8">
        {/* RFID Boom Barrier Gate Tap Simulator */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg">MFRC522 RFID Gate Tap</h2>
              <p className="text-xs text-slate-500">Simulate driver tapping card at entry/exit boom barrier</p>
            </div>
          </div>

          <form onSubmit={handleSimulateRFID} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Parking Location</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                {locations.map((loc) => (
                  <option key={loc.parkingId || (loc as any)._id || (loc as any).id} value={loc.parkingId || (loc as any)._id || (loc as any).id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">RFID Card UID Tag</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={rfidUid}
                  onChange={(e) => setRfidUid(e.target.value.toUpperCase())}
                  placeholder="e.g. A1B2C3D4"
                  className="w-full pl-9 pr-3 py-2 border rounded-xl bg-slate-50 text-sm uppercase font-mono font-bold tracking-wider"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Preset test tags: A1B2C3D4 (User Card), E5F6G7H8 (VIP)</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Gate Gate Event</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEventType('ENTRY')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all border ${
                    eventType === 'ENTRY'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🟢 ENTRY GATE
                </button>
                <button
                  type="button"
                  onClick={() => setEventType('EXIT')}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all border ${
                    eventType === 'EXIT'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  🟠 EXIT GATE
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={simulating}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {simulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Simulate RFID Gate Tap
            </button>
          </form>
        </div>

        {/* IR Sensor Slot Occupancy Simulator */}
        <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
            <div className="p-2.5 bg-cyan-50 text-cyan-600 rounded-xl">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg">ESP32 Slot Occupancy</h2>
              <p className="text-xs text-slate-500">Simulate IR sensor detecting car presence</p>
            </div>
          </div>

          <form onSubmit={handleSimulateSlot} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Target Parking Location</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:ring-2 focus:ring-cyan-500"
              >
                {locations.map((loc) => (
                  <option key={loc._id || loc.id} value={loc._id || loc.id}>
                    {loc.name} ({loc.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Slot Identifier</label>
              <input
                type="text"
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                placeholder="e.g. A-101"
                className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm font-semibold"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">IR Sensor State</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsOccupied(true)}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all border ${
                    isOccupied
                      ? 'bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  🚗 OCCUPIED
                </button>
                <button
                  type="button"
                  onClick={() => setIsOccupied(false)}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all border ${
                    !isOccupied
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}
                >
                  🟢 VACANT
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={simulating}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl shadow-lg shadow-cyan-100 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {simulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Publish Telemetry Signal
            </button>
          </form>
        </div>
      </div>

      {/* Real-time Response Console */}
      {lastResult && (
        <div className={`p-6 rounded-2xl border ${
          lastResult.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : lastResult.data?.status === 'granted' || lastResult.data?.status === 'ok'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-3 font-bold text-base mb-3">
            {lastResult.type === 'error' || lastResult.data?.status === 'denied' ? (
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            )}
            <span>
              {lastResult.type === 'rfid'
                ? `RFID Tap Result: ${lastResult.data?.status?.toUpperCase()} (${lastResult.data?.action || 'NO_ACTION'})`
                : lastResult.type === 'slot'
                ? 'Telemetry Signal Published Successfully'
                : 'Simulation Error'}
            </span>
          </div>

          {lastResult.type === 'rfid' && (
            <div className="space-y-2 text-xs font-mono bg-white/80 p-4 rounded-xl border border-slate-200/50">
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-slate-400">Status:</span> <strong className={lastResult.data?.status === 'granted' ? 'text-emerald-600' : 'text-rose-600'}>{lastResult.data?.status}</strong></div>
                <div><span className="text-slate-400">Boom Barrier Action:</span> <strong>{lastResult.data?.action || 'KEEP_CLOSED'}</strong></div>
                <div><span className="text-slate-400">RFID Tag UID:</span> <strong>{lastResult.data?.uid}</strong></div>
                <div><span className="text-slate-400">Driver Name:</span> <strong>{lastResult.data?.userName || 'N/A'}</strong></div>
                {lastResult.data?.reason && <div className="col-span-2 text-rose-600"><span className="text-slate-400">Denial Reason:</span> {lastResult.data.reason}</div>}
                {lastResult.data?.sessionId && <div className="col-span-2"><span className="text-slate-400">Active Session ID:</span> {lastResult.data.sessionId}</div>}
              </div>
            </div>
          )}

          {lastResult.type === 'error' && (
            <p className="text-xs font-medium text-rose-700">{lastResult.message}</p>
          )}
        </div>
      )}
    </div>
  );
};
