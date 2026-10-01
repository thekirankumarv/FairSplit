import { useState, useMemo, useRef } from 'react';
import {
  Trip,
  Expense,
  Member,
  SettlementPayment,
  AppSettings,
  TripFinancialSummary,
} from './types';
import {
  loadAppState,
  saveAppState,
  getActiveTrip,
  resetAppState,
} from './storage/tripStorage';
import { calculateTripFinancials } from './engine/calculationEngine';

// Components
import { Navbar } from './components/Navbar';
import { BottomNav, NavigationTab } from './components/BottomNav';
import { HomeTab } from './components/HomeTab';
import { ExpensesTab } from './components/ExpensesTab';
import { BalancesTab } from './components/BalancesTab';
import { SummaryTab } from './components/SummaryTab';
import { SettingsTab } from './components/SettingsTab';
import { Toast, ToastState } from './components/Toast';

// Modals
import { ExpenseModal } from './components/ExpenseModal';
import { ExpenseDetailModal } from './components/ExpenseDetailModal';
import { RecordPaymentModal } from './components/RecordPaymentModal';
import { CreateTripModal } from './components/CreateTripModal';
import { AddMemberModal } from './components/AddMemberModal';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { ConfirmDialog } from './components/ConfirmDialog';

export default function App() {
  // 1. Core State
  const [appState, setAppState] = useState(() => loadAppState());
  const [activeTab, setActiveTab] = useState<NavigationTab>('home');
  const [toast, setToast] = useState<ToastState | null>(null);

  // Undo delete buffer for expenses
  const undoExpenseRef = useRef<{ expense: Expense; tripId: string } | null>(null);

  // Active Trip resolution
  const activeTrip = useMemo(() => {
    return getActiveTrip(appState);
  }, [appState]);

  // Derived Financial Summary from Pure Calculation Engine (Single source of truth)
  const financials: TripFinancialSummary | null = useMemo(() => {
    if (!activeTrip) return null;
    return calculateTripFinancials(activeTrip);
  }, [activeTrip]);

  // 2. Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [selectedDetailExpense, setSelectedDetailExpense] = useState<Expense | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentPreset, setPaymentPreset] = useState<{
    fromId?: string;
    toId?: string;
    maxAmount?: number;
  }>({});

  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [tripPendingDelete, setTripPendingDelete] = useState<Trip | null>(null);

  // Helper to show toasts
  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info',
    actionLabel?: string,
    onAction?: () => void
  ) => {
    setToast({ message, type, actionLabel, onAction });
  };

  // Helper to persist state updates
  const updateState = (updater: (prev: typeof appState) => typeof appState) => {
    setAppState((prev) => {
      const next = updater(prev);
      saveAppState(next);
      return next;
    });
  };

  // 3. Expense Actions
  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (expense: Expense) => {
    setSelectedDetailExpense(null);
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const handleDuplicateExpense = (expense: Expense) => {
    setSelectedDetailExpense(null);
    const duplicated: Expense = {
      ...expense,
      id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `${expense.title} (Copy)`,
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setEditingExpense(duplicated);
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = (expense: Expense) => {
    if (!activeTrip) return;

    const existingIdx = activeTrip.expenses.findIndex((e) => e.id === expense.id);
    let updatedExpenses: Expense[];
    if (existingIdx >= 0) {
      updatedExpenses = [...activeTrip.expenses];
      updatedExpenses[existingIdx] = expense;
      showToast(`Updated "${expense.title}"`, 'success');
    } else {
      updatedExpenses = [expense, ...activeTrip.expenses];
      showToast(`Added "${expense.title}"`, 'success');
    }

    const updatedTrip: Trip = {
      ...activeTrip,
      expenses: updatedExpenses,
      updatedAt: new Date().toISOString(),
    };

    updateState((prev) => {
      const trips = prev.trips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t));
      return { ...prev, trips };
    });
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (!activeTrip) return;
    const target = activeTrip.expenses.find((e) => e.id === expenseId);
    if (!target) return;

    undoExpenseRef.current = { expense: target, tripId: activeTrip.id };

    const updatedExpenses = activeTrip.expenses.filter((e) => e.id !== expenseId);
    const updatedTrip: Trip = {
      ...activeTrip,
      expenses: updatedExpenses,
      updatedAt: new Date().toISOString(),
    };

    updateState((prev) => {
      const trips = prev.trips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t));
      return { ...prev, trips };
    });

    showToast(`Deleted "${target.title}"`, 'info', 'Undo', handleUndoDeleteExpense);
  };

  const handleUndoDeleteExpense = () => {
    const item = undoExpenseRef.current;
    if (!item) return;

    updateState((prev) => {
      const targetTrip = prev.trips.find((t) => t.id === item.tripId);
      if (!targetTrip) return prev;
      const updatedExpenses = [item.expense, ...targetTrip.expenses];
      const trips = prev.trips.map((t) =>
        t.id === item.tripId ? { ...t, expenses: updatedExpenses } : t
      );
      return { ...prev, trips };
    });

    undoExpenseRef.current = null;
    showToast(`Restored "${item.expense.title}"`, 'success');
  };

  // 4. Settlement Actions
  const handleOpenRecordPayment = (fromId?: string, toId?: string, maxAmount?: number) => {
    setPaymentPreset({ fromId, toId, maxAmount });
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = (payment: SettlementPayment) => {
    if (!activeTrip) return;

    const updatedTrip: Trip = {
      ...activeTrip,
      settlements: [payment, ...activeTrip.settlements],
      updatedAt: new Date().toISOString(),
    };

    updateState((prev) => {
      const trips = prev.trips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t));
      return { ...prev, trips };
    });

    showToast('Settlement payment recorded', 'success');
  };

  const handleDeleteSettlement = (settlementId: string) => {
    if (!activeTrip) return;

    const updatedTrip: Trip = {
      ...activeTrip,
      settlements: activeTrip.settlements.filter((s) => s.id !== settlementId),
      updatedAt: new Date().toISOString(),
    };

    updateState((prev) => {
      const trips = prev.trips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t));
      return { ...prev, trips };
    });

    showToast('Payment record removed', 'info');
  };

  const handleMarkAllSettled = () => {
    if (!activeTrip || !financials) return;

    const newPayments: SettlementPayment[] = [];
    const now = new Date().toISOString();

    for (const rec of financials.recommendedSettlements) {
      if (!rec.isFullySettled && rec.remainingAmountInPaise > 0) {
        newPayments.push({
          id: `settle-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          tripId: activeTrip.id,
          fromMemberId: rec.fromMemberId,
          toMemberId: rec.toMemberId,
          amountInPaise: rec.remainingAmountInPaise,
          notes: 'Full balance settled',
          paidAt: now,
        });
      }
    }

    if (newPayments.length === 0) return;

    const updatedTrip: Trip = {
      ...activeTrip,
      settlements: [...newPayments, ...activeTrip.settlements],
      updatedAt: now,
    };

    updateState((prev) => {
      const trips = prev.trips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t));
      return { ...prev, trips };
    });

    showToast('All recommended debts marked as settled!', 'success');
  };

  // 5. Trip Management Actions
  const handleSelectTrip = (tripId: string) => {
    updateState((prev) => ({
      ...prev,
      activeTripId: tripId,
    }));
  };

  const handleCreateTrip = (newTrip: Trip) => {
    updateState((prev) => ({
      ...prev,
      trips: [newTrip, ...prev.trips],
      activeTripId: newTrip.id,
      settings: {
        ...prev.settings,
        currentUserId: newTrip.members[0]?.id || prev.settings.currentUserId,
      },
    }));
    setActiveTab('home');
    showToast(`Trip "${newTrip.name}" created!`, 'success');
  };

  const handleDeleteTrip = (tripId: string) => {
    updateState((prev) => {
      const trips = prev.trips.filter((t) => t.id !== tripId);
      const activeTripId =
        prev.activeTripId === tripId ? (trips[0] ? trips[0].id : null) : prev.activeTripId;
      return { ...prev, trips, activeTripId };
    });
  };

  const handleRenameMember = (memberId: string, name: string) => {
    if (!activeTrip) return;

    const updatedTrip: Trip = {
      ...activeTrip,
      members: activeTrip.members.map((m) => (m.id === memberId ? { ...m, name } : m)),
      updatedAt: new Date().toISOString(),
    };

    updateState((prev) => ({
      ...prev,
      trips: prev.trips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t)),
    }));
  };

  const handleAddMember = (newMember: Member) => {
    if (!activeTrip) return;

    const updatedTrip: Trip = {
      ...activeTrip,
      members: [...activeTrip.members, newMember],
      updatedAt: new Date().toISOString(),
    };

    updateState((prev) => {
      const trips = prev.trips.map((t) => (t.id === updatedTrip.id ? updatedTrip : t));
      return { ...prev, trips };
    });

    showToast(`Added ${newMember.name} to "${activeTrip.name}"`, 'success');
  };

  const handleImportTrip = (importedTrip: Trip) => {
    updateState((prev) => {
      // If trip already exists by ID, update it; otherwise append
      const existingIdx = prev.trips.findIndex((t) => t.id === importedTrip.id);
      let trips: Trip[];
      if (existingIdx >= 0) {
        trips = [...prev.trips];
        trips[existingIdx] = importedTrip;
      } else {
        trips = [importedTrip, ...prev.trips];
      }
      return {
        ...prev,
        trips,
        activeTripId: importedTrip.id,
      };
    });
    setActiveTab('home');
  };

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    updateState((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings },
    }));
  };

  const handleRestoreBackup = (rawBackup: any, mode: 'replace' | 'merge') => {
    if (mode === 'replace') {
      saveAppState(rawBackup);
      setAppState(rawBackup);
    } else {
      updateState((prev) => {
        const mergedTrips = [...prev.trips];
        for (const trip of rawBackup.trips || []) {
          if (!mergedTrips.some((t) => t.id === trip.id)) {
            mergedTrips.push(trip);
          }
        }
        return {
          ...prev,
          trips: mergedTrips,
        };
      });
    }
  };

  const handleResetAllData = () => {
    const fresh = resetAppState();
    setAppState(fresh);
    setActiveTab('home');
  };

  if (!activeTrip || !financials) {
    return (
      <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <h1 className="text-xl font-bold">No Trips Found</h1>
          <p className="text-xs text-stone-400">Create a new short trip to get started.</p>
          <button
            onClick={() => setIsCreateTripOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-stone-950 font-bold text-xs"
          >
            Create Trip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col antialiased selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Navigation Bar */}
      <Navbar
        activeTrip={activeTrip}
        allTrips={appState.trips}
        onSelectTrip={handleSelectTrip}
        onOpenCreateTrip={() => setIsCreateTripOpen(true)}
        onOpenAddExpense={handleOpenAddExpense}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        onOpenSettings={() => setActiveTab('settings')}
        onDeleteTrip={setTripPendingDelete}
        isSettingsActive={activeTab === 'settings'}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-2xl mx-auto pt-4 pad-screen-x pb-bottom-nav">
        {activeTab === 'home' && (
          <HomeTab
            trip={activeTrip}
            financials={financials}
            settings={appState.settings}
            onOpenAddExpense={handleOpenAddExpense}
            onOpenBalances={() => setActiveTab('balances')}
            onOpenRecordPayment={handleOpenRecordPayment}
            onSelectExpense={(exp) => setSelectedDetailExpense(exp)}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesTab
            trip={activeTrip}
            settings={appState.settings}
            onOpenAddExpense={handleOpenAddExpense}
            onSelectExpense={(exp) => setSelectedDetailExpense(exp)}
          />
        )}

        {activeTab === 'balances' && (
          <BalancesTab
            trip={activeTrip}
            financials={financials}
            settings={appState.settings}
            onOpenRecordPayment={handleOpenRecordPayment}
            onDeleteSettlement={handleDeleteSettlement}
            onMarkAllSettled={handleMarkAllSettled}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryTab
            trip={activeTrip}
            financials={financials}
            settings={appState.settings}
            onImportTrip={handleImportTrip}
            onOpenAddMember={() => setIsAddMemberOpen(true)}
            onShowToast={showToast}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            trips={appState.trips}
            activeTrip={activeTrip}
            settings={appState.settings}
            onSelectTrip={handleSelectTrip}
            onOpenCreateTrip={() => setIsCreateTripOpen(true)}
            onDeleteTrip={handleDeleteTrip}
            onRenameMember={handleRenameMember}
            onUpdateSettings={handleUpdateSettings}
            onRestoreBackup={handleRestoreBackup}
            onResetAllData={handleResetAllData}
            onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
            onShowToast={showToast}
          />
        )}
      </main>

      {/* Floating Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onAddExpenseClick={handleOpenAddExpense}
      />

      {/* Modals */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        trip={activeTrip}
        currentUserId={appState.settings.currentUserId}
        initialExpense={editingExpense}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSave={handleSaveExpense}
      />

      <ExpenseDetailModal
        isOpen={Boolean(selectedDetailExpense)}
        expense={selectedDetailExpense}
        trip={activeTrip}
        currentUserId={appState.settings.currentUserId}
        onClose={() => setSelectedDetailExpense(null)}
        onEdit={handleOpenEditExpense}
        onDuplicate={handleDuplicateExpense}
        onDelete={handleDeleteExpense}
      />

      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        trip={activeTrip}
        initialFromMemberId={paymentPreset.fromId}
        initialToMemberId={paymentPreset.toId}
        initialAmountInPaise={paymentPreset.maxAmount}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPaymentPreset({});
        }}
        onSavePayment={handleSavePayment}
      />

      <CreateTripModal
        isOpen={isCreateTripOpen}
        onClose={() => setIsCreateTripOpen(false)}
        onCreateTrip={handleCreateTrip}
      />

      <AddMemberModal
        isOpen={isAddMemberOpen}
        trip={activeTrip}
        onClose={() => setIsAddMemberOpen(false)}
        onAddMember={handleAddMember}
      />

      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />

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
            handleDeleteTrip(tripPendingDelete.id);
            showToast(`Deleted trip "${tripPendingDelete.name}"`, 'info');
          }
          setTripPendingDelete(null);
        }}
        onCancel={() => setTripPendingDelete(null)}
      />

      {/* Toast Notification Container */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
