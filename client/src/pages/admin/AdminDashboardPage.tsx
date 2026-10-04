import React from 'react';
import { ShieldCheck, Users, Settings, Database, Activity } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="w-7 h-7 text-sky-600" />
            <span>Admin System Control Center</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Platform management, RBAC control, devices & global configurations</p>
        </div>
        <span className="px-3 py-1 bg-sky-100 text-sky-800 text-xs font-bold rounded-full uppercase">
          Role: ADMIN
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <Users className="w-10 h-10 text-indigo-600 bg-indigo-50 p-2 rounded-lg" />
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Total Users</p>
            <p className="text-xl font-bold text-slate-900">Active</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <Database className="w-10 h-10 text-emerald-600 bg-emerald-50 p-2 rounded-lg" />
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Parking Locations</p>
            <p className="text-xl font-bold text-slate-900">Managed</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <Activity className="w-10 h-10 text-amber-600 bg-amber-50 p-2 rounded-lg" />
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">IoT Network</p>
            <p className="text-xl font-bold text-slate-900">Online</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <Settings className="w-10 h-10 text-purple-600 bg-purple-50 p-2 rounded-lg" />
          <div>
            <p className="text-xs text-slate-500 font-semibold uppercase">Audit Logs</p>
            <p className="text-xl font-bold text-slate-900">Enabled</p>
          </div>
        </div>
      </div>
    </div>
  );
};
