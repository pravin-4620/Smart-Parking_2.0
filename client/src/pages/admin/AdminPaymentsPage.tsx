import { PageHeader } from '../../components/ui/MobilityUI';
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService.js';

export const AdminPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    adminService.getPayments().then(setPayments).catch(console.error);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader eyebrow="Payments overview" title="The payment ledger" description="Review payment amounts, order references, and transaction status." />
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="responsive-table w-full text-left text-xs">
          <thead className="bg-slate-50 border-b font-bold text-slate-700">
            <tr>
              <th className="p-3">Razorpay Order ID</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((p) => (
              <tr key={p._id}>
                <td data-label="Razorpay Order ID" className="p-3 font-mono font-bold">{p.orderId}</td>
                <td data-label="Amount" className="p-3 font-bold">₹{p.amount}</td>
                <td data-label="Status" className="p-3"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded">{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
