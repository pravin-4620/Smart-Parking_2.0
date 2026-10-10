import { PageHeader } from '../../components/ui/MobilityUI';
import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService.js';

export const AdminPaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([adminService.getPayments(), adminService.getFines()]).then(([paymentRows, fineRows]) => { setPayments(paymentRows); setFines(fineRows); }).catch(console.error);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader eyebrow="Payments overview" title="The payment ledger" description="Review payment amounts, order references, and transaction status." />
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="responsive-table w-full text-left text-xs">
          <thead className="bg-slate-50 border-b font-bold text-slate-700">
            <tr>
              <th className="p-3">Legacy Transaction ID</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((p) => (
              <tr key={p._id}>
                <td data-label="Legacy Transaction ID" className="p-3 font-mono font-bold">{p.orderId}</td>
                <td data-label="Amount" className="p-3 font-bold">₹{p.amount}</td>
                <td data-label="Status" className="p-3"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded">{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <h2 className="p-4 font-bold text-slate-900 border-b">Overstay fines</h2>
        {fines.length === 0 ? <p className="p-6 text-sm text-slate-500">No overstay fines recorded.</p> : <table className="responsive-table w-full text-left text-xs"><thead className="bg-slate-50 border-b"><tr><th className="p-3">Facility / slot</th><th className="p-3">Overstay</th><th className="p-3">Amount</th><th className="p-3">Status</th></tr></thead><tbody>{fines.map((fine) => <tr key={fine._id} className="border-b"><td className="p-3">{fine.parkingLocationId?.name ?? 'Facility'} / {fine.slotId?.slotNumber ?? 'Slot'}</td><td className="p-3">{fine.overstayMinutes} min</td><td className="p-3">₹{fine.amount}</td><td className="p-3 font-bold">{fine.status}</td></tr>)}</tbody></table>}
      </div>
    </div>
  );
};
