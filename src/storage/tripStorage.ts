/**
 * FairSplit - Local Storage Abstraction Layer
 *
 * Encapsulates all browser persistence, schema validation, import/export,
 * and data integrity safety guards.
 */

import { AppState, Trip, Member, Expense, SettlementPayment } from '../types';
import { CURRENT_SCHEMA_VERSION, STORAGE_KEY, PersistedEnvelope, ExportedTripEnvelope, ExportedBackupEnvelope } from './schema';
import { migrateState } from './migration';

/**
 * Gets the active trip from AppState or defaults to the first trip.
 */
export function getActiveTrip(state: AppState): Trip | null {
  if (state.activeTripId) {
    const found = state.trips.find((t) => t.id === state.activeTripId);
    if (found) return found;
  }
  return state.trips[0] || null;
}

/**
 * Resets state to clean default seed data and returns it.
 */
export function resetAppState(): AppState {
  clearAllData();
  const fresh = getInitialSeedData();
  saveAppState(fresh);
  return fresh;
}

/**
 * Saves or updates a single trip into AppState and persists to localStorage.
 */
export function saveTrip(trip: Trip): AppState {
  const state = loadAppState();
  const index = state.trips.findIndex((t) => t.id === trip.id);
  const updatedTrips = [...state.trips];
  if (index >= 0) {
    updatedTrips[index] = { ...trip, updatedAt: new Date().toISOString() };
  } else {
    updatedTrips.push({ ...trip, updatedAt: new Date().toISOString() });
  }
  const nextState: AppState = {
    ...state,
    trips: updatedTrips,
    activeTripId: state.activeTripId || trip.id,
  };
  saveAppState(nextState);
  return nextState;
}

/**
 * Deletes a trip by ID from AppState and persists to localStorage.
 */
export function deleteTrip(tripId: string): AppState {
  const state = loadAppState();
  const updatedTrips = state.trips.filter((t) => t.id !== tripId);
  const nextActiveId =
    state.activeTripId === tripId
      ? updatedTrips[0]?.id || ''
      : state.activeTripId;
  const nextState: AppState = {
    ...state,
    trips: updatedTrips,
    activeTripId: nextActiveId,
  };
  saveAppState(nextState);
  return nextState;
}

/**
 * Persists the entire application state safely to browser localStorage.
 */
export function saveAppState(state: AppState): void {
  try {
    const envelope: PersistedEnvelope = {
      version: CURRENT_SCHEMA_VERSION,
      data: state,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch (error) {
    console.error('FairSplit Storage: Failed to persist application state', error);
  }
}

/**
 * Loads and migrates application state from browser localStorage.
 * If no state exists or data is corrupt, initializes with realistic default seed data.
 */
export function loadAppState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const migrated = migrateState(parsed);
      if (migrated && migrated.trips.length > 0) {
        return migrated;
      }
    }
  } catch (error) {
    console.warn('FairSplit Storage: Error loading saved state, falling back to seed data', error);
  }

  const initial = getInitialSeedData();
  saveAppState(initial);
  return initial;
}

/**
 * Exports a single trip into a standalone JSON file format.
 */
export function exportTrip(trip: Trip): string {
  const envelope: ExportedTripEnvelope = {
    version: CURRENT_SCHEMA_VERSION,
    type: 'fair_split_single_trip',
    trip,
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * Validates and imports a single trip JSON.
 * Rejects corrupt data, invalid IDs, missing member references, or negative amounts.
 */
export function validateAndImportTrip(jsonString: string): { success: boolean; trip?: Trip; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    let tripCandidate: unknown = parsed;

    if (parsed && typeof parsed === 'object' && 'type' in parsed && parsed.type === 'fair_split_single_trip' && parsed.trip) {
      tripCandidate = parsed.trip;
    }

    if (!tripCandidate || typeof tripCandidate !== 'object') {
      return { success: false, error: 'Invalid JSON file: Missing trip root object' };
    }

    const t = tripCandidate as Partial<Trip>;

    if (!t.name || typeof t.name !== 'string' || t.name.trim() === '') {
      return { success: false, error: 'Validation Error: Trip must have a non-empty name' };
    }

    if (!Array.isArray(t.members) || t.members.length === 0) {
      return { success: false, error: 'Validation Error: Trip must contain at least one member' };
    }

    // Validate members
    const memberIdSet = new Set<string>();
    for (const m of t.members) {
      if (!m.id || !m.name) {
        return { success: false, error: 'Validation Error: Every member must have an ID and name' };
      }
      memberIdSet.add(m.id);
    }

    // Validate expenses
    const validExpenses: Expense[] = [];
    if (Array.isArray(t.expenses)) {
      for (const e of t.expenses) {
        if (!e.title || typeof e.totalAmountInPaise !== 'number' || e.totalAmountInPaise <= 0) {
          return { success: false, error: `Validation Error: Expense "${e.title || 'Unknown'}" has an invalid amount` };
        }

        // Validate payer references
        if (!Array.isArray(e.payers) || e.payers.length === 0) {
          return { success: false, error: `Validation Error: Expense "${e.title}" has no payers recorded` };
        }
        for (const p of e.payers) {
          if (!memberIdSet.has(p.memberId)) {
            return { success: false, error: `Validation Error: Payer in "${e.title}" does not exist in trip members` };
          }
        }

        // Validate participant references
        if (!Array.isArray(e.participantIds) || e.participantIds.length === 0) {
          return { success: false, error: `Validation Error: Expense "${e.title}" must have at least one participant` };
        }
        for (const pid of e.participantIds) {
          if (!memberIdSet.has(pid)) {
            return { success: false, error: `Validation Error: Participant in "${e.title}" does not exist in trip members` };
          }
        }

        validExpenses.push(e as Expense);
      }
    }

    // Validate settlements
    const validSettlements: SettlementPayment[] = [];
    if (Array.isArray(t.settlements)) {
      for (const s of t.settlements) {
        if (!memberIdSet.has(s.fromMemberId) || !memberIdSet.has(s.toMemberId)) {
          return { success: false, error: 'Validation Error: Settlement references unknown member' };
        }
        if (s.amountInPaise <= 0) {
          return { success: false, error: 'Validation Error: Settlement amount must be greater than zero' };
        }
        validSettlements.push(s as SettlementPayment);
      }
    }

    const validatedTrip: Trip = {
      id: t.id || `trip-import-${Date.now()}`,
      name: t.name.trim(),
      description: t.description,
      startDate: t.startDate || new Date().toISOString().slice(0, 10),
      endDate: t.endDate || new Date().toISOString().slice(0, 10),
      currency: t.currency || 'INR',
      members: t.members as Member[],
      expenses: validExpenses,
      settlements: validSettlements,
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return { success: true, trip: validatedTrip };
  } catch (err) {
    return { success: false, error: `Failed to parse trip JSON: ${(err as Error).message}` };
  }
}

/**
 * Creates a complete JSON backup of all locally stored trips and settings.
 */
export function exportAllData(state: AppState): string {
  const envelope: ExportedBackupEnvelope = {
    version: CURRENT_SCHEMA_VERSION,
    type: 'fair_split_full_backup',
    state,
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(envelope, null, 2);
}

/**
 * Validates a full backup JSON string.
 */
export function validateBackup(jsonString: string): { success: boolean; state?: AppState; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    let stateCandidate: unknown = parsed;

    if (parsed && typeof parsed === 'object' && 'type' in parsed && parsed.type === 'fair_split_full_backup' && parsed.state) {
      stateCandidate = parsed.state;
    }

    const migrated = migrateState({ version: CURRENT_SCHEMA_VERSION, data: stateCandidate, updatedAt: '' });
    if (!migrated) {
      return { success: false, error: 'Invalid backup structure or unparseable data' };
    }

    return { success: true, state: migrated };
  } catch (err) {
    return { success: false, error: `Invalid JSON backup: ${(err as Error).message}` };
  }
}

/**
 * Permanently clears all locally stored data.
 */
export function clearAllData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('FairSplit Storage: Failed to clear local data', err);
  }
}

/**
 * The example trip the app starts with, so a new install has something to
 * look at. It is flagged as sample data and can be deleted like any other trip.
 */
export function getInitialSeedData(): AppState {
  const members: Member[] = [
    { id: 'm-kiran', name: 'Kiran', nickname: 'You', avatarColor: '#10b981', isCurrentUser: true, isActive: true, createdAt: '2026-09-20T08:00:00Z' },
    { id: 'm-rahul', name: 'Rahul', avatarColor: '#3b82f6', isCurrentUser: false, isActive: true, createdAt: '2026-09-20T08:00:00Z' },
    { id: 'm-arun', name: 'Arun', avatarColor: '#f59e0b', isCurrentUser: false, isActive: true, createdAt: '2026-09-20T08:00:00Z' },
    { id: 'm-vishal', name: 'Vishal', avatarColor: '#8b5cf6', isCurrentUser: false, isActive: true, createdAt: '2026-09-20T08:00:00Z' },
    { id: 'm-ananya', name: 'Ananya', avatarColor: '#ec4899', isCurrentUser: false, isActive: true, createdAt: '2026-09-20T08:00:00Z' },
    { id: 'm-rohit', name: 'Rohit', avatarColor: '#06b6d4', isCurrentUser: false, isActive: true, createdAt: '2026-09-20T08:00:00Z' },
  ];

  const all6Ids = members.map((m) => m.id);

  const expenses: Expense[] = [
    {
      id: 'exp-1',
      tripId: 'trip-goa-2026',
      title: 'Beach Resort & Villas',
      category: 'hotel',
      date: '2026-09-20',
      totalAmountInPaise: 900000, // ₹9,000.00
      payers: [{ memberId: 'm-kiran', amountInPaise: 900000 }],
      splitMethod: 'EQUAL',
      participantIds: all6Ids,
      notes: '2-night villa stay with sea view',
      createdAt: '2026-09-20T11:30:00Z',
      updatedAt: '2026-09-20T11:30:00Z',
    },
    {
      id: 'exp-2',
      tripId: 'trip-goa-2026',
      title: 'Seafood Dinner at Ocean Pearl',
      category: 'food',
      date: '2026-09-20',
      totalAmountInPaise: 360000, // ₹3,600.00
      payers: [{ memberId: 'm-rahul', amountInPaise: 360000 }],
      splitMethod: 'EQUAL',
      participantIds: ['m-kiran', 'm-rahul', 'm-arun', 'm-vishal', 'm-ananya'], // Everyone except Rohit
      notes: 'Rohit caught up later from airport',
      createdAt: '2026-09-20T21:15:00Z',
      updatedAt: '2026-09-20T21:15:00Z',
    },
    {
      id: 'exp-3',
      tripId: 'trip-goa-2026',
      title: 'Sunset Drinks & Cocktails',
      category: 'drinks',
      date: '2026-09-21',
      totalAmountInPaise: 240000, // ₹2,400.00
      payers: [{ memberId: 'm-arun', amountInPaise: 240000 }],
      splitMethod: 'EQUAL',
      participantIds: ['m-kiran', 'm-arun', 'm-vishal'],
      notes: 'Beach shack beverages',
      createdAt: '2026-09-21T18:45:00Z',
      updatedAt: '2026-09-21T18:45:00Z',
    },
    {
      id: 'exp-4',
      tripId: 'trip-goa-2026',
      title: 'Flea Market Souvenirs',
      category: 'shopping',
      date: '2026-09-21',
      totalAmountInPaise: 150000, // ₹1,500.00
      payers: [{ memberId: 'm-vishal', amountInPaise: 150000 }],
      splitMethod: 'EQUAL',
      participantIds: ['m-kiran', 'm-rahul'],
      notes: 'Handmade crafts & cashews',
      createdAt: '2026-09-21T20:10:00Z',
      updatedAt: '2026-09-21T20:10:00Z',
    },
    {
      id: 'exp-5',
      tripId: 'trip-goa-2026',
      title: 'Bottled Water & Coconut Crates',
      category: 'groceries',
      date: '2026-09-22',
      totalAmountInPaise: 60000, // ₹600.00
      payers: [{ memberId: 'm-ananya', amountInPaise: 60000 }],
      splitMethod: 'EQUAL',
      participantIds: all6Ids,
      notes: 'Hydration crate for the road trip',
      createdAt: '2026-09-22T09:00:00Z',
      updatedAt: '2026-09-22T09:00:00Z',
    },
    {
      id: 'exp-6',
      tripId: 'trip-goa-2026',
      title: 'SUV Fuel & Tolls',
      category: 'fuel',
      date: '2026-09-22',
      totalAmountInPaise: 180000, // ₹1,800.00
      payers: [{ memberId: 'm-rohit', amountInPaise: 180000 }],
      splitMethod: 'EQUAL',
      participantIds: ['m-kiran', 'm-arun', 'm-vishal', 'm-rohit'],
      notes: 'Highway fuel stop on the way back',
      createdAt: '2026-09-22T14:30:00Z',
      updatedAt: '2026-09-22T14:30:00Z',
    },
  ];

  const goaTrip: Trip = {
    id: 'trip-goa-2026',
    name: 'Goa Weekend',
    description: '3-day coastal road trip with the gang',
    isSample: true,
    startDate: '2026-09-20',
    endDate: '2026-09-22',
    currency: 'INR',
    members,
    expenses,
    settlements: [],
    createdAt: '2026-09-20T08:00:00Z',
    updatedAt: '2026-09-22T15:00:00Z',
  };

  return {
    activeTripId: 'trip-goa-2026',
    trips: [goaTrip],
    settings: {
      currentUserId: 'm-kiran',
      theme: 'dark',
      defaultCurrency: 'INR',
      hapticsEnabled: true,
      soundEnabled: true,
    },
  };
}
