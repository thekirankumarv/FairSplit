import React from 'react';
import { ChevronDown, ShieldCheck, Plus, BadgeCheck, Settings } from 'lucide-react';
import { Trip } from '../types';
import { Logo } from './Logo';

interface NavbarProps {
  allTrips: Trip[];
  activeTrip: Trip | null;
  onSelectTrip: (tripId: string) => void;
  onOpenCreateTrip: () => void;
  onOpenAddExpense?: () => void;
  onOpenDiagnostics: () => void;
  onOpenSettings: () => void;
  /** Highlights the settings button while the settings tab is open. */
  isSettingsActive?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  allTrips,
  activeTrip,
  onSelectTrip,
  onOpenCreateTrip,
  onOpenDiagnostics,
  onOpenSettings,
  isSettingsActive = false,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 w-full bg-stone-900 border-b border-stone-800/80 select-none pad-screen-x pad-bar-top">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand + Active Trip Selector */}
        <div className="flex items-center gap-2 relative">
          <Logo size={32} />

          <div className="relative">
            <button
              id="trip-selector-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-800/80 hover:bg-stone-800 border border-stone-700/60 transition-colors text-left"
            >
              <div className="max-w-[140px] sm:max-w-[200px]">
                <div className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold leading-tight">
                  Active Trip
                </div>
                <div className="text-xs sm:text-sm font-bold text-stone-100 truncate">
                  {activeTrip ? activeTrip.name : 'Select Trip'}
                </div>
              </div>
              <ChevronDown size={14} className={`text-stone-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-stone-800 border border-stone-700 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 text-[11px] font-semibold text-stone-400 uppercase tracking-wider border-b border-stone-700/50">
                    Switch Trip ({allTrips.length})
                  </div>
                  <div className="max-h-56 overflow-y-auto py-1">
                    {allTrips.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          onSelectTrip(t.id);
                          setDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-left transition-colors ${
                          t.id === activeTrip?.id
                            ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                            : 'text-stone-200 hover:bg-stone-700/60'
                        }`}
                      >
                        <div className="truncate">
                          <div>{t.name}</div>
                          <div className="text-[10px] text-stone-400 font-normal">
                            {t.members.length} members • {t.expenses.length} expenses
                          </div>
                        </div>
                        {t.id === activeTrip?.id && (
                          <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="pt-1 border-t border-stone-700/50">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenCreateTrip();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                    >
                      <Plus size={14} />
                      <span>Create New Trip</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Status Pill & Diagnostics button */}
        <div className="flex items-center gap-2">
          {/* Engine Invariant Test shortcut */}
          <button
            id="diagnostics-btn"
            onClick={onOpenDiagnostics}
            title="Inspect 0-Drift Financial Integrity Engine"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-800/80 hover:bg-stone-800 border border-stone-700/60 text-[11px] font-semibold text-emerald-400 transition-colors"
          >
            <BadgeCheck size={13} className="text-emerald-400" />
            <span>0-Drift Verified</span>
          </button>

          {/* Device safety badge */}
          <div
            id="device-safe-badge"
            title="All transactions processed and stored safely on this device"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-stone-800/50 border border-stone-800 text-[11px] font-medium text-stone-400"
          >
            <ShieldCheck size={13} className="text-emerald-400" />
            <span className="hidden md:inline">Device Storage</span>
          </div>

          {/* Settings shortcut button */}
          <button
            id="navbar-settings-btn"
            onClick={onOpenSettings}
            title="Settings and backups"
            aria-label="Settings and backups"
            aria-pressed={isSettingsActive}
            className={`p-2 rounded-xl border transition-colors ${
              isSettingsActive
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-stone-800/80 hover:bg-stone-800 border-stone-700/60 text-stone-300'
            }`}
          >
            <Settings size={15} />
          </button>
        </div>
      </div>
    </header>
  );
};
