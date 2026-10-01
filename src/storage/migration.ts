/**
 * FairSplit - Schema Migration Pipeline
 *
 * Ensures backward compatibility across schema changes.
 * Never crashes if older versions exist in local storage.
 */

import { AppState, Trip } from '../types';
import { PersistedEnvelope } from './schema';

export function migrateState(rawEnvelope: unknown): AppState | null {
  if (!rawEnvelope || typeof rawEnvelope !== 'object') {
    return null;
  }

  const envelope = rawEnvelope as Partial<PersistedEnvelope>;

  // If raw object is unversioned (legacy raw AppState)
  if (!('version' in envelope) && 'trips' in envelope) {
    return sanitizeAppState(envelope as unknown as AppState);
  }

  // Version 1
  if (envelope.version === 1 && envelope.data) {
    return sanitizeAppState(envelope.data);
  }

  // Future migrations can be chained here:
  // if (envelope.version === 2) { ... }

  if (envelope.data) {
    return sanitizeAppState(envelope.data);
  }

  return null;
}

/**
 * Sanitizes and fills any missing fields to guarantee type safety at runtime
 */
export function sanitizeAppState(data: Partial<AppState>): AppState {
  const trips: Trip[] = Array.isArray(data.trips)
    ? data.trips.map((t) => ({
        id: String(t.id || `trip-${Date.now()}`),
        name: String(t.name || 'Untitled Trip'),
        description: t.description ? String(t.description) : undefined,
        startDate: String(t.startDate || new Date().toISOString().slice(0, 10)),
        endDate: String(t.endDate || new Date().toISOString().slice(0, 10)),
        currency: (t.currency || 'INR') as Trip['currency'],
        members: Array.isArray(t.members) ? t.members : [],
        expenses: Array.isArray(t.expenses) ? t.expenses : [],
        settlements: Array.isArray(t.settlements) ? t.settlements : [],
        createdAt: String(t.createdAt || new Date().toISOString()),
        updatedAt: String(t.updatedAt || new Date().toISOString()),
      }))
    : [];

  const defaultTripId = trips.length > 0 ? trips[0].id : null;
  const activeTripId = data.activeTripId && trips.some((t) => t.id === data.activeTripId)
    ? data.activeTripId
    : defaultTripId;

  const currentMemberId = trips.find((t) => t.id === activeTripId)?.members[0]?.id || 'm-kiran';

  return {
    activeTripId,
    trips,
    settings: {
      currentUserId: data.settings?.currentUserId || currentMemberId,
      theme: data.settings?.theme || 'dark',
      defaultCurrency: data.settings?.defaultCurrency || 'INR',
      hapticsEnabled: data.settings?.hapticsEnabled ?? true,
      soundEnabled: data.settings?.soundEnabled ?? true,
    },
  };
}
