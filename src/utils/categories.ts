/**
 * FairSplit - Category Definitions and Metadata
 */

import { ExpenseCategory } from '../types';

export interface CategoryMeta {
  id: ExpenseCategory;
  label: string;
  iconName: string;
  color: string;
  bgLight: string;
  bgDark: string;
}

export const CATEGORIES: Record<ExpenseCategory, CategoryMeta> = {
  food: {
    id: 'food',
    label: 'Food & Dining',
    iconName: 'Utensils',
    color: '#f97316', // orange
    bgLight: 'bg-orange-100 text-orange-700 border-orange-200',
    bgDark: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  },
  hotel: {
    id: 'hotel',
    label: 'Hotel & Stay',
    iconName: 'Bed',
    color: '#3b82f6', // blue
    bgLight: 'bg-blue-100 text-blue-700 border-blue-200',
    bgDark: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  },
  transport: {
    id: 'transport',
    label: 'Transport & Cab',
    iconName: 'Car',
    color: '#8b5cf6', // purple
    bgLight: 'bg-purple-100 text-purple-700 border-purple-200',
    bgDark: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
  fuel: {
    id: 'fuel',
    label: 'Fuel & Toll',
    iconName: 'Fuel',
    color: '#ef4444', // red
    bgLight: 'bg-red-100 text-red-700 border-red-200',
    bgDark: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
  shopping: {
    id: 'shopping',
    label: 'Shopping',
    iconName: 'ShoppingBag',
    color: '#ec4899', // pink
    bgLight: 'bg-pink-100 text-pink-700 border-pink-200',
    bgDark: 'bg-pink-500/15 text-pink-400 border-pink-500/30',
  },
  drinks: {
    id: 'drinks',
    label: 'Drinks & Bar',
    iconName: 'Wine',
    color: '#eab308', // yellow
    bgLight: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    bgDark: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  },
  activities: {
    id: 'activities',
    label: 'Activities',
    iconName: 'Compass',
    color: '#06b6d4', // cyan
    bgLight: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    bgDark: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  },
  groceries: {
    id: 'groceries',
    label: 'Groceries',
    iconName: 'Apple',
    color: '#10b981', // emerald
    bgLight: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    bgDark: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  tickets: {
    id: 'tickets',
    label: 'Tickets & Entry',
    iconName: 'Ticket',
    color: '#6366f1', // indigo
    bgLight: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    bgDark: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  },
  misc: {
    id: 'misc',
    label: 'General Misc',
    iconName: 'Receipt',
    color: '#64748b', // slate
    bgLight: 'bg-slate-100 text-slate-700 border-slate-200',
    bgDark: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  },
};
