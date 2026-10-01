import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Users,
  CreditCard,
  Camera,
  Check,
} from 'lucide-react';
import {
  Trip,
  Expense,
  ExpenseCategory,
  SplitMethod,
  ExpensePayer,
  ExpenseItem,
  ExpenseAdjustment,
} from '../types';
import {
  rupeesToPaise,
  paiseToRupees,
  formatPaise,
  distributeEvenly,
} from '../engine/precision';
import { CategoryIcon } from './CategoryIcon';
import { MemberAvatar } from './MemberAvatar';
import { CATEGORIES } from '../utils/categories';

interface ExpenseModalProps {
  isOpen: boolean;
  trip: Trip;
  currentUserId: string;
  initialExpense?: Expense | null;
  onClose: () => void;
  onSave: (expense: Expense) => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  trip,
  currentUserId,
  initialExpense,
  onClose,
  onSave,
}) => {
  if (!isOpen) return null;

  const isEditing = Boolean(initialExpense);

  // Form State
  const [amountStr, setAmountStr] = useState<string>(
    initialExpense ? paiseToRupees(initialExpense.totalAmountInPaise).toString() : ''
  );
  const [title, setTitle] = useState<string>(initialExpense?.title || '');
  const [category, setCategory] = useState<ExpenseCategory>(initialExpense?.category || 'food');
  const [date, setDate] = useState<string>(
    initialExpense?.date || new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState<string>(initialExpense?.notes || '');
  const [receiptImage, setReceiptImage] = useState<string | undefined>(
    initialExpense?.receiptImage
  );

  // Payer state
  const [isMultiplePayers, setIsMultiplePayers] = useState<boolean>(
    (initialExpense?.payers.length || 0) > 1
  );
  const [singlePayerId, setSinglePayerId] = useState<string>(
    initialExpense?.payers[0]?.memberId || currentUserId
  );
  const [multiPayerMap, setMultiPayerMap] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (initialExpense?.payers) {
      for (const p of initialExpense.payers) {
        map[p.memberId] = paiseToRupees(p.amountInPaise).toString();
      }
    }
    return map;
  });

  // Participants state
  const [participantIds, setParticipantIds] = useState<string[]>(
    initialExpense?.participantIds || trip.members.map((m) => m.id)
  );

  // Split Method state
  const [splitMethod, setSplitMethod] = useState<SplitMethod>(
    initialExpense?.splitMethod || 'EQUAL'
  );
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (initialExpense?.exactAmounts) {
      for (const [k, v] of Object.entries(initialExpense.exactAmounts)) {
        map[k] = paiseToRupees(v).toString();
      }
    }
    return map;
  });
  const [percentages, setPercentages] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (initialExpense?.percentages) {
      for (const [k, v] of Object.entries(initialExpense.percentages)) {
        map[k] = v.toString();
      }
    }
    return map;
  });
  const [shares, setShares] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (initialExpense?.shares) {
      for (const [k, v] of Object.entries(initialExpense.shares)) {
        map[k] = v.toString();
      }
    }
    return map;
  });

  // Itemized state
  const [items, setItems] = useState<ExpenseItem[]>(() => {
    if (initialExpense?.items && initialExpense.items.length > 0) {
      return initialExpense.items;
    }
    return [
      {
        id: 'item-1',
        title: 'Item 1',
        unitPriceInPaise: 0,
        quantity: 1,
        participantIds: trip.members.map((m) => m.id),
      },
    ];
  });
  const [adjustments, setAdjustments] = useState<ExpenseAdjustment[]>(
    initialExpense?.adjustments || []
  );

  const totalAmountInPaise = rupeesToPaise(amountStr);

  // Quick select all / unselect all participants
  const handleToggleAllParticipants = () => {
    if (participantIds.length === trip.members.length) {
      // Keep only current user
      setParticipantIds([currentUserId]);
    } else {
      setParticipantIds(trip.members.map((m) => m.id));
    }
  };

  const handleToggleParticipant = (id: string) => {
    if (participantIds.includes(id)) {
      if (participantIds.length > 1) {
        setParticipantIds(participantIds.filter((p) => p !== id));
      }
    } else {
      setParticipantIds([...participantIds, id]);
    }
  };

  // Recalculate itemized total into amountStr if in ITEMIZED mode
  useEffect(() => {
    if (splitMethod === 'ITEMIZED') {
      const itemsSum = items.reduce(
        (acc, item) => acc + item.unitPriceInPaise * (item.quantity > 0 ? item.quantity : 1),
        0
      );
      const adjSum = adjustments.reduce((acc, adj) => acc + adj.amountInPaise, 0);
      const grandTotal = itemsSum + adjSum;
      setAmountStr(paiseToRupees(grandTotal).toString());
    }
  }, [splitMethod, items, adjustments]);

  // Validation
  const validateForm = (): { isValid: boolean; error?: string } => {
    if (!title.trim()) return { isValid: false, error: 'Please enter a description for the expense' };
    if (totalAmountInPaise <= 0) return { isValid: false, error: 'Please enter a valid expense amount greater than 0' };
    if (participantIds.length === 0) return { isValid: false, error: 'Please select at least one participant' };

    // Payer validation
    if (isMultiplePayers) {
      const sumPayersPaise = Object.values(multiPayerMap).reduce(
        (acc, val) => acc + rupeesToPaise(val),
        0
      );
      if (sumPayersPaise !== totalAmountInPaise) {
        return {
          isValid: false,
          error: `Multiple payers sum (${formatPaise(sumPayersPaise, trip.currency)}) must equal total (${formatPaise(totalAmountInPaise, trip.currency)})`,
        };
      }
    }

    // Split method validation
    if (splitMethod === 'EXACT') {
      const sumExact = participantIds.reduce(
        (acc, id) => acc + rupeesToPaise(exactAmounts[id] || 0),
        0
      );
      if (sumExact !== totalAmountInPaise) {
        return {
          isValid: false,
          error: `Assigned exact shares sum to ${formatPaise(sumExact, trip.currency)}, which differs from total ${formatPaise(totalAmountInPaise, trip.currency)}`,
        };
      }
    }

    if (splitMethod === 'PERCENTAGE') {
      const sumPct = participantIds.reduce((acc, id) => acc + Number(percentages[id] || 0), 0);
      if (Math.round(sumPct) !== 100) {
        return { isValid: false, error: `Percentages must add up to exactly 100% (currently ${sumPct.toFixed(1)}%)` };
      }
    }

    return { isValid: true };
  };

  const validation = validateForm();

  // Distribute remaining action for Exact split
  const handleDistributeRemainingExact = () => {
    const sumExact = participantIds.reduce(
      (acc, id) => acc + rupeesToPaise(exactAmounts[id] || 0),
      0
    );
    const diffPaise = totalAmountInPaise - sumExact;
    if (diffPaise <= 0) return;

    // Distribute among participants with 0 or evenly
    const unassigned = participantIds.filter((id) => !exactAmounts[id] || Number(exactAmounts[id]) === 0);
    const targetIds = unassigned.length > 0 ? unassigned : participantIds;
    const distributed = distributeEvenly(diffPaise, targetIds.length);

    const newExact = { ...exactAmounts };
    targetIds.forEach((id, idx) => {
      const existing = rupeesToPaise(newExact[id] || 0);
      newExact[id] = paiseToRupees(existing + distributed[idx]).toString();
    });
    setExactAmounts(newExact);
  };

  // Receipt image upload
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setReceiptImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid) return;

    // Construct payers
    const payers: ExpensePayer[] = [];
    if (isMultiplePayers) {
      for (const [mId, valStr] of Object.entries(multiPayerMap)) {
        const p = rupeesToPaise(valStr);
        if (p > 0) {
          payers.push({ memberId: mId, amountInPaise: p });
        }
      }
    } else {
      payers.push({ memberId: singlePayerId, amountInPaise: totalAmountInPaise });
    }

    // Exact amounts in paise
    const exactPaiseMap: Record<string, number> = {};
    if (splitMethod === 'EXACT') {
      for (const id of participantIds) {
        exactPaiseMap[id] = rupeesToPaise(exactAmounts[id] || 0);
      }
    }

    // Percentages
    const pctMap: Record<string, number> = {};
    if (splitMethod === 'PERCENTAGE') {
      for (const id of participantIds) {
        pctMap[id] = Number(percentages[id] || 0);
      }
    }

    // Shares
    const shareMap: Record<string, number> = {};
    if (splitMethod === 'SHARES') {
      for (const id of participantIds) {
        shareMap[id] = Math.max(1, parseInt(shares[id] || '1', 10));
      }
    }

    const newExpense: Expense = {
      id: initialExpense?.id || `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tripId: trip.id,
      title: title.trim(),
      category,
      date,
      totalAmountInPaise,
      payers,
      splitMethod,
      participantIds,
      exactAmounts: splitMethod === 'EXACT' ? exactPaiseMap : undefined,
      percentages: splitMethod === 'PERCENTAGE' ? pctMap : undefined,
      shares: splitMethod === 'SHARES' ? shareMap : undefined,
      items: splitMethod === 'ITEMIZED' ? items : undefined,
      adjustments: splitMethod === 'ITEMIZED' ? adjustments : undefined,
      notes: notes.trim() || undefined,
      receiptImage,
      createdAt: initialExpense?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newExpense);
    onClose();
  };

  const categoriesList = Object.keys(CATEGORIES) as ExpenseCategory[];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/80 backdrop-blur-sm sm:px-4 pad-sheet overflow-y-auto">
      <div className="w-full max-w-lg bg-stone-900 border border-stone-750 sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
          <div>
            <h2 className="text-base font-extrabold text-stone-100">
              {isEditing ? 'Edit Expense' : 'Add New Expense'}
            </h2>
            <p className="text-xs text-stone-400">
              {trip.name} • Zero-drift calculation
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* 1. Large Amount Input */}
          <div className="text-center py-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-1">
              Amount Spent ({trip.currency})
            </div>
            <div className="inline-flex items-center justify-center relative">
              <span className="text-3xl font-extrabold text-emerald-400 mr-1 select-none">
                {trip.currency === 'INR' ? '₹' : trip.currency === 'USD' ? '$' : '€'}
              </span>
              <input
                id="expense-amount-input"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                disabled={splitMethod === 'ITEMIZED'}
                className="w-48 text-3xl sm:text-4xl font-black text-stone-100 bg-transparent text-center focus:outline-none placeholder-stone-600 font-mono tracking-tight"
                autoFocus={!isEditing}
              />
            </div>
            {splitMethod === 'ITEMIZED' && (
              <div className="text-[10px] text-stone-400 mt-1">
                Amount computed automatically from items subtotal + taxes
              </div>
            )}
          </div>

          {/* 2. Description Title & Category Picker */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                Description
              </label>
              <input
                id="expense-title-input"
                type="text"
                placeholder="e.g. Seafood Dinner at Ocean Pearl"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-stone-850 border border-stone-750 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5">
                Category
              </label>
              <div className="grid grid-cols-5 gap-2">
                {categoriesList.map((catKey) => {
                  const meta = CATEGORIES[catKey];
                  const isSelected = category === catKey;
                  return (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setCategory(catKey)}
                      className={`flex flex-col items-center justify-center p-2 rounded-xl border text-[10px] font-medium transition-all ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500/60 ring-1 ring-emerald-500/30 text-emerald-300 font-bold'
                          : 'bg-stone-850 border-stone-800 text-stone-400 hover:bg-stone-800'
                      }`}
                    >
                      <CategoryIcon category={catKey} showBackground={false} size={16} />
                      <span className="truncate mt-1 max-w-[50px]">{meta.label.split(' ')[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 3. Who Paid? */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <CreditCard size={14} className="text-emerald-400" />
                <span>Who Paid?</span>
              </label>
              <button
                type="button"
                onClick={() => setIsMultiplePayers(!isMultiplePayers)}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
              >
                {isMultiplePayers ? 'Single Payer' : 'Multiple Payers?'}
              </button>
            </div>

            {!isMultiplePayers ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {trip.members.map((m) => {
                  const isSelected = singlePayerId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSinglePayerId(m.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-emerald-500/20 border-emerald-500/50 ring-1 ring-emerald-500/30 text-emerald-300 font-bold'
                          : 'bg-stone-850 border-stone-800 text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      <MemberAvatar member={m} size="xs" />
                      <span className="text-xs truncate">{m.name}</span>
                      {isSelected && <Check size={14} className="ml-auto text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2 p-3 rounded-2xl bg-stone-850 border border-stone-750">
                <div className="text-[11px] text-stone-400">
                  Enter exact amounts paid by each member (must sum to total):
                </div>
                {trip.members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <MemberAvatar member={m} size="xs" />
                      <span className="text-xs text-stone-200 truncate">{m.name}</span>
                    </div>
                    <div className="flex items-center gap-1 w-32">
                      <span className="text-xs text-stone-500">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={multiPayerMap[m.id] || ''}
                        onChange={(e) =>
                          setMultiPayerMap({ ...multiPayerMap, [m.id]: e.target.value })
                        }
                        className="w-full px-2 py-1 rounded-lg bg-stone-900 border border-stone-750 text-xs text-stone-100 font-mono text-right focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Who Participated? */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <Users size={14} className="text-emerald-400" />
                <span>
                  Who Participated? ({participantIds.length} of {trip.members.length})
                </span>
              </label>
              <button
                type="button"
                onClick={handleToggleAllParticipants}
                className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300"
              >
                {participantIds.length === trip.members.length ? 'Select Only You' : 'Select Everyone'}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {trip.members.map((m) => {
                const isSelected = participantIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => handleToggleParticipant(m.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-stone-800 border-emerald-500/50 text-stone-100 font-semibold'
                        : 'bg-stone-900 border-stone-800 text-stone-500 line-through opacity-60'
                    }`}
                  >
                    <MemberAvatar member={m} size="xs" />
                    <span className="text-xs truncate">{m.name}</span>
                    {isSelected && <Check size={14} className="ml-auto text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. Split Method Tabs */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-400">
              Split Method
            </label>

            <div className="grid grid-cols-5 gap-1 p-1 rounded-2xl bg-stone-850 border border-stone-800 text-xs">
              {(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES', 'ITEMIZED'] as SplitMethod[]).map(
                (method) => {
                  const isActive = splitMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setSplitMethod(method)}
                      className={`py-1.5 rounded-xl font-bold transition-all text-center ${
                        isActive
                          ? 'bg-emerald-500 text-stone-950 shadow-sm'
                          : 'text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {method === 'EQUAL' && 'Equal'}
                      {method === 'EXACT' && 'Exact'}
                      {method === 'PERCENTAGE' && '%'}
                      {method === 'SHARES' && 'Shares'}
                      {method === 'ITEMIZED' && 'Bill'}
                    </button>
                  );
                }
              )}
            </div>

            {/* Sub-view: Equal */}
            {splitMethod === 'EQUAL' && (
              <div className="p-3 rounded-2xl bg-stone-850 border border-stone-750 text-xs text-stone-300">
                <div className="flex justify-between items-center">
                  <span>Evenly split among {participantIds.length} friends:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {participantIds.length > 0 && totalAmountInPaise > 0
                      ? formatPaise(
                          distributeEvenly(totalAmountInPaise, participantIds.length)[0],
                          trip.currency
                        ) + ' / person'
                      : '₹0.00'}
                  </span>
                </div>
              </div>
            )}

            {/* Sub-view: Exact */}
            {splitMethod === 'EXACT' && (
              <div className="p-3 rounded-2xl bg-stone-850 border border-stone-750 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-400">Assign Exact Rupee Amounts:</span>
                  <button
                    type="button"
                    onClick={handleDistributeRemainingExact}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300"
                  >
                    Distribute Remaining
                  </button>
                </div>
                {participantIds.map((pId) => {
                  const m = trip.members.find((mem) => mem.id === pId);
                  return (
                    <div key={pId} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MemberAvatar member={m} size="xs" />
                        <span className="text-xs text-stone-200 truncate">{m?.name}</span>
                      </div>
                      <div className="flex items-center gap-1 w-28">
                        <span className="text-xs text-stone-500">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={exactAmounts[pId] || ''}
                          onChange={(e) =>
                            setExactAmounts({ ...exactAmounts, [pId]: e.target.value })
                          }
                          className="w-full px-2 py-1 rounded-lg bg-stone-900 border border-stone-750 text-xs text-stone-100 font-mono text-right focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sub-view: Percentage */}
            {splitMethod === 'PERCENTAGE' && (
              <div className="p-3 rounded-2xl bg-stone-850 border border-stone-750 space-y-2">
                <div className="flex items-center justify-between text-xs text-stone-400">
                  <span>Enter percentage (must sum to 100%):</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {participantIds
                      .reduce((acc, id) => acc + Number(percentages[id] || 0), 0)
                      .toFixed(1)}
                    %
                  </span>
                </div>
                {participantIds.map((pId) => {
                  const m = trip.members.find((mem) => mem.id === pId);
                  return (
                    <div key={pId} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MemberAvatar member={m} size="xs" />
                        <span className="text-xs text-stone-200 truncate">{m?.name}</span>
                      </div>
                      <div className="flex items-center gap-1 w-24">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="0"
                          value={percentages[pId] || ''}
                          onChange={(e) =>
                            setPercentages({ ...percentages, [pId]: e.target.value })
                          }
                          className="w-full px-2 py-1 rounded-lg bg-stone-900 border border-stone-750 text-xs text-stone-100 font-mono text-right focus:outline-none focus:border-emerald-500"
                        />
                        <span className="text-xs text-stone-500">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sub-view: Shares */}
            {splitMethod === 'SHARES' && (
              <div className="p-3 rounded-2xl bg-stone-850 border border-stone-750 space-y-2">
                <div className="text-xs text-stone-400">
                  Assign relative share ratios (e.g. 2 shares, 1 share):
                </div>
                {participantIds.map((pId) => {
                  const m = trip.members.find((mem) => mem.id === pId);
                  return (
                    <div key={pId} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MemberAvatar member={m} size="xs" />
                        <span className="text-xs text-stone-200 truncate">{m?.name}</span>
                      </div>
                      <div className="flex items-center gap-1 w-24">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          placeholder="1"
                          value={shares[pId] || '1'}
                          onChange={(e) => setShares({ ...shares, [pId]: e.target.value })}
                          className="w-full px-2 py-1 rounded-lg bg-stone-900 border border-stone-750 text-xs text-stone-100 font-mono text-right focus:outline-none focus:border-emerald-500"
                        />
                        <span className="text-xs text-stone-500">share</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sub-view: Itemized Bill */}
            {splitMethod === 'ITEMIZED' && (
              <div className="p-3 rounded-2xl bg-stone-850 border border-stone-750 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-300">Bill Items</span>
                  <button
                    type="button"
                    onClick={() =>
                      setItems([
                        ...items,
                        {
                          id: `item-${Date.now()}`,
                          title: `Item ${items.length + 1}`,
                          unitPriceInPaise: 0,
                          quantity: 1,
                          participantIds,
                        },
                      ])
                    }
                    className="flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300"
                  >
                    <Plus size={14} /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-stone-900 border border-stone-800 space-y-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Item Name (e.g. Biryani)"
                          value={item.title}
                          onChange={(e) => {
                            const next = [...items];
                            next[idx].title = e.target.value;
                            setItems(next);
                          }}
                          className="flex-1 px-2 py-1 rounded-lg bg-stone-850 border border-stone-750 text-stone-100"
                        />
                        <div className="flex items-center gap-1 w-24">
                          <span className="text-stone-500">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={paiseToRupees(item.unitPriceInPaise) || ''}
                            onChange={(e) => {
                              const next = [...items];
                              next[idx].unitPriceInPaise = rupeesToPaise(e.target.value);
                              setItems(next);
                            }}
                            className="w-full px-2 py-1 rounded-lg bg-stone-850 border border-stone-750 text-stone-100 font-mono text-right"
                          />
                        </div>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setItems(items.filter((_, i) => i !== idx))}
                            className="p-1 text-stone-500 hover:text-rose-400"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* Participant tags for this item */}
                      <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                        <span className="text-[10px] text-stone-500 flex-shrink-0">Split by:</span>
                        {trip.members.map((m) => {
                          const isIn = item.participantIds.includes(m.id);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                const next = [...items];
                                if (isIn) {
                                  if (item.participantIds.length > 1) {
                                    next[idx].participantIds = item.participantIds.filter(
                                      (id) => id !== m.id
                                    );
                                  }
                                } else {
                                  next[idx].participantIds = [...item.participantIds, m.id];
                                }
                                setItems(next);
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap transition-colors ${
                                isIn
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-stone-850 text-stone-500 border border-stone-800'
                              }`}
                            >
                              {m.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Adjustments (Tax, Tip, Discount) */}
                <div className="pt-2 border-t border-stone-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-400">Taxes, Tips & Discounts</span>
                    <button
                      type="button"
                      onClick={() =>
                        setAdjustments([
                          ...adjustments,
                          {
                            id: `adj-${Date.now()}`,
                            type: 'tax',
                            label: 'Tax / GST',
                            amountInPaise: 0,
                            allocation: 'proportional',
                          },
                        ])
                      }
                      className="text-xs font-semibold text-emerald-400"
                    >
                      + Add Charge
                    </button>
                  </div>

                  {adjustments.map((adj, aIdx) => (
                    <div key={adj.id} className="flex items-center gap-2 text-xs">
                      <select
                        value={adj.type}
                        onChange={(e) => {
                          const next = [...adjustments];
                          next[aIdx].type = e.target.value as any;
                          next[aIdx].label = e.target.value.toUpperCase();
                          setAdjustments(next);
                        }}
                        className="px-2 py-1 rounded-lg bg-stone-900 border border-stone-750 text-stone-300"
                      >
                        <option value="tax">Tax / GST</option>
                        <option value="tip">Tip</option>
                        <option value="service">Service Charge</option>
                        <option value="discount">Discount (-)</option>
                      </select>

                      <div className="flex items-center gap-1 flex-1">
                        <span className="text-stone-500">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={paiseToRupees(adj.amountInPaise) || ''}
                          onChange={(e) => {
                            const next = [...adjustments];
                            next[aIdx].amountInPaise = rupeesToPaise(e.target.value);
                            setAdjustments(next);
                          }}
                          className="w-full px-2 py-1 rounded-lg bg-stone-900 border border-stone-750 text-stone-100 font-mono text-right"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setAdjustments(adjustments.filter((_, i) => i !== aIdx))}
                        className="p-1 text-stone-500 hover:text-rose-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 6. Date, Notes & Optional Receipt */}
          <div className="space-y-3 pt-2 border-t border-stone-800">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-stone-850 border border-stone-750 text-xs text-stone-100 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
                  Receipt Photo
                </label>
                <label className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-stone-850 border border-stone-750 text-xs font-semibold text-stone-300 hover:bg-stone-800 cursor-pointer transition-colors">
                  <Camera size={14} className="text-emerald-400" />
                  <span>{receiptImage ? 'Change Photo' : 'Attach'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleReceiptUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {receiptImage && (
              <div className="relative inline-block">
                <img
                  src={receiptImage}
                  alt="Receipt Preview"
                  className="h-20 w-auto rounded-xl object-cover border border-stone-700"
                />
                <button
                  type="button"
                  onClick={() => setReceiptImage(undefined)}
                  className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-rose-600 text-white"
                >
                  <X size={10} />
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-400 mb-1">
                Notes (Optional)
              </label>
              <textarea
                placeholder="Add details, table number, notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-stone-850 border border-stone-750 text-xs text-stone-100 placeholder-stone-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Validation Error banner if invalid */}
          {!validation.isValid && (
            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-900/50 text-xs text-rose-300 font-medium">
              {validation.error}
            </div>
          )}

          {/* Submit Action Button */}
          <div className="pt-2">
            <button
              id="save-expense-btn"
              type="submit"
              disabled={!validation.isValid}
              className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg ${
                validation.isValid
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950 shadow-emerald-500/20 active:scale-[0.99]'
                  : 'bg-stone-800 text-stone-500 cursor-not-allowed border border-stone-750'
              }`}
            >
              {isEditing ? 'Save Changes' : 'Record Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
