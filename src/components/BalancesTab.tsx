import React from 'react';
import {
  Scale,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  History,
  RotateCcw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Trip, TripFinancialSummary, AppSettings } from '../types';
import { formatPaise } from '../engine/precision';
import { getBilateralDebtsForMember } from '../engine/calculationEngine';
import { MemberAvatar } from './MemberAvatar';

interface BalancesTabProps {
  trip: Trip;
  financials: TripFinancialSummary;
  settings: AppSettings;
  onOpenRecordPayment: (fromId?: string, toId?: string, maxAmount?: number) => void;
  onDeleteSettlement: (settlementId: string) => void;
  onMarkAllSettled: () => void;
}

export const BalancesTab: React.FC<BalancesTabProps> = ({
  trip,
  financials,
  settings,
  onOpenRecordPayment,
  onDeleteSettlement,
  onMarkAllSettled,
}) => {
  const currentUserId = settings.currentUserId;
  const bilateralDebts = getBilateralDebtsForMember(currentUserId, trip);

  const handleSettleAllCelebration = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
    onMarkAllSettled();
  };

  const totalOriginalDebt = financials.recommendedSettlements.reduce(
    (a, b) => a + b.originalAmountInPaise,
    0
  );
  const totalSettled = financials.totalSettledInPaise;
  const settlementPercentage =
    totalOriginalDebt > 0 ? Math.round((totalSettled / totalOriginalDebt) * 100) : 100;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Tab Header & Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold text-stone-100 tracking-tight">
              Balances & Settlements
            </h1>
            <p className="text-xs text-stone-400 mt-0.5">
              Net member positions & minimal transfer plan
            </p>
          </div>

          {!financials.isFullySettled && totalOriginalDebt > 0 && (
            <button
              id="settle-all-btn"
              onClick={handleSettleAllCelebration}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all active:scale-95"
            >
              <Sparkles size={14} />
              <span>Settle All</span>
            </button>
          )}
        </div>

        {/* Settlement Progress Card */}
        {totalOriginalDebt > 0 && (
          <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-stone-400">Settlement Progress</span>
              <span className="text-emerald-400 font-mono font-bold">
                {settlementPercentage}% complete
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-stone-750 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
                style={{ width: `${settlementPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-stone-400 font-mono">
              <span>Paid: {formatPaise(totalSettled, trip.currency)}</span>
              <span>Remaining: {formatPaise(financials.totalUnsettledInPaise, trip.currency)}</span>
            </div>
          </div>
        )}
      </div>

      {/* 1. All Member Net Balances */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
          <Scale size={14} className="text-emerald-400" />
          <span>Group Ledger Status ({trip.members.length})</span>
        </h2>

        <div className="space-y-2">
          {trip.members.map((member) => {
            const b = financials.memberBalances[member.id];
            if (!b) return null;

            const isCreditor = b.netBalanceInPaise > 0;
            const isDebtor = b.netBalanceInPaise < 0;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-850 border border-stone-750 gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MemberAvatar member={member} size="md" />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-stone-200 flex items-center gap-1.5">
                      <span className="truncate">{member.name}</span>
                      {member.id === currentUserId && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 uppercase tracking-wider">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-stone-400 font-mono mt-0.5">
                      Paid: {formatPaise(b.totalPaidInPaise, trip.currency)} • Share:{' '}
                      {formatPaise(b.totalOwedInPaise, trip.currency)}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div
                    className={`text-sm font-extrabold font-mono ${
                      isCreditor
                        ? 'text-emerald-400'
                        : isDebtor
                        ? 'text-amber-400'
                        : 'text-stone-400'
                    }`}
                  >
                    {isCreditor && '+'}
                    {formatPaise(b.netBalanceInPaise, trip.currency)}
                  </div>
                  <div className="text-[10px] text-stone-400 font-medium">
                    {isCreditor ? 'Gets back' : isDebtor ? 'Owes group' : 'Settled'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Conservation Invariant confirmation badge */}
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-[11px] text-stone-400">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck size={14} />
            <span className="font-semibold">Mathematical Conservation Law:</span>
          </div>
          <span className="font-mono text-stone-300">
            Σ Net Balances = {financials.invariants.netBalanceSumPaise} paise (Exact Zero)
          </span>
        </div>
      </div>

      {/* 2. "Because of..." Bilateral Breakdown for current user */}
      {bilateralDebts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Direct Pair Breakdown (You & Others)
            </h2>
          </div>

          <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-2.5">
            {bilateralDebts.map((item) => {
              const other = trip.members.find((m) => m.id === item.otherMemberId);
              const theyOweYou = item.amountInPaise > 0;

              return (
                <div
                  key={item.otherMemberId}
                  className="flex items-center justify-between text-xs py-1 border-b border-stone-800/80 last:border-none"
                >
                  <div className="flex items-center gap-2">
                    <MemberAvatar member={other} size="xs" />
                    <span className="font-semibold text-stone-200">{other?.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono font-bold">
                    {theyOweYou ? (
                      <span className="text-emerald-400 flex items-center gap-0.5">
                        <TrendingDown size={12} /> owes you {formatPaise(item.amountInPaise, trip.currency)}
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-0.5">
                        <TrendingUp size={12} /> you owe {formatPaise(Math.abs(item.amountInPaise), trip.currency)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Recommended Minimal Settlement Plan */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
            Recommended Settlement Transfers ({financials.recommendedSettlements.length})
          </h2>
          <span className="text-[11px] text-stone-400">Simplified debt netting</span>
        </div>

        {financials.recommendedSettlements.length === 0 ? (
          <div className="text-center py-8 rounded-2xl bg-stone-850 border border-stone-750">
            <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2" />
            <div className="text-sm font-bold text-stone-200">Everyone is fully settled!</div>
            <p className="text-xs text-stone-400 mt-0.5">No outstanding payments required.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {financials.recommendedSettlements.map((rec) => {
              const fromMember = trip.members.find((m) => m.id === rec.fromMemberId);
              const toMember = trip.members.find((m) => m.id === rec.toMemberId);
              const isCurrentUserInvolved =
                rec.fromMemberId === currentUserId || rec.toMemberId === currentUserId;

              return (
                <div
                  key={rec.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    rec.isFullySettled
                      ? 'bg-stone-900/60 border-stone-800 opacity-60'
                      : isCurrentUserInvolved
                      ? 'bg-stone-850 border-emerald-500/30 ring-1 ring-emerald-500/20'
                      : 'bg-stone-850 border-stone-750'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Transfer Route: From -> To */}
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MemberAvatar member={fromMember} size="sm" />
                        <span className="text-xs font-bold text-stone-200 truncate">
                          {fromMember?.name}
                        </span>
                      </div>

                      <ArrowRight size={14} className="text-stone-500 flex-shrink-0" />

                      <div className="flex items-center gap-1.5 min-w-0">
                        <MemberAvatar member={toMember} size="sm" />
                        <span className="text-xs font-bold text-stone-200 truncate">
                          {toMember?.name}
                        </span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <div
                        className={`text-sm font-extrabold font-mono ${
                          rec.isFullySettled ? 'text-stone-500 line-through' : 'text-stone-100'
                        }`}
                      >
                        {formatPaise(rec.originalAmountInPaise, trip.currency)}
                      </div>
                    </div>
                  </div>

                  {/* Partial settlement status & record button */}
                  <div className="mt-3 pt-3 border-t border-stone-800/80 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-stone-400 font-mono">
                      {rec.isFullySettled ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                          <CheckCircle2 size={12} /> Settled in full
                        </span>
                      ) : rec.isPartiallySettled ? (
                        <span className="text-amber-400">
                          Paid {formatPaise(rec.amountSettledInPaise, trip.currency)} • Remaining{' '}
                          {formatPaise(rec.remainingAmountInPaise, trip.currency)}
                        </span>
                      ) : (
                        <span>Pending settlement</span>
                      )}
                    </div>

                    {!rec.isFullySettled && (
                      <button
                        onClick={() =>
                          onOpenRecordPayment(
                            rec.fromMemberId,
                            rec.toMemberId,
                            rec.remainingAmountInPaise
                          )
                        }
                        className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold transition-all active:scale-95 shadow-sm"
                      >
                        Record Payment
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Settlement History & Logs */}
      {trip.settlements.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-400">
            <History size={14} />
            <span>Recorded Payments ({trip.settlements.length})</span>
          </div>

          <div className="space-y-2">
            {trip.settlements.map((s) => {
              const from = trip.members.find((m) => m.id === s.fromMemberId);
              const to = trip.members.find((m) => m.id === s.toMemberId);

              return (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-stone-900 border border-stone-800 text-xs gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-stone-200 truncate">
                        {from?.name} paid {to?.name}
                      </div>
                      <div className="text-[10px] text-stone-400">
                        {new Date(s.paidAt).toLocaleDateString()} {s.notes && `• ${s.notes}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono font-bold text-emerald-400">
                      {formatPaise(s.amountInPaise, trip.currency)}
                    </span>
                    <button
                      onClick={() => onDeleteSettlement(s.id)}
                      title="Undo this payment"
                      className="p-1 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-stone-800 transition-colors"
                    >
                      <RotateCcw size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
