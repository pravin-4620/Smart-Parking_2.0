import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService.js';

export const AdminAnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    adminService.getAnalytics().then(setAnalytics).catch(console.error);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Cross-City Analytics</h1>
      <div className="bg-white p-6 rounded-2xl border border-slate-200">
        <pre className="text-xs bg-slate-50 p-4 rounded-xl overflow-x-auto">{JSON.stringify(analytics, null, 2)}</pre>
      </div>
    </div>
  );
};
