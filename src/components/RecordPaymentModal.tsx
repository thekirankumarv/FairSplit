import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, ArrowRight } from 'lucide-react';
import { Trip, SettlementPayment } from '../types';
import { rupeesToPaise, paiseToRupees, formatPaise } from '../engine/precision';

interface RecordPaymentModalProps {
  isOpen: boolean;
  trip: Trip;
  initialFromMemberId?: string;
  initialToMemberId?: string;
  initialAmountInPaise?: number;
  onClose: () => void;
  onSavePayment: (payment: SettlementPayment) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  trip,
  initialFromMemberId,
  initialToMemberId,
  initialAmountInPaise,
  onClose,
  onSavePayment,
}) => {
  if (!isOpen) return null;

  const defaultFrom = initialFromMemberId || trip.members[1]?.id || trip.members[0]?.id;
  const defaultTo = initialToMemberId || trip.members[0]?.id;

  const [fromMemberId, setFromMemberId] = useState<string>(defaultFrom);
  const [toMemberId, setToMemberId] = useState<string>(defaultTo);
  const [amountStr, setAmountStr] = useState<string>(
    initialAmountInPaise ? paiseToRupees(initialAmountInPaise).toString() : ''
  );
  const [notes, setNotes] = useState<string>('Settlement transfer');

  useEffect(() => {
    if (initialFromMemberId) setFromMemberId(initialFromMemberId);
    if (initialToMemberId) setToMemberId(initialToMemberId);
    if (initialAmountInPaise) setAmountStr(paiseToRupees(initialAmountInPaise).toString());
  }, [initialFromMemberId, initialToMemberId, initialAmountInPaise]);

  const amountInPaise = rupeesToPaise(amountStr);

  const isValid = amountInPaise > 0 && fromMemberId !== toMemberId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    const payment: SettlementPayment = {
      id: `settle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tripId: trip.id,
      fromMemberId,
      toMemberId,
      amountInPaise,
      notes: notes.trim() || undefined,
      paidAt: new Date().toISOString(),
    };

    onSavePayment(payment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm pad-overlay animate-in fade-in">
      <div className="w-full max-w-sm bg-stone-900 border border-stone-750 rounded-3xl shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-400" />
            <h2 className="text-sm font-extrabold text-stone-100">Record Settlement Payment</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Who paid whom visual */}
          <div className="p-3 rounded-2xl bg-stone-850 border border-stone-750 flex items-center justify-between gap-2">
            <div className="text-center flex-1">
              <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Payer</label>
              <select
                value={fromMemberId}
                onChange={(e) => setFromMemberId(e.target.value)}
                className="w-full px-2 py-1.5 rounded-xl bg-stone-900 border border-stone-750 text-xs text-stone-100 font-bold focus:outline-none"
              >
                {trip.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <ArrowRight size={16} className="text-stone-500 mt-4 flex-shrink-0" />

            <div className="text-center flex-1">
              <label className="text-[10px] uppercase font-bold text-stone-400 block mb-1">Receiver</label>
              <select
                value={toMemberId}
                onChange={(e) => setToMemberId(e.target.value)}
                className="w-full px-2 py-1.5 rounded-xl bg-stone-900 border border-stone-750 text-xs text-stone-100 font-bold focus:outline-none"
              >
                {trip.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
              Amount Paid ({trip.currency})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-mono font-bold">
                {trip.currency === 'INR' ? '₹' : '$'}
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-2xl bg-stone-850 border border-stone-750 text-sm font-bold text-stone-100 font-mono focus:outline-none focus:border-emerald-500"
                autoFocus
              />
            </div>
            {initialAmountInPaise && amountInPaise < initialAmountInPaise && (
              <p className="text-[10px] text-amber-400 mt-1">
                Partial payment: Remaining {formatPaise(initialAmountInPaise - amountInPaise, trip.currency)} will stay unsettled.
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
              Payment Note
            </label>
            <input
              type="text"
              placeholder="e.g. UPI / Google Pay / Cash"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-stone-850 border border-stone-750 text-xs text-stone-100 placeholder-stone-500 focus:outline-none"
            />
          </div>

          {fromMemberId === toMemberId && (
            <p className="text-xs text-rose-400">Payer and receiver cannot be the same person.</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!isValid}
            className={`w-full py-3 rounded-2xl font-bold text-xs transition-all ${
              isValid
                ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
                : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-750'
            }`}
          >
            Confirm Payment
          </button>
        </form>
      </div>
    </div>
  );
};
