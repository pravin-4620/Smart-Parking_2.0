import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService.js';

export const AdminAuditPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    adminService.getAuditLogs().then(setLogs).catch(console.error);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Security Audit Trail</h1>
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <pre className="text-xs bg-slate-50 p-4 rounded-xl overflow-x-auto">{JSON.stringify(logs, null, 2)}</pre>
      </div>
    </div>
  );
};
