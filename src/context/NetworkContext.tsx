import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { NativeModules, AppState, AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { getAllRecords, updateRecordSyncStatus } from '../storage/db';
import { submitBatchRecords, BatchSyncResponse } from '../api/client';
import { useAuth } from './AuthContext';

interface NetworkContextType {
  isOnline: boolean;
  connectionType: string;
  isSyncing: boolean;
  pendingCount: number;
  syncPendingRecords: () => Promise<{ success: boolean; syncedCount: number; message: string }>;
  refreshPendingCount: () => Promise<number>;
  checkConnectivity: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  connectionType: 'wifi',
  isSyncing: false,
  pendingCount: 0,
  syncPendingRecords: async () => ({ success: false, syncedCount: 0, message: '' }),
  refreshPendingCount: async () => 0,
  checkConnectivity: async () => true,
});

// Dynamic check for native NetInfo binary module
let nativeNetInfo: any = null;
try {
  if (NativeModules && NativeModules.RNCNetInfo) {
    nativeNetInfo = require('@react-native-community/netinfo').default;
  }
} catch {
  nativeNetInfo = null;
}

// Active HTTP probe checking Go backend /health and internet fallback
async function probeConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('http://localhost:8080/health', {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('https://clients3.google.com/generate_204', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return res.status === 204 || res.ok;
    } catch {
      return false;
    }
  }
}

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [hardwareConnected, setHardwareConnected] = useState<boolean>(true);
  const [hardwareReachable, setHardwareReachable] = useState<boolean | null>(true);
  const [connectionType, setConnectionType] = useState<string>('wifi');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Effective real online status
  const isOnline = hardwareConnected && (hardwareReachable ?? true);

  // Track previous online state to trigger auto-sync on reconnection
  const wasOnlineRef = useRef<boolean>(true);

  // 1. Refresh pending outbox counter
  const refreshPendingCount = useCallback(async (): Promise<number> => {
    try {
      const records = await getAllRecords(currentUser?.id);
      const pending = records.filter((r) => r.sync_status === 'pending_sync').length;
      setPendingCount(pending);
      return pending;
    } catch {
      return 0;
    }
  }, [currentUser?.id]);

  useEffect(() => {
    refreshPendingCount();
  }, [currentUser?.id, refreshPendingCount]);

  // 2. Batch Sync Pending Records to Go Backend
  const syncPendingRecords = useCallback(async (): Promise<{
    success: boolean;
    syncedCount: number;
    message: string;
  }> => {
    if (!isOnline) {
      return { success: false, syncedCount: 0, message: 'Device is currently offline.' };
    }

    setIsSyncing(true);
    try {
      const records = await getAllRecords(currentUser?.id);
      const pending = records.filter((r) => r.sync_status === 'pending_sync');

      if (pending.length === 0) {
        setIsSyncing(false);
        return { success: true, syncedCount: 0, message: 'Outbox is empty.' };
      }

      const response: BatchSyncResponse = await submitBatchRecords(
        pending,
        currentUser?.id,
        currentUser?.role,
        currentUser?.state
      );

      const rejectionMap = new Map<string, string>();
      if (response.results) {
        for (const res of response.results) {
          if (res.status === 'rejected' && res.errors && res.errors.length > 0) {
            rejectionMap.set(res.record_id, res.errors[0].message);
          }
        }
      } else if (response.rejections) {
        for (const rej of response.rejections) {
          rejectionMap.set(rej.record_id, rej.reason);
        }
      }

      for (const rec of pending) {
        if (rejectionMap.has(rec.id)) {
          await updateRecordSyncStatus(rec.id, 'rejected', rejectionMap.get(rec.id));
        } else {
          await updateRecordSyncStatus(rec.id, 'synced', null);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['localRecords'] });
      await queryClient.invalidateQueries({ queryKey: ['serverRecords'] });
      await refreshPendingCount();

      setIsSyncing(false);
      return {
        success: true,
        syncedCount: response.accepted_count || pending.length,
        message: `Synced ${response.accepted_count || pending.length} records to server.`,
      };
    } catch (err: any) {
      setIsSyncing(false);
      return {
        success: false,
        syncedCount: 0,
        message: err.message || 'Synchronization failed.',
      };
    }
  }, [isOnline, currentUser, queryClient, refreshPendingCount]);

  // 3. Real Network Detection Engine
  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    const reachable = await probeConnectivity();
    setHardwareConnected(reachable);
    setHardwareReachable(reachable);
    setConnectionType(reachable ? 'wifi' : 'none');
    return reachable;
  }, []);

  useEffect(() => {
    if (nativeNetInfo) {
      const unsubscribe = nativeNetInfo.addEventListener((state: any) => {
        setHardwareConnected(state.isConnected ?? true);
        setHardwareReachable(state.isInternetReachable);
        setConnectionType(state.type || 'wifi');
      });

      nativeNetInfo.fetch().then((state: any) => {
        setHardwareConnected(state.isConnected ?? true);
        setHardwareReachable(state.isInternetReachable);
        setConnectionType(state.type || 'wifi');
      });

      return () => {
        unsubscribe();
      };
    } else {
      let isMounted = true;

      const runCheck = async () => {
        const reachable = await probeConnectivity();
        if (isMounted) {
          setHardwareConnected(reachable);
          setHardwareReachable(reachable);
          setConnectionType(reachable ? 'wifi' : 'none');
        }
      };

      runCheck();

      // Check on foregrounding
      const appStateSub = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          runCheck();
        }
      });

      // Regular heartbeat check (every 3 seconds for instant detection)
      const intervalId = setInterval(runCheck, 3000);

      return () => {
        isMounted = false;
        appStateSub.remove();
        clearInterval(intervalId);
      };
    }
  }, []);

  // 4. Auto-Sync on Real Network Restoration (Transitions from Offline -> Online)
  useEffect(() => {
    if (!wasOnlineRef.current && isOnline) {
      // Reconnected! Automatically attempt sync if there are pending items
      (async () => {
        const count = await refreshPendingCount();
        if (count > 0) {
          await syncPendingRecords();
        }
      })();
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline, refreshPendingCount, syncPendingRecords]);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        connectionType,
        isSyncing,
        pendingCount,
        syncPendingRecords,
        refreshPendingCount,
        checkConnectivity,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
