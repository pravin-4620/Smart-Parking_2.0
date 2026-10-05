import React from 'react';
import { PricingCalculationResult } from '@smart-parking/shared';

interface PriceBreakdownCardProps {
  pricing: PricingCalculationResult;
}

export const PriceBreakdownCard: React.FC<PriceBreakdownCardProps> = ({ pricing }) => {
  return (
    <div className="price-summary bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">
        Your price summary
      </h3>

      <div className="space-y-3 mb-4">
        {pricing.breakdown.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center text-sm text-slate-600">
            <span>{item.description}</span>
            <span className={`font-semibold ${item.amount < 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
              {item.amount < 0 ? `- ₹${Math.abs(item.amount)}` : `₹${item.amount}`}
            </span>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-slate-200 pt-3 space-y-2 text-sm">
        <div className="flex justify-between text-slate-500">
          <span>Base Charge</span>
          <span>₹{pricing.baseAmount}</span>
        </div>
        {pricing.peakAmount > 0 && (
          <div className="flex justify-between text-amber-600">
            <span>Peak Hour Surcharge</span>
            <span>+ ₹{pricing.peakAmount}</span>
          </div>
        )}
        {pricing.discount > 0 && (
          <div className="flex justify-between text-emerald-600">
            <span>Discounts / Caps Applied</span>
            <span>- ₹{pricing.discount}</span>
          </div>
        )}
        <div className="flex justify-between text-slate-500">
          <span>Estimated Taxes (GST 0%)</span>
          <span>₹{pricing.taxes}</span>
        </div>
      </div>

      <div className="border-t-2 border-slate-800 pt-4 mt-4 flex justify-between items-center">
        <div>
          <span className="text-base font-bold text-slate-800 block">Total Amount Payable</span>
          <span className="text-xs text-slate-400">Pricing version {pricing.pricingRuleVersion}</span>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-emerald-700">₹{pricing.finalAmount}</span>
          <span className="text-xs text-slate-400 block font-bold uppercase">{pricing.currency}</span>
        </div>
      </div>
    </div>
  );
};
