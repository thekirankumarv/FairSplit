import React, { useState, useMemo } from 'react';
import { Search, Filter, Calendar, X } from 'lucide-react';
import { Trip, Expense, ExpenseCategory, AppSettings } from '../types';
import { formatPaise } from '../engine/precision';
import { calculateExpenseParticipantShares, calculateExpensePayerContributions } from '../engine/calculationEngine';
import { CategoryIcon } from './CategoryIcon';
import { MemberAvatar } from './MemberAvatar';
import { CATEGORIES } from '../utils/categories';

interface ExpensesTabProps {
  trip: Trip;
  currentUserId?: string;
  settings?: AppSettings;
  onOpenAddExpense: () => void;
  onViewExpenseDetail?: (expense: Expense) => void;
  onSelectExpense?: (expense: Expense) => void;
}

export const ExpensesTab: React.FC<ExpensesTabProps> = ({
  trip,
  currentUserId: propUserId,
  settings,
  onViewExpenseDetail,
  onSelectExpense,
}) => {
  const currentUserId = propUserId || settings?.currentUserId || trip.members[0]?.id || '';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMember, setSelectedMember] = useState<string>('all');

  const handleSelectExpense = (expense: Expense) => {
    if (onSelectExpense) onSelectExpense(expense);
    else if (onViewExpenseDetail) onViewExpenseDetail(expense);
  };

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return trip.expenses.filter((exp) => {
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = exp.title.toLowerCase().includes(query);
        const matchesNotes = exp.notes?.toLowerCase().includes(query);
        const matchesPayer = exp.payers.some((p) => {
          const m = trip.members.find((member) => member.id === p.memberId);
          return m?.name.toLowerCase().includes(query);
        });
        if (!matchesTitle && !matchesNotes && !matchesPayer) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && exp.category !== selectedCategory) {
        return false;
      }

      // Member filter
      if (selectedMember !== 'all') {
        const isPayer = exp.payers.some((p) => p.memberId === selectedMember);
        const isParticipant = exp.participantIds.includes(selectedMember);
        if (!isPayer && !isParticipant) return false;
      }

      return true;
    });
  }, [trip.expenses, trip.members, searchQuery, selectedCategory, selectedMember]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, Expense[]> = {};
    const sorted = [...filteredExpenses].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    for (const exp of sorted) {
      const dateKey = exp.date;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(exp);
    }
    return groups;
  }, [filteredExpenses]);

  const categoriesList = Object.keys(CATEGORIES) as ExpenseCategory[];

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Search Bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          id="expense-search-input"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search expenses by title, note, payer..."
          className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-stone-850 border border-stone-750 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 p-0.5"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Filter Chips: Category & Member */}
      <div className="space-y-2">
        {/* Horizontal Category Scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors border ${
              selectedCategory === 'all'
                ? 'bg-emerald-500 text-stone-950 border-emerald-400 font-bold'
                : 'bg-stone-850 text-stone-300 border-stone-750 hover:bg-stone-800'
            }`}
          >
            All Categories
          </button>
          {categoriesList.map((catKey) => {
            const cat = CATEGORIES[catKey];
            const isSelected = selectedCategory === catKey;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(isSelected ? 'all' : catKey)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors border ${
                  isSelected
                    ? 'bg-emerald-500 text-stone-950 border-emerald-400 font-bold'
                    : 'bg-stone-850 text-stone-300 border-stone-750 hover:bg-stone-800'
                }`}
              >
                <CategoryIcon category={catKey} showBackground={false} size={12} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Member filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-stone-500 pl-1">
            Filter:
          </span>
          <button
            onClick={() => setSelectedMember('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedMember === 'all'
                ? 'bg-stone-700 text-stone-100 font-bold'
                : 'bg-stone-850 text-stone-400 hover:text-stone-200'
            }`}
          >
            Everyone
          </button>
          <button
            onClick={() => setSelectedMember(currentUserId)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedMember === currentUserId
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                : 'bg-stone-850 text-stone-400 hover:text-stone-200'
            }`}
          >
            You Only
          </button>
          {trip.members.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelectedMember(selectedMember === m.id ? 'all' : m.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors ${
                selectedMember === m.id
                  ? 'bg-stone-700 text-stone-100 font-bold ring-1 ring-white/20'
                  : 'bg-stone-850 text-stone-400 hover:text-stone-200'
              }`}
            >
              <MemberAvatar member={m} size="xs" />
              <span>{m.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline List */}
      {Object.keys(groupedByDate).length === 0 ? (
        <div className="text-center py-12 px-4 rounded-3xl bg-stone-850 border border-stone-800">
          <div className="w-12 h-12 rounded-2xl bg-stone-800 text-stone-400 mx-auto flex items-center justify-center mb-3">
            <Filter size={22} />
          </div>
          <div className="text-sm font-bold text-stone-200">No matching expenses</div>
          <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
            Try resetting your search query or filters.
          </p>
          {(searchQuery || selectedCategory !== 'all' || selectedMember !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setSelectedMember('all');
              }}
              className="mt-3 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-emerald-400 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedByDate).map(([dateStr, expenses]) => {
            const dateObj = new Date(dateStr);
            const dateFormatted = isNaN(dateObj.getTime())
              ? dateStr
              : dateObj.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                });

            const dayTotalPaise = expenses.reduce((acc, e) => acc + e.totalAmountInPaise, 0);

            return (
              <div key={dateStr} className="space-y-2">
                {/* Date Header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-stone-400">
                    <Calendar size={13} className="text-stone-500" />
                    <span>{dateFormatted}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-stone-500">
                    {formatPaise(dayTotalPaise, trip.currency)}
                  </span>
                </div>

                {/* Expenses on this day */}
                <div className="space-y-2">
                  {expenses.map((expense) => {
                    const payerContributions = calculateExpensePayerContributions(expense);
                    const participantShares = calculateExpenseParticipantShares(expense);

                    const userPaid = payerContributions[currentUserId] || 0;
                    const userShare = participantShares[currentUserId] || 0;
                    const userNetImpact = userPaid - userShare;

                    const primaryPayerId = expense.payers[0]?.memberId;
                    const primaryPayer = trip.members.find((m) => m.id === primaryPayerId);
                    const multiplePayers = expense.payers.length > 1;

                    return (
                      <div
                        key={expense.id}
                        onClick={() => handleSelectExpense(expense)}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-850 hover:bg-stone-800/90 border border-stone-750 hover:border-stone-700 cursor-pointer transition-all active:scale-[0.99] gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <CategoryIcon category={expense.category} sizeVariant="md" />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-stone-100 truncate flex items-center gap-1.5">
                              <span className="truncate">{expense.title}</span>
                              {expense.splitMethod === 'ITEMIZED' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300">
                                  Itemized
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-stone-400 flex items-center gap-1.5 mt-0.5">
                              <div className="flex items-center gap-1">
                                <MemberAvatar member={primaryPayer} size="xs" />
                                <span>
                                  {multiplePayers
                                    ? `${primaryPayer?.name} +${expense.payers.length - 1}`
                                    : primaryPayer?.name || 'Someone'}
                                </span>
                              </div>
                              <span>•</span>
                              <span>{expense.participantIds.length} split</span>
                            </div>
                          </div>
                        </div>

                        {/* Amount & User Impact */}
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-extrabold text-stone-100 font-mono">
                            {formatPaise(expense.totalAmountInPaise, trip.currency)}
                          </div>

                          {/* Personal Impact */}
                          {userShare > 0 || userPaid > 0 ? (
                            <div className="text-[11px] font-mono mt-0.5">
                              {userNetImpact > 0 ? (
                                <span className="text-emerald-400 font-semibold">
                                  +{formatPaise(userNetImpact, trip.currency)}
                                </span>
                              ) : userNetImpact < 0 ? (
                                <span className="text-amber-400 font-semibold">
                                  {formatPaise(userNetImpact, trip.currency)}
                                </span>
                              ) : (
                                <span className="text-stone-400">
                                  Share: {formatPaise(userShare, trip.currency)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-stone-500">Not involved</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
