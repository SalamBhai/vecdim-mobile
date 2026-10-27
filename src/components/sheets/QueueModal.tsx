import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, CheckCircle2, RefreshCw, UserCheck, Shield, CloudOff } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalFieldRecord, updateRecordSyncStatus } from '../../storage/db';
import { submitBatchRecords, BatchSyncResponse } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useNetwork } from '../../context/NetworkContext';
import { getDemoUserById } from '../../data/demoUsers';

interface QueueModalProps {
  visible: boolean;
  onClose: () => void;
  records: LocalFieldRecord[];
}

export const QueueModal: React.FC<QueueModalProps> = ({ visible, onClose, records }) => {
  const { currentUser } = useAuth();
  const { isOnline, isSimulatedOffline, toggleSimulatedOffline } = useNetwork();
  const queryClient = useQueryClient();
  const [filterMode, setFilterMode] = useState<'mine' | 'all'>('mine');

  // Filter pending records
  const allPending = records.filter((r) => r.sync_status === 'pending_sync');
  const myPending = allPending.filter((r) => !r.user_id || r.user_id === currentUser?.id);

  const displayRecords = filterMode === 'mine' ? myPending : allPending;

  const syncMutation = useMutation({
    mutationFn: async (items: LocalFieldRecord[]) => {
      return await submitBatchRecords(items, currentUser?.id, currentUser?.role, currentUser?.state);
    },
    onSuccess: async (data: BatchSyncResponse) => {
      const rejectionMap = new Map<string, string>();
      if (data.results) {
        for (const res of data.results) {
          if (res.status === 'rejected' && res.errors && res.errors.length > 0) {
            rejectionMap.set(res.record_id, res.errors[0].message);
          }
        }
      } else if (data.rejections) {
        for (const rej of data.rejections) {
          rejectionMap.set(rej.record_id, rej.reason);
        }
      }

      for (const rec of displayRecords) {
        if (rejectionMap.has(rec.id)) {
          await updateRecordSyncStatus(rec.id, 'rejected', rejectionMap.get(rec.id));
        } else {
          await updateRecordSyncStatus(rec.id, 'synced', null);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['localRecords'] });

      Alert.alert(
        'Batch Sync Complete',
        `Successfully submitted under officer: ${currentUser?.name || 'Officer'} (${currentUser?.id || 'u_field'})\nAccepted: ${data.accepted_count || 0}, Rejected: ${data.rejected_count || 0}`
      );
    },
    onError: (err: any) => {
      Alert.alert('Network Error', err.message || 'Could not connect to Go backend');
    },
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-[32px] p-5 h-[85%] shadow-2xl flex-col">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <View>
              <View className="flex-row items-center">
                <Text className="text-[19px] font-extrabold text-slate-900 font-bricolage mr-2">
                  Offline Local Queue
                </Text>
                <Pressable
                  onPress={toggleSimulatedOffline}
                  className={`flex-row items-center px-2 py-0.5 rounded-full border ${
                    isOnline
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-amber-50 border-amber-300'
                  }`}
                >
                  {isOnline ? (
                    <View className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                  ) : (
                    <CloudOff size={10} color="#B45309" />
                  )}
                  <Text
                    className={`text-[9.5px] font-bold font-bricolage ${
                      isOnline ? 'text-emerald-800' : 'text-amber-900'
                    }`}
                  >
                    {isOnline ? 'Live' : isSimulatedOffline ? 'Offline (Sim)' : 'Offline'}
                  </Text>
                </Pressable>
              </View>
              <Text className="text-[11.5px] text-slate-400 font-medium mt-0.5">
                SQLite WAL • Auto-syncs on reconnection
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
            >
              <X size={16} color="#475569" />
            </Pressable>
          </View>

          {/* Filter Tabs: My Scans vs All Local */}
          <View className="flex-row mt-3 bg-slate-100 p-1 rounded-xl">
            <Pressable
              onPress={() => setFilterMode('mine')}
              className={`flex-1 py-1.5 rounded-lg items-center justify-center ${
                filterMode === 'mine' ? 'bg-white shadow-xs' : ''
              }`}
            >
              <Text
                className={`text-[11.5px] font-bold ${
                  filterMode === 'mine' ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                My Scans ({myPending.length})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setFilterMode('all')}
              className={`flex-1 py-1.5 rounded-lg items-center justify-center ${
                filterMode === 'all' ? 'bg-white shadow-xs' : ''
              }`}
            >
              <Text
                className={`text-[11.5px] font-bold ${
                  filterMode === 'all' ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                All Local Queue ({allPending.length})
              </Text>
            </Pressable>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
            {displayRecords.length === 0 ? (
              <View className="py-12 items-center justify-center">
                <CheckCircle2 size={40} color="#10B981" />
                <Text className="text-[16px] font-extrabold text-slate-900 mt-3 font-bricolage text-center">
                  Offline queue is empty
                </Text>
                <Text className="text-[12px] text-slate-400 mt-1 text-center max-w-[280px]">
                  Toggle offline mode in the navbar to test offline caching.
                </Text>
              </View>
            ) : (
              <View className="space-y-2">
                {displayRecords.map((item) => {
                  const recordUser = getDemoUserById(item.user_id || 'u_field_03');
                  return (
                    <View
                      key={item.id}
                      className="p-3 bg-slate-50 rounded-2xl border border-slate-200 mb-2"
                    >
                      <View className="flex-row items-center justify-between mb-1">
                        <View className="flex-row items-center flex-1 mr-2">
                          <View
                            className="w-5 h-5 rounded-md items-center justify-center mr-1.5"
                            style={{ backgroundColor: recordUser.avatarColor }}
                          >
                            <Text className="text-white text-[9px] font-bold">
                              {recordUser.initials}
                            </Text>
                          </View>
                          <Text className="text-[12px] font-bold text-slate-900">
                            MALARIA: {item.state} • {item.lga}
                          </Text>
                        </View>
                        <Text className="text-[10px] text-slate-400 font-mono">
                          {new Date(item.created_at).toLocaleTimeString()}
                        </Text>
                      </View>
                      <Text className="text-[11px] text-slate-600 mb-1">
                        {item.ward} • {item.species} • Mortality: {item.mortality_pct}% ({item.who_class})
                      </Text>
                      <View className="flex-row items-center justify-between">
                        <Text className="text-[9.5px] text-slate-400">
                          Captured by: {recordUser.name} ({item.user_id || 'u_field_03'})
                        </Text>
                        <View className="px-1.5 py-0.5 rounded bg-amber-100">
                          <Text className="text-[9px] font-bold text-amber-800">
                            Staged Locally
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}

                <Pressable
                  onPress={() => {
                    if (!isOnline) {
                      Alert.alert(
                        'Device Offline',
                        'Device is currently offline (or simulated offline). Records are safely saved in SQLite WAL and will automatically sync to PostGIS as soon as connection is restored.'
                      );
                      return;
                    }
                    syncMutation.mutate(displayRecords);
                  }}
                  disabled={syncMutation.isPending}
                  className={`py-3.5 rounded-2xl items-center justify-center flex-row shadow-md mt-2 ${
                    !isOnline
                      ? 'bg-amber-600 active:bg-amber-700'
                      : 'bg-emerald-600 active:bg-emerald-700'
                  }`}
                >
                  {syncMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : !isOnline ? (
                    <CloudOff size={16} color="#FFFFFF" />
                  ) : (
                    <RefreshCw size={16} color="#FFFFFF" />
                  )}
                  <Text className="text-white font-bold text-[13px] ml-2 font-bricolage">
                    {syncMutation.isPending
                      ? 'Synchronizing Batch...'
                      : !isOnline
                      ? `Offline (${displayRecords.length} Staged — Auto-Syncs on Connect)`
                      : `Sync ${displayRecords.length} Record${
                          displayRecords.length === 1 ? '' : 's'
                        } to PostGIS`}
                  </Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
