/**
 * FairSplit - Storage Schema Definitions & Versioning
 */

import { AppState, Trip } from '../types';

export const CURRENT_SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'fairsplit_app_state_v1';

export interface PersistedEnvelope {
  version: number;
  data: AppState;
  updatedAt: string;
}

export interface ExportedTripEnvelope {
  version: number;
  type: 'fair_split_single_trip';
  trip: Trip;
  exportedAt: string;
  checksum?: string;
}

export interface ExportedBackupEnvelope {
  version: number;
  type: 'fair_split_full_backup';
  state: AppState;
  exportedAt: string;
}
