import React from 'react';
import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
import { X, CheckCircle2, Clock, Bug, MapPin } from 'lucide-react-native';

export interface SurveyDetailRecord {
  id: string;
  source?: 'local' | 'server';
  sync_status?: string;
  state?: string;
  lga: string;
  ward: string;
  collection_date?: string;
  species?: string;
  insecticide?: string;
  n_exposed?: number;
  n_dead?: number;
  mortality_pct?: number;
  who_class?: string;
  larval_density?: number;
  latitude?: number;
  longitude?: number;
  itn_use_pct?: number;
  irs_covered?: boolean;
}

interface SurveyDetailModalProps {
  visible: boolean;
  onClose: () => void;
  record: SurveyDetailRecord | null;
  onOpenQueue?: () => void;
  onCompleteBioassay?: (record: SurveyDetailRecord) => void;
}

export const SurveyDetailModal: React.FC<SurveyDetailModalProps> = ({
  visible,
  onClose,
  record,
  onOpenQueue,
  onCompleteBioassay,
}) => {
  if (!record) return null;

  const isLocal = record.source === 'local' || record.sync_status === 'pending_sync';
  const isBioassayPending = record.who_class?.toLowerCase().includes('pending');
  const mortality = record.mortality_pct ?? 0;

  let resistanceColor = 'text-rose-600';
  let resistanceBadgeBg = 'bg-rose-50 border-rose-200';
  let resistanceBadgeText = 'text-rose-800';

  if (isBioassayPending) {
    resistanceColor = 'text-amber-600';
    resistanceBadgeBg = 'bg-amber-50 border-amber-200';
    resistanceBadgeText = 'text-amber-800';
  } else if (mortality >= 98.0) {
    resistanceColor = 'text-emerald-600';
    resistanceBadgeBg = 'bg-emerald-50 border-emerald-200';
    resistanceBadgeText = 'text-emerald-800';
  } else if (mortality >= 90.0) {
    resistanceColor = 'text-amber-600';
    resistanceBadgeBg = 'bg-amber-50 border-amber-200';
    resistanceBadgeText = 'text-amber-800';
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-[32px] px-6 pt-5 pb-6 h-[85%] shadow-2xl flex-col">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <View className="flex-1 mr-3">
              <Text className="text-[18px] font-extrabold text-slate-900 font-bricolage">
                {record.lga} • {record.ward}
              </Text>
              <Text className="text-[12px] text-slate-500 font-medium">
                State: {record.state || 'Osun'} • Form E-1 Survey Record
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
            >
              <X size={16} color="#475569" />
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingTop: 14, paddingBottom: 36 }}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            bounces={true}
          >
            {/* Sync Status Banner */}
            <View
              className={`p-3.5 rounded-2xl border flex-row items-center mb-3.5 ${
                isLocal ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
              }`}
            >
              {isLocal ? (
                <Clock size={18} color="#D97706" />
              ) : (
                <CheckCircle2 size={18} color="#059669" />
              )}
              <View className="ml-2.5 flex-1">
                <Text
                  className={`text-[12.5px] font-bold ${
                    isLocal ? 'text-amber-900' : 'text-emerald-900'
                  }`}
                >
                  {isLocal ? 'Staged in Local Outbox (SQLite)' : 'Synced to PostGIS Server'}
                </Text>
                <Text className="text-[11px] text-slate-500 mt-0.5">
                  ID: {record.id}
                </Text>
              </View>
            </View>

            {/* Entomological Bioassay Results */}
            <View className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200 mb-3.5 shadow-xs">
              <View className="flex-row items-center justify-between mb-2.5">
                <Text className="text-[11px] font-bold uppercase text-slate-500 tracking-wider font-bricolage">
                  WHO BIOASSAY RESULTS
                </Text>
                <View className={`px-2 py-0.5 rounded-md border ${resistanceBadgeBg}`}>
                  <Text className={`text-[10px] font-bold ${resistanceBadgeText}`}>
                    {record.who_class || (isBioassayPending ? 'Bioassay Pending' : 'Susceptible')}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between py-1.5 border-b border-slate-200/60">
                <Text className="text-[12px] text-slate-600">Insecticide Formulation</Text>
                <Text className="text-[12.5px] font-bold text-slate-900">
                  {record.insecticide || 'Permethrin'}
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-1.5 border-b border-slate-200/60">
                <Text className="text-[12px] text-slate-600">Vector Species</Text>
                <Text className="text-[12.5px] font-bold text-slate-900">
                  {record.species || 'Anopheles gambiae s.l.'}
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-1.5 border-b border-slate-200/60">
                <Text className="text-[12px] text-slate-600">Mosquitoes Exposed</Text>
                <Text className="text-[12.5px] font-mono font-bold text-slate-900">
                  {record.n_exposed ?? 0}
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-1.5 border-b border-slate-200/60">
                <Text className="text-[12px] text-slate-600">Mosquitoes Dead (24h)</Text>
                <Text className="text-[12.5px] font-mono font-bold text-slate-900">
                  {record.n_dead ?? 0}
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-1.5 pt-2.5">
                <Text className="text-[13px] font-bold text-slate-900 font-bricolage">
                  {isBioassayPending ? 'Bioassay Status' : 'Calculated Mortality'}
                </Text>
                <Text className={`text-[16px] font-black font-mono ${resistanceColor}`}>
                  {isBioassayPending ? 'Awaiting Readout' : `${Number(mortality).toFixed(1)}%`}
                </Text>
              </View>
            </View>

            {/* Field Surveillance & GIS Metrics */}
            <View className="bg-slate-50/90 p-4 rounded-2xl border border-slate-200 mb-4 shadow-xs">
              <Text className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-2.5 font-bricolage">
                FIELD SURVEILLANCE & GIS
              </Text>
              <View className="flex-row items-center justify-between py-1.5 border-b border-slate-200/60">
                <Text className="text-[12px] text-slate-600">Larval Density</Text>
                <Text className="text-[12.5px] font-bold text-slate-900">
                  {record.larval_density ?? 0} /dip
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-1.5 border-b border-slate-200/60">
                <Text className="text-[12px] text-slate-600">Collection Date</Text>
                <Text className="text-[12px] font-semibold text-slate-800">
                  {record.collection_date || '2026-10-28'}
                </Text>
              </View>
              {record.latitude && record.longitude && (
                <View className="flex-row items-center justify-between py-1.5 border-b border-slate-200/60">
                  <Text className="text-[12px] text-slate-600">GPS Coordinates</Text>
                  <Text className="text-[11.5px] font-mono text-slate-700">
                    {Number(record.latitude).toFixed(4)}°, {Number(record.longitude).toFixed(4)}°
                  </Text>
                </View>
              )}
              <View className="flex-row items-center justify-between py-1.5 border-b border-slate-200/60">
                <Text className="text-[12px] text-slate-600">ITN Bednet Coverage</Text>
                <Text className="text-[12.5px] font-bold text-slate-900">
                  {record.itn_use_pct ?? 65}%
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-1.5">
                <Text className="text-[12px] text-slate-600">IRS Spraying Covered</Text>
                <Text className="text-[12.5px] font-bold text-slate-900">
                  {record.irs_covered ? 'Yes (Active)' : 'No (Unsprayed)'}
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            {isBioassayPending && onCompleteBioassay ? (
              <Pressable
                onPress={() => {
                  onClose();
                  onCompleteBioassay(record);
                }}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 items-center justify-center shadow-xs active:bg-emerald-700 mb-2"
              >
                <Text className="text-white font-bold text-[13.5px] font-bricolage">
                  Complete WHO Bioassay (Day 7) →
                </Text>
              </Pressable>
            ) : isLocal && onOpenQueue ? (
              <Pressable
                onPress={() => {
                  onClose();
                  onOpenQueue();
                }}
                className="w-full py-3.5 rounded-2xl bg-amber-600 items-center justify-center shadow-xs active:bg-amber-700 mb-2"
              >
                <Text className="text-white font-bold text-[13px] font-bricolage">
                  Review in Offline Outbox
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={onClose}
                className="w-full py-3.5 rounded-2xl bg-slate-900 items-center justify-center shadow-xs active:bg-slate-800 mb-2"
              >
                <Text className="text-white font-bold text-[13px] font-bricolage">Done</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
