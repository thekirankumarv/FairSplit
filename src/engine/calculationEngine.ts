/**
 * FairSplit - Pure Financial Calculation Engine
 *
 * Fully decoupled from UI and framework state.
 * Implements deterministic apportionment, debt netting, and invariant checks.
 */

import {
  Expense,
  ExpenseItem,
  MemberBalance,
  SettlementRecommendation,
  Trip,
  TripFinancialSummary,
  InvariantsValidationResult,
  BilateralDebt,
  ExpenseCategory,
} from '../types';
import { distributeEvenly, distributeRatios } from './precision';

/**
 * Calculates the exact share (in paise) for each participant of an expense.
 * Invariant: sum(participantShares) === expense.totalAmountInPaise
 */
export function calculateExpenseParticipantShares(expense: Expense): Record<string, number> {
  const shares: Record<string, number> = {};
  const participants = expense.participantIds || [];

  if (participants.length === 0 || expense.totalAmountInPaise <= 0) {
    return shares;
  }

  // 1. Equal Split
  if (expense.splitMethod === 'EQUAL') {
    const allocations = distributeEvenly(expense.totalAmountInPaise, participants.length);
    participants.forEach((id, idx) => {
      shares[id] = allocations[idx];
    });
    return shares;
  }

  // 2. Exact Amounts
  if (expense.splitMethod === 'EXACT') {
    const exactMap = expense.exactAmounts || {};
    let totalAssigned = 0;
    participants.forEach((id) => {
      const val = exactMap[id] || 0;
      shares[id] = val;
      totalAssigned += val;
    });

    // If there is any difference between declared exact amounts and total, reconcile onto participants
    const diff = expense.totalAmountInPaise - totalAssigned;
    if (diff !== 0 && participants.length > 0) {
      // Reconcile remaining paise proportionally or to the first participant
      shares[participants[0]] = (shares[participants[0]] || 0) + diff;
    }
    return shares;
  }

  // 3. Percentage Split
  if (expense.splitMethod === 'PERCENTAGE') {
    const pctMap = expense.percentages || {};
    const weights = participants.map((id) => pctMap[id] || 0);
    const allocations = distributeRatios(expense.totalAmountInPaise, weights);
    participants.forEach((id, idx) => {
      shares[id] = allocations[idx];
    });
    return shares;
  }

  // 4. Shares / Ratios Split
  if (expense.splitMethod === 'SHARES') {
    const shareMap = expense.shares || {};
    const weights = participants.map((id) => shareMap[id] || 1);
    const allocations = distributeRatios(expense.totalAmountInPaise, weights);
    participants.forEach((id, idx) => {
      shares[id] = allocations[idx];
    });
    return shares;
  }

  // 5. Itemized Split
  if (expense.splitMethod === 'ITEMIZED') {
    const items: ExpenseItem[] = expense.items || [];
    const itemSubtotals: Record<string, number> = {};
    participants.forEach((id) => {
      itemSubtotals[id] = 0;
    });

    let itemsTotalPaise = 0;

    for (const item of items) {
      const itemPrice = item.unitPriceInPaise * (item.quantity > 0 ? item.quantity : 1);
      itemsTotalPaise += itemPrice;
      const itemParticipants = (item.participantIds && item.participantIds.length > 0)
        ? item.participantIds
        : participants;

      const itemShares = distributeEvenly(itemPrice, itemParticipants.length);
      itemParticipants.forEach((pId, idx) => {
        itemSubtotals[pId] = (itemSubtotals[pId] || 0) + itemShares[idx];
      });
    }

    // Process adjustments (tax, tip, discount)
    const adjustments = expense.adjustments || [];
    let netAdjustmentsPaise = 0;

    for (const adj of adjustments) {
      netAdjustmentsPaise += adj.amountInPaise;
      if (adj.allocation === 'equal') {
        const adjShares = distributeEvenly(adj.amountInPaise, participants.length);
        participants.forEach((pId, idx) => {
          itemSubtotals[pId] = (itemSubtotals[pId] || 0) + adjShares[idx];
        });
      } else {
        // Proportional to item subtotals
        const weights = participants.map((id) => Math.max(0, itemSubtotals[id] || 0));
        const adjShares = distributeRatios(adj.amountInPaise, weights);
        participants.forEach((pId, idx) => {
          itemSubtotals[pId] = (itemSubtotals[pId] || 0) + adjShares[idx];
        });
      }
    }

    // Reconcile with expense.totalAmountInPaise (handles any rounding remainder)
    const currentSum = Object.values(itemSubtotals).reduce((a, b) => a + b, 0);
    const discrepancy = expense.totalAmountInPaise - currentSum;
    if (discrepancy !== 0 && participants.length > 0) {
      itemSubtotals[participants[0]] += discrepancy;
    }

    return itemSubtotals;
  }

  // Fallback to equal
  const fallback = distributeEvenly(expense.totalAmountInPaise, participants.length);
  participants.forEach((id, idx) => {
    shares[id] = fallback[idx];
  });
  return shares;
}

/**
 * Calculates each payer's paid amount in paise for an expense.
 * Invariant: sum(paidAmounts) === expense.totalAmountInPaise
 */
export function calculateExpensePayerContributions(expense: Expense): Record<string, number> {
  const contributions: Record<string, number> = {};

  if (!expense.payers || expense.payers.length === 0) {
    return contributions;
  }

  let totalDeclared = 0;
  for (const payer of expense.payers) {
    contributions[payer.memberId] = (contributions[payer.memberId] || 0) + payer.amountInPaise;
    totalDeclared += payer.amountInPaise;
  }

  // If there is any drift between payers sum and total, reconcile onto the first payer
  const diff = expense.totalAmountInPaise - totalDeclared;
  if (diff !== 0 && expense.payers.length > 0) {
    const firstPayerId = expense.payers[0].memberId;
    contributions[firstPayerId] = (contributions[firstPayerId] || 0) + diff;
  }

  return contributions;
}

/**
 * Computes optimal debt simplification recommendations using greedy debt-netting.
 * Reduces the group transaction count to the minimum practical number while preserving exact totals.
 */
export function calculateDebtSimplification(
  netBalances: Record<string, number>
): { fromMemberId: string; toMemberId: string; amountInPaise: number }[] {
  interface Account {
    memberId: string;
    balance: number; // positive = creditor, negative = debtor
  }

  const creditors: Account[] = [];
  const debtors: Account[] = [];

  for (const [memberId, balance] of Object.entries(netBalances)) {
    if (balance > 0) {
      creditors.push({ memberId, balance });
    } else if (balance < 0) {
      debtors.push({ memberId, balance: Math.abs(balance) });
    }
  }

  // Sort descending by magnitude
  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => b.balance - a.balance);

  const transactions: { fromMemberId: string; toMemberId: string; amountInPaise: number }[] = [];

  let cIdx = 0;
  let dIdx = 0;

  while (cIdx < creditors.length && dIdx < debtors.length) {
    const creditor = creditors[cIdx];
    const debtor = debtors[dIdx];

    const amount = Math.min(creditor.balance, debtor.balance);
    if (amount > 0) {
      transactions.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amountInPaise: amount,
      });

      creditor.balance -= amount;
      debtor.balance -= amount;
    }

    if (creditor.balance === 0) cIdx++;
    if (debtor.balance === 0) dIdx++;
  }

  return transactions;
}

/**
 * Computes complete financial overview of a trip.
 * Validates all financial invariants and incorporates recorded settlements.
 */
export function calculateTripFinancials(trip: Trip): TripFinancialSummary {
  const members = trip.members || [];
  const expenses = trip.expenses || [];
  const settlements = trip.settlements || [];

  // Initialize balances
  const balances: Record<string, MemberBalance> = {};
  for (const m of members) {
    balances[m.id] = {
      memberId: m.id,
      totalPaidInPaise: 0,
      totalOwedInPaise: 0,
      netBalanceInPaise: 0,
    };
  }

  let totalSpentInPaise = 0;
  let allExpenseSharesReconciled = true;
  const categorySpending: Record<ExpenseCategory, number> = {
    food: 0,
    hotel: 0,
    transport: 0,
    fuel: 0,
    shopping: 0,
    drinks: 0,
    activities: 0,
    groceries: 0,
    tickets: 0,
    misc: 0,
  };

  let biggestExpense: Expense | undefined;
  const payerCountMap: Record<string, number> = {};

  // 1. Process all expenses
  for (const expense of expenses) {
    totalSpentInPaise += expense.totalAmountInPaise;
    categorySpending[expense.category] = (categorySpending[expense.category] || 0) + expense.totalAmountInPaise;

    if (!biggestExpense || expense.totalAmountInPaise > biggestExpense.totalAmountInPaise) {
      biggestExpense = expense;
    }

    // Accumulate payments
    const payerContributions = calculateExpensePayerContributions(expense);
    let totalPaidInExpense = 0;
    for (const [payerId, amount] of Object.entries(payerContributions)) {
      if (balances[payerId]) {
        balances[payerId].totalPaidInPaise += amount;
      }
      totalPaidInExpense += amount;
      payerCountMap[payerId] = (payerCountMap[payerId] || 0) + 1;
    }

    // Accumulate shares
    const participantShares = calculateExpenseParticipantShares(expense);
    let totalSharesInExpense = 0;
    for (const [participantId, share] of Object.entries(participantShares)) {
      if (balances[participantId]) {
        balances[participantId].totalOwedInPaise += share;
      }
      totalSharesInExpense += share;
    }

    // Invariant: sum(participantShares) === expense.totalAmountInPaise
    if (totalSharesInExpense !== expense.totalAmountInPaise || totalPaidInExpense !== expense.totalAmountInPaise) {
      allExpenseSharesReconciled = false;
    }
  }

  // 2. Compute net balances
  let sumNetBalancesPaise = 0;
  for (const b of Object.values(balances)) {
    b.netBalanceInPaise = b.totalPaidInPaise - b.totalOwedInPaise;
    sumNetBalancesPaise += b.netBalanceInPaise;
  }

  // Determine most frequent payer
  let mostFrequentPayerId: string | undefined;
  let maxPayerCount = 0;
  for (const [payerId, count] of Object.entries(payerCountMap)) {
    if (count > maxPayerCount) {
      maxPayerCount = count;
      mostFrequentPayerId = payerId;
    }
  }

  // 3. Compute simplified settlements from raw expense net balances
  const rawNetBalancesMap: Record<string, number> = {};
  for (const [mId, b] of Object.entries(balances)) {
    rawNetBalancesMap[mId] = b.netBalanceInPaise;
  }

  const rawRecommended = calculateDebtSimplification(rawNetBalancesMap);

  // 4. Map settlements into recommendations
  // Build paid matrix from settlements: from -> to -> totalPaid
  const paidMatrix: Record<string, Record<string, number>> = {};
  for (const s of settlements) {
    if (!paidMatrix[s.fromMemberId]) paidMatrix[s.fromMemberId] = {};
    paidMatrix[s.fromMemberId][s.toMemberId] =
      (paidMatrix[s.fromMemberId][s.toMemberId] || 0) + s.amountInPaise;
  }

  let totalSettledInPaise = 0;
  let totalUnsettledInPaise = 0;

  const recommendations: SettlementRecommendation[] = rawRecommended.map((r, idx) => {
    const alreadyPaid = paidMatrix[r.fromMemberId]?.[r.toMemberId] || 0;
    const settledForThis = Math.min(r.amountInPaise, alreadyPaid);
    const remaining = Math.max(0, r.amountInPaise - settledForThis);

    totalSettledInPaise += settledForThis;
    totalUnsettledInPaise += remaining;

    return {
      id: `rec-${idx}-${r.fromMemberId}-${r.toMemberId}`,
      fromMemberId: r.fromMemberId,
      toMemberId: r.toMemberId,
      originalAmountInPaise: r.amountInPaise,
      amountSettledInPaise: settledForThis,
      remainingAmountInPaise: remaining,
      isFullySettled: remaining === 0,
      isPartiallySettled: settledForThis > 0 && remaining > 0,
    };
  });

  // Check invariants
  const errorMessages: string[] = [];
  const sumNetBalancesZero = Math.abs(sumNetBalancesPaise) === 0;
  if (!sumNetBalancesZero) {
    errorMessages.push(`Conservation invariant violated: sum of member net balances is ${sumNetBalancesPaise} paise (must be 0).`);
  }
  if (!allExpenseSharesReconciled) {
    errorMessages.push('One or more expenses has unallocated or unbalanced shares.');
  }

  // Money sent === Money received in recommendations
  const totalSent = recommendations.reduce((acc, r) => acc + r.originalAmountInPaise, 0);
  const totalCreditorDemand = Object.values(balances)
    .filter((b) => b.netBalanceInPaise > 0)
    .reduce((acc, b) => acc + b.netBalanceInPaise, 0);
  const sumMoneySentEqualsReceived = totalSent === totalCreditorDemand;

  const invariants: InvariantsValidationResult = {
    allExpenseSharesReconciled,
    sumNetBalancesZero,
    sumMoneySentEqualsReceived,
    netBalanceSumPaise: sumNetBalancesPaise,
    errorMessages,
  };

  return {
    tripId: trip.id,
    totalSpentInPaise,
    expenseCount: expenses.length,
    memberBalances: balances,
    recommendedSettlements: recommendations,
    totalUnsettledInPaise,
    totalSettledInPaise,
    isFullySettled: totalUnsettledInPaise === 0 && expenses.length > 0,
    biggestExpense,
    mostFrequentPayerId,
    categorySpending,
    invariants,
  };
}

/**
 * Calculates bilateral debts for a specific member ("Because of...").
 * Positive: otherMember owes this member.
 * Negative: this member owes otherMember.
 */
export function getBilateralDebtsForMember(memberId: string, trip: Trip): BilateralDebt[] {
  const result: Record<string, number> = {};

  for (const m of trip.members) {
    if (m.id !== memberId) {
      result[m.id] = 0;
    }
  }

  for (const expense of trip.expenses) {
    const payerMap = calculateExpensePayerContributions(expense);
    const sharesMap = calculateExpenseParticipantShares(expense);

    const totalExpense = expense.totalAmountInPaise;
    if (totalExpense <= 0) continue;

    // For every pair: payer P and participant C
    // C owes P: (payerMap[P] / totalExpense) * sharesMap[C]
    for (const [payerId, payerPaid] of Object.entries(payerMap)) {
      if (payerPaid <= 0) continue;
      const payerFraction = payerPaid / totalExpense;

      for (const [participantId, participantShare] of Object.entries(sharesMap)) {
        if (participantShare <= 0 || payerId === participantId) continue;
        const portion = Math.round(payerFraction * participantShare);

        if (payerId === memberId && participantId in result) {
          result[participantId] += portion; // they owe memberId
        } else if (participantId === memberId && payerId in result) {
          result[payerId] -= portion; // memberId owes payer
        }
      }
    }
  }

  return Object.entries(result)
    .filter(([_, amt]) => amt !== 0)
    .map(([otherMemberId, amountInPaise]) => ({
      otherMemberId,
      amountInPaise,
    }))
    .sort((a, b) => Math.abs(b.amountInPaise) - Math.abs(a.amountInPaise));
}
