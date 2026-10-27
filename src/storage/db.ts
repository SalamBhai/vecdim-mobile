import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

export type SyncStatus = 'draft' | 'pending_sync' | 'synced' | 'rejected';

export interface LocalFieldRecord {
  id: string; // Client UUID v4
  user_id?: string; // Field Officer ID (e.g. u_field_03, u_field_01)
  state: string;
  lga: string;
  ward: string;
  collection_date: string; // YYYY-MM-DD
  latitude: number;
  longitude: number;
  gps_accuracy_m: number;
  species: string;
  insecticide: string;
  n_exposed: number;
  n_dead: number;
  mortality_pct: number;
  who_class: string;
  larval_density: number;
  urban: boolean;
  irs_covered: boolean;
  itn_use_pct: number;
  sync_status: SyncStatus;
  server_error?: string | null;
  created_at: string;
  updated_at: string;
}

// -------------------------------------------------------------
// NATIVE SQLITE DRIVER (iOS & Android)
// -------------------------------------------------------------

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getNativeDB(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('vecdim_offline.db');
      await initSchema(db);
      return db;
    })();
  }
  return dbPromise;
}

async function initSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      state TEXT NOT NULL,
      lga TEXT NOT NULL,
      ward TEXT NOT NULL,
      collection_date TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      gps_accuracy_m REAL NOT NULL,
      species TEXT NOT NULL,
      insecticide TEXT NOT NULL,
      n_exposed INTEGER NOT NULL,
      n_dead INTEGER NOT NULL,
      mortality_pct REAL NOT NULL,
      who_class TEXT NOT NULL,
      larval_density REAL NOT NULL,
      urban INTEGER NOT NULL,
      irs_covered INTEGER NOT NULL,
      itn_use_pct REAL NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending_sync',
      server_error TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_records_sync_status ON records(sync_status);
    CREATE INDEX IF NOT EXISTS idx_records_user_id ON records(user_id);
    CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(created_at DESC);

    CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      form_data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

// -------------------------------------------------------------
// WEB LOCALSTORAGE ADAPTER (Browser preview without OPFS lock issues)
// -------------------------------------------------------------

const WEB_RECORDS_KEY = 'vecdim_offline_records';
const WEB_DRAFT_KEY = 'vecdim_active_draft';
const WEB_USER_KEY = 'vecdim_active_user_id';

function getWebRecords(): LocalFieldRecord[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(WEB_RECORDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWebRecords(records: LocalFieldRecord[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(WEB_RECORDS_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

// -------------------------------------------------------------
// USER SESSION STORAGE (Hybrid)
// -------------------------------------------------------------

export async function getActiveUserId(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(WEB_USER_KEY);
    }
    return null;
  }

  try {
    const db = await getNativeDB();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM app_settings WHERE key = 'current_user_id';`
    );
    return row?.value || null;
  } catch {
    return null;
  }
}

export async function setActiveUserId(userId: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(WEB_USER_KEY, userId);
    }
    return;
  }

  const db = await getNativeDB();
  await db.runAsync(
    `INSERT INTO app_settings (key, value) VALUES ('current_user_id', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [userId]
  );
}

export async function clearActiveUserId(): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(WEB_USER_KEY);
    }
    return;
  }

  const db = await getNativeDB();
  await db.runAsync(`DELETE FROM app_settings WHERE key = 'current_user_id';`);
}

// -------------------------------------------------------------
// PUBLIC UNIFIED API (Hybrid: Web localStorage + Native SQLite)
// -------------------------------------------------------------

export async function saveFormDraft(formData: Record<string, any>, userId?: string): Promise<void> {
  const now = new Date().toISOString();
  const draftKey = userId ? `active_draft_${userId}` : 'active_nmep_e1_draft';

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        `${WEB_DRAFT_KEY}_${userId || 'default'}`,
        JSON.stringify({ formData, updatedAt: now })
      );
    }
    return;
  }

  const db = await getNativeDB();
  const jsonStr = JSON.stringify(formData);
  await db.runAsync(
    `INSERT INTO drafts (id, form_data, updated_at) 
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET form_data = excluded.form_data, updated_at = excluded.updated_at;`,
    [draftKey, jsonStr, now]
  );
}

export async function getFormDraft(userId?: string): Promise<{ formData: Record<string, any>; updatedAt: string } | null> {
  const draftKey = userId ? `active_draft_${userId}` : 'active_nmep_e1_draft';

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(`${WEB_DRAFT_KEY}_${userId || 'default'}`);
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  const db = await getNativeDB();
  const row = await db.getFirstAsync<{ form_data: string; updated_at: string }>(
    `SELECT form_data, updated_at FROM drafts WHERE id = ?;`,
    [draftKey]
  );

  if (!row) return null;

  try {
    return {
      formData: JSON.parse(row.form_data),
      updatedAt: row.updated_at,
    };
  } catch {
    return null;
  }
}

export async function clearFormDraft(userId?: string): Promise<void> {
  const draftKey = userId ? `active_draft_${userId}` : 'active_nmep_e1_draft';

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(`${WEB_DRAFT_KEY}_${userId || 'default'}`);
      window.localStorage.removeItem(WEB_DRAFT_KEY);
    }
    return;
  }

  const db = await getNativeDB();
  await db.runAsync(`DELETE FROM drafts WHERE id = ? OR id = 'active_nmep_e1_draft';`, [draftKey]);
}

export async function saveFieldRecord(record: LocalFieldRecord): Promise<void> {
  const now = new Date().toISOString();

  if (Platform.OS === 'web') {
    const records = getWebRecords();
    const idx = records.findIndex((r) => r.id === record.id);
    const updatedRecord = { ...record, updated_at: now };
    if (idx >= 0) {
      records[idx] = updatedRecord;
    } else {
      records.unshift(updatedRecord);
    }
    saveWebRecords(records);
    return;
  }

  const db = await getNativeDB();
  await db.runAsync(
    `INSERT INTO records (
      id, user_id, state, lga, ward, collection_date, latitude, longitude,
      gps_accuracy_m, species, insecticide, n_exposed, n_dead,
      mortality_pct, who_class, larval_density, urban, irs_covered,
      itn_use_pct, sync_status, server_error, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      user_id = excluded.user_id,
      state = excluded.state,
      lga = excluded.lga,
      ward = excluded.ward,
      collection_date = excluded.collection_date,
      latitude = excluded.latitude,
      longitude = excluded.longitude,
      gps_accuracy_m = excluded.gps_accuracy_m,
      species = excluded.species,
      insecticide = excluded.insecticide,
      n_exposed = excluded.n_exposed,
      n_dead = excluded.n_dead,
      mortality_pct = excluded.mortality_pct,
      who_class = excluded.who_class,
      larval_density = excluded.larval_density,
      urban = excluded.urban,
      irs_covered = excluded.irs_covered,
      itn_use_pct = excluded.itn_use_pct,
      sync_status = excluded.sync_status,
      server_error = excluded.server_error,
      updated_at = excluded.updated_at;`,
    [
      record.id,
      record.user_id || 'u_field_03',
      record.state,
      record.lga,
      record.ward,
      record.collection_date,
      record.latitude,
      record.longitude,
      record.gps_accuracy_m,
      record.species,
      record.insecticide,
      record.n_exposed,
      record.n_dead,
      record.mortality_pct,
      record.who_class,
      record.larval_density,
      record.urban ? 1 : 0,
      record.irs_covered ? 1 : 0,
      record.itn_use_pct,
      record.sync_status,
      record.server_error || null,
      record.created_at || now,
      now,
    ]
  );
}

export async function getOutboxRecords(userId?: string): Promise<LocalFieldRecord[]> {
  if (Platform.OS === 'web') {
    return getWebRecords().filter(
      (r) =>
        (r.sync_status === 'pending_sync' || r.sync_status === 'rejected') &&
        (!userId || r.user_id === userId)
    );
  }

  const db = await getNativeDB();
  if (userId) {
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM records WHERE sync_status IN ('pending_sync', 'rejected') AND user_id = ? ORDER BY created_at DESC;`,
      [userId]
    );
    return rows.map(formatRecordFromRow);
  }

  const rows = await db.getAllAsync<any>(
    `SELECT * FROM records WHERE sync_status IN ('pending_sync', 'rejected') ORDER BY created_at DESC;`
  );
  return rows.map(formatRecordFromRow);
}

export async function getAllRecords(userId?: string): Promise<LocalFieldRecord[]> {
  if (Platform.OS === 'web') {
    const all = getWebRecords();
    if (userId) {
      return all.filter((r) => !r.user_id || r.user_id === userId);
    }
    return all;
  }

  const db = await getNativeDB();
  if (userId) {
    const rows = await db.getAllAsync<any>(
      `SELECT * FROM records WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC;`,
      [userId]
    );
    return rows.map(formatRecordFromRow);
  }

  const rows = await db.getAllAsync<any>(`SELECT * FROM records ORDER BY created_at DESC;`);
  return rows.map(formatRecordFromRow);
}

export async function getRecordById(id: string): Promise<LocalFieldRecord | null> {
  if (Platform.OS === 'web') {
    const record = getWebRecords().find((r) => r.id === id);
    return record || null;
  }

  const db = await getNativeDB();
  const row = await db.getFirstAsync<any>(`SELECT * FROM records WHERE id = ?;`, [id]);
  return row ? formatRecordFromRow(row) : null;
}

export async function updateRecordSyncStatus(
  id: string,
  status: SyncStatus,
  serverError?: string | null
): Promise<void> {
  const now = new Date().toISOString();

  if (Platform.OS === 'web') {
    const records = getWebRecords();
    const target = records.find((r) => r.id === id);
    if (target) {
      target.sync_status = status;
      target.server_error = serverError || null;
      target.updated_at = now;
      saveWebRecords(records);
    }
    return;
  }

  const db = await getNativeDB();
  await db.runAsync(
    `UPDATE records SET sync_status = ?, server_error = ?, updated_at = ? WHERE id = ?;`,
    [status, serverError || null, now, id]
  );
}

export async function deleteRecord(id: string): Promise<void> {
  if (Platform.OS === 'web') {
    const records = getWebRecords().filter((r) => r.id !== id);
    saveWebRecords(records);
    return;
  }

  const db = await getNativeDB();
  await db.runAsync(`DELETE FROM records WHERE id = ?;`, [id]);
}

function formatRecordFromRow(row: any): LocalFieldRecord {
  return {
    id: row.id,
    user_id: row.user_id || undefined,
    state: row.state,
    lga: row.lga,
    ward: row.ward,
    collection_date: row.collection_date,
    latitude: row.latitude,
    longitude: row.longitude,
    gps_accuracy_m: row.gps_accuracy_m,
    species: row.species,
    insecticide: row.insecticide,
    n_exposed: row.n_exposed,
    n_dead: row.n_dead,
    mortality_pct: row.mortality_pct,
    who_class: row.who_class,
    larval_density: row.larval_density,
    urban: Boolean(row.urban),
    irs_covered: Boolean(row.irs_covered),
    itn_use_pct: row.itn_use_pct,
    sync_status: row.sync_status as SyncStatus,
    server_error: row.server_error,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
