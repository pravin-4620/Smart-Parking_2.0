import React, { useState, useEffect } from 'react';
import { managerService } from '../../services/managerService.js';

export const ManagerReportsPage: React.FC = () => {
  const [report, setReport] = useState<any>(null);

  useEffect(() => {
    managerService.getReport().then(setReport).catch(console.error);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Facility Performance Statement</h1>
      <div className="bg-white p-6 rounded-2xl border border-slate-200">
        <pre className="text-xs bg-slate-50 p-4 rounded-xl overflow-x-auto">{JSON.stringify(report, null, 2)}</pre>
      </div>
    </div>
  );
};

