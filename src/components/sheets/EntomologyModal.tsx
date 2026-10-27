import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { X, CheckCircle2, Send, User, MapPin, ChevronDown, CloudOff } from 'lucide-react-native';
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

const HABITAT_TYPES = [
  'Drainage / Gutter',
  'Puddle / Marsh',
  'Tyre / Container',
  'Rice Field',
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

  const userInitialState = currentUser?.state === 'National' || !currentUser ? 'Osun' : currentUser.state;
  const userInitialLga = currentUser?.primaryLga || 'Osogbo';
  const userInitialLat = currentUser?.defaultLat || 7.7827;
  const userInitialLon = currentUser?.defaultLon || 4.5418;

  const [selectedState, setSelectedState] = useState<string>(userInitialState);
  const [selectedLga, setSelectedLga] = useState<string>(userInitialLga);
  const [showLgaPicker, setShowLgaPicker] = useState<boolean>(false);
  const [ward, setWard] = useState<string>('Ward 04 (Oja-Oba)');
  const [habitatType, setHabitatType] = useState<string>(HABITAT_TYPES[0]);
  const [dipsCount, setDipsCount] = useState<number>(10);
  const [totalLarvae, setTotalLarvae] = useState<number>(180);
  const [nExposed, setNExposed] = useState<number>(100);
  const [nDead, setNDead] = useState<number>(84);
  const [species, setSpecies] = useState<string>('Anopheles gambiae s.l.');
  const [insecticide, setInsecticide] = useState<string>('Permethrin');

  const [gpsData, setGpsData] = useState<GPSLocationData>({
    latitude: userInitialLat,
    longitude: userInitialLon,
    accuracy: 5.8,
    isBlocked: false,
    proximityResult: null,
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const larvaePerDip = dipsCount > 0 ? (totalLarvae / dipsCount).toFixed(1) : '0.0';

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
          if (d.totalLarvae) setTotalLarvae(d.totalLarvae);
          if (d.nExposed) setNExposed(d.nExposed);
          if (d.nDead) setNDead(d.nDead);
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
  }, [selectedState, selectedLga, ward, habitatType, totalLarvae, nExposed, nDead, species, insecticide, currentUser?.id]);

  const handleLocationChange = useCallback((data: GPSLocationData) => {
    setGpsData(data);
  }, []);

  const handleSubmit = async () => {
    if (nDead > nExposed || nExposed <= 0) {
      Alert.alert('Validation Error', 'Dead mosquitoes cannot exceed exposed mosquitoes.');
      return;
    }

    if (gpsData.isBlocked) {
      Alert.alert('GPS Error', 'Accuracy exceeds 50m. Acquire a better GPS signal before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const mortalityPct = Math.round((nDead / nExposed) * 1000) / 10;
      let whoClass = 'Confirmed Resistance';
      if (mortalityPct >= 98.0) whoClass = 'Susceptible';
      else if (mortalityPct >= 90.0) whoClass = 'Possible Resistance';

      const uuid = 'rec_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);

      const record: LocalFieldRecord = {
        id: uuid,
        user_id: currentUser?.id || 'u_field_03', // Authenticated officer ID attribution
        state: selectedState,
        lga: selectedLga,
        ward,
        collection_date: new Date().toISOString().split('T')[0],
        latitude: gpsData.latitude || userInitialLat,
        longitude: gpsData.longitude || userInitialLon,
        gps_accuracy_m: gpsData.accuracy || 5.8,
        species,
        insecticide,
        n_exposed: nExposed,
        n_dead: nDead,
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
      Alert.alert(
        'Record Saved & Assigned',
        `Survey queued for ${selectedLga} (${whoClass}).\nAssigned to Officer: ${currentUser?.name || 'Officer'} (${currentUser?.badge || 'OS-FO'}). Ready in Outbox.`
      );
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
              <Text className="text-[18px] font-extrabold text-slate-900">
                Malaria Entomology Survey
              </Text>
              <Text className="text-[11.5px] text-slate-500">
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

          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={true}
            contentContainerStyle={{ paddingBottom: 40, paddingTop: 14 }}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
            bounces={true}
          >
            {/* State Selection (National Director only) */}
            {currentUser?.role === 'uniosun' && (
              <View className="mb-3">
                <Text className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
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

            {/* 3. Dips / Larvae Count Stepper Card */}
            <View className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/90 flex-row items-center justify-between mb-3.5 shadow-xs">
              <View>
                <Text className="text-[13.5px] font-bold text-slate-800 font-bricolage">
                  Dips / Larvae Count
                </Text>
                <Text className="text-[11.5px] text-slate-500 font-medium mt-0.5">
                  Density:{' '}
                  <Text className="font-bold text-emerald-700">
                    {larvaePerDip} / dip
                  </Text>
                </Text>
              </View>

              <View className="flex-row items-center space-x-2">
                <Pressable
                  onPress={() => setTotalLarvae(Math.max(0, totalLarvae - 20))}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-300 items-center justify-center mr-2 active:bg-slate-100 shadow-xs"
                >
                  <Text className="font-bold text-slate-700 text-[16px]">-</Text>
                </Pressable>
                <Text className="text-[15px] font-extrabold w-11 text-center text-slate-900 font-mono">
                  {totalLarvae}
                </Text>
                <Pressable
                  onPress={() => setTotalLarvae(totalLarvae + 20)}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-300 items-center justify-center ml-2 active:bg-slate-100 shadow-xs"
                >
                  <Text className="font-bold text-slate-700 text-[16px]">+</Text>
                </Pressable>
              </View>
            </View>

            {/* 4. WHO Bioassay Tube-Test Calculation */}
            <View className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/90 mb-3.5">
              <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 font-bricolage">
                WHO TUBE-TEST BIOASSAY
              </Text>
              <View className="flex-row mb-2">
                <View className="flex-1 mr-2">
                  <Text className="text-[10px] font-semibold text-slate-400">EXPOSED</Text>
                  <Text className="text-[15px] font-bold text-slate-800 font-mono">
                    {nExposed}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[10px] font-semibold text-slate-400">DEAD</Text>
                  <Text className="text-[15px] font-bold text-slate-800 font-mono">
                    {nDead}
                  </Text>
                </View>
              </View>

              <WHOMortalityBadge nExposed={nExposed} nDead={nDead} />
            </View>

            {/* 5. GPS Coordinates & Live Accuracy Meter */}
            <GPSAccuracyMeter
              selectedState={selectedState}
              selectedLga={selectedLga}
              initialLat={gpsData.latitude || currentUser?.defaultLat || 7.7827}
              initialLon={gpsData.longitude || currentUser?.defaultLon || 4.5418}
              initialAccuracy={gpsData.accuracy || 5.8}
              onLocationChange={handleLocationChange}
            />

            {/* 6. Action Button: Save to Offline Queue */}
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting || gpsData.isBlocked}
              className={`py-3.5 rounded-2xl items-center justify-center flex-row shadow-md ${
                gpsData.isBlocked ? 'bg-slate-300' : 'bg-[#D97706] active:bg-[#B45309]'
              }`}
            >
              <CloudOff size={16} color="#FFFFFF" />
              <Text className="text-white font-bold text-[14px] ml-2 font-bricolage">
                {isSubmitting ? 'Staging Record...' : 'Save to Offline Queue'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
