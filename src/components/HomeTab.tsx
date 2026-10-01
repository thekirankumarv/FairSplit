import React from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle,
  Plus,
  Scale,
  Calendar,
  Users,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Trip, TripFinancialSummary, AppSettings, Expense } from '../types';
import { formatPaise } from '../engine/precision';
import { CategoryIcon } from './CategoryIcon';
import { MemberAvatar } from './MemberAvatar';

interface HomeTabProps {
  trip: Trip;
  financials: TripFinancialSummary;
  settings: AppSettings;
  onOpenAddExpense: () => void;
  onViewExpenseDetail?: (expense: Expense) => void;
  onSelectExpense?: (expense: Expense) => void;
  onNavigateToTab?: (tab: 'expenses' | 'balances' | 'summary') => void;
  onOpenBalances?: () => void;
  onQuickRecordPayment?: (fromId: string, toId: string, amountInPaise: number) => void;
  onOpenRecordPayment?: (fromId?: string, toId?: string, maxAmount?: number) => void;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  trip,
  financials,
  settings,
  onOpenAddExpense,
  onViewExpenseDetail,
  onSelectExpense,
  onNavigateToTab,
  onOpenBalances,
  onQuickRecordPayment,
  onOpenRecordPayment,
}) => {
  const handleViewExpense = (exp: Expense) => {
    if (onSelectExpense) onSelectExpense(exp);
    else if (onViewExpenseDetail) onViewExpenseDetail(exp);
  };

  const handleGoToBalances = () => {
    if (onOpenBalances) onOpenBalances();
    else if (onNavigateToTab) onNavigateToTab('balances');
  };

  const handleRecordPayment = (fromId: string, toId: string, amount: number) => {
    if (onOpenRecordPayment) onOpenRecordPayment(fromId, toId, amount);
    else if (onQuickRecordPayment) onQuickRecordPayment(fromId, toId, amount);
  };
  const currentUserId = settings.currentUserId;
  const currentUser = trip.members.find((m) => m.id === currentUserId) || trip.members[0];
  const userBalance = currentUser ? financials.memberBalances[currentUser.id] : null;
  const netPaise = userBalance ? userBalance.netBalanceInPaise : 0;
  const totalPaidPaise = userBalance ? userBalance.totalPaidInPaise : 0;
  const totalOwedPaise = userBalance ? userBalance.totalOwedInPaise : 0;

  const isOwed = netPaise > 0;
  const owesMoney = netPaise < 0;
  const isSettled = netPaise === 0;

  const recentExpenses = [...trip.expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  // Recommendations involving the current user
  const userRecommendations = financials.recommendedSettlements.filter(
    (r) => !r.isFullySettled && (r.fromMemberId === currentUser?.id || r.toMemberId === currentUser?.id)
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Trip Header Banner */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-400">
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              {trip.startDate} {trip.endDate !== trip.startDate && `– ${trip.endDate}`}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Users size={13} />
              {trip.members.length} friends
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-stone-100 tracking-tight mt-0.5">
            {trip.name}
          </h1>
        </div>
      </div>

      {/* Hero Financial Position Card */}
      <div
        id="hero-balance-card"
        className={`relative overflow-hidden rounded-3xl p-5 sm:p-6 border transition-all ${
          isOwed
            ? 'bg-gradient-to-br from-emerald-950/70 via-stone-900 to-stone-900 border-emerald-500/30 shadow-xl shadow-emerald-950/30'
            : owesMoney
            ? 'bg-gradient-to-br from-amber-950/70 via-stone-900 to-stone-900 border-amber-500/30 shadow-xl shadow-amber-950/30'
            : 'bg-stone-850 border-stone-750'
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-stone-400">
                Your Balance ({currentUser?.name})
              </span>
              {isOwed && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                  <ArrowDownLeft size={11} /> To Receive
                </span>
              )}
              {owesMoney && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                  <ArrowUpRight size={11} /> To Pay
                </span>
              )}
              {isSettled && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-stone-700/60 text-stone-300 text-[10px] font-bold">
                  <CheckCircle size={11} /> Settled
                </span>
              )}
            </div>

            <div className="mt-2 text-3xl sm:text-4xl font-black tracking-tight font-mono">
              {isOwed && (
                <span className="text-emerald-400">
                  +{formatPaise(netPaise, trip.currency)}
                </span>
              )}
              {owesMoney && (
                <span className="text-amber-400">
                  {formatPaise(netPaise, trip.currency)}
                </span>
              )}
              {isSettled && (
                <span className="text-stone-300">
                  {formatPaise(0, trip.currency)}
                </span>
              )}
            </div>

            <p className="text-xs text-stone-400 mt-1">
              {isOwed
                ? 'Friends owe you money for shared group expenses'
                : owesMoney
                ? 'You have unsettled balances to pay back to friends'
                : 'All your expenses and settlements are currently balanced'}
            </p>
          </div>
        </div>

        {/* Breakdown sub-metrics */}
        <div className="mt-5 pt-4 border-t border-stone-800/80 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-2xl bg-stone-900/60 p-3 border border-stone-800/60">
            <div className="text-[11px] font-semibold text-stone-400">You Paid</div>
            <div className="text-sm sm:text-base font-bold text-stone-200 mt-0.5 font-mono">
              {formatPaise(totalPaidPaise, trip.currency)}
            </div>
          </div>

          <div className="rounded-2xl bg-stone-900/60 p-3 border border-stone-800/60">
            <div className="text-[11px] font-semibold text-stone-400">Your Share</div>
            <div className="text-sm sm:text-base font-bold text-stone-200 mt-0.5 font-mono">
              {formatPaise(totalOwedPaise, trip.currency)}
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-2xl bg-stone-900/60 p-3 border border-stone-800/60">
            <div className="text-[11px] font-semibold text-stone-400">Group Total</div>
            <div className="text-sm sm:text-base font-bold text-stone-200 mt-0.5 font-mono">
              {formatPaise(financials.totalSpentInPaise, trip.currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          id="home-add-expense-btn"
          onClick={onOpenAddExpense}
          className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-stone-950 font-bold text-sm shadow-md shadow-emerald-950/30 transition-all"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Add Expense</span>
        </button>

        <button
          id="home-settle-debts-btn"
          onClick={handleGoToBalances}
          className="flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-stone-800 hover:bg-stone-750 active:scale-[0.98] border border-stone-700 text-stone-200 font-bold text-sm transition-all"
        >
          <Scale size={18} className="text-emerald-400" />
          <span>Settle Debts</span>
        </button>
      </div>

      {/* Personal Settlement Action Cards (if any pending) */}
      {userRecommendations.length > 0 && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">
              Actionable Transfers
            </h2>
            <button
              onClick={handleGoToBalances}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300"
            >
              View all
            </button>
          </div>

          <div className="space-y-2">
            {userRecommendations.slice(0, 2).map((rec) => {
              const fromMember = trip.members.find((m) => m.id === rec.fromMemberId);
              const toMember = trip.members.find((m) => m.id === rec.toMemberId);
              const isPayer = rec.fromMemberId === currentUser?.id;

              return (
                <div
                  key={rec.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-850/80 border border-stone-750 gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MemberAvatar member={isPayer ? toMember : fromMember} size="sm" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-stone-200 truncate">
                        {isPayer ? `Pay ${toMember?.name}` : `${fromMember?.name} owes you`}
                      </div>
                      <div className="text-[11px] text-stone-400 font-mono">
                        {formatPaise(rec.remainingAmountInPaise, trip.currency)}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRecordPayment(rec.fromMemberId, rec.toMemberId, rec.remainingAmountInPaise)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-700 text-xs font-bold text-emerald-400 transition-colors"
                  >
                    Mark Paid
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Expense Timeline */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-stone-400">
              Recent Expenses ({trip.expenses.length})
            </h2>
          </div>
          <button
            onClick={() => onNavigateToTab ? onNavigateToTab('expenses') : undefined}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300"
          >
            <span>Timeline</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {recentExpenses.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-3xl bg-stone-850 border border-stone-800">
            <div className="w-12 h-12 rounded-2xl bg-stone-800 text-stone-400 mx-auto flex items-center justify-center mb-3">
              <Plus size={24} />
            </div>
            <div className="text-sm font-bold text-stone-200">No expenses recorded yet</div>
            <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
              Tap + Add Expense to record the first payment for this trip.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentExpenses.map((expense) => {
              const payerNames = expense.payers
                .map((p) => trip.members.find((m) => m.id === p.memberId)?.name || 'Someone')
                .join(', ');

              const participantCount = expense.participantIds.length;
              const isCurrentUserParticipant = expense.participantIds.includes(currentUserId);

              return (
                <div
                  key={expense.id}
                  onClick={() => handleViewExpense(expense)}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-850 hover:bg-stone-800/90 border border-stone-750 hover:border-stone-700 cursor-pointer transition-all active:scale-[0.99] gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <CategoryIcon category={expense.category} sizeVariant="md" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-stone-100 truncate">
                        {expense.title}
                      </div>
                      <div className="text-xs text-stone-400 flex items-center gap-1.5 mt-0.5">
                        <span>Paid by {payerNames}</span>
                        <span>•</span>
                        <span>{participantCount} people</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-extrabold text-stone-100 font-mono">
                      {formatPaise(expense.totalAmountInPaise, trip.currency)}
                    </div>
                    {isCurrentUserParticipant && (
                      <div className="text-[11px] text-stone-400">
                        Shared
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
