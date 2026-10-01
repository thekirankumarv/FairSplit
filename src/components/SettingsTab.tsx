import React, { useEffect, useState } from 'react';
import {
  Download,
  Upload,
  Trash2,
  Sparkles,
  User,
  Plus,
  Check,
  AlertTriangle,
  Coins,
  HardDrive,
  Calendar,
} from 'lucide-react';
import { Trip, AppSettings, CurrencyCode, SUPPORTED_CURRENCIES } from '../types';
import { exportAllData, validateBackup } from '../storage/tripStorage';
import { saveTextFile, describeError } from '../utils/fileExport';
import { MemberAvatar } from './MemberAvatar';
import { ConfirmDialog } from './ConfirmDialog';
import { SampleBadge } from './SampleBadge';

interface SettingsTabProps {
  trips: Trip[];
  activeTrip: Trip | null;
  settings: AppSettings;
  onSelectTrip: (tripId: string) => void;
  onOpenCreateTrip: () => void;
  onDeleteTrip: (tripId: string) => void;
  onRenameMember: (memberId: string, name: string) => void;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onRestoreBackup: (state: unknown, mode: 'replace' | 'merge') => void;
  onResetAllData: () => void;
  onOpenDiagnostics: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  trips,
  activeTrip,
  settings,
  onSelectTrip,
  onOpenCreateTrip,
  onDeleteTrip,
  onRenameMember,
  onUpdateSettings,
  onRestoreBackup,
  onResetAllData,
  onOpenDiagnostics,
  onShowToast,
}) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [tripPendingDelete, setTripPendingDelete] = useState<Trip | null>(null);

  const currentMember =
    activeTrip?.members.find((m) => m.id === settings.currentUserId) ?? null;
  const [nameDraft, setNameDraft] = useState(currentMember?.name ?? '');

  // Follow the selection when the user switches persona or trip.
  useEffect(() => {
    setNameDraft(currentMember?.name ?? '');
  }, [currentMember?.id, currentMember?.name]);

  const trimmedName = nameDraft.trim();
  const isNameDirty = Boolean(currentMember) && trimmedName !== '' && trimmedName !== currentMember?.name;

  const commitName = () => {
    if (!currentMember || !isNameDirty) {
      setNameDraft(currentMember?.name ?? '');
      return;
    }
    onRenameMember(currentMember.id, trimmedName);
    onShowToast(`You are now shown as "${trimmedName}"`, 'success');
  };
  const [pendingBackupState, setPendingBackupState] = useState<unknown | null>(null);
  const [showBackupModal, setShowBackupModal] = useState(false);

  // Export full backup
  const handleExportAllBackup = async () => {
    const jsonStr = exportAllData({
      activeTripId: activeTrip?.id || null,
      trips,
      settings,
    });
    const fileName = `fairsplit-backup-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      const { location } = await saveTextFile(fileName, jsonStr, 'application/json');
      onShowToast(`Backup saved to ${location}`, 'success');
    } catch (error) {
      onShowToast(`Could not save ${fileName}. ${describeError(error)}`, 'error');
    }
  };

  // Import full backup file
  const handleFileBackupChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = validateBackup(content);
      if (res.success && res.state) {
        setPendingBackupState(res.state);
        setShowBackupModal(true);
      } else {
        onShowToast(res.error || 'Invalid backup file', 'error');
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
          Settings & Local Storage
        </h1>
        <p className="text-xs text-stone-400 mt-0.5">
          Device ownership, backups, and user identity
        </p>
      </div>

      {/* 1. Current User Identity ("Who are you?") */}
      {activeTrip && (
        <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-3">
          <div className="flex items-center gap-2">
            <User size={16} className="text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Your Persona ({activeTrip.name})
            </h2>
          </div>
          <p className="text-xs text-stone-400">
            Pick who is holding this device, then set the name you want shown for yourself.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {activeTrip.members.map((m) => {
              const isSelected = settings.currentUserId === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => onUpdateSettings({ currentUserId: m.id })}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-emerald-500/20 border-emerald-500/50 ring-1 ring-emerald-500/30 text-emerald-300 font-bold'
                      : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                  }`}
                >
                  <MemberAvatar member={m} size="xs" />
                  <span className="text-xs truncate">{m.name}</span>
                  {isSelected && <Check size={14} className="ml-auto text-emerald-400 flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {currentMember && (
            <div className="pt-1 space-y-1.5">
              <label
                htmlFor="display-name-input"
                className="block text-[11px] font-semibold text-stone-400"
              >
                Your display name
              </label>
              <div className="flex gap-2">
                <input
                  id="display-name-input"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitName();
                    }
                  }}
                  onBlur={commitName}
                  maxLength={40}
                  placeholder="Enter your name"
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-stone-900 border border-stone-700 text-xs text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-emerald-500/60"
                />
                <button
                  type="button"
                  onClick={commitName}
                  disabled={!isNameDirty}
                  className="shrink-0 px-3 py-2 rounded-xl bg-emerald-500 text-stone-950 text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
              <p className="text-[10px] text-stone-500">
                This renames {currentMember.name} everywhere in this trip.
              </p>
            </div>
          )}
        </div>
      )}

      {/* 2. Currency Setting */}
      <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-3">
        <div className="flex items-center gap-2">
          <Coins size={16} className="text-emerald-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
            Default Currency
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(SUPPORTED_CURRENCIES) as CurrencyCode[]).map((code) => {
            const config = SUPPORTED_CURRENCIES[code];
            const isSelected = settings.defaultCurrency === code;
            return (
              <button
                key={code}
                onClick={() => onUpdateSettings({ defaultCurrency: code })}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                    : 'bg-stone-900 border-stone-800 text-stone-300 hover:bg-stone-800'
                }`}
              >
                <div className="text-left">
                  <div className="text-xs font-bold">{config.symbol} {config.code}</div>
                  <div className="text-[10px] text-stone-400">{config.minorUnitName}</div>
                </div>
                {isSelected && <Check size={14} className="text-emerald-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Trip Manager */}
      <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-emerald-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Manage Trips ({trips.length})
            </h2>
          </div>
          <button
            onClick={onOpenCreateTrip}
            className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <Plus size={14} />
            <span>New Trip</span>
          </button>
        </div>

        <div className="space-y-2">
          {trips.map((t) => {
            const isActive = t.id === activeTrip?.id;
            return (
              <div
                key={t.id}
                className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-stone-100'
                    : 'bg-stone-900 border-stone-800 text-stone-300'
                }`}
              >
                <div
                  onClick={() => onSelectTrip(t.id)}
                  className="cursor-pointer min-w-0 flex-1"
                >
                  <div className="text-xs font-bold truncate flex items-center gap-1.5">
                    <span className="truncate">{t.name}</span>
                    {t.isSample && <SampleBadge />}
                    {isActive && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 uppercase">
                        Active
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">
                    {t.startDate} • {t.members.length} members • {t.expenses.length} expenses
                  </div>
                </div>

                {t.isSample ? (
                  <span
                    className="text-[9px] text-stone-500 ml-2 shrink-0"
                    title="The example trip cannot be deleted"
                  >
                    Kept
                  </span>
                ) : (
                  <button
                    onClick={() => setTripPendingDelete(t)}
                    className="p-1.5 rounded-lg text-stone-500 hover:text-rose-400 hover:bg-stone-800 transition-colors ml-2 shrink-0"
                    title={`Delete ${t.name}`}
                    aria-label={`Delete ${t.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Device Storage & Backup */}
      <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 space-y-3">
        <div className="flex items-center gap-2">
          <HardDrive size={16} className="text-emerald-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-stone-400">
            Device Storage & Backups
          </h2>
        </div>

        <p className="text-xs text-stone-400 leading-relaxed">
          Your trip data is stored on this device. Create periodic JSON backups to preserve your data across browser cache refreshes or when transferring between devices.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={handleExportAllBackup}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-xs font-bold text-stone-200 transition-colors"
          >
            <Download size={15} className="text-emerald-400" />
            <span>Export All Data Backup</span>
          </button>

          <label className="flex items-center justify-center gap-2 p-3 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-xs font-bold text-stone-200 cursor-pointer transition-colors">
            <Upload size={15} className="text-blue-400" />
            <span>Import Backup (.json)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileBackupChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* 5. Precision Diagnostics */}
      <div className="p-4 rounded-2xl bg-stone-850 border border-stone-750 flex items-center justify-between">
        <div>
          <div className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
            <Sparkles size={14} className="text-emerald-400" />
            <span>Zero-Drift Engine Verification</span>
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Run automated mathematical conservation tests in real time
          </div>
        </div>
        <button
          onClick={onOpenDiagnostics}
          className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-colors"
        >
          Run Tests
        </button>
      </div>

      {/* 6. Dangerous Action: Reset All Data */}
      <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40 space-y-2">
        <div className="flex items-center gap-2 text-rose-400">
          <AlertTriangle size={16} />
          <h2 className="text-xs font-bold uppercase tracking-wider">
            Reset All Local Data
          </h2>
        </div>
        <p className="text-xs text-stone-400">
          This permanently removes all locally stored trips and expenses from this device.
        </p>

        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-colors"
          >
            Reset All Device Data
          </button>
        ) : (
          <div className="p-3 rounded-xl bg-stone-900 border border-rose-500/50 space-y-2">
            <div className="text-xs font-bold text-rose-300">
              Are you sure? This cannot be undone.
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onResetAllData();
                  setShowResetConfirm(false);
                  onShowToast('All local data has been reset to defaults', 'info');
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors"
              >
                Yes, Delete All
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={tripPendingDelete !== null}
        destructive
        title="Delete trip"
        message={
          <>
            <span className="font-semibold text-stone-100">{tripPendingDelete?.name}</span> and its{' '}
            {tripPendingDelete?.expenses.length ?? 0} expenses will be removed from this device.
            This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={() => {
          if (tripPendingDelete) {
            onDeleteTrip(tripPendingDelete.id);
            onShowToast(`Deleted trip "${tripPendingDelete.name}"`, 'info');
          }
          setTripPendingDelete(null);
        }}
        onCancel={() => setTripPendingDelete(null)}
      />

      {/* Backup Import Confirmation Modal (Replace vs Merge vs Cancel) */}
      {Boolean(showBackupModal && pendingBackupState) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pad-overlay bg-stone-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-stone-900 border border-stone-750 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-stone-100">
              <Upload size={18} className="text-emerald-400" />
              <h3 className="text-sm font-bold">Import Backup File</h3>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed">
              How would you like to restore this backup?
            </p>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  onRestoreBackup(pendingBackupState, 'merge');
                  setShowBackupModal(false);
                  setPendingBackupState(null);
                  onShowToast('Backup merged with existing trips', 'success');
                }}
                className="w-full p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold transition-colors"
              >
                Merge with Existing Data
              </button>

              <button
                onClick={() => {
                  onRestoreBackup(pendingBackupState, 'replace');
                  setShowBackupModal(false);
                  setPendingBackupState(null);
                  onShowToast('Existing data replaced with backup', 'success');
                }}
                className="w-full p-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 border border-stone-700 text-xs font-bold text-amber-300 transition-colors"
              >
                Replace All Existing Data
              </button>

              <button
                onClick={() => {
                  setShowBackupModal(false);
                  setPendingBackupState(null);
                }}
                className="w-full p-2.5 rounded-xl bg-transparent hover:bg-stone-800 text-stone-400 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
