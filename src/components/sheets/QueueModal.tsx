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
import { X, CheckCircle2, RefreshCw, UserCheck, Shield } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LocalFieldRecord, updateRecordSyncStatus } from '../../storage/db';
import { submitBatchRecords, BatchSyncResponse } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { getDemoUserById } from '../../data/demoUsers';

interface QueueModalProps {
  visible: boolean;
  onClose: () => void;
  records: LocalFieldRecord[];
}

export const QueueModal: React.FC<QueueModalProps> = ({ visible, onClose, records }) => {
  const { currentUser } = useAuth();
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
        <View className="bg-white rounded-t-[32px] p-5 max-h-[85%] shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
            <View>
              <Text className="text-[17px] font-extrabold text-slate-900">
                Offline Local Queue
              </Text>
              <Text className="text-[11px] text-slate-500">
                ODK Cache ({allPending.length} pending total)
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
            >
              <X size={16} color="#475569" />
            </Pressable>
          </View>

          {/* Sync Attribution Notice */}
          <View className="mt-3 p-2.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1 mr-2">
              <View
                className="w-7 h-7 rounded-lg items-center justify-center mr-2 shadow-xs"
                style={{ backgroundColor: currentUser?.avatarColor || '#047857' }}
              >
                <Text className="text-white font-bold text-[10.5px]">
                  {currentUser?.initials || 'EM'}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-bold text-emerald-950 leading-tight">
                  Officer: {currentUser?.name || 'Officer'} ({currentUser?.badge || 'Active'})
                </Text>
                <Text className="text-[10px] text-emerald-700">
                  Transmitting as: X-User-Id: {currentUser?.id || 'u_field_03'}
                </Text>
              </View>
            </View>
            <View className="px-2 py-0.5 rounded-md bg-emerald-200/60">
              <Text className="text-[9px] font-black text-emerald-900">
                {currentUser?.state || 'Osun'}
              </Text>
            </View>
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

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 12 }}>
            {displayRecords.length === 0 ? (
              <View className="py-8 items-center justify-center">
                <CheckCircle2 size={36} color="#10B981" />
                <Text className="text-[14px] font-bold text-slate-800 mt-2">
                  {filterMode === 'mine'
                    ? 'No pending scans for your profile'
                    : 'Offline queue is completely empty'}
                </Text>
                <Text className="text-[11px] text-slate-400 mt-1 text-center">
                  All entomology surveys have been synchronized with the Go backend.
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
                  onPress={() => syncMutation.mutate(displayRecords)}
                  disabled={syncMutation.isPending}
                  className="py-3.5 rounded-2xl bg-emerald-600 active:bg-emerald-700 items-center justify-center flex-row shadow-md mt-2"
                >
                  {syncMutation.isPending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <RefreshCw size={16} color="#FFFFFF" />
                  )}
                  <Text className="text-white font-bold text-[13px] ml-2">
                    {syncMutation.isPending
                      ? 'Synchronizing Batch...'
                      : `Sync ${displayRecords.length} Record${
                          displayRecords.length === 1 ? '' : 's'
                        } as ${currentUser?.firstName || 'Officer'}`}
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
