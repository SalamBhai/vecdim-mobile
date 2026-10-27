import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { NativeModules, AppState, AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { getAllRecords, updateRecordSyncStatus } from '../storage/db';
import { submitBatchRecords, BatchSyncResponse } from '../api/client';
import { useAuth } from './AuthContext';

interface NetworkContextType {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  connectionType: string;
  isSyncing: boolean;
  pendingCount: number;
  toggleSimulatedOffline: () => void;
  syncPendingRecords: () => Promise<{ success: boolean; syncedCount: number; message: string }>;
  refreshPendingCount: () => Promise<number>;
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  isSimulatedOffline: false,
  connectionType: 'wifi',
  isSyncing: false,
  pendingCount: 0,
  toggleSimulatedOffline: () => {},
  syncPendingRecords: async () => ({ success: false, syncedCount: 0, message: '' }),
  refreshPendingCount: async () => 0,
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

// Active HTTP probe against local backend & public 204 endpoint
async function probeConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
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
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Computed effective online status
  const isOnline = !isSimulatedOffline && hardwareConnected && (hardwareReachable ?? true);

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

  // 3. Hardware & Probe Network Detection
  useEffect(() => {
    if (nativeNetInfo) {
      // Native NetInfo module available
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
      // Fallback: active probe via heartbeat + AppState
      let isMounted = true;

      const checkConnectivity = async () => {
        const reachable = await probeConnectivity();
        if (isMounted) {
          setHardwareConnected(reachable);
          setHardwareReachable(reachable);
          setConnectionType(reachable ? 'wifi' : 'none');
        }
      };

      // Initial check
      checkConnectivity();

      // Check on AppState change (foregrounding app)
      const appStateSub = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          checkConnectivity();
        }
      });

      // 6-second heartbeat interval
      const intervalId = setInterval(checkConnectivity, 6000);

      return () => {
        isMounted = false;
        appStateSub.remove();
        clearInterval(intervalId);
      };
    }
  }, []);

  // 4. Auto-Sync on Network Restoration (Offline -> Online transition)
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

  // 5. Toggle Simulated Offline Mode
  const toggleSimulatedOffline = useCallback(() => {
    setIsSimulatedOffline((prev) => !prev);
  }, []);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isSimulatedOffline,
        connectionType,
        isSyncing,
        pendingCount,
        toggleSimulatedOffline,
        syncPendingRecords,
        refreshPendingCount,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
