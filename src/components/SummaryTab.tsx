import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileJson,
  Upload,
  Users,
  Award,
  TrendingUp,
  Copy,
  Check,
} from 'lucide-react';
import { Trip, TripFinancialSummary, AppSettings, ExpenseCategory } from '../types';
import { saveTextFile, describeError } from '../utils/fileExport';
import { formatPaise } from '../engine/precision';
import { exportTrip, validateAndImportTrip } from '../storage/tripStorage';
import { CategoryIcon } from './CategoryIcon';
import { MemberAvatar } from './MemberAvatar';
import { CATEGORIES } from '../utils/categories';

interface SummaryTabProps {
  trip: Trip;
  financials: TripFinancialSummary;
  settings: AppSettings;
  onImportTrip: (importedTrip: Trip) => void;
  onOpenAddMember: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({
  trip,
  financials,
  settings,
  onImportTrip,
  onOpenAddMember,
  onShowToast,
}) => {
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Compute trip duration in days
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

  const averagePerDay = Math.round(financials.totalSpentInPaise / diffDays);
  const averagePerMember = trip.members.length > 0
    ? Math.round(financials.totalSpentInPaise / trip.members.length)
    : 0;

  const mostFrequentPayer = trip.members.find((m) => m.id === financials.mostFrequentPayerId);

  // Sort categories by spending descending
  const sortedCategories = (Object.entries(financials.categorySpending) as [ExpenseCategory, number][])
    .filter(([_, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1]);

  // Export as JSON file
  const handleExportJSON = async () => {
    const safeName = trip.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const fileName = `${safeName}-${new Date().getFullYear()}.json`;
    try {
      const { location } = await saveTextFile(fileName, exportTrip(trip), 'application/json');
      onShowToast(`Saved to ${location}`, 'success');
    } catch (error) {
      onShowToast(`Could not save ${fileName}. ${describeError(error)}`, 'error');
    }
  };

  // Export as CSV
  const handleExportCSV = async () => {
    const headers = ['Date', 'Title', 'Category', 'Total Amount', 'Paid By', 'Participants', 'Split Method', 'Notes'];
    const rows = trip.expenses.map((e) => {
      const payers = e.payers
        .map((p) => {
          const m = trip.members.find((mem) => mem.id === p.memberId);
          return `${m?.name || 'Unknown'}: ${formatPaise(p.amountInPaise, trip.currency)}`;
        })
        .join('; ');

      const participants = e.participantIds
        .map((pid) => trip.members.find((mem) => mem.id === pid)?.name || 'Unknown')
        .join(', ');

      return [
        `"${e.date}"`,
        `"${e.title.replace(/"/g, '""')}"`,
        `"${e.category}"`,
        `"${formatPaise(e.totalAmountInPaise, trip.currency)}"`,
        `"${payers}"`,
        `"${participants}"`,
        `"${e.splitMethod}"`,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const fileName = `${trip.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-ledger.csv`;
    try {
      const { location } = await saveTextFile(fileName, csvContent, 'text/csv');
      onShowToast(`Saved to ${location}`, 'success');
    } catch (error) {
      onShowToast(`Could not save ${fileName}. ${describeError(error)}`, 'error');
    }
  };

  // Copy text summary to clipboard
  const handleCopyTextSummary = () => {
    const lines = [
      `✈️ ${trip.name} — FairSplit Trip Summary`,
      `📅 ${trip.startDate} to ${trip.endDate} (${diffDays} days)`,
      `👥 ${trip.members.length} members • ${trip.expenses.length} expenses`,
      `💰 Total Spent: ${formatPaise(financials.totalSpentInPaise, trip.currency)}`,
      '',
      '--- MEMBER BALANCES ---',
      ...trip.members.map((m) => {
        const b = financials.memberBalances[m.id];
        const netStr = b ? formatPaise(b.netBalanceInPaise, trip.currency, { showSign: true }) : '0';
        return `• ${m.name}: Net ${netStr}`;
      }),
      '',
      '--- RECOMMENDED SETTLEMENTS ---',
      ...financials.recommendedSettlements.map((r) => {
        const from = trip.members.find((m) => m.id === r.fromMemberId)?.name;
        const to = trip.members.find((m) => m.id === r.toMemberId)?.name;
        const status = r.isFullySettled ? '✅ Paid' : '⏳ Pending';
        return `• ${from} ➡️ ${to}: ${formatPaise(r.originalAmountInPaise, trip.currency)} (${status})`;
      }),
      '',
      'Calculated with exact zero-drift integer paise by FairSplit.',
    ];

    const fullText = lines.join('\n');
    navigator.clipboard.writeText(fullText).then(() => {
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2000);
      onShowToast('Trip summary copied to clipboard!', 'success');
    });
  };

  // File import handler
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = validateAndImportTrip(content);
      if (res.success && res.trip) {
        onImportTrip(res.trip);
        onShowToast(`Successfully imported trip "${res.trip.name}"!`, 'success');
      } else {
        onShowToast(res.error || 'Failed to import trip', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-stone-100 tracking-tight">
          Trip Summary & Analytics
        </h1>
        <p className="text-xs text-stone-400 mt-0.5">
          Detailed metrics, spending categories, and sharing tools
        </p>
      </div>

      {/* 4-Stat Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750">
          <div className="text-[11px] font-semibold text-stone-400">Total Spending</div>
          <div className="text-lg font-bold text-stone-100 mt-1 font-mono">
            {formatPaise(financials.totalSpentInPaise, trip.currency)}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">{trip.expenses.length} expenses</div>
        </div>

        <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750">
          <div className="text-[11px] font-semibold text-stone-400">Daily Average</div>
          <div className="text-lg font-bold text-stone-100 mt-1 font-mono">
            {formatPaise(averagePerDay, trip.currency)}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">Across {diffDays} days</div>
        </div>

        <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750">
          <div className="text-[11px] font-semibold text-stone-400">Avg / Friend</div>
          <div className="text-lg font-bold text-stone-100 mt-1 font-mono">
            {formatPaise(averagePerMember, trip.currency)}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">{trip.members.length} members</div>
        </div>

        <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750">
          <div className="text-[11px] font-semibold text-stone-400">Outstanding</div>
          <div className="text-lg font-bold text-amber-400 mt-1 font-mono">
            {formatPaise(financials.totalUnsettledInPaise, trip.currency)}
          </div>
          <div className="text-[10px] text-stone-500 mt-0.5">
            {financials.isFullySettled ? '100% Settled' : 'Pending transfers'}
          </div>
        </div>
      </div>

      {/* Highlights (Biggest expense, top payer) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {financials.biggestExpense && (
          <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 flex items-center gap-3">
            <CategoryIcon category={financials.biggestExpense.category} sizeVariant="md" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-stone-400 flex items-center gap-1">
                <TrendingUp size={12} className="text-emerald-400" /> Biggest Expense
              </div>
              <div className="text-sm font-bold text-stone-100 truncate mt-0.5">
                {financials.biggestExpense.title}
              </div>
              <div className="text-xs font-mono font-semibold text-emerald-400">
                {formatPaise(financials.biggestExpense.totalAmountInPaise, trip.currency)}
              </div>
            </div>
          </div>
        )}

        {mostFrequentPayer && (
          <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 flex items-center gap-3">
            <MemberAvatar member={mostFrequentPayer} size="md" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold tracking-wider text-stone-400 flex items-center gap-1">
                <Award size={12} className="text-amber-400" /> Frequent Payer
              </div>
              <div className="text-sm font-bold text-stone-100 truncate mt-0.5">
                {mostFrequentPayer.name}
              </div>
              <div className="text-xs font-mono text-stone-400">
                Paid {formatPaise(financials.memberBalances[mostFrequentPayer.id]?.totalPaidInPaise || 0, trip.currency)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
          Spending by Category
        </h2>

        {sortedCategories.length === 0 ? (
          <div className="p-6 rounded-2xl bg-stone-850 text-center text-xs text-stone-400">
            No categorized spending recorded yet.
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-3">
            {sortedCategories.map(([categoryKey, amount]) => {
              const meta = CATEGORIES[categoryKey];
              const pct = financials.totalSpentInPaise > 0
                ? Math.round((amount / financials.totalSpentInPaise) * 100)
                : 0;

              return (
                <div key={categoryKey} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CategoryIcon category={categoryKey} sizeVariant="sm" />
                      <span className="font-semibold text-stone-200">{meta.label}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-stone-100">
                        {formatPaise(amount, trip.currency)}
                      </span>
                      <span className="text-stone-400 text-[11px] w-8 text-right">{pct}%</span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-stone-750 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, backgroundColor: meta.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Members List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
            <Users size={14} />
            <span>Trip Members ({trip.members.length})</span>
          </h2>
          <button
            onClick={onOpenAddMember}
            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            + Add Friend
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {trip.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2.5 p-3 rounded-2xl bg-stone-850 border border-stone-750"
            >
              <MemberAvatar member={m} size="sm" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-stone-200 truncate flex items-center gap-1">
                  <span>{m.name}</span>
                  {m.id === settings.currentUserId && (
                    <span className="text-[9px] font-extrabold text-emerald-400 uppercase">
                      (You)
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-stone-400 truncate">
                  {m.nickname || 'Member'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Export & Data Sharing Section */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
          Data Export & Offline Transfer
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Export JSON */}
          <button
            id="export-trip-json-btn"
            onClick={handleExportJSON}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-stone-850 hover:bg-stone-800 border border-stone-750 text-left transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <FileJson size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-200">Export Trip JSON</div>
              <div className="text-[11px] text-stone-400">Standalone file for transfer</div>
            </div>
          </button>

          {/* Export CSV */}
          <button
            id="export-trip-csv-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-stone-850 hover:bg-stone-800 border border-stone-750 text-left transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center flex-shrink-0">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <div className="text-xs font-bold text-stone-200">Export as CSV</div>
              <div className="text-[11px] text-stone-400">Spreadsheet table of expenses</div>
            </div>
          </button>

          {/* Copy Shareable Summary */}
          <button
            id="copy-trip-summary-btn"
            onClick={handleCopyTextSummary}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-stone-850 hover:bg-stone-800 border border-stone-750 text-left transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
              {copiedSummary ? <Check size={20} className="text-emerald-400" /> : <Copy size={20} />}
            </div>
            <div>
              <div className="text-xs font-bold text-stone-200">
                {copiedSummary ? 'Copied to Clipboard!' : 'Share Text Summary'}
              </div>
              <div className="text-[11px] text-stone-400">WhatsApp & chat breakdown</div>
            </div>
          </button>
        </div>

        {/* Import Single Trip JSON file */}
        <div className="pt-2">
          <label className="flex items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-stone-700 hover:border-emerald-500/50 bg-stone-850/50 hover:bg-stone-850 cursor-pointer text-xs font-semibold text-stone-300 transition-colors">
            <Upload size={16} className="text-emerald-400" />
            <span>Import another Trip (.json)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
