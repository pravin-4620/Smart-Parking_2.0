import React from 'react';
import { AuthorizedSlotDetails } from '@smart-parking/shared';
import { X, User, Car, Calendar, Clock, ShieldCheck } from 'lucide-react';

interface SlotDetailModalProps {
  slot: AuthorizedSlotDetails | null;
  onClose: () => void;
  onCancelReservation?: (reservationId: string) => Promise<void>;
  onToggleMaintenance?: (slotId: string, currentStatus: string) => Promise<void>;
  locationName?: string;
}

export const SlotDetailModal: React.FC<SlotDetailModalProps> = ({
  slot,
  onClose,
  onCancelReservation,
  onToggleMaintenance,
  locationName,
}) => {
  if (!slot) return null;

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'N/A';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'RESERVED':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'OCCUPIED':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'MAINTENANCE':
        return 'bg-slate-200 text-slate-800 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const reservation = slot.reservation;
  const session = slot.activeSession;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-extrabold text-slate-900">Slot {slot.slotNumber}</h3>
              <span
                className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                  slot.status
                )}`}
              >
                {slot.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Type: <strong className="text-slate-700">{slot.slotType}</strong>
              {locationName ? ` • ${locationName}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* RESERVED or OCCUPIED Customer & Vehicle Details */}
          {(reservation || session) ? (
            <>
              {/* Customer Box */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span>Customer Information</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Customer Name</span>
                    <span className="font-bold text-slate-900">
                      {reservation?.customer?.name || session?.customer?.name || 'Customer'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Email Address</span>
                    <span className="font-semibold text-slate-800 break-all">
                      {reservation?.customer?.email || session?.customer?.email || 'N/A'}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-slate-400 block font-medium">Mobile Contact</span>
                    <span className="font-semibold text-slate-800">
                      {reservation?.customer?.phone || session?.customer?.phone || 'Not provided'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vehicle Box */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Car className="w-4 h-4 text-indigo-600" />
                  <span>Vehicle Details</span>
                </div>
                {reservation?.vehicle || session?.vehicle ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">License Plate</span>
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 inline-block">
                        {(reservation?.vehicle || session?.vehicle)?.licensePlate}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Vehicle Type</span>
                      <span className="font-semibold text-slate-800">
                        {(reservation?.vehicle || session?.vehicle)?.vehicleType || 'CAR'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Make & Model</span>
                      <span className="font-semibold text-slate-800">
                        {[(reservation?.vehicle || session?.vehicle)?.make, (reservation?.vehicle || session?.vehicle)?.model]
                          .filter(Boolean)
                          .join(' ') || 'Not specified'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Color</span>
                      <span className="font-semibold text-slate-800">
                        {(reservation?.vehicle || session?.vehicle)?.color || 'Not specified'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">Vehicle: Not provided</p>
                )}
              </div>

              {/* Booking Window Box (if reservation exists) */}
              {reservation && (
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>Reservation Schedule</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Start Time</span>
                      <span className="font-semibold text-slate-800">
                        {formatDate(reservation.startTime)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">End Time</span>
                      <span className="font-semibold text-slate-800">
                        {formatDate(reservation.endTime)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Booking Status</span>
                      <span className="font-bold text-amber-700">{reservation.status}</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">Reservation Ref</span>
                      <span className="font-mono text-xs text-slate-600">
                        {reservation.reservationId.slice(-8).toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Session Box (if OCCUPIED) */}
              {session && (
                <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-700">
                    <Clock className="w-4 h-4 text-rose-600" />
                    <span>Active Parking Session</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-xs text-rose-500 block font-medium">Check-In Time</span>
                      <span className="font-semibold text-rose-950">
                        {formatDate(session.checkInTime)}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-rose-500 block font-medium">Session Status</span>
                      <span className="font-bold text-rose-800">{session.status}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="font-bold text-slate-800">Slot Vacant & Available</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                No active reservations or parking sessions are associated with this bay.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          {onToggleMaintenance && (
            <button
              onClick={() => onToggleMaintenance(slot._id, slot.status)}
              className="px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
            >
              {slot.status === 'MAINTENANCE' ? 'Restore to Available' : 'Mark as Maintenance'}
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            {reservation && onCancelReservation && slot.status === 'RESERVED' && (
              <button
                onClick={() => {
                  if (confirm(`Are you sure you want to cancel reservation ${reservation.reservationId}?`)) {
                    onCancelReservation(reservation.reservationId);
                  }
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition"
              >
                Cancel Reservation
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
