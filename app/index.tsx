import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  Scan,
  Home as HomeIcon,
  ClipboardList,
  Flame,
  User,
  Bug,
  Archive,
  Database,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  CloudOff,
} from 'lucide-react-native';

import { useAuth } from '../src/context/AuthContext';
import { useNetwork } from '../src/context/NetworkContext';
import { DemoUser } from '../src/data/demoUsers';
import { LoginScreen } from '../src/screens/LoginScreen';
import { SentinelHeroCard } from '../src/components/SentinelHeroCard';
import { TransectRouteMap } from '../src/components/TransectRouteMap';
import { SurveysTabScreen } from '../src/components/SurveysTabScreen';
import { EntomologyModal, RecordSavedInfo } from '../src/components/sheets/EntomologyModal';
import { SurveyDetailModal } from '../src/components/sheets/SurveyDetailModal';
import { QueueModal } from '../src/components/sheets/QueueModal';
import { AlertsModal } from '../src/components/sheets/AlertsModal';
import { Dhis2Modal } from '../src/components/sheets/Dhis2Modal';
import { AuthModal } from '../src/components/sheets/AuthModal';
import { getAllRecords, LocalFieldRecord, cacheServerRecords } from '../src/storage/db';
import { fetchServerRecords, ServerRecord, ServerRecordsResponse } from '../src/api/client';

export default function MainAppScreen() {
  const { currentUser, isAuthenticated, isLoading } = useAuth();

  // 1. Session initializing: clean loading screen
  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#10B981" />
        <Text className="text-white text-[13px] font-bold mt-3">
          Loading VECDIM Gateway...
        </Text>
      </View>
    );
  }

  // 2. Unauthenticated: Render dedicated enterprise Login Screen
  if (!isAuthenticated || !currentUser) {
    return <LoginScreen />;
  }

  // 3. Authenticated: Render Dashboard (all hooks reside inside AuthenticatedDashboard)
  return <AuthenticatedDashboard currentUser={currentUser} />;
}

// -------------------------------------------------------------
// AUTHENTICATED DASHBOARD (Hooks run unconditionally)
// -------------------------------------------------------------

function AuthenticatedDashboard({ currentUser }: { currentUser: DemoUser }) {
  const { isOnline, isSyncing, toggleOffline, syncPendingRecords } = useNetwork();
  const [activeTab, setActiveTab] = useState<'home' | 'surveys'>('home');
  const [activeModal, setActiveModal] = useState<
    'entomology' | 'queue' | 'alerts' | 'dhis2' | 'auth' | null
  >(null);
  const [viewingDetailRecord, setViewingDetailRecord] = useState<any | null>(null);
  const [editingPendingRecord, setEditingPendingRecord] = useState<LocalFieldRecord | null>(null);

  // Reusable callback to start a fresh Form E-1 survey (shared by Quick Action, Center Scan, and empty states)
  const handleOpenNewSurvey = useCallback(() => {
    setEditingPendingRecord(null);
    setActiveModal('entomology');
  }, []);

  // Reusable callback to resume an existing pending survey for Day 7 WHO Bioassay
  const handleResumeBioassay = useCallback((record: LocalFieldRecord | any) => {
    setViewingDetailRecord(null);
    setEditingPendingRecord(record as LocalFieldRecord);
    setActiveModal('entomology');
  }, []);

  // Non-blocking auto-dismissing toast notification
  const [toastMessage, setToastMessage] = useState<{
    title: string;
    subtitle?: string;
    type: 'success' | 'offline';
  } | null>(null);

  const handleRecordSaved = async (info?: RecordSavedInfo) => {
    handleRefreshAll();
    if (isOnline) {
      setToastMessage({
        title: 'Saving & Syncing...',
        subtitle: `${info?.lga || ''} • Uploading to national cloud`,
        type: 'success',
      });
      try {
        await syncPendingRecords();
        handleRefreshAll();
        setToastMessage({
          title: 'Survey Synced & Verified',
          subtitle: `${info?.lga || ''} • ${info?.bottleLabelId || 'Transmitted to server'}`,
          type: 'success',
        });
      } catch {
        setToastMessage({
          title: 'Saved to Outbox',
          subtitle: `${info?.lga || ''} • Will retry automatically`,
          type: 'offline',
        });
      }
    } else {
      setToastMessage({
        title: 'Saved to Offline Outbox',
        subtitle: `${info?.lga || ''} • ${info?.bottleLabelId || ''}`,
        type: 'offline',
      });
    }
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 2800);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Load live server records scoped to this authenticated officer
  const {
    data: serverData,
    isLoading: loadingServer,
    refetch: refetchServer,
  } = useQuery({
    queryKey: ['serverRecords', currentUser.id],
    queryFn: async () => {
      try {
        let res: ServerRecordsResponse;
        // National Director has nationwide oversight: fetch all records across Osun, Lagos, Kano
        if (currentUser.role === 'uniosun' || currentUser.state === 'National') {
          res = await fetchServerRecords(currentUser.id);
        } else if (currentUser.role === 'vecdim') {
          res = await fetchServerRecords(currentUser.id, currentUser.state);
        } else {
          res = await fetchServerRecords(currentUser.id, currentUser.state);
        }
        if (res?.records && res.records.length > 0) {
          cacheServerRecords(res.records, currentUser.id).catch(console.error);
        }
        return res;
      } catch {
        return null;
      }
    },
    enabled: !!currentUser.id && isOnline,
    placeholderData: (previousData) => previousData,
    refetchInterval: isOnline ? 3000 : false,
  });

  // Load local offline records scoped to this authenticated officer
  const {
    data: localRecords = [],
    refetch: refetchLocal,
  } = useQuery({
    queryKey: ['localRecords', currentUser.id],
    queryFn: async () => await getAllRecords(currentUser.id),
    enabled: !!currentUser.id,
  });

  const handleRefreshAll = () => {
    refetchLocal();
    if (isOnline) {
      refetchServer();
    }
  };

  const pendingLocalRecords = localRecords.filter((r) => r.sync_status === 'pending_sync');
  const localSyncedRecords = localRecords.filter((r) => r.sync_status === 'synced');

  // Unified synced records: preserves all surveys offline from SQLite cache + overlays live server records
  const unifiedSyncedRecords = useMemo(() => {
    const map = new Map<string, any>();
    // 1. Seed with local SQLite synced records (available offline)
    for (const r of localSyncedRecords) {
      map.set(r.id, r);
    }
    // 2. Overlay live server records if online
    if (serverData?.records) {
      for (const r of serverData.records) {
        map.set(r.id, r);
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const dateA = a.created_at || a.collection_date || '';
      const dateB = b.created_at || b.collection_date || '';
      return dateB.localeCompare(dateA);
    });
  }, [localSyncedRecords, serverData?.records]);

  // Automatically flush outbox whenever the device is online and pending items exist
  useEffect(() => {
    if (isOnline && pendingLocalRecords.length > 0 && !isSyncing) {
      syncPendingRecords().catch(console.error);
    }
  }, [isOnline, pendingLocalRecords.length, isSyncing, syncPendingRecords]);

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      {/* 1. Top Safe Area Container */}
      <SafeAreaView className="flex-1" edges={['top']}>
        {activeTab === 'home' ? (
          /* Scrollable Home Screen Content */
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}
            className="flex-1"
            refreshControl={
              <RefreshControl refreshing={loadingServer} onRefresh={handleRefreshAll} />
            }
          >
          {/* Header Profile Bar */}
          <View className="flex-row items-center justify-between mb-4">
            <Pressable
              onPress={() => setActiveModal('auth')}
              className="flex-row items-center flex-1 mr-3 active:opacity-75 min-w-0"
            >
              <View
                className="w-10 h-10 rounded-2xl items-center justify-center mr-3 shadow-xs shrink-0"
                style={{ backgroundColor: currentUser.avatarColor }}
              >
                <Text className="text-white font-extrabold text-[13.5px]">
                  {currentUser.initials}
                </Text>
              </View>
              <View className="flex-1 min-w-0">
                <View className="flex-row items-center">
                  <Text className="font-extrabold text-[16px] text-slate-900 leading-tight mr-1.5" numberOfLines={1}>
                    Hi, {currentUser.firstName}
                  </Text>
                  <View className="px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 shrink-0">
                    <Text className="text-[9px] font-bold text-slate-700">
                      {currentUser.badge}
                    </Text>
                  </View>
                </View>
                <Text className="text-[11.5px] text-slate-500 font-medium mt-0.5" numberOfLines={1}>
                  {currentUser.state === 'National' ? 'Nationwide vector surveillance grid active' : `${currentUser.state} vector surveillance grid active`}
                </Text>
              </View>
            </Pressable>

            {/* Live Network Status Badge (Clickable Toggle to Simulate Offline Mode) */}
            <Pressable
              onPress={toggleOffline}
              className={`flex-row items-center px-2.5 py-1.5 rounded-full mr-2 shadow-xs border active:opacity-70 ${
                isOnline
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-rose-50 border-rose-300'
              }`}
            >
              {isOnline ? (
                <View className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
              ) : (
                <CloudOff size={11} color="#E11D48" />
              )}
              <Text
                className={`text-[10px] font-bold font-bricolage ml-0.5 ${
                  isOnline ? 'text-emerald-800' : 'text-rose-800'
                }`}
              >
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </Pressable>

            {/* Outbreak Notification Bell */}
            <Pressable
              onPress={() => setActiveModal('alerts')}
              className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center relative active:bg-slate-200 shrink-0 shadow-xs"
            >
              <Bell size={18} color="#334155" />
              <View className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 border-2 border-white" />
            </Pressable>
          </View>

        {/* 1. Sentinel Site Inspection Hero Card */}
        <SentinelHeroCard onPressProfile={() => setActiveModal('auth')} />

        {/* 2. Quick Action Grid (4 Buttons) */}
        <View className="flex-row mb-4 gap-2">
          {/* Action 1: Malaria */}
          <Pressable
            onPress={handleOpenNewSurvey}
            className="flex-1 bg-white rounded-2xl py-3 px-1 border border-slate-100 items-center justify-center shadow-xs active:bg-slate-50"
          >
            <View className="w-10 h-10 rounded-xl bg-emerald-50 items-center justify-center mb-1.5">
              <Bug size={18} color="#059669" />
            </View>
            <Text className="text-[11px] font-bold text-slate-900 leading-tight">
              Malaria
            </Text>
            <Text className="text-[9.5px] text-slate-400 font-medium mt-0.5">
              Larval E-1
            </Text>
          </Pressable>

          {/* Action 2: Early Warning Alerts */}
          <Pressable
            onPress={() => setActiveModal('alerts')}
            className="flex-1 bg-white rounded-2xl py-3 px-1 border border-slate-100 items-center justify-center shadow-xs active:bg-slate-50"
          >
            <View className="w-10 h-10 rounded-xl bg-rose-50 items-center justify-center mb-1.5">
              <Flame size={18} color="#E11D48" />
            </View>
            <Text className="text-[11px] font-bold text-slate-900 leading-tight">
              Alerts
            </Text>
            <Text className="text-[9.5px] text-slate-400 font-medium mt-0.5">
              EWS Outbreak
            </Text>
          </Pressable>

          {/* Action 3: Offline Queue */}
          <Pressable
            onPress={() => setActiveModal('queue')}
            className="flex-1 bg-white rounded-2xl py-3 px-1 border border-slate-100 items-center justify-center shadow-xs active:bg-slate-50"
          >
            <View className="w-10 h-10 rounded-xl bg-amber-50 items-center justify-center mb-1.5">
              <Archive size={18} color="#D97706" />
            </View>
            <Text className="text-[11px] font-bold text-slate-900 leading-tight">
              Queue
            </Text>
            <Text className="text-[9.5px] text-slate-400 font-medium mt-0.5">
              Offline ({pendingLocalRecords.length})
            </Text>
          </Pressable>

          {/* Action 4: DHIS2 */}
          <Pressable
            onPress={() => setActiveModal('dhis2')}
            className="flex-1 bg-white rounded-2xl py-3 px-1 border border-slate-100 items-center justify-center shadow-xs active:bg-slate-50"
          >
            <View className="w-10 h-10 rounded-xl bg-slate-100 items-center justify-center mb-1.5">
              <Database size={18} color="#1E293B" />
            </View>
            <Text className="text-[11px] font-bold text-slate-900 leading-tight">
              DHIS2
            </Text>
            <Text className="text-[9.5px] text-slate-400 font-medium mt-0.5">
              NHMIS Feed
            </Text>
          </Pressable>
        </View>

        {/* 3. Active Transect Route Map (Dynamically displays active jurisdiction landmarks) */}
        <TransectRouteMap onPressDetails={handleOpenNewSurvey} />

        {/* 4. Officer Surveys Feed: Retrieved specifically for this officer */}
        <View className="mb-2">
          <View className="flex-row items-center justify-between mb-2.5">
            <View className="flex-row items-center">
              <Text className="text-[14px] font-bold text-slate-900 tracking-tight">
                Surveys Collected ({unifiedSyncedRecords.length + pendingLocalRecords.length})
              </Text>
              {loadingServer && (
                <ActivityIndicator size="small" color="#059669" className="ml-2" />
              )}
            </View>
            <View className="flex-row items-center gap-2">
              <Pressable onPress={() => setActiveModal('queue')}>
                <Text className="text-[12px] font-bold text-amber-600">
                  Outbox ({pendingLocalRecords.length})
                </Text>
              </Pressable>
              <Text className="text-slate-300">•</Text>
              <Pressable onPress={() => setActiveTab('surveys')}>
                <Text className="text-[12px] font-bold text-emerald-600">
                  View All →
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Staged pending local scans first */}
          {pendingLocalRecords.map((item) => {
            const isPendingBioassay = item.who_class?.toLowerCase().includes('pending');
            return (
              <Pressable
                key={`local-${item.id}`}
                onPress={() => {
                  if (isPendingBioassay) {
                    handleResumeBioassay(item);
                  } else {
                    setViewingDetailRecord({ ...item, source: 'local' });
                  }
                }}
                className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-300 shadow-xs flex-row items-center justify-between mb-2.5 active:bg-amber-100/60"
              >
                <View className="flex-row items-center flex-1 mr-3">
                  <View className="w-10 h-10 rounded-full bg-amber-100 items-center justify-center mr-3 shrink-0 shadow-xs">
                    <Clock size={18} color="#D97706" />
                  </View>
                  <View className="flex-1">
                    <Text className="font-bold text-[13px] text-slate-900 leading-tight" numberOfLines={1}>
                      {item.lga} • {item.ward}
                    </Text>
                    <Text className="text-[11px] text-slate-500 mt-0.5" numberOfLines={1}>
                      {item.species} • {item.larval_density ?? '0.0'} /dip
                    </Text>
                  </View>
                </View>

                <View className="items-end justify-center shrink-0">
                  <View className={`px-2 py-0.5 rounded-full bg-amber-200 border border-amber-300 ${!isPendingBioassay ? 'mb-1' : ''}`}>
                    <Text className="text-[8.5px] font-black text-amber-900 uppercase">
                      Pending Sync
                    </Text>
                  </View>
                  {!isPendingBioassay && (
                    <Text className="text-[10px] font-medium text-amber-800">
                      {item.mortality_pct}% mort.
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}

          {/* Real surveys retrieved from Go Backend database or cached locally in SQLite */}
          {unifiedSyncedRecords.map((item) => (
            <Pressable
              key={`record-${item.id}`}
              onPress={() => setViewingDetailRecord({ ...item, source: 'server' })}
              className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs flex-row items-center justify-between mb-2.5 active:bg-slate-50"
            >
              <View className="flex-row items-center flex-1 mr-3">
                <View className="w-10 h-10 rounded-full bg-emerald-100 items-center justify-center mr-3 shrink-0 shadow-xs">
                  <Text className="text-base">🦟</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-[13px] text-slate-900 leading-tight" numberOfLines={1}>
                    {item.lga} • {item.ward}
                  </Text>
                  <Text className="text-[11px] text-slate-400 mt-0.5" numberOfLines={1}>
                    {item.collection_date} • {item.species}
                  </Text>
                </View>
              </View>

              <View className="items-end shrink-0">
                <View className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 mb-1">
                  <Text className="text-[8.5px] font-bold text-emerald-800 uppercase">
                    Synced
                  </Text>
                </View>
                <Text className="text-[10.5px] font-bold text-slate-900">
                  {!item.n_exposed || item.n_exposed === 0 || item.who_class?.toLowerCase().includes('pending')
                    ? 'Bioassay Pending'
                    : `${item.mortality_pct}% mort.`}
                </Text>
              </View>
            </Pressable>
          ))}

          {/* Empty state if this officer has no surveys yet */}
          {unifiedSyncedRecords.length === 0 && pendingLocalRecords.length === 0 && (
            <View className="bg-slate-50 rounded-2xl p-6 items-center justify-center border border-slate-200/80 my-2">
              <View className="w-12 h-12 rounded-full bg-emerald-100 items-center justify-center mb-2">
                <CheckCircle2 size={24} color="#059669" />
              </View>
              <Text className="text-[13.5px] font-bold text-slate-800 text-center">
                No surveys collected yet for {currentUser.name}
              </Text>
              <Text className="text-[11px] text-slate-500 text-center mt-1 max-w-[260px]">
                Your {currentUser.state} sentinel grid is active. Tap below to capture your first NMEP Form E-1 survey.
              </Text>
              <Pressable
                onPress={handleOpenNewSurvey}
                className="mt-3.5 px-4 py-2.5 rounded-xl bg-emerald-600 flex-row items-center shadow-xs active:bg-emerald-700"
              >
                <Plus size={15} color="#FFFFFF" />
                <Text className="text-white text-[12px] font-bold ml-1.5">
                  Capture Form E-1 Survey
                </Text>
              </Pressable>
            </View>
          )}
        </View>
        </ScrollView>
        ) : (
          /* Dedicated Surveys Feed & Explorer View */
          <SurveysTabScreen
            currentUser={currentUser}
            serverRecords={unifiedSyncedRecords}
            pendingLocalRecords={pendingLocalRecords}
            loadingServer={loadingServer}
            onRefresh={handleRefreshAll}
            onOpenCapture={handleOpenNewSurvey}
            onOpenQueue={() => setActiveModal('queue')}
            onOpenAlerts={() => setActiveModal('alerts')}
            onCompleteBioassay={handleResumeBioassay}
          />
        )}
      </SafeAreaView>

      {/* 2. Docked Bottom Navigation Bar with Native Bottom Safe Area (Zero Overlap) */}
      <SafeAreaView edges={['bottom']} className="bg-white border-t border-slate-100 shadow-xl">
        <View className="px-6 pt-2 pb-1 flex-row items-center justify-between">
          {/* Home Tab */}
          <Pressable
            onPress={() => setActiveTab('home')}
            className="items-center py-1 flex-1 active:opacity-75"
          >
            <HomeIcon
              size={20}
              color={activeTab === 'home' ? '#059669' : '#94A3B8'}
              strokeWidth={activeTab === 'home' ? 2.5 : 2}
            />
            <Text
              className={`text-[10px] mt-0.5 ${
                activeTab === 'home'
                  ? 'font-bold text-emerald-700'
                  : 'font-medium text-slate-400'
              }`}
            >
              Home
            </Text>
          </Pressable>

          {/* Surveys Tab */}
          <Pressable
            onPress={() => setActiveTab('surveys')}
            className="items-center py-1 flex-1 active:opacity-75"
          >
            <ClipboardList
              size={20}
              color={activeTab === 'surveys' ? '#059669' : '#94A3B8'}
              strokeWidth={activeTab === 'surveys' ? 2.5 : 2}
            />
            <Text
              className={`text-[10px] mt-0.5 ${
                activeTab === 'surveys'
                  ? 'font-bold text-emerald-700'
                  : 'font-medium text-slate-400'
              }`}
            >
              Surveys
            </Text>
          </Pressable>

          {/* Elevated Floating Center Scan / Capture Button */}
          <View className="items-center justify-center flex-1">
            <Pressable
              onPress={handleOpenNewSurvey}
              className="w-13 h-13 rounded-2xl bg-slate-950 items-center justify-center shadow-xl shadow-slate-950/40 active:scale-95 -mt-6 border-4 border-white"
              style={{ width: 54, height: 54 }}
            >
              <Scan size={22} color="#FFFFFF" strokeWidth={2.5} />
            </Pressable>
          </View>

          {/* Alerts */}
          <Pressable
            onPress={() => setActiveModal('alerts')}
            className="items-center py-1 flex-1 relative active:opacity-75"
          >
            <View className="relative">
              <Flame size={20} color="#94A3B8" />
              <View className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500" />
            </View>
            <Text className="text-[10px] font-medium text-slate-400 mt-0.5">
              Alerts
            </Text>
          </Pressable>

          {/* Profile / Officer */}
          <Pressable
            onPress={() => setActiveModal('auth')}
            className="items-center py-1 flex-1 active:opacity-75"
          >
            <User size={20} color={activeModal === 'auth' ? '#059669' : '#94A3B8'} />
            <Text
              className={`text-[10px] mt-0.5 ${
                activeModal === 'auth' ? 'font-bold text-emerald-700' : 'font-medium text-slate-400'
              }`}
            >
              Profile
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* 3. SLIDE-UP MODALS */}
      <EntomologyModal
        visible={activeModal === 'entomology'}
        onClose={() => {
          setActiveModal(null);
          setEditingPendingRecord(null);
        }}
        onRecordSaved={handleRecordSaved}
        existingRecord={editingPendingRecord}
      />

      <SurveyDetailModal
        visible={!!viewingDetailRecord}
        onClose={() => setViewingDetailRecord(null)}
        record={viewingDetailRecord}
        onOpenQueue={() => {
          setViewingDetailRecord(null);
          setActiveModal('queue');
        }}
        onCompleteBioassay={handleResumeBioassay}
      />

      <QueueModal
        visible={activeModal === 'queue'}
        onClose={() => setActiveModal(null)}
        records={localRecords}
      />

      <AlertsModal
        visible={activeModal === 'alerts'}
        onClose={() => setActiveModal(null)}
      />

      <Dhis2Modal
        visible={activeModal === 'dhis2'}
        onClose={() => setActiveModal(null)}
      />

      <AuthModal
        visible={activeModal === 'auth'}
        onClose={() => setActiveModal(null)}
        records={localRecords}
        onUserChanged={handleRefreshAll}
      />

      {/* 4. SLEEK NON-BLOCKING FLOATING TOAST PILL */}
      {toastMessage && (
        <View
          pointerEvents="none"
          className="absolute top-14 left-0 right-0 z-50 items-center px-4"
        >
          <View
            className={`flex-row items-center px-4 py-2 rounded-full shadow-lg border ${
              toastMessage.type === 'success'
                ? 'bg-slate-950/95 border-emerald-500/50'
                : 'bg-slate-950/95 border-amber-500/50'
            }`}
          >
            <View
              className={`w-2 h-2 rounded-full mr-2 ${
                toastMessage.type === 'success' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <Text className="text-white text-[12px] font-bold font-bricolage">
              {toastMessage.title}
            </Text>
            {toastMessage.subtitle && (
              <Text className="text-slate-300 text-[11px] font-mono ml-2 pl-2 border-l border-slate-700">
                {toastMessage.subtitle}
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
