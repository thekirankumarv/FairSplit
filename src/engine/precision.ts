/**
 * FairSplit - Precision Financial Math Engine
 *
 * Implements deterministic integer-paise arithmetic.
 * Ensures zero-float rounding drift with exact conservation laws:
 * 1. sum(distributedShares) === totalAmount
 * 2. sum(netBalances) === 0
 * 3. sum(settlementReceived) === sum(settlementSent)
 */

import { CurrencyCode, SUPPORTED_CURRENCIES } from '../types';

/**
 * Safely converts an input string or numeric rupee amount to integer paise.
 * Avoids JavaScript floating-point errors (e.g. 1.1 * 100 = 110.00000000000001).
 *
 * Examples:
 *   "1250.75" -> 125075
 *   "1250"    -> 125000
 *   "0.05"    -> 5
 *   1250.75   -> 125075
 */
export function rupeesToPaise(input: string | number): number {
  if (typeof input === 'number') {
    if (isNaN(input) || !isFinite(input)) return 0;
    // Format to 2 decimal places to sanitize float representation first
    input = input.toFixed(2);
  }

  const sanitized = input.trim().replace(/,/g, '');
  if (!sanitized || isNaN(Number(sanitized))) return 0;

  const parts = sanitized.split('.');
  const wholePart = parseInt(parts[0] || '0', 10);
  let fractionalPart = 0;

  if (parts.length > 1) {
    const fractionStr = (parts[1] + '00').slice(0, 2);
    fractionalPart = parseInt(fractionStr, 10);
  }

  const sign = wholePart < 0 || sanitized.startsWith('-') ? -1 : 1;
  const absWhole = Math.abs(wholePart);
  return sign * (absWhole * 100 + fractionalPart);
}

/**
 * Converts integer paise back to number of rupees (only for calculations that require decimal ratio).
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Formats integer paise into a localized currency string.
 * e.g., 125075 -> "₹1,250.75" or "1,250.75"
 */
export function formatPaise(
  paise: number,
  currencyCode: CurrencyCode = 'INR',
  options?: {
    showSymbol?: boolean;
    showSign?: boolean;
    hideDecimalsIfZero?: boolean;
  }
): string {
  const { showSymbol = true, showSign = false, hideDecimalsIfZero = false } = options || {};
  const currency = SUPPORTED_CURRENCIES[currencyCode] || SUPPORTED_CURRENCIES.INR;

  const isNegative = paise < 0;
  const absPaise = Math.abs(paise);
  const whole = Math.floor(absPaise / 100);
  const fraction = absPaise % 100;

  // Format with Indian English numbering (lakh/crore) for INR or standard for others
  const locale = currencyCode === 'INR' ? 'en-IN' : 'en-US';
  const wholeFormatted = whole.toLocaleString(locale);

  let result = '';
  if (hideDecimalsIfZero && fraction === 0) {
    result = wholeFormatted;
  } else {
    result = `${wholeFormatted}.${fraction.toString().padStart(2, '0')}`;
  }

  const symbol = showSymbol ? currency.symbol : '';

  if (isNegative) {
    return `-${symbol}${result}`;
  } else if (showSign && paise > 0) {
    return `+${symbol}${result}`;
  }
  return `${symbol}${result}`;
}

/**
 * Evenly distributes totalPaise among count participants.
 * Deterministic remainder handling: the remainder paise are distributed
 * one-by-one to the first few participants.
 *
 * Invariant: sum(returnedArray) === totalPaise
 */
export function distributeEvenly(totalPaise: number, count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [totalPaise];

  const baseShare = Math.floor(totalPaise / count);
  const remainder = totalPaise % count;

  const result = new Array(count).fill(baseShare);
  for (let i = 0; i < remainder; i++) {
    result[i] += 1;
  }

  return result;
}

/**
 * Distributes totalPaise according to arbitrary numeric weights using the
 * Largest Remainder Method (Hamilton / Hare-Niemeyer apportionment).
 *
 * Guarantees that:
 * 1. Each share is an exact integer paisa.
 * 2. sum(result) === totalPaise exactly, never off by 1 paisa.
 */
export function distributeRatios(totalPaise: number, weights: number[]): number[] {
  const count = weights.length;
  if (count === 0) return [];
  if (count === 1) return [totalPaise];

  const totalWeight = weights.reduce((acc, w) => acc + (w > 0 ? w : 0), 0);
  if (totalWeight <= 0) {
    return distributeEvenly(totalPaise, count);
  }

  interface Candidate {
    index: number;
    baseShare: number;
    fraction: number;
  }

  const candidates: Candidate[] = [];
  let allocatedSum = 0;

  for (let i = 0; i < count; i++) {
    const weight = Math.max(0, weights[i]);
    const exactQuota = (totalPaise * weight) / totalWeight;
    const baseShare = Math.floor(exactQuota);
    const fraction = exactQuota - baseShare;

    candidates.push({ index: i, baseShare, fraction });
    allocatedSum += baseShare;
  }

  let remainder = totalPaise - allocatedSum;

  // Sort descending by fractional remainder, with stable index tie-breaking
  candidates.sort((a, b) => {
    if (b.fraction !== a.fraction) {
      return b.fraction - a.fraction;
    }
    return a.index - b.index;
  });

  // Distribute the remaining paise one by one to highest fractional parts
  for (let i = 0; i < remainder; i++) {
    candidates[i % count].baseShare += 1;
  }

  // Restore original order
  const result = new Array(count);
  for (const c of candidates) {
    result[c.index] = c.baseShare;
  }

  return result;
}
