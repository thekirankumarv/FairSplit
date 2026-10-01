import React, { useState } from 'react';
import {
  X,
  Edit2,
  Copy,
  Trash2,
  Calendar,
  CreditCard,
  Users,
  Receipt,
  FileText,
} from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { Trip, Expense } from '../types';
import { formatPaise } from '../engine/precision';
import {
  calculateExpenseParticipantShares,
  calculateExpensePayerContributions,
} from '../engine/calculationEngine';
import { CategoryIcon } from './CategoryIcon';
import { MemberAvatar } from './MemberAvatar';

interface ExpenseDetailModalProps {
  isOpen: boolean;
  expense: Expense | null;
  trip: Trip;
  currentUserId: string;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
  onDuplicate: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
}

export const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  isOpen,
  expense,
  trip,
  currentUserId,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen || !expense) return null;

  const payerContributions = calculateExpensePayerContributions(expense);
  const participantShares = calculateExpenseParticipantShares(expense);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/80 backdrop-blur-sm sm:px-4 pad-sheet overflow-y-auto">
      <div className="w-full max-w-md bg-stone-900 border border-stone-750 sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-200 max-h-[90vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <CategoryIcon category={expense.category} sizeVariant="sm" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Expense Details
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Main Title & Amount */}
          <div className="text-center py-1">
            <h1 className="text-xl font-black text-stone-100">{expense.title}</h1>
            <div className="mt-2 text-3xl sm:text-4xl font-black text-emerald-400 font-mono tracking-tight">
              {formatPaise(expense.totalAmountInPaise, trip.currency)}
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-stone-400 mt-1">
              <Calendar size={13} />
              <span>{expense.date}</span>
              <span>•</span>
              <span className="capitalize">{expense.splitMethod.toLowerCase()} split</span>
            </div>
          </div>

          {/* Paid By Section */}
          <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
              <CreditCard size={14} className="text-emerald-400" />
              <span>Paid By</span>
            </div>

            <div className="space-y-1.5">
              {Object.entries(payerContributions).map(([payerId, amountPaid]) => {
                const member = trip.members.find((m) => m.id === payerId);
                return (
                  <div key={payerId} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <MemberAvatar member={member} size="xs" />
                      <span className="font-semibold text-stone-200 truncate">
                        {member?.name || 'Someone'}
                        {payerId === currentUserId && ' (You)'}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-stone-100">
                      {formatPaise(amountPaid, trip.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Split Breakdown */}
          <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <Users size={14} className="text-emerald-400" />
                <span>Participants ({expense.participantIds.length})</span>
              </div>
              <span className="text-[11px] text-stone-500 font-mono">
                Sum: {formatPaise(expense.totalAmountInPaise, trip.currency)}
              </span>
            </div>

            <div className="space-y-2">
              {expense.participantIds.map((pId) => {
                const member = trip.members.find((m) => m.id === pId);
                const sharePaise = participantShares[pId] || 0;
                const isYou = pId === currentUserId;

                return (
                  <div
                    key={pId}
                    className={`flex items-center justify-between text-xs p-2 rounded-xl transition-colors ${
                      isYou ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-stone-900/60'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MemberAvatar member={member} size="xs" />
                      <span className="font-semibold text-stone-200 truncate">
                        {member?.name || 'Someone'} {isYou && '(You)'}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-stone-100">
                      {formatPaise(sharePaise, trip.currency)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Itemized Items (if present) */}
          {expense.splitMethod === 'ITEMIZED' && expense.items && expense.items.length > 0 && (
            <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <Receipt size={14} className="text-blue-400" />
                <span>Itemized Bill Details</span>
              </div>

              <div className="space-y-2">
                {expense.items.map((item) => {
                  const itemTotal = item.unitPriceInPaise * (item.quantity > 0 ? item.quantity : 1);
                  const participants = item.participantIds
                    .map((id) => trip.members.find((m) => m.id === id)?.name)
                    .filter(Boolean)
                    .join(', ');

                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-stone-200">{item.title}</span>
                        <span className="font-mono font-bold text-stone-100">
                          {formatPaise(itemTotal, trip.currency)}
                        </span>
                      </div>
                      <div className="text-[10px] text-stone-400 truncate">
                        For: {participants || 'All'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Receipt Image (if present) */}
          {expense.receiptImage && (
            <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <Receipt size={14} className="text-emerald-400" />
                <span>Attached Receipt</span>
              </div>
              <img
                src={expense.receiptImage}
                alt="Receipt"
                className="w-full max-h-60 rounded-xl object-contain bg-black/40 border border-stone-800"
              />
            </div>
          )}

          {/* Notes (if present) */}
          {expense.notes && (
            <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-1">
              <div className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <FileText size={14} className="text-stone-400" />
                <span>Notes</span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">{expense.notes}</p>
            </div>
          )}
        </div>

        {/* Action Buttons: Edit, Duplicate, Delete */}
        <div className="p-4 border-t border-stone-800 bg-stone-900/90 grid grid-cols-3 gap-2">
          <button
            onClick={() => onEdit(expense)}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-xs font-bold text-stone-200 transition-colors"
          >
            <Edit2 size={14} />
            <span>Edit</span>
          </button>

          <button
            onClick={() => onDuplicate(expense)}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-xs font-bold text-stone-200 transition-colors"
          >
            <Copy size={14} />
            <span>Duplicate</span>
          </button>

          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-bold text-rose-300 transition-colors"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        destructive
        title="Delete expense"
        message={
          <>
            <span className="font-semibold text-stone-100">{expense.title}</span> will be removed
            from this trip and every balance recalculated.
          </>
        }
        confirmLabel="Delete"
        onConfirm={() => {
          setConfirmDelete(false);
          onDelete(expense.id);
          onClose();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
};
