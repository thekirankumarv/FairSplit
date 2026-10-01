/**
 * FairSplit - Core Data Types & Financial Models
 * All monetary amounts are strictly represented in integer minor units (paise for INR, cents for USD/EUR).
 * Float numbers are NEVER used as source of truth.
 */

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  minorUnitName: string;
  decimals: number;
}

export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', minorUnitName: 'Paise', decimals: 2 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', minorUnitName: 'Cents', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', minorUnitName: 'Cents', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', minorUnitName: 'Pence', decimals: 2 },
};

export type SplitMethod = 'EQUAL' | 'EXACT' | 'PERCENTAGE' | 'SHARES' | 'ITEMIZED';

export type ExpenseCategory =
  | 'food'
  | 'hotel'
  | 'transport'
  | 'fuel'
  | 'shopping'
  | 'drinks'
  | 'activities'
  | 'groceries'
  | 'tickets'
  | 'misc';

export interface Member {
  id: string;
  name: string;
  nickname?: string;
  avatarColor: string;
  avatarIcon?: string;
  isCurrentUser?: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface ExpensePayer {
  memberId: string;
  amountInPaise: number;
}

export interface ExpenseItem {
  id: string;
  title: string;
  unitPriceInPaise: number;
  quantity: number;
  participantIds: string[];
}

export interface ExpenseAdjustment {
  id: string;
  type: 'tax' | 'tip' | 'service' | 'discount';
  label: string;
  amountInPaise: number; // positive for tax/tip/service, negative for discount
  allocation: 'proportional' | 'equal';
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  category: ExpenseCategory;
  date: string; // ISO date string (YYYY-MM-DD or full timestamp)
  totalAmountInPaise: number; // Canonical total
  payers: ExpensePayer[];
  splitMethod: SplitMethod;
  participantIds: string[];
  
  // Custom split allocations depending on method
  exactAmounts?: Record<string, number>; // memberId -> amountInPaise
  percentages?: Record<string, number>;  // memberId -> percentage (0 - 100)
  shares?: Record<string, number>;       // memberId -> number of shares (positive integer)
  
  // For itemized bills
  items?: ExpenseItem[];
  adjustments?: ExpenseAdjustment[];
  
  // Optional receipt and metadata
  notes?: string;
  receiptImage?: string; // Data URL or local object reference
  createdAt: string;
  updatedAt: string;
}

export interface SettlementPayment {
  id: string;
  tripId: string;
  fromMemberId: string;
  toMemberId: string;
  amountInPaise: number;
  notes?: string;
  paidAt: string;
}

export interface Trip {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  currency: CurrencyCode;
  members: Member[];
  expenses: Expense[];
  settlements: SettlementPayment[];
  createdAt: string;
  updatedAt: string;
  /** Set on the example trip shipped with the app, so it can be labelled. */
  isSample?: boolean;
}

export interface AppSettings {
  currentUserId: string; // Member id representing "You" in active trip
  theme: 'dark' | 'light' | 'system';
  defaultCurrency: CurrencyCode;
  hapticsEnabled: boolean;
  soundEnabled: boolean;
}

export interface AppState {
  activeTripId: string | null;
  trips: Trip[];
  settings: AppSettings;
}

// -------------------------------------------------------------
// Pure Calculation Engine Derived Types (Never persisted directly)
// -------------------------------------------------------------

export interface MemberBalance {
  memberId: string;
  totalPaidInPaise: number;
  totalOwedInPaise: number;
  netBalanceInPaise: number; // positive = should receive, negative = owes, 0 = settled
}

export interface SettlementRecommendation {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  originalAmountInPaise: number;
  amountSettledInPaise: number;
  remainingAmountInPaise: number;
  isFullySettled: boolean;
  isPartiallySettled: boolean;
}

export interface BilateralDebt {
  otherMemberId: string;
  amountInPaise: number; // positive = they owe you, negative = you owe them
}

export interface InvariantsValidationResult {
  allExpenseSharesReconciled: boolean;
  sumNetBalancesZero: boolean;
  sumMoneySentEqualsReceived: boolean;
  netBalanceSumPaise: number; // MUST be 0
  errorMessages: string[];
}

export interface TripFinancialSummary {
  tripId: string;
  totalSpentInPaise: number;
  expenseCount: number;
  memberBalances: Record<string, MemberBalance>;
  recommendedSettlements: SettlementRecommendation[];
  totalUnsettledInPaise: number;
  totalSettledInPaise: number;
  isFullySettled: boolean;
  biggestExpense?: Expense;
  mostFrequentPayerId?: string;
  categorySpending: Record<ExpenseCategory, number>;
  invariants: InvariantsValidationResult;
}
