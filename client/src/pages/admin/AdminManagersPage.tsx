import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService.js';

export const AdminManagersPage: React.FC = () => {
  const [managers, setManagers] = useState<any[]>([]);

  useEffect(() => {
    adminService.getManagers().then(setManagers).catch(console.error);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Manager Facility Assignments</h1>
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <pre className="text-xs bg-slate-50 p-4 rounded-xl overflow-x-auto">{JSON.stringify(managers, null, 2)}</pre>
      </div>
    </div>
  );
};
