import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchHealthStatus } from '../services/healthService';
import { Activity, Database, Server, Radio } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealthStatus,
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          IoT-Cloud-Web Smart Parking Framework
        </h1>
        <p className="text-slate-600">
          Real-Time Occupancy Prediction and Dynamic Allocation System Architecture
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Backend Status */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Backend API</span>
            <Server className="w-5 h-5 text-sky-500" />
          </div>
          {isLoading ? (
            <div className="animate-pulse text-sm text-slate-400">Connecting...</div>
          ) : isError ? (
            <div className="text-red-500 text-sm font-medium">Offline / Error ({error instanceof Error ? error.message : 'Failed'})</div>
          ) : (
            <div>
              <div className="text-2xl font-bold text-emerald-600 uppercase mb-1">{data?.status}</div>
              <div className="text-xs text-slate-500 font-mono">Uptime: {Math.round(data?.uptime || 0)}s</div>
            </div>
          )}
        </div>

        {/* Database Status */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">MongoDB</span>
            <Database className="w-5 h-5 text-emerald-500" />
          </div>
          {isLoading ? (
            <div className="animate-pulse text-sm text-slate-400">Checking...</div>
          ) : (
            <div>
              <div className={`text-2xl font-bold mb-1 ${data?.services.database.connected ? 'text-emerald-600' : 'text-amber-500'}`}>
                {data?.services.database.status.toUpperCase()}
              </div>
              <div className="text-xs text-slate-500 font-mono">Primary Mongo Node</div>
            </div>
          )}
        </div>

        {/* Redis Status */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Redis Cache</span>
            <Activity className="w-5 h-5 text-indigo-500" />
          </div>
          {isLoading ? (
            <div className="animate-pulse text-sm text-slate-400">Checking...</div>
          ) : (
            <div>
              <div className={`text-2xl font-bold mb-1 ${data?.services.redis.connected ? 'text-emerald-600' : 'text-amber-500'}`}>
                {data?.services.redis.status.toUpperCase()}
              </div>
              <div className="text-xs text-slate-500 font-mono">Session & Queue Store</div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center space-x-3 mb-4">
          <Radio className="w-5 h-5 text-sky-400 animate-pulse" />
          <h2 className="text-lg font-bold">IoT Ingestion Ready</h2>
        </div>
        <p className="text-slate-300 text-sm leading-relaxed">
          The Phase 1 core baseline is initialized with npm workspaces, strict TypeScript contracts, 
          and Dockerized infrastructure. Ready for Phase 2 implementation.
        </p>
      </div>
    </div>
  );
};
