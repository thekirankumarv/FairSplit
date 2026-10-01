import React from 'react';
import { Home, ReceiptText, Plus, Scale, BarChart3, LucideIcon } from 'lucide-react';

export type NavigationTab = 'home' | 'expenses' | 'balances' | 'summary' | 'settings';

interface BottomNavProps {
  activeTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onAddExpenseClick: () => void;
  unsettledCount?: number;
}

interface TabDefinition {
  id: Exclude<NavigationTab, 'settings'>;
  label: string;
  icon: LucideIcon;
}

/**
 * Two tabs sit either side of the add button so it lands on the centre line.
 * Settings is deliberately not here; it opens from the toolbar instead.
 */
const LEFT_TABS: TabDefinition[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'expenses', label: 'Expenses', icon: ReceiptText },
];

const RIGHT_TABS: TabDefinition[] = [
  { id: 'balances', label: 'Balances', icon: Scale },
  { id: 'summary', label: 'Summary', icon: BarChart3 },
];

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onAddExpenseClick,
  unsettledCount = 0,
}) => {
  const renderTab = ({ id, label, icon: Icon }: TabDefinition) => {
    const isActive = activeTab === id;

    return (
      <button
        key={id}
        id={`tab-btn-${id}`}
        type="button"
        onClick={() => onTabChange(id)}
        aria-current={isActive ? 'page' : undefined}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-all ${
          isActive ? 'text-emerald-400 font-bold scale-105' : 'text-stone-400 hover:text-stone-200'
        }`}
      >
        <span className="relative">
          <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
          {id === 'balances' && unsettledCount > 0 && (
            <span
              className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-stone-900"
              aria-label={`${unsettledCount} unsettled`}
            />
          )}
        </span>
        <span className="text-[10px] mt-1 tracking-tight">{label}</span>
      </button>
    );
  };

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-40 bg-stone-900 border-t border-stone-800/90 pad-bar-bottom"
    >
      <div className="max-w-md mx-auto px-2 sm:px-4 py-2 flex items-center justify-between">
        {LEFT_TABS.map(renderTab)}

        <div className="flex flex-col items-center -mt-6 px-1 shrink-0">
          <button
            id="fab-add-expense"
            type="button"
            onClick={onAddExpenseClick}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-stone-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
            aria-label="Add expense"
            title="Add expense"
          >
            <Plus size={26} strokeWidth={2.8} />
          </button>
          <span className="text-[10px] mt-1 text-emerald-400 font-semibold tracking-tight">
            Add
          </span>
        </div>

        {RIGHT_TABS.map(renderTab)}
      </div>
    </nav>
  );
};
