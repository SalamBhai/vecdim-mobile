import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import {
  X,
  CheckCircle2,
  ChevronDown,
  CloudOff,
  ArrowRight,
  ArrowLeft,
  Clock,
  FlaskConical,
  Bug,
} from 'lucide-react-native';
import { GPSAccuracyMeter, GPSLocationData } from '../GPSAccuracyMeter';
import { WHOMortalityBadge } from '../WHOMortalityBadge';
import { STATES, getLGAsForState } from '../../data/lgaReference';
import {
  saveFormDraft,
  getFormDraft,
  clearFormDraft,
  saveFieldRecord,
  LocalFieldRecord,
} from '../../storage/db';
import { useAuth } from '../../context/AuthContext';
import { useNetwork } from '../../context/NetworkContext';

const HABITAT_TYPES = [
  'Drainage / Gutter',
  'Puddle / Marsh',
  'Tyre / Container',
  'Rice Field',
];

const VECTOR_SPECIES = [
  'Anopheles gambiae s.l.',
  'Anopheles funestus',
  'Anopheles coluzzii',
  'Anopheles stephensi',
];

const INSECTICIDE_TYPES = [
  'Permethrin',
  'Deltamethrin',
  'Bendiocarb',
  'Pirimiphos-methyl',
];

interface EntomologyModalProps {
  visible: boolean;
  onClose: () => void;
  onRecordSaved: () => void;
}

export const EntomologyModal: React.FC<EntomologyModalProps> = ({
  visible,
  onClose,
  onRecordSaved,
}) => {
  const { currentUser } = useAuth();
  const { isOnline } = useNetwork();

  const userInitialState = currentUser?.state === 'National' || !currentUser ? 'Osun' : currentUser.state;
  const userInitialLga = currentUser?.primaryLga || 'Osogbo';
  const userInitialLat = currentUser?.defaultLat || 7.7827;
  const userInitialLon = currentUser?.defaultLon || 4.5418;

  // Active form section tab: 1. Larval (Field) vs 2. Bioassay (Lab)
  const [activeTab, setActiveTab] = useState<'larval' | 'bioassay'>('larval');
  const [bioassayStatus, setBioassayStatus] = useState<'completed' | 'pending'>('completed');

  const [selectedState, setSelectedState] = useState<string>(userInitialState);
  const [selectedLga, setSelectedLga] = useState<string>(userInitialLga);
  const [showLgaPicker, setShowLgaPicker] = useState<boolean>(false);
  const [ward, setWard] = useState<string>('Ward 04 (Oja-Oba)');
  const [habitatType, setHabitatType] = useState<string>(HABITAT_TYPES[0]);
  const [dipsCount, setDipsCount] = useState<number>(10);
  const [totalLarvae, setTotalLarvae] = useState<number>(180);
  const [nExposed, setNExposed] = useState<number>(100);
  const [nDead, setNDead] = useState<number>(84);
  const [species, setSpecies] = useState<string>(VECTOR_SPECIES[0]);
  const [insecticide, setInsecticide] = useState<string>(INSECTICIDE_TYPES[0]);

  const [gpsData, setGpsData] = useState<GPSLocationData>({
    latitude: userInitialLat,
    longitude: userInitialLon,
    accuracy: 5.8,
    isBlocked: false,
    proximityResult: null,
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived Physical Bottle Label ID (written on the physical sample collection bottle)
  const bottleLabelId = useMemo(() => {
    const stateCode = selectedState === 'Lagos' ? 'LA' : selectedState === 'Kano' ? 'KN' : 'OS';
    const lgaCode = (selectedLga || 'OSG').substring(0, 3).toUpperCase();
    const wardDigits = ward.replace(/\D/g, '');
    const wardCode = wardDigits ? `W${wardDigits.padStart(2, '0')}` : 'W04';
    return `${stateCode}-${lgaCode}-${wardCode}-A1`;
  }, [selectedState, selectedLga, ward]);

  // Derived Larval Density & Risk Tiers
  const larvaePerDip = dipsCount > 0 ? (totalLarvae / dipsCount).toFixed(1) : '0.0';
  const densityNum = parseFloat(larvaePerDip);

  let densityBadgeBg = 'bg-emerald-50 border-emerald-200';
  let densityBadgeText = 'text-emerald-800';
  let densityRiskLabel = 'Low Risk';
  let densityDotColor = 'bg-emerald-500';

  if (densityNum >= 10.0) {
    densityBadgeBg = 'bg-rose-50 border-rose-300';
    densityBadgeText = 'text-rose-800';
    densityRiskLabel = 'High Alert';
    densityDotColor = 'bg-rose-500';
  } else if (densityNum >= 2.0) {
    densityBadgeBg = 'bg-amber-50 border-amber-300';
    densityBadgeText = 'text-amber-900';
    densityRiskLabel = 'Moderate';
    densityDotColor = 'bg-amber-500';
  }

  // Synchronize state/LGA defaults when currentUser changes or modal opens
  useEffect(() => {
    if (visible) {
      const isNational = currentUser?.role === 'uniosun' || currentUser?.state === 'National';
      const assigned = isNational ? 'Osun' : (currentUser?.state || 'Osun');
      setSelectedState(assigned);
      setSelectedLga(currentUser?.primaryLga && !currentUser.primaryLga.includes('HQ') ? currentUser.primaryLga : (getLGAsForState(assigned)[0] || 'Osogbo'));
      setGpsData({
        latitude: currentUser?.defaultLat || 7.7827,
        longitude: currentUser?.defaultLon || 4.5418,
        accuracy: 5.8,
        isBlocked: false,
        proximityResult: null,
      });

      // Load draft strictly scoped to this authenticated user
      (async () => {
        const draft = await getFormDraft(currentUser?.id);
        if (draft && draft.formData) {
          const d = draft.formData;
          if (isNational && d.selectedState) {
            setSelectedState(d.selectedState);
          }
          if (d.selectedLga) setSelectedLga(d.selectedLga);
          if (d.ward) setWard(d.ward);
          if (d.habitatType) setHabitatType(d.habitatType);
          if (d.dipsCount) setDipsCount(d.dipsCount);
          if (d.totalLarvae) setTotalLarvae(d.totalLarvae);
          if (d.nExposed) setNExposed(d.nExposed);
          if (d.nDead) setNDead(d.nDead);
          if (d.species) setSpecies(d.species);
          if (d.insecticide) setInsecticide(d.insecticide);
        }
      })();
    }
  }, [visible, currentUser]);

  // Debounced autosave strictly scoped to this officer
  useEffect(() => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      await saveFormDraft({
        selectedState,
        selectedLga,
        ward,
        habitatType,
        dipsCount,
        totalLarvae,
        nExposed,
        nDead,
        species,
        insecticide,
      }, currentUser?.id);
    }, 1500);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [selectedState, selectedLga, ward, habitatType, dipsCount, totalLarvae, nExposed, nDead, species, insecticide, currentUser?.id]);

  const handleLocationChange = useCallback((data: GPSLocationData) => {
    setGpsData(data);
  }, []);

  const handleSubmit = async (isComplete: boolean = true) => {
    if (isComplete && (nDead > nExposed || nExposed <= 0)) {
      Alert.alert('Validation Error', 'Dead mosquitoes cannot exceed exposed mosquitoes.');
      return;
    }

    if (gpsData.isBlocked) {
      Alert.alert('GPS Error', 'Accuracy exceeds 50m. Acquire a better GPS signal before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const mortalityPct = isComplete ? Math.round((nDead / nExposed) * 1000) / 10 : 0;
      let whoClass = isComplete ? 'Confirmed Resistance' : 'Bioassay Pending';
      if (isComplete) {
        if (mortalityPct >= 98.0) whoClass = 'Susceptible';
        else if (mortalityPct >= 90.0) whoClass = 'Possible Resistance';
      }

      const uuid = 'rec_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);

      const record: LocalFieldRecord = {
        id: uuid,
        user_id: currentUser?.id || 'u_field_03',
        state: selectedState,
        lga: selectedLga,
        ward,
        collection_date: new Date().toISOString().split('T')[0],
        latitude: gpsData.latitude || userInitialLat,
        longitude: gpsData.longitude || userInitialLon,
        gps_accuracy_m: gpsData.accuracy || 5.8,
        species,
        insecticide,
        n_exposed: isComplete ? nExposed : 0,
        n_dead: isComplete ? nDead : 0,
        mortality_pct: mortalityPct,
        who_class: whoClass,
        larval_density: parseFloat(larvaePerDip),
        urban: habitatType === 'Drainage / Gutter' || habitatType === 'Tyre / Container',
        irs_covered: true,
        itn_use_pct: 65,
        sync_status: 'pending_sync',
        server_error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await saveFieldRecord(record);
      await clearFormDraft(currentUser?.id);
      setIsSubmitting(false);
      onRecordSaved();
      onClose();

      const successTitle = isOnline ? 'Survey Saved & Queued' : 'Saved to Offline Outbox';
      const successBody = isOnline
        ? `Survey saved for ${selectedLga} (${bottleLabelId} • ${whoClass}). Ready for cloud sync.`
        : `Device is offline. Survey safely committed to local SQLite WAL (${bottleLabelId}). Will auto-sync on reconnect.`;

      Alert.alert(successTitle, successBody);
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert('Storage Error', err.message);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-[32px] px-5 pt-4 pb-6 h-[88%] shadow-2xl flex-col">
          {/* Sheet Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <View>
              <Text className="text-[18px] font-extrabold text-slate-900 font-bricolage">
                Malaria Entomology Survey
              </Text>
              <Text className="text-[11.5px] text-slate-500 font-medium">
                NMEP Form E-1 • {selectedState} State
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
            >
              <X size={16} color="#475569" />
            </Pressable>
          </View>

          {/* Form E-1 Protocol Tabs (Field Sampling vs Lab Bioassay) */}
          <View className="flex-row mt-2.5 mb-3 bg-slate-100 p-1 rounded-xl shrink-0">
            <Pressable
              onPress={() => setActiveTab('larval')}
              className={`flex-1 py-2 rounded-lg items-center justify-center ${
                activeTab === 'larval' ? 'bg-white shadow-xs' : ''
              }`}
            >
              <View className="flex-row items-center">
                <Bug size={13} color={activeTab === 'larval' ? '#0F172A' : '#64748B'} />
                <Text
                  className={`text-[11px] font-bold font-bricolage ml-1.5 ${
                    activeTab === 'larval' ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  1. Larval Sampling (Field)
                </Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('bioassay')}
              className={`flex-1 py-2 rounded-lg items-center justify-center ${
                activeTab === 'bioassay' ? 'bg-white shadow-xs' : ''
              }`}
            >
              <View className="flex-row items-center">
                <FlaskConical size={13} color={activeTab === 'bioassay' ? '#0F172A' : '#64748B'} />
                <Text
                  className={`text-[11px] font-bold font-bricolage ml-1.5 ${
                    activeTab === 'bioassay' ? 'text-slate-900' : 'text-slate-500'
                  }`}
                >
                  2. WHO Bioassay (Lab)
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Tab 1: Larval Sampling (Field) */}
          {activeTab === 'larval' ? (
            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 70, paddingTop: 4 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              bounces={true}
            >
              {/* Bottle Label ID Card */}
              <View className="flex-row items-center justify-between p-3 bg-blue-50/80 rounded-2xl border border-blue-200/80 mb-3 shadow-xs">
                <View className="flex-row items-center flex-1 mr-2">
                  <Text className="text-[14px] mr-2">🏷️</Text>
                  <View>
                    <Text className="text-[9.5px] font-bold text-blue-900 uppercase tracking-wider font-bricolage">
                      BOTTLE LABEL ID
                    </Text>
                    <Text className="text-[12.5px] font-mono font-black text-blue-800">
                      {bottleLabelId}
                    </Text>
                  </View>
                </View>
                <View className="px-2 py-0.5 rounded-md bg-blue-100 border border-blue-200">
                  <Text className="text-[9px] font-bold text-blue-800">Field Sample</Text>
                </View>
              </View>

              {/* State Selection (National Director only) */}
              {currentUser?.role === 'uniosun' && (
                <View className="mb-3">
                  <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-bricolage">
                    State
                  </Text>
                  <View className="flex-row space-x-1.5">
                    {STATES.map((s) => (
                      <Pressable
                        key={s}
                        onPress={() => {
                          setSelectedState(s);
                          const lgas = getLGAsForState(s);
                          if (lgas.length > 0) setSelectedLga(lgas[0]);
                        }}
                        className={`px-3 py-1.5 rounded-xl border mr-1.5 ${
                          selectedState === s
                            ? 'bg-slate-900 border-slate-900'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <Text
                          className={`text-[11px] font-bold ${
                            selectedState === s ? 'text-white' : 'text-slate-700'
                          }`}
                        >
                          {s} State
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {/* 1. Two-Column Row: LGA Dropdown & Ward Input */}
              <View className="flex-row gap-2.5 mb-3.5">
                {/* LGA Dropdown */}
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-bricolage">
                    LGA ({selectedState.toUpperCase()})
                  </Text>
                  <Pressable
                    onPress={() => setShowLgaPicker(!showLgaPicker)}
                    className="border border-slate-200 rounded-2xl px-3.5 py-3 bg-white flex-row items-center justify-between shadow-xs active:bg-slate-50"
                  >
                    <Text className="text-[13px] font-semibold text-slate-800" numberOfLines={1}>
                      {selectedLga}
                    </Text>
                    <ChevronDown size={15} color="#64748B" />
                  </Pressable>
                </View>

                {/* Ward Site Input */}
                <View className="flex-1">
                  <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 font-bricolage">
                    WARD SITE
                  </Text>
                  <TextInput
                    value={ward}
                    onChangeText={setWard}
                    className="border border-slate-200 rounded-2xl px-3.5 py-2.5 bg-white text-[13px] font-semibold text-slate-800"
                    placeholder="e.g. Ward 04 (Oja-Oba)"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* Dropdown list when LGA picker is open */}
              {showLgaPicker && (
                <View className="bg-white border border-slate-200 rounded-2xl p-2 mb-3.5 shadow-lg max-h-48">
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                    {getLGAsForState(selectedState).map((lga) => (
                      <Pressable
                        key={lga}
                        onPress={() => {
                          setSelectedLga(lga);
                          setShowLgaPicker(false);
                        }}
                        className={`px-3 py-2 rounded-xl mb-1 ${
                          selectedLga === lga ? 'bg-emerald-50' : 'active:bg-slate-50'
                        }`}
                      >
                        <Text
                          className={`text-[12px] ${
                            selectedLga === lga
                              ? 'font-bold text-emerald-800'
                              : 'font-medium text-slate-700'
                          }`}
                        >
                          {lga}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* 2. Breeding Habitat Type: 2x2 Grid */}
              <View className="mb-3.5">
                <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-bricolage">
                  BREEDING HABITAT TYPE
                </Text>
                <View className="flex-row gap-2 mb-2">
                  <Pressable
                    onPress={() => setHabitatType(HABITAT_TYPES[0])}
                    className={`flex-1 py-2.5 px-3 rounded-2xl border items-center justify-center ${
                      habitatType === HABITAT_TYPES[0]
                        ? 'bg-emerald-50/90 border-emerald-500 shadow-xs'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-[12px] text-center ${
                        habitatType === HABITAT_TYPES[0]
                          ? 'text-emerald-900 font-bold'
                          : 'text-slate-600 font-medium'
                      }`}
                    >
                      {HABITAT_TYPES[0]}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setHabitatType(HABITAT_TYPES[1])}
                    className={`flex-1 py-2.5 px-3 rounded-2xl border items-center justify-center ${
                      habitatType === HABITAT_TYPES[1]
                        ? 'bg-emerald-50/90 border-emerald-500 shadow-xs'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-[12px] text-center ${
                        habitatType === HABITAT_TYPES[1]
                          ? 'text-emerald-900 font-bold'
                          : 'text-slate-600 font-medium'
                      }`}
                    >
                      {HABITAT_TYPES[1]}
                    </Text>
                  </Pressable>
                </View>

                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => setHabitatType(HABITAT_TYPES[2])}
                    className={`flex-1 py-2.5 px-3 rounded-2xl border items-center justify-center ${
                      habitatType === HABITAT_TYPES[2]
                        ? 'bg-emerald-50/90 border-emerald-500 shadow-xs'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-[12px] text-center ${
                        habitatType === HABITAT_TYPES[2]
                          ? 'text-emerald-900 font-bold'
                          : 'text-slate-600 font-medium'
                      }`}
                    >
                      {HABITAT_TYPES[2]}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setHabitatType(HABITAT_TYPES[3])}
                    className={`flex-1 py-2.5 px-3 rounded-2xl border items-center justify-center ${
                      habitatType === HABITAT_TYPES[3]
                        ? 'bg-emerald-50/90 border-emerald-500 shadow-xs'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-[12px] text-center ${
                        habitatType === HABITAT_TYPES[3]
                          ? 'text-emerald-900 font-bold'
                          : 'text-slate-600 font-medium'
                      }`}
                    >
                      {HABITAT_TYPES[3]}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* 3. Larval Sampling & Density Card (Both Dips AND Larvae) */}
              <View className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/90 mb-3.5 shadow-xs">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-bricolage">
                    LARVAL SAMPLING & DENSITY
                  </Text>
                  <View className={`flex-row items-center px-2 py-0.5 rounded-md border ${densityBadgeBg}`}>
                    <View className={`w-1.5 h-1.5 rounded-full mr-1.5 ${densityDotColor}`} />
                    <Text className={`text-[10px] font-bold ${densityBadgeText}`}>
                      {larvaePerDip} / dip • {densityRiskLabel}
                    </Text>
                  </View>
                </View>

                <View className="flex-row gap-2.5">
                  {/* Dips Taken */}
                  <View className="flex-1 bg-white p-2.5 rounded-xl border border-slate-200">
                    <Text className="text-[9.5px] font-bold text-slate-500 uppercase mb-1">
                      DIPS TAKEN (N)
                    </Text>
                    <View className="flex-row items-center justify-between">
                      <Pressable
                        onPress={() => setDipsCount(Math.max(1, dipsCount - 1))}
                        className="w-7 h-7 rounded-lg bg-slate-100 items-center justify-center active:bg-slate-200"
                      >
                        <Text className="font-bold text-slate-700 text-[14px]">-</Text>
                      </Pressable>
                      <TextInput
                        value={String(dipsCount)}
                        onChangeText={(t) => {
                          const val = parseInt(t.replace(/[^0-9]/g, ''), 10);
                          setDipsCount(isNaN(val) ? 1 : Math.max(1, val));
                        }}
                        keyboardType="number-pad"
                        className="text-[15px] font-mono font-black text-slate-900 text-center w-12 py-0"
                      />
                      <Pressable
                        onPress={() => setDipsCount(dipsCount + 1)}
                        className="w-7 h-7 rounded-lg bg-slate-100 items-center justify-center active:bg-slate-200"
                      >
                        <Text className="font-bold text-slate-700 text-[14px]">+</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Total Larvae Count */}
                  <View className="flex-1 bg-white p-2.5 rounded-xl border border-slate-200">
                    <Text className="text-[9.5px] font-bold text-slate-500 uppercase mb-1">
                      TOTAL LARVAE (N)
                    </Text>
                    <View className="flex-row items-center justify-between">
                      <Pressable
                        onPress={() => setTotalLarvae(Math.max(0, totalLarvae - 10))}
                        className="w-7 h-7 rounded-lg bg-slate-100 items-center justify-center active:bg-slate-200"
                      >
                        <Text className="font-bold text-slate-700 text-[14px]">-</Text>
                      </Pressable>
                      <TextInput
                        value={String(totalLarvae)}
                        onChangeText={(t) => {
                          const val = parseInt(t.replace(/[^0-9]/g, ''), 10);
                          setTotalLarvae(isNaN(val) ? 0 : Math.max(0, val));
                        }}
                        keyboardType="number-pad"
                        className="text-[15px] font-mono font-black text-slate-900 text-center w-12 py-0"
                      />
                      <Pressable
                        onPress={() => setTotalLarvae(totalLarvae + 10)}
                        className="w-7 h-7 rounded-lg bg-slate-100 items-center justify-center active:bg-slate-200"
                      >
                        <Text className="font-bold text-slate-700 text-[14px]">+</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </View>

              {/* 4. GPS Coordinates & Live Accuracy Meter */}
              <GPSAccuracyMeter
                selectedState={selectedState}
                selectedLga={selectedLga}
                initialLat={gpsData.latitude || currentUser?.defaultLat || 7.7827}
                initialLon={gpsData.longitude || currentUser?.defaultLon || 4.5418}
                initialAccuracy={gpsData.accuracy || 5.8}
                onLocationChange={handleLocationChange}
              />

              {/* Action Buttons: Save Larval Survey (Primary) OR Next: WHO Bioassay (Secondary) */}
              <View className="mt-4 mb-2">
                <Pressable
                  onPress={() => handleSubmit(false)}
                  disabled={isSubmitting || gpsData.isBlocked}
                  className={`py-3.5 rounded-2xl items-center justify-center flex-row shadow-md mb-3 ${
                    gpsData.isBlocked
                      ? 'bg-slate-300'
                      : isOnline
                      ? 'bg-emerald-600 active:bg-emerald-700'
                      : 'bg-amber-600 active:bg-amber-700'
                  }`}
                >
                  {isOnline ? (
                    <CheckCircle2 size={16} color="#FFFFFF" />
                  ) : (
                    <CloudOff size={16} color="#FFFFFF" />
                  )}
                  <Text className="text-white font-bold text-[14px] ml-2 font-bricolage">
                    {isSubmitting
                      ? 'Saving Record...'
                      : 'Save Larval Survey (Bioassay Pending)'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setActiveTab('bioassay')}
                  className="py-3.5 rounded-2xl bg-white border border-slate-300 active:bg-slate-50 items-center justify-center flex-row shadow-xs"
                >
                  <Text className="text-slate-800 font-bold text-[13.5px] mr-2 font-bricolage">
                    Next: WHO Bioassay
                  </Text>
                  <ArrowRight size={15} color="#1E293B" />
                </Pressable>
              </View>
            </ScrollView>
          ) : (
            /* Tab 2: WHO Bioassay (Lab) */
            <ScrollView
              className="flex-1"
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 70, paddingTop: 4 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              bounces={true}
            >
              {/* Sample Linkage & Workflow Status Card */}
              <View className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/90 mb-3.5 shadow-xs">
                <View className="flex-row items-center justify-between mb-2 pb-2 border-b border-slate-200">
                  <View>
                    <Text className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider font-bricolage">
                      LINKED FIELD SAMPLE
                    </Text>
                    <Text className="text-[13px] font-mono font-black text-slate-900">
                      {bottleLabelId}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-[9.5px] font-bold text-slate-400 uppercase">
                      SITE
                    </Text>
                    <Text className="text-[11px] font-bold text-slate-700">
                      {selectedLga} • {ward.split(' ')[0] || 'Ward'}
                    </Text>
                  </View>
                </View>

                {/* Status Toggle: Completed vs Pending 24h Readout */}
                <View className="flex-row items-center justify-between">
                  <Text className="text-[11px] font-bold text-slate-700 font-bricolage">
                    Bioassay Status:
                  </Text>
                  <View className="flex-row space-x-1.5">
                    <Pressable
                      onPress={() => setBioassayStatus('completed')}
                      className={`px-2.5 py-1 rounded-lg border ${
                        bioassayStatus === 'completed'
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${
                          bioassayStatus === 'completed' ? 'text-white' : 'text-slate-600'
                        }`}
                      >
                        Readout Complete
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setBioassayStatus('pending')}
                      className={`px-2.5 py-1 rounded-lg border ${
                        bioassayStatus === 'pending'
                          ? 'bg-amber-600 border-amber-600'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${
                          bioassayStatus === 'pending' ? 'text-white' : 'text-slate-600'
                        }`}
                      >
                        24h Pending
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Target Vector Species Selector */}
              <View className="mb-3.5">
                <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-bricolage">
                  TARGET VECTOR SPECIES
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {VECTOR_SPECIES.map((sp) => (
                    <Pressable
                      key={sp}
                      onPress={() => setSpecies(sp)}
                      className={`px-3 py-2 rounded-xl border mb-1 ${
                        species === sp
                          ? 'bg-emerald-50/90 border-emerald-600 shadow-xs'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-[11.5px] italic ${
                          species === sp ? 'font-bold text-emerald-950' : 'text-slate-700'
                        }`}
                      >
                        {sp}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Tested Insecticide Selector */}
              <View className="mb-3.5">
                <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 font-bricolage">
                  TESTED INSECTICIDE
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {INSECTICIDE_TYPES.map((ins) => (
                    <Pressable
                      key={ins}
                      onPress={() => setInsecticide(ins)}
                      className={`px-3 py-2 rounded-xl border mb-1 ${
                        insecticide === ins
                          ? 'bg-slate-900 border-slate-900 shadow-xs'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <Text
                        className={`text-[11.5px] ${
                          insecticide === ins ? 'font-bold text-white' : 'text-slate-700 font-medium'
                        }`}
                      >
                        {ins}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* WHO Tube-Test Bioassay Card */}
              <View className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/90 mb-3.5 shadow-xs">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-bricolage">
                    WHO TUBE-TEST BIOASSAY
                  </Text>
                </View>

                {/* Interactive Inputs for Exposed & Dead Mosquitoes */}
                <View className="flex-row gap-2.5 mb-2">
                  {/* Exposed Mosquitoes */}
                  <View className="flex-1 bg-white p-2.5 rounded-xl border border-slate-200">
                    <Text className="text-[9.5px] font-bold text-slate-500 uppercase mb-1">
                      EXPOSED (N)
                    </Text>
                    <View className="flex-row items-center justify-between">
                      <Pressable
                        onPress={() => {
                          const next = Math.max(10, nExposed - 5);
                          setNExposed(next);
                          if (nDead > next) setNDead(next);
                        }}
                        className="w-7 h-7 rounded-lg bg-slate-100 items-center justify-center active:bg-slate-200"
                      >
                        <Text className="font-bold text-slate-700 text-[14px]">-</Text>
                      </Pressable>
                      <TextInput
                        value={String(nExposed)}
                        onChangeText={(t) => {
                          const val = parseInt(t.replace(/[^0-9]/g, ''), 10);
                          const nextExposed = isNaN(val) ? 0 : val;
                          setNExposed(nextExposed);
                          if (nDead > nextExposed) setNDead(nextExposed);
                        }}
                        keyboardType="number-pad"
                        className="text-[15px] font-mono font-black text-slate-900 text-center w-12 py-0"
                      />
                      <Pressable
                        onPress={() => setNExposed(nExposed + 5)}
                        className="w-7 h-7 rounded-lg bg-slate-100 items-center justify-center active:bg-slate-200"
                      >
                        <Text className="font-bold text-slate-700 text-[14px]">+</Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* Dead Mosquitoes */}
                  <View className="flex-1 bg-white p-2.5 rounded-xl border border-slate-200">
                    <Text className="text-[9.5px] font-bold text-slate-500 uppercase mb-1">
                      DEAD (N)
                    </Text>
                    <View className="flex-row items-center justify-between">
                      <Pressable
                        onPress={() => setNDead(Math.max(0, nDead - 5))}
                        className="w-7 h-7 rounded-lg bg-slate-100 items-center justify-center active:bg-slate-200"
                      >
                        <Text className="font-bold text-slate-700 text-[14px]">-</Text>
                      </Pressable>
                      <TextInput
                        value={String(nDead)}
                        onChangeText={(t) => {
                          const val = parseInt(t.replace(/[^0-9]/g, ''), 10);
                          const nextDead = isNaN(val) ? 0 : Math.min(val, nExposed);
                          setNDead(nextDead);
                        }}
                        keyboardType="number-pad"
                        className="text-[15px] font-mono font-black text-slate-900 text-center w-12 py-0"
                      />
                      <Pressable
                        onPress={() => setNDead(Math.min(nExposed, nDead + 5))}
                        className="w-7 h-7 rounded-lg bg-slate-100 items-center justify-center active:bg-slate-200"
                      >
                        <Text className="font-bold text-slate-700 text-[14px]">+</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Dynamic Live WHO Mortality Badge */}
                <WHOMortalityBadge nExposed={nExposed} nDead={nDead} />
              </View>

              {/* Action Buttons: Save Complete Survey OR Back */}
              <View className="mt-4 mb-2">
                <Pressable
                  onPress={() => handleSubmit(bioassayStatus === 'completed')}
                  disabled={isSubmitting || gpsData.isBlocked}
                  className={`py-3.5 rounded-2xl items-center justify-center flex-row shadow-md mb-3 ${
                    gpsData.isBlocked
                      ? 'bg-slate-300'
                      : isOnline
                      ? 'bg-emerald-600 active:bg-emerald-700'
                      : 'bg-amber-600 active:bg-amber-700'
                  }`}
                >
                  {isOnline ? (
                    <CheckCircle2 size={16} color="#FFFFFF" />
                  ) : (
                    <CloudOff size={16} color="#FFFFFF" />
                  )}
                  <Text className="text-white font-bold text-[14px] ml-2 font-bricolage">
                    {isSubmitting
                      ? 'Saving Record...'
                      : isOnline
                      ? 'Save Complete Survey'
                      : 'Save to Offline Outbox'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setActiveTab('larval')}
                  className="py-3.5 rounded-2xl bg-white border border-slate-200 active:bg-slate-50 items-center justify-center flex-row shadow-xs"
                >
                  <ArrowLeft size={15} color="#475569" />
                  <Text className="font-bold text-[13px] ml-1.5 text-slate-700 font-bricolage">
                    Back to Larval Sampling
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};
