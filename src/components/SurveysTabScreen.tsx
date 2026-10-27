import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  Search,
  X,
  CheckCircle2,
  Clock,
  Bug,
  MapPin,
  RefreshCw,
  Plus,
  ShieldAlert,
  SlidersHorizontal,
  ChevronRight,
  Database,
  Calendar,
} from 'lucide-react-native';

import { DemoUser } from '../data/demoUsers';
import { ServerRecord } from '../api/client';
import { LocalFieldRecord } from '../storage/db';

interface SurveysTabScreenProps {
  currentUser: DemoUser;
  serverRecords: ServerRecord[];
  pendingLocalRecords: LocalFieldRecord[];
  loadingServer: boolean;
  onRefresh: () => void;
  onOpenCapture: () => void;
  onOpenQueue: () => void;
  onOpenAlerts: () => void;
}

type FilterType = 'all' | 'pending' | 'synced' | 'resistance';

export const SurveysTabScreen: React.FC<SurveysTabScreenProps> = ({
  currentUser,
  serverRecords,
  pendingLocalRecords,
  loadingServer,
  onRefresh,
  onOpenCapture,
  onOpenQueue,
  onOpenAlerts,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  // Normalize unified list of items
  const combinedRecords = useMemo(() => {
    const locals = pendingLocalRecords.map((r) => ({
      ...r,
      source: 'local' as const,
      statusLabel: 'Pending Sync (SQLite WAL)',
      badgeVariant: 'amber' as const,
    }));

    const servers = serverRecords.map((r) => ({
      ...r,
      source: 'server' as const,
      statusLabel: 'PostGIS Synced',
      badgeVariant: 'emerald' as const,
    }));

    return [...locals, ...servers];
  }, [pendingLocalRecords, serverRecords]);

  // Count high resistance items (<90% mortality)
  const highResistanceCount = useMemo(() => {
    return combinedRecords.filter((r) => (r.mortality_pct ?? 0) < 90).length;
  }, [combinedRecords]);

  // Filtered items based on activeFilter and searchQuery
  const filteredRecords = useMemo(() => {
    return combinedRecords.filter((item) => {
      // 1. Tab filter
      if (activeFilter === 'pending' && item.source !== 'local') return false;
      if (activeFilter === 'synced' && item.source !== 'server') return false;
      if (activeFilter === 'resistance' && (item.mortality_pct ?? 0) >= 90) return false;

      // 2. Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const lga = (item.lga || '').toLowerCase();
      const ward = (item.ward || '').toLowerCase();
      const species = (item.species || '').toLowerCase();
      const insecticide = (item.insecticide || '').toLowerCase();
      const whoClass = (item.who_class || '').toLowerCase();

      return (
        lga.includes(q) ||
        ward.includes(q) ||
        species.includes(q) ||
        insecticide.includes(q) ||
        whoClass.includes(q)
      );
    });
  }, [combinedRecords, activeFilter, searchQuery]);

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32 }}
      >
        {/* 1. Header Bar */}
        <View className="flex-row items-center justify-between mb-3.5">
          <View className="flex-1 mr-3">
            <Text className="text-[20px] font-extrabold text-slate-900 tracking-tight">
              Surveys Collected
            </Text>
            <Text className="text-[11.5px] text-slate-500 font-medium mt-0.5" numberOfLines={1}>
              {currentUser.name} • {currentUser.state === 'National' ? 'Nationwide Archive' : `${currentUser.state} Jurisdiction`}
            </Text>
          </View>

          {/* Action cluster: Refresh + Queue button */}
          <View className="flex-row items-center space-x-2 gap-2">
            <Pressable
              onPress={onRefresh}
              disabled={loadingServer}
              className="w-9 h-9 rounded-full bg-white border border-slate-200 items-center justify-center shadow-xs active:bg-slate-100"
            >
              <RefreshCw
                size={15}
                color="#475569"
                className={loadingServer ? 'animate-spin' : ''}
              />
            </Pressable>
            <Pressable
              onPress={onOpenCapture}
              className="px-3 py-2 rounded-xl bg-slate-950 flex-row items-center shadow-xs active:bg-slate-800"
            >
              <Plus size={14} color="#FFFFFF" />
              <Text className="text-[11px] font-bold text-white ml-1">New Survey</Text>
            </Pressable>
          </View>
        </View>

        {/* 2. Top Metric Cards (3 KPI Cards) */}
        <View className="flex-row mb-3.5 gap-2">
          {/* Total */}
          <Pressable
            onPress={() => setActiveFilter('all')}
            className={`flex-1 p-2.5 rounded-2xl border items-start ${
              activeFilter === 'all'
                ? 'bg-slate-900 border-slate-900 shadow-xs'
                : 'bg-white border-slate-200/80'
            }`}
          >
            <Text
              className={`text-[9.5px] font-bold uppercase tracking-wider ${
                activeFilter === 'all' ? 'text-slate-300' : 'text-slate-400'
              }`}
            >
              Total Records
            </Text>
            <Text
              className={`text-[19px] font-extrabold mt-0.5 ${
                activeFilter === 'all' ? 'text-white' : 'text-slate-900'
              }`}
            >
              {combinedRecords.length}
            </Text>
          </Pressable>

          {/* Synced PostGIS */}
          <Pressable
            onPress={() => setActiveFilter('synced')}
            className={`flex-1 p-2.5 rounded-2xl border items-start ${
              activeFilter === 'synced'
                ? 'bg-emerald-700 border-emerald-700 shadow-xs'
                : 'bg-emerald-50/50 border-emerald-200'
            }`}
          >
            <View className="flex-row items-center">
              <CheckCircle2
                size={11}
                color={activeFilter === 'synced' ? '#A7F3D0' : '#059669'}
              />
              <Text
                className={`text-[9.5px] font-bold uppercase tracking-wider ml-1 ${
                  activeFilter === 'synced' ? 'text-emerald-100' : 'text-emerald-700'
                }`}
              >
                Synced
              </Text>
            </View>
            <Text
              className={`text-[19px] font-extrabold mt-0.5 ${
                activeFilter === 'synced' ? 'text-white' : 'text-emerald-950'
              }`}
            >
              {serverRecords.length}
            </Text>
          </Pressable>

          {/* Outbox Pending */}
          <Pressable
            onPress={() => setActiveFilter('pending')}
            className={`flex-1 p-2.5 rounded-2xl border items-start ${
              activeFilter === 'pending'
                ? 'bg-amber-600 border-amber-600 shadow-xs'
                : 'bg-amber-50/50 border-amber-200'
            }`}
          >
            <View className="flex-row items-center">
              <Clock
                size={11}
                color={activeFilter === 'pending' ? '#FDE68A' : '#D97706'}
              />
              <Text
                className={`text-[9.5px] font-bold uppercase tracking-wider ml-1 ${
                  activeFilter === 'pending' ? 'text-amber-100' : 'text-amber-700'
                }`}
              >
                Outbox
              </Text>
            </View>
            <Text
              className={`text-[19px] font-extrabold mt-0.5 ${
                activeFilter === 'pending' ? 'text-white' : 'text-amber-950'
              }`}
            >
              {pendingLocalRecords.length}
            </Text>
          </Pressable>
        </View>

        {/* 3. Search Bar */}
        <View className="mb-3 flex-row items-center bg-white px-3 py-2 rounded-2xl border border-slate-200/90 shadow-xs">
          <Search size={16} color="#94A3B8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search by LGA, Ward, species, or insecticide..."
            placeholderTextColor="#94A3B8"
            className="flex-1 text-[13px] text-slate-800 ml-2 py-0"
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} className="p-1">
              <X size={15} color="#94A3B8" />
            </Pressable>
          )}
        </View>

        {/* 4. Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row mb-3.5 space-x-1.5"
          contentContainerStyle={{ gap: 6 }}
        >
          <Pressable
            onPress={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-full border ${
              activeFilter === 'all'
                ? 'bg-slate-900 border-slate-900'
                : 'bg-white border-slate-200'
            }`}
          >
            <Text
              className={`text-[11px] font-bold ${
                activeFilter === 'all' ? 'text-white' : 'text-slate-600'
              }`}
            >
              All ({combinedRecords.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveFilter('pending')}
            className={`px-3 py-1.5 rounded-full border flex-row items-center ${
              activeFilter === 'pending'
                ? 'bg-amber-600 border-amber-600'
                : 'bg-amber-50 border-amber-200'
            }`}
          >
            <Clock
              size={11}
              color={activeFilter === 'pending' ? '#FFFFFF' : '#D97706'}
            />
            <Text
              className={`text-[11px] font-bold ml-1 ${
                activeFilter === 'pending' ? 'text-white' : 'text-amber-800'
              }`}
            >
              Outbox ({pendingLocalRecords.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveFilter('synced')}
            className={`px-3 py-1.5 rounded-full border flex-row items-center ${
              activeFilter === 'synced'
                ? 'bg-emerald-700 border-emerald-700'
                : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <CheckCircle2
              size={11}
              color={activeFilter === 'synced' ? '#FFFFFF' : '#059669'}
            />
            <Text
              className={`text-[11px] font-bold ml-1 ${
                activeFilter === 'synced' ? 'text-white' : 'text-emerald-800'
              }`}
            >
              Synced ({serverRecords.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveFilter('resistance')}
            className={`px-3 py-1.5 rounded-full border flex-row items-center ${
              activeFilter === 'resistance'
                ? 'bg-rose-600 border-rose-600'
                : 'bg-rose-50 border-rose-200'
            }`}
          >
            <ShieldAlert
              size={11}
              color={activeFilter === 'resistance' ? '#FFFFFF' : '#E11D48'}
            />
            <Text
              className={`text-[11px] font-bold ml-1 ${
                activeFilter === 'resistance' ? 'text-white' : 'text-rose-800'
              }`}
            >
              Resistance Alert ({highResistanceCount})
            </Text>
          </Pressable>
        </ScrollView>

        {/* 5. Surveys List Content */}
        {filteredRecords.length === 0 ? (
          <View className="bg-white rounded-3xl p-8 items-center justify-center border border-slate-200/80 my-2 shadow-xs">
            <View className="w-14 h-14 rounded-full bg-slate-100 items-center justify-center mb-3">
              <Bug size={26} color="#64748B" />
            </View>
            <Text className="text-[15px] font-extrabold text-slate-800 text-center">
              No matching surveys found
            </Text>
            <Text className="text-[12px] text-slate-500 text-center mt-1 max-w-[260px] leading-relaxed">
              {searchQuery
                ? `No results matching "${searchQuery}". Clear your search query or change filters.`
                : `No surveys recorded yet under ${currentUser.name}'s active ${currentUser.state} sentinel grid.`}
            </Text>

            <Pressable
              onPress={onOpenCapture}
              className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 flex-row items-center shadow-xs active:bg-emerald-700"
            >
              <Plus size={16} color="#FFFFFF" />
              <Text className="text-white text-[12.5px] font-bold ml-1.5">
                Capture Form E-1 Survey
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="space-y-3 gap-3">
            {filteredRecords.map((item, index) => {
              const isLocal = item.source === 'local';
              const mortality = item.mortality_pct ?? 0;
              const isHighResistance = mortality < 90;
              const isSusceptible = mortality >= 98;

              return (
                <Pressable
                  key={`survey-${item.id || index}`}
                  onPress={() => setSelectedRecord(item)}
                  className={`rounded-2xl p-4 border shadow-xs active:scale-[0.99] ${
                    isLocal
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-white border-slate-200/90'
                  }`}
                >
                  {/* Card Header: Location + Status Badge */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-1 mr-2">
                      <View className="flex-row items-center">
                        <Text className="text-[14px] font-extrabold text-slate-900 tracking-tight">
                          {item.lga}
                        </Text>
                        <Text className="text-[13px] font-medium text-slate-400 mx-1">•</Text>
                        <Text className="text-[13px] font-semibold text-slate-700">
                          {item.ward}
                        </Text>
                      </View>
                    </View>

                    {/* Status Badge */}
                    <View
                      className={`px-2 py-0.5 rounded-full flex-row items-center border ${
                        isLocal
                          ? 'bg-amber-100/80 border-amber-300'
                          : 'bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      {isLocal ? (
                        <Clock size={10} color="#B45309" />
                      ) : (
                        <CheckCircle2 size={10} color="#059669" />
                      )}
                      <Text
                        className={`text-[9px] font-bold ml-1 ${
                          isLocal ? 'text-amber-900' : 'text-emerald-800'
                        }`}
                      >
                        {isLocal ? 'Outbox Pending' : 'PostGIS Synced'}
                      </Text>
                    </View>
                  </View>

                  {/* Metadata: Date, Species & Coordinates */}
                  <View className="flex-row items-center text-slate-500 mb-3 flex-wrap gap-y-1">
                    <View className="flex-row items-center mr-3">
                      <Calendar size={11} color="#64748B" />
                      <Text className="text-[11px] text-slate-500 ml-1 font-medium">
                        {item.collection_date || '2026-10-27'}
                      </Text>
                    </View>
                    <View className="flex-row items-center mr-3">
                      <Bug size={11} color="#64748B" />
                      <Text className="text-[11px] text-slate-600 font-semibold ml-1">
                        {item.species || 'Anopheles gambiae'}
                      </Text>
                    </View>
                    {item.latitude && item.longitude && (
                      <View className="flex-row items-center">
                        <MapPin size={11} color="#94A3B8" />
                        <Text className="text-[10.5px] text-slate-400 ml-0.5 font-mono">
                          {Number(item.latitude).toFixed(4)}°, {Number(item.longitude).toFixed(4)}°
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Insecticide Bioassay Box */}
                  <View className="bg-slate-50/90 rounded-xl p-3 border border-slate-200/60 flex-row items-center justify-between">
                    <View className="flex-1 mr-2">
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        INSECTICIDE TESTED
                      </Text>
                      <Text className="text-[12.5px] font-bold text-slate-800 mt-0.5">
                        {item.insecticide || 'Permethrin 0.75%'}
                      </Text>
                      <Text className="text-[10.5px] text-slate-500 font-medium mt-0.5">
                        {item.n_dead ?? 0} knocked down / {item.n_exposed ?? 100} exposed
                      </Text>
                    </View>

                    {/* WHO Mortality Badge */}
                    <View
                      className={`px-3 py-1.5 rounded-xl border items-end ${
                        isHighResistance
                          ? 'bg-rose-50 border-rose-300'
                          : isSusceptible
                          ? 'bg-emerald-50 border-emerald-300'
                          : 'bg-amber-50 border-amber-300'
                      }`}
                    >
                      <View className="flex-row items-baseline">
                        <Text
                          className={`text-[15px] font-black font-mono ${
                            isHighResistance
                              ? 'text-rose-700'
                              : isSusceptible
                              ? 'text-emerald-700'
                              : 'text-amber-800'
                          }`}
                        >
                          {Number(mortality).toFixed(1)}%
                        </Text>
                        <Text className="text-[9.5px] text-slate-400 font-normal ml-0.5">
                          mort.
                        </Text>
                      </View>
                      <Text
                        className={`text-[9px] font-extrabold uppercase tracking-tight mt-0.5 ${
                          isHighResistance
                            ? 'text-rose-700'
                            : isSusceptible
                            ? 'text-emerald-800'
                            : 'text-amber-800'
                        }`}
                      >
                        {item.who_class || (isHighResistance ? 'Confirmed Resistance' : 'Susceptible')}
                      </Text>
                    </View>
                  </View>

                  {/* Larval Density & Footer Details */}
                  <View className="flex-row items-center justify-between mt-2.5 pt-2 border-t border-slate-100">
                    <Text className="text-[11px] text-slate-500">
                      Larval Density: <Text className="font-bold text-slate-800">{item.larval_density ?? 0} /dip</Text>
                    </Text>
                    <View className="flex-row items-center">
                      <Text className="text-[11px] font-bold text-emerald-600 mr-0.5">
                        {isLocal ? 'Review in Outbox' : 'Verified Record'}
                      </Text>
                      <ChevronRight size={13} color="#059669" />
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Selected Record Detail Bottom Sheet / Modal */}
      {selectedRecord && (
        <View className="absolute inset-0 bg-black/50 z-50 justify-end">
          <Pressable
            className="flex-1"
            onPress={() => setSelectedRecord(null)}
          />
          <View className="bg-white rounded-t-3xl p-6 border-t border-slate-200 max-h-[85%] shadow-2xl">
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
              <View>
                <Text className="text-[18px] font-extrabold text-slate-900">
                  {selectedRecord.lga} • {selectedRecord.ward}
                </Text>
                <Text className="text-[12px] text-slate-500 font-medium">
                  State: {selectedRecord.state} • WHO Tube Test Bioassay
                </Text>
              </View>
              <Pressable
                onPress={() => setSelectedRecord(null)}
                className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
              >
                <X size={16} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView className="py-4 space-y-3.5 gap-3" showsVerticalScrollIndicator={false}>
              {/* Sync Status Banner */}
              <View
                className={`p-3 rounded-2xl border flex-row items-center ${
                  selectedRecord.source === 'local'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-emerald-50 border-emerald-200'
                }`}
              >
                {selectedRecord.source === 'local' ? (
                  <Clock size={18} color="#D97706" />
                ) : (
                  <CheckCircle2 size={18} color="#059669" />
                )}
                <View className="ml-2.5 flex-1">
                  <Text
                    className={`text-[12.5px] font-bold ${
                      selectedRecord.source === 'local' ? 'text-amber-900' : 'text-emerald-900'
                    }`}
                  >
                    {selectedRecord.source === 'local'
                      ? 'Staged in Offline SQLite WAL Storage'
                      : 'Synced to PostGIS Modulith Database'}
                  </Text>
                  <Text className="text-[11px] text-slate-500 mt-0.5">
                    UUID: {selectedRecord.id}
                  </Text>
                </View>
              </View>

              {/* Bioassay Results Box */}
              <View className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <Text className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-2">
                  ENTOMOLOGICAL BIOASSAY
                </Text>
                <View className="flex-row items-center justify-between py-1 border-b border-slate-200/60">
                  <Text className="text-[12px] text-slate-600">Insecticide Formulation</Text>
                  <Text className="text-[12.5px] font-bold text-slate-900">{selectedRecord.insecticide}</Text>
                </View>
                <View className="flex-row items-center justify-between py-1 border-b border-slate-200/60">
                  <Text className="text-[12px] text-slate-600">Vector Species</Text>
                  <Text className="text-[12.5px] font-bold text-slate-900">{selectedRecord.species}</Text>
                </View>
                <View className="flex-row items-center justify-between py-1 border-b border-slate-200/60">
                  <Text className="text-[12px] text-slate-600">Mosquitoes Exposed</Text>
                  <Text className="text-[12.5px] font-mono font-bold text-slate-900">{selectedRecord.n_exposed}</Text>
                </View>
                <View className="flex-row items-center justify-between py-1 border-b border-slate-200/60">
                  <Text className="text-[12px] text-slate-600">Mosquitoes Knocked Down / Dead</Text>
                  <Text className="text-[12.5px] font-mono font-bold text-slate-900">{selectedRecord.n_dead}</Text>
                </View>
                <View className="flex-row items-center justify-between py-1 pt-2">
                  <Text className="text-[13px] font-bold text-slate-900">Calculated Mortality</Text>
                  <Text className="text-[16px] font-black text-rose-600 font-mono">
                    {Number(selectedRecord.mortality_pct).toFixed(1)}%
                  </Text>
                </View>
              </View>

              {/* Environmental & GIS Metadata */}
              <View className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <Text className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mb-2">
                  GIS & INTERVENTION METRICS
                </Text>
                <View className="flex-row items-center justify-between py-1 border-b border-slate-200/60">
                  <Text className="text-[12px] text-slate-600">Larval Density</Text>
                  <Text className="text-[12.5px] font-bold text-slate-900">{selectedRecord.larval_density} /dip</Text>
                </View>
                <View className="flex-row items-center justify-between py-1 border-b border-slate-200/60">
                  <Text className="text-[12px] text-slate-600">GPS Coordinates</Text>
                  <Text className="text-[11.5px] font-mono text-slate-700">
                    {selectedRecord.latitude}°, {selectedRecord.longitude}°
                  </Text>
                </View>
                <View className="flex-row items-center justify-between py-1 border-b border-slate-200/60">
                  <Text className="text-[12px] text-slate-600">ITN Bednet Coverage</Text>
                  <Text className="text-[12.5px] font-bold text-slate-900">{selectedRecord.itn_use_pct ?? 65}%</Text>
                </View>
                <View className="flex-row items-center justify-between py-1">
                  <Text className="text-[12px] text-slate-600">IRS Spraying Covered</Text>
                  <Text className="text-[12.5px] font-bold text-slate-900">
                    {selectedRecord.irs_covered ? 'Yes (Active)' : 'No (Unsprayed)'}
                  </Text>
                </View>
              </View>

              {/* Action buttons */}
              {selectedRecord.source === 'local' ? (
                <Pressable
                  onPress={() => {
                    setSelectedRecord(null);
                    onOpenQueue();
                  }}
                  className="w-full py-3 rounded-xl bg-amber-600 items-center justify-center shadow-xs active:bg-amber-700 mt-1"
                >
                  <Text className="text-white font-bold text-[13px]">
                    Open Outbox & Sync to Server
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => setSelectedRecord(null)}
                  className="w-full py-3 rounded-xl bg-slate-900 items-center justify-center shadow-xs active:bg-slate-800 mt-1"
                >
                  <Text className="text-white font-bold text-[13px]">Done</Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
};
