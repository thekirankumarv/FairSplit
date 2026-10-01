/**
 * FairSplit - Comprehensive Automated Engine Invariant Tests
 * Can be executed programmatically in-app to verify calculations in real time.
 */

import {
  rupeesToPaise,
  distributeEvenly,
  distributeRatios,
} from './precision';
import {
  calculateExpenseParticipantShares,
  calculateTripFinancials,
} from './calculationEngine';
import { Trip, Expense, Member } from '../types';

export interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  message: string;
  details?: Record<string, unknown>;
}

export function runAllEngineTests(): {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
} {
  const results: TestResult[] = [];

  function assert(name: string, category: string, condition: boolean, message: string, details?: Record<string, unknown>) {
    results.push({
      name,
      category,
      passed: condition,
      message: condition ? 'PASSED: ' + message : 'FAILED: ' + message,
      details,
    });
  }

  // -------------------------------------------------------------
  // Test 1: Precision Conversion (No float drift)
  // -------------------------------------------------------------
  const p1 = rupeesToPaise('1250.75');
  assert(
    'Rupees to Paise Conversion',
    'Precision',
    p1 === 125075,
    `"1250.75" converted to ${p1} paise (expected 125075)`
  );

  const p2 = rupeesToPaise('0.05');
  assert(
    'Sub-rupee conversion',
    'Precision',
    p2 === 5,
    `"0.05" converted to ${p2} paise (expected 5)`
  );

  // -------------------------------------------------------------
  // Test 2: ₹1 split among 3 people (Single paisa remainder)
  // -------------------------------------------------------------
  const oneRupeeShares = distributeEvenly(100, 3);
  const sumOneRupee = oneRupeeShares.reduce((a, b) => a + b, 0);
  assert(
    '₹1 split among 3 people remainder handling',
    'Conservation',
    sumOneRupee === 100 && oneRupeeShares.length === 3 && oneRupeeShares[0] === 34 && oneRupeeShares[1] === 33 && oneRupeeShares[2] === 33,
    `Shares: [${oneRupeeShares.join(', ')}] sum = ${sumOneRupee} paise (exact match 100 paise)`
  );

  // -------------------------------------------------------------
  // Test 3: ₹10 split among 6 people
  // -------------------------------------------------------------
  const tenRupeesShares = distributeEvenly(1000, 6);
  const sumTenRupees = tenRupeesShares.reduce((a, b) => a + b, 0);
  assert(
    '₹10 split among 6 people',
    'Conservation',
    sumTenRupees === 1000,
    `Shares: [${tenRupeesShares.join(', ')}] sum = ${sumTenRupees} paise`
  );

  // -------------------------------------------------------------
  // Test 4: Largest Remainder Apportionment (Percentages)
  // -------------------------------------------------------------
  // Split 1000 paise by 50%, 30%, 20%
  const pctShares = distributeRatios(1000, [50, 30, 20]);
  const sumPct = pctShares.reduce((a, b) => a + b, 0);
  assert(
    'Percentage split reconciliation',
    'Conservation',
    sumPct === 1000 && pctShares[0] === 500 && pctShares[1] === 300 && pctShares[2] === 200,
    `Allocated [${pctShares.join(', ')}] sum = ${sumPct} paise`
  );

  // Odd percentage: 33.33%, 33.33%, 33.34% of 1000 paise
  const oddPctShares = distributeRatios(1000, [33.33, 33.33, 33.34]);
  const sumOddPct = oddPctShares.reduce((a, b) => a + b, 0);
  assert(
    'Odd percentage split exact total',
    'Conservation',
    sumOddPct === 1000,
    `Allocated [${oddPctShares.join(', ')}] sum = ${sumOddPct} paise`
  );

  // -------------------------------------------------------------
  // Test 5: Section 54 Goa Weekend 6-Friends Reference Scenario
  // -------------------------------------------------------------
  const members: Member[] = [
    { id: 'm-kiran', name: 'Kiran', avatarColor: '#10b981', isActive: true, isCurrentUser: true, createdAt: '' },
    { id: 'm-rahul', name: 'Rahul', avatarColor: '#3b82f6', isActive: true, createdAt: '' },
    { id: 'm-arun', name: 'Arun', avatarColor: '#f59e0b', isActive: true, createdAt: '' },
    { id: 'm-vishal', name: 'Vishal', avatarColor: '#8b5cf6', isActive: true, createdAt: '' },
    { id: 'm-ananya', name: 'Ananya', avatarColor: '#ec4899', isActive: true, createdAt: '' },
    { id: 'm-rohit', name: 'Rohit', avatarColor: '#06b6d4', isActive: true, createdAt: '' },
  ];

  const all6Ids = members.map((m) => m.id);

  const expenses: Expense[] = [
    // 1. Hotel: ₹9,000 paid by Kiran, Everyone (6)
    {
      id: 'e1',
      tripId: 'trip-goa',
      title: 'Hotel',
      category: 'hotel',
      date: '2026-09-20',
      totalAmountInPaise: 900000,
      payers: [{ memberId: 'm-kiran', amountInPaise: 900000 }],
      splitMethod: 'EQUAL',
      participantIds: all6Ids,
      createdAt: '',
      updatedAt: '',
    },
    // 2. Dinner: ₹3,600 paid by Rahul, Everyone except Rohit (5)
    {
      id: 'e2',
      tripId: 'trip-goa',
      title: 'Dinner',
      category: 'food',
      date: '2026-09-20',
      totalAmountInPaise: 360000,
      payers: [{ memberId: 'm-rahul', amountInPaise: 360000 }],
      splitMethod: 'EQUAL',
      participantIds: ['m-kiran', 'm-rahul', 'm-arun', 'm-vishal', 'm-ananya'],
      createdAt: '',
      updatedAt: '',
    },
    // 3. Drinks: ₹2,400 paid by Arun, Kiran + Arun + Vishal (3)
    {
      id: 'e3',
      tripId: 'trip-goa',
      title: 'Drinks',
      category: 'drinks',
      date: '2026-09-21',
      totalAmountInPaise: 240000,
      payers: [{ memberId: 'm-arun', amountInPaise: 240000 }],
      splitMethod: 'EQUAL',
      participantIds: ['m-kiran', 'm-arun', 'm-vishal'],
      createdAt: '',
      updatedAt: '',
    },
    // 4. Shopping: ₹1,500 paid by Vishal, Kiran + Rahul (2)
    {
      id: 'e4',
      tripId: 'trip-goa',
      title: 'Shopping',
      category: 'shopping',
      date: '2026-09-21',
      totalAmountInPaise: 150000,
      payers: [{ memberId: 'm-vishal', amountInPaise: 150000 }],
      splitMethod: 'EQUAL',
      participantIds: ['m-kiran', 'm-rahul'],
      createdAt: '',
      updatedAt: '',
    },
    // 5. Water: ₹600 paid by Ananya, Everyone (6)
    {
      id: 'e5',
      tripId: 'trip-goa',
      title: 'Water',
      category: 'groceries',
      date: '2026-09-22',
      totalAmountInPaise: 60000,
      payers: [{ memberId: 'm-ananya', amountInPaise: 60000 }],
      splitMethod: 'EQUAL',
      participantIds: all6Ids,
      createdAt: '',
      updatedAt: '',
    },
    // 6. Fuel: ₹1,800 paid by Rohit, Kiran + Arun + Vishal + Rohit (4)
    {
      id: 'e6',
      tripId: 'trip-goa',
      title: 'Fuel',
      category: 'fuel',
      date: '2026-09-22',
      totalAmountInPaise: 180000,
      payers: [{ memberId: 'm-rohit', amountInPaise: 180000 }],
      splitMethod: 'EQUAL',
      participantIds: ['m-kiran', 'm-arun', 'm-vishal', 'm-rohit'],
      createdAt: '',
      updatedAt: '',
    },
  ];

  const goaTrip: Trip = {
    id: 'trip-goa',
    name: 'Goa Weekend',
    startDate: '2026-09-20',
    endDate: '2026-09-22',
    currency: 'INR',
    members,
    expenses,
    settlements: [],
    createdAt: '2026-09-20T10:00:00Z',
    updatedAt: '2026-09-22T10:00:00Z',
  };

  const goaSummary = calculateTripFinancials(goaTrip);

  // Check 1: Total spent === ₹18,900 (1,890,000 paise)
  assert(
    'Goa Weekend: Total Spending',
    'Scenario-Goa',
    goaSummary.totalSpentInPaise === 1890000,
    `Total spent: ${goaSummary.totalSpentInPaise} paise (expected 1890000 paise / ₹18,900)`
  );

  // Check 2: Sum of net balances MUST be EXACTLY 0
  assert(
    'Goa Weekend: Invariant sum(netBalances) === 0',
    'Conservation',
    goaSummary.invariants.sumNetBalancesZero && goaSummary.invariants.netBalanceSumPaise === 0,
    `Net balance sum across all 6 members is ${goaSummary.invariants.netBalanceSumPaise} paise`
  );

  // Check 3: Exact Net Balances for each person
  // Kiran: paid 900000, share 432000 -> net +468000 (+₹4,680)
  const kiranNet = goaSummary.memberBalances['m-kiran'].netBalanceInPaise;
  assert(
    'Goa Weekend: Kiran Net Balance (+₹4,680)',
    'Scenario-Goa',
    kiranNet === 468000,
    `Kiran net: ${kiranNet} paise (expected +468000)`
  );

  // Rahul: paid 360000, share 307000 -> net +53000 (+₹530)
  const rahulNet = goaSummary.memberBalances['m-rahul'].netBalanceInPaise;
  assert(
    'Goa Weekend: Rahul Net Balance (+₹530)',
    'Scenario-Goa',
    rahulNet === 53000,
    `Rahul net: ${rahulNet} paise (expected +53000)`
  );

  // Arun: paid 240000, share 357000 -> net -117000 (-₹1,170)
  const arunNet = goaSummary.memberBalances['m-arun'].netBalanceInPaise;
  assert(
    'Goa Weekend: Arun Net Balance (-₹1,170)',
    'Scenario-Goa',
    arunNet === -117000,
    `Arun net: ${arunNet} paise (expected -117000)`
  );

  // Vishal: paid 150000, share 357000 -> net -207000 (-₹2,070)
  const vishalNet = goaSummary.memberBalances['m-vishal'].netBalanceInPaise;
  assert(
    'Goa Weekend: Vishal Net Balance (-₹2,070)',
    'Scenario-Goa',
    vishalNet === -207000,
    `Vishal net: ${vishalNet} paise (expected -207000)`
  );

  // Ananya: paid 60000, share 232000 -> net -172000 (-₹1,720)
  const ananyaNet = goaSummary.memberBalances['m-ananya'].netBalanceInPaise;
  assert(
    'Goa Weekend: Ananya Net Balance (-₹1,720)',
    'Scenario-Goa',
    ananyaNet === -172000,
    `Ananya net: ${ananyaNet} paise (expected -172000)`
  );

  // Rohit: paid 180000, share 205000 (hotel 150000 + water 10000 + fuel 45000)
  // -> net -25000 (-₹250)
  const rohitNet = goaSummary.memberBalances['m-rohit'].netBalanceInPaise;
  assert(
    'Goa Weekend: Rohit Net Balance (-₹250)',
    'Scenario-Goa',
    rohitNet === -25000,
    `Rohit net: ${rohitNet} paise (expected -25000)`
  );

  // Check 4: Settlement recommendations
  const totalCreditors = 468000 + 53000;                   // 521000
  const totalDebtors = 117000 + 207000 + 172000 + 25000;   // 521000
  const recSum = goaSummary.recommendedSettlements.reduce((a, b) => a + b.originalAmountInPaise, 0);
  assert(
    'Goa Weekend: Settlement Total Equality',
    'Settlement',
    recSum === totalCreditors && recSum === totalDebtors,
    `Total debt recommendations: ${recSum} paise equals creditor total ${totalCreditors} paise`
  );

  // -------------------------------------------------------------
  // Test 6: Itemized Restaurant Bill with Tax & Tip
  // -------------------------------------------------------------
  const itemizedExpense: Expense = {
    id: 'e-itemized',
    tripId: 'test',
    title: 'Dinner at Ocean Pearl',
    category: 'food',
    date: '2026-09-22',
    totalAmountInPaise: 220000, // ₹2,200
    payers: [{ memberId: 'm-kiran', amountInPaise: 220000 }],
    splitMethod: 'ITEMIZED',
    participantIds: ['m-kiran', 'm-rahul'],
    items: [
      { id: 'i1', title: 'Paneer', unitPriceInPaise: 30000, quantity: 1, participantIds: ['m-kiran', 'm-rahul'] }, // 150 each
      { id: 'i2', title: 'Biryani', unitPriceInPaise: 170000, quantity: 1, participantIds: ['m-kiran'] },           // 1700 kiran
    ], // total items = 200000
    adjustments: [
      { id: 'a1', type: 'tax', label: 'GST', amountInPaise: 10000, allocation: 'proportional' },
      { id: 'a2', type: 'tip', label: 'Tip', amountInPaise: 10000, allocation: 'proportional' },
    ], // total adjustments = 20000. Grand total = 220000
    createdAt: '',
    updatedAt: '',
  };

  const itemShares = calculateExpenseParticipantShares(itemizedExpense);
  const sumItemShares = Object.values(itemShares).reduce((a, b) => a + b, 0);
  assert(
    'Itemized bill share conservation',
    'Itemized',
    sumItemShares === 220000,
    `Itemized total: ${sumItemShares} paise equals expected 220000 paise`
  );

  // -------------------------------------------------------------
  // Test 7: Multiple Payers support
  // -------------------------------------------------------------
  const multiPayerExpense: Expense = {
    id: 'e-multi',
    tripId: 'test',
    title: 'Shared Rental',
    category: 'transport',
    date: '2026-09-22',
    totalAmountInPaise: 100000, // ₹1,000
    payers: [
      { memberId: 'm-kiran', amountInPaise: 60000 },
      { memberId: 'm-rahul', amountInPaise: 40000 },
    ],
    splitMethod: 'EQUAL',
    participantIds: ['m-kiran', 'm-rahul', 'm-arun', 'm-vishal'],
    createdAt: '',
    updatedAt: '',
  };

  const multiPayerTrip: Trip = {
    id: 'test-multi',
    name: 'Multi Payer Test',
    startDate: '2026-09-22',
    endDate: '2026-09-22',
    currency: 'INR',
    members,
    expenses: [multiPayerExpense],
    settlements: [],
    createdAt: '',
    updatedAt: '',
  };

  const multiSummary = calculateTripFinancials(multiPayerTrip);
  assert(
    'Multiple payers balance conservation',
    'MultiplePayers',
    multiSummary.invariants.sumNetBalancesZero &&
    multiSummary.memberBalances['m-kiran'].netBalanceInPaise === 35000 && // 600 - 250 = +350
    multiSummary.memberBalances['m-rahul'].netBalanceInPaise === 15000 && // 400 - 250 = +150
    multiSummary.memberBalances['m-arun'].netBalanceInPaise === -25000,   // 0 - 250 = -250
    `Kiran net: ${multiSummary.memberBalances['m-kiran'].netBalanceInPaise} (expected +35000), Arun net: ${multiSummary.memberBalances['m-arun'].netBalanceInPaise} (expected -25000)`
  );

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return {
    total: results.length,
    passed: passedCount,
    failed: failedCount,
    results,
  };
}
