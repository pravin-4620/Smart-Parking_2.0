import React from 'react';
import { MapPin, Calendar, Clock, Car, ShieldCheck } from 'lucide-react';

interface BookingSummaryCardProps {
  parkingName: string;
  address: string;
  slotNumber: string;
  slotType: string;
  startTime: string;
  endTime: string;
  durationHours: number;
}

export const BookingSummaryCard: React.FC<BookingSummaryCardProps> = ({
  parkingName,
  address,
  slotNumber,
  slotType,
  startTime,
  endTime,
  durationHours,
}) => {
  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="booking-summary bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start gap-4 justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800">{parkingName}</h2>
          <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
            <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
            {address}
          </p>
        </div>
        <div className="text-right">
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-sm border border-emerald-200">
            Slot #{slotNumber}
          </span>
          <p className="text-xs text-slate-400 mt-1 uppercase font-semibold">{slotType}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 my-4 py-2">
        <div className="flex items-start gap-3">
          <Calendar className="w-5 h-5 text-indigo-600 mt-0.5" />
          <div>
            <span className="text-xs text-slate-400 block font-medium">Start Time</span>
            <span className="text-sm font-semibold text-slate-700">{formatDateTime(startTime)}</span>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-indigo-600 mt-0.5" />
          <div>
            <span className="text-xs text-slate-400 block font-medium">End Time</span>
            <span className="text-sm font-semibold text-slate-700">{formatDateTime(endTime)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center justify-between pt-4 border-t border-slate-100 bg-slate-50 p-3 rounded-lg">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <Car className="w-4 h-4 text-indigo-600" />
          Total Reserved Duration: <span className="text-indigo-700 font-bold">{durationHours} Hours</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
          <ShieldCheck className="w-4 h-4" /> Lock Protected
        </div>
      </div>
    </div>
  );
};
