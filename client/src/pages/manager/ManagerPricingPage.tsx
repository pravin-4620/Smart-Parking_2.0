import React, { useState, useEffect } from 'react';
import { managerService } from '../../services/managerService.js';

export const ManagerPricingPage: React.FC = () => {
  const [pricing, setPricing] = useState<any>(null);

  useEffect(() => {
    managerService.getPricing().then(setPricing).catch(console.error);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Dynamic Pricing Rules</h1>
      <div className="bg-white p-6 rounded-2xl border border-slate-200">
        <p className="text-sm font-semibold text-slate-700">Base Tariff Configuration & Surge Multipliers</p>
        <pre className="text-xs bg-slate-50 p-4 rounded-xl mt-3 overflow-x-auto">{JSON.stringify(pricing, null, 2)}</pre>
      </div>
    </div>
  );
};

