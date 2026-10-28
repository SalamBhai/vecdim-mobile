import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Screen } from '../components/ui/Screen';
import { AppButton } from '../components/ui/AppButton';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import {
  getAllRecords,
  updateRecordSyncStatus,
  deleteRecord,
  LocalFieldRecord,
  SyncStatus,
} from '../storage/db';
import { submitBatchRecords, BatchSyncResponse } from '../api/client';

export const OutboxSyncScreen: React.FC<{ onEditRecord?: (id: string) => void }> = ({
  onEditRecord,
}) => {
  const queryClient = useQueryClient();

  // Load records from local SQLite
  const {
    data: records = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<LocalFieldRecord[]>({
    queryKey: ['localRecords'],
    queryFn: async () => {
      return await getAllRecords();
    },
  });

  // Calculate stats
  const pendingRecords = records.filter((r) => r.sync_status === 'pending_sync');
  const syncedRecords = records.filter((r) => r.sync_status === 'synced');
  const rejectedRecords = records.filter((r) => r.sync_status === 'rejected');

  // TanStack Query Mutation for Outbox Sync
  const syncMutation = useMutation({
    mutationFn: async (itemsToSync: LocalFieldRecord[]) => {
      return await submitBatchRecords(itemsToSync);
    },
    onSuccess: async (data: BatchSyncResponse) => {
      // Map rejections by record_id
      const rejectionMap = new Map<string, string>();
      if (data.rejections && data.rejections.length > 0) {
        for (const rej of data.rejections) {
          rejectionMap.set(rej.record_id, rej.reason);
        }
      }

      // Update SQLite records
      for (const rec of pendingRecords) {
        if (rejectionMap.has(rec.id)) {
          const reason = rejectionMap.get(rec.id)!;
          await updateRecordSyncStatus(rec.id, 'rejected', reason);
        } else {
          await updateRecordSyncStatus(rec.id, 'synced', null);
        }
      }

      // Refresh list
      queryClient.invalidateQueries({ queryKey: ['localRecords'] });

      const rejectedCount = data.rejected_count ?? 0;
      const acceptedCount = data.accepted_count ?? 0;

      if (rejectedCount > 0) {
        Alert.alert(
          'Sync Completed with Flags (207 Multi-Status)',
          `Synced: ${acceptedCount} accepted, ${rejectedCount} rejected by R validation engine. Check rejected items below.`
        );
      } else {
        Alert.alert(
          'Sync Successful',
          `All ${acceptedCount} field records staged to backend successfully!`
        );
      }
    },
    onError: (error: any) => {
      Alert.alert(
        'Sync Network Error',
        error.message || 'Could not connect to national server. Records remain safe in offline storage.'
      );
    },
  });

  const handleSyncNow = () => {
    if (pendingRecords.length === 0) {
      Alert.alert('Outbox Empty', 'No pending records to sync.');
      return;
    }
    syncMutation.mutate(pendingRecords);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Record', 'Are you sure you want to remove this record from local storage?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteRecord(id);
          queryClient.invalidateQueries({ queryKey: ['localRecords'] });
        },
      },
    ]);
  };

  const renderStatusBadge = (status: SyncStatus) => {
    switch (status) {
      case 'synced':
        return <Badge label="SYNCED" variant="emerald" />;
      case 'rejected':
        return <Badge label="REJECTED" variant="rose" />;
      case 'pending_sync':
      default:
        return <Badge label="PENDING SYNC" variant="amber" />;
    }
  };

  const renderRecordItem = ({ item }: { item: LocalFieldRecord }) => {
    return (
      <View className="bg-white rounded-xl p-4 mb-3 border border-slate-200/80 shadow-sm">
        {/* Header with Client UUID & Status */}
        <View className="flex-row items-center justify-between mb-2 pb-2 border-b border-slate-100">
          <View className="flex-row items-center">
            <Text className="text-[11px] font-mono font-semibold text-slate-400 mr-2">
              #{item.id.substring(0, 12)}...
            </Text>
          </View>
          {renderStatusBadge(item.sync_status)}
        </View>

        {/* Location & Date */}
        <View className="flex-row items-center justify-between mb-1.5">
          <Text className="text-[15px] font-bold text-slate-900">
            {item.state} • {item.lga}
          </Text>
          <Text className="text-[12px] text-slate-500 font-medium font-mono">
            {item.collection_date}
          </Text>
        </View>

        <Text className="text-[13px] text-slate-600 mb-2">
          Ward: {item.ward} • {item.species}
        </Text>

        {/* Entomological Summary */}
        <View className="flex-row items-center justify-between bg-slate-50 rounded-lg p-2.5 border border-slate-200/60 mb-2">
          <View>
            <Text className="text-[11px] font-semibold text-slate-400 uppercase">
              INSECTICIDE
            </Text>
            <Text className="text-[13px] font-medium text-slate-800">
              {item.insecticide}
            </Text>
          </View>

          <View className="items-end">
            <Text className="text-[11px] font-semibold text-slate-400 uppercase">
              MORTALITY
            </Text>
            <Text className="text-[13px] font-bold text-slate-800">
              {item.n_dead}/{item.n_exposed} ({item.mortality_pct}%)
            </Text>
          </View>
        </View>

        {/* Rejection / Validation Warning Banner */}
        {item.sync_status === 'rejected' && item.server_error && (
          <View className="bg-red-50 rounded-lg p-3 border border-red-200 mb-2">
            <Text className="text-[12px] font-bold text-red-900 mb-0.5">
              ⚠️ Server Rejection Flag:
            </Text>
            <Text className="text-[12px] text-red-700">
              {item.server_error}
            </Text>
          </View>
        )}

        {/* Action Toolbar */}
        <View className="flex-row items-center justify-end mt-1 space-x-2">
          {item.sync_status === 'rejected' && (
            <Pressable
              onPress={() => onEditRecord?.(item.id)}
              className="px-3 py-1.5 bg-teal-50 rounded-lg border border-teal-200 mr-2 active:bg-teal-100"
            >
              <Text className="text-[12px] font-semibold text-teal-700">
                Edit & Resubmit
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={() => handleDelete(item.id)}
            className="px-2.5 py-1.5 bg-slate-100 rounded-lg active:bg-slate-200"
          >
            <Text className="text-[12px] font-medium text-slate-600">Delete</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <View className="flex-1">
        {/* Outbox Header */}
        <View className="mb-3 mt-2">
          <Text className="text-[22px] font-bold text-slate-900 tracking-tight">
            Surveillance Outbox
          </Text>
          <Text className="text-[13px] text-slate-500">
            ODK-Style Offline Queue & Backend Synchronization
          </Text>
        </View>

        {/* Metrics Status Banner */}
        <View className="flex-row mb-3.5 space-x-2">
          <View className="flex-1 bg-white p-3 rounded-xl border border-slate-200 items-center mr-2">
            <Text className="text-[18px] font-bold text-amber-600">
              {pendingRecords.length}
            </Text>
            <Text className="text-[11px] font-medium text-slate-400 uppercase mt-0.5">
              Pending
            </Text>
          </View>

          <View className="flex-1 bg-white p-3 rounded-xl border border-slate-200 items-center mr-2">
            <Text className="text-[18px] font-bold text-emerald-600">
              {syncedRecords.length}
            </Text>
            <Text className="text-[11px] font-medium text-slate-400 uppercase mt-0.5">
              Synced
            </Text>
          </View>

          <View className="flex-1 bg-white p-3 rounded-xl border border-slate-200 items-center">
            <Text className="text-[18px] font-bold text-red-600">
              {rejectedRecords.length}
            </Text>
            <Text className="text-[11px] font-medium text-slate-400 uppercase mt-0.5">
              Rejected
            </Text>
          </View>
        </View>

        {/* Sync Action Button */}
        <View className="mb-3.5">
          <AppButton
            label={
              syncMutation.isPending
                ? 'Synchronizing Batch...'
                : `Sync Outbox Now (${pendingRecords.length} Pending)`
            }
            onPress={handleSyncNow}
            loading={syncMutation.isPending}
            disabled={pendingRecords.length === 0 || syncMutation.isPending}
          />
        </View>

        {/* Record Queue List */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0D9488" />
            <Text className="text-[13px] text-slate-400 mt-2">Loading outbox...</Text>
          </View>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(item) => item.id}
            renderItem={renderRecordItem}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 30 }}
            ListEmptyComponent={
              <View className="bg-white rounded-2xl p-8 items-center justify-center border border-dashed border-slate-200 mt-4">
                <Text className="text-3xl mb-2">📭</Text>
                <Text className="text-[16px] font-bold text-slate-800">
                  Outbox is Empty
                </Text>
                <Text className="text-[13px] text-slate-400 text-center mt-1">
                  New entomology surveys saved from Form E-1 will appear here ready for synchronization.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Screen>
  );
};
