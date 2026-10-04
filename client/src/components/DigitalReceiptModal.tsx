import React from 'react';
import { PaymentReceipt } from '@smart-parking/shared';
import { CheckCircle2, Printer, ShieldCheck } from 'lucide-react';

interface DigitalReceiptModalProps {
  receipt: PaymentReceipt;
  onClose: () => void;
}

export const DigitalReceiptModal: React.FC<DigitalReceiptModalProps> = ({ receipt, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="text-center pb-4 border-b border-slate-100">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Smart Parking Receipt</h2>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 mt-1 inline-block">
            {receipt.receiptId}
          </span>
        </div>

        <div className="my-4 space-y-3 text-sm">
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Transaction ID</span>
            <span className="font-mono text-xs text-slate-800 font-bold">{receipt.transactionId}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Razorpay Payment ID</span>
            <span className="font-mono text-xs text-slate-800 font-bold">{receipt.razorpayPaymentId}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Parking Facility</span>
            <span className="font-semibold text-slate-800">{receipt.reservationDetails.parkingName}</span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Slot Reserved</span>
            <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              #{receipt.reservationDetails.slotNumber}
            </span>
          </div>

          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-slate-500">Amount Paid</span>
            <span className="font-black text-emerald-600 text-lg">
              ₹{receipt.amount} {receipt.currency}
            </span>
          </div>

          <div className="flex justify-between py-1">
            <span className="text-slate-500">Paid At</span>
            <span className="text-xs text-slate-600">
              {new Date(receipt.createdAt).toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="bg-slate-50 p-3 rounded-lg flex items-center gap-2 text-xs text-slate-500 border border-slate-100 mb-6">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          Verified Razorpay HMAC SHA256 Signature. Valid entry pass.
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-300 font-semibold text-slate-700 text-sm hover:bg-slate-50 transition"
          >
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
