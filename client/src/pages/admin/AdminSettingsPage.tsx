import React from 'react';

export const AdminSettingsPage: React.FC = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Global System Parameters</h1>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 text-sm text-slate-600">
        System feature flags, device connectivity, and local operational policies.
      </div>
    </div>
  );
};
