import { LocalFieldRecord } from '../storage/db';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

export interface BatchSyncResponse {
  batch_id?: string;
  total_submitted?: number;
  accepted_count?: number;
  rejected_count?: number;
  results?: Array<{
    record_id: string;
    status: 'accepted' | 'accepted_with_flags' | 'already_received' | 'rejected';
    flags?: Array<{ rule: string; field: string; severity: string; message: string }>;
    errors?: Array<{ rule: string; field: string; severity: string; message: string }>;
  }>;
  rejections?: Array<{
    record_id: string;
    reason: string;
    flags?: string[];
  }>;
  status?: 'COMPLETED' | 'PARTIAL_SUCCESS' | 'FAILED';
}

export async function submitBatchRecords(
  records: LocalFieldRecord[],
  userId?: string,
  userRole?: string,
  userState?: string
): Promise<BatchSyncResponse> {
  const payload = {
    device_id: 'vecdim-mobile-sim-01',
    records: records.map((r) => ({
      record_id: r.id,
      state: r.state,
      lga: r.lga,
      ward: r.ward,
      collection_date: r.collection_date,
      latitude: r.latitude,
      longitude: r.longitude,
      gps_accuracy_m: r.gps_accuracy_m,
      species: r.species,
      insecticide: r.insecticide,
      n_exposed: r.n_exposed,
      n_dead: r.n_dead,
      mortality_pct: r.mortality_pct,
      who_class: r.who_class,
      larval_density: r.larval_density !== undefined ? Math.round(r.larval_density) : undefined,
      urban: r.urban ? 1 : 0,
      irs_covered: r.irs_covered ? 1 : 0,
      itn_use_pct: r.itn_use_pct,
    })),
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-User-Id': userId || 'u_field_03',
  };
  if (userRole) headers['X-User-Role'] = userRole;
  if (userState && userState !== 'National') headers['X-User-State'] = userState;

  const response = await fetch(`${API_BASE_URL}/records/batch`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok && response.status !== 207) {
    throw new Error(data.message || `Sync failed with status ${response.status}`);
  }

  // Normalize response counts if backend returns results array
  if (data.results && data.accepted_count === undefined) {
    const accepted = data.results.filter(
      (r: any) => r.status === 'accepted' || r.status === 'accepted_with_flags' || r.status === 'already_received'
    ).length;
    const rejected = data.results.filter((r: any) => r.status === 'rejected').length;
    data.accepted_count = accepted;
    data.rejected_count = rejected;
    data.total_submitted = data.results.length;
  }

  return data;
}

export interface ServerRecord {
  id: string;
  user_id: string;
  device_id?: string;
  sync_batch_id?: string;
  state: string;
  lga: string;
  ward: string;
  latitude: number;
  longitude: number;
  gps_accuracy_m: number;
  collection_date: string;
  species: string;
  insecticide: string;
  n_exposed: number;
  n_dead: number;
  mortality_pct: number;
  who_class: string;
  larval_density: number;
  urban?: number;
  irs_covered?: number;
  itn_use_pct?: number;
  status: string;
  received_at: string;
  created_at: string;
}

export interface ServerRecordsResponse {
  count: number;
  records: ServerRecord[];
}

export async function fetchServerRecords(
  userId: string,
  state?: string,
  lga?: string
): Promise<ServerRecordsResponse> {
  const params = new URLSearchParams();
  if (state && state !== 'National') params.append('state', state);
  if (lga) params.append('lga', lga);

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE_URL}/records${queryStr}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch records: status ${response.status}`);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return { count: data.length, records: data };
  }
  return {
    count: data.count || data.records?.length || 0,
    records: data.records || [],
  };
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
