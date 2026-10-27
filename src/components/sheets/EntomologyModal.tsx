import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Alert,
} from 'react-native';
import { X, CheckCircle2, Send, User, MapPin } from 'lucide-react-native';
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
        urban: false,
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
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-[32px] p-5 max-h-[90%] shadow-2xl">
          {/* Sheet Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
            <View>
              <Text className="text-[17px] font-extrabold text-slate-900">
                Malaria Entomology Survey
              </Text>
              <Text className="text-[11px] text-slate-500">
                NMEP Protocol Form E-1
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
            >
              <X size={16} color="#475569" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
            {/* Officer Attribution Pill */}
            <View className="mt-3.5 p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-2">
                <View
                  className="w-7 h-7 rounded-lg items-center justify-center mr-2 shadow-xs"
                  style={{ backgroundColor: currentUser?.avatarColor || '#047857' }}
                >
                  <Text className="text-white font-bold text-[11px]">
                    {currentUser?.initials || 'EM'}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-[11.5px] font-bold text-slate-900 leading-tight">
                    {currentUser?.name || 'Field Officer'} • {currentUser?.badge || 'Active'}
                  </Text>
                  <Text className="text-[10px] text-slate-500 font-medium">
                    Attributed enumerator: {currentUser?.id || 'u_field_03'}
                  </Text>
                </View>
              </View>
              <View className="px-2 py-0.5 rounded-md bg-emerald-100 border border-emerald-300">
                <Text className="text-[9px] font-black text-emerald-800 uppercase">
                  Active
                </Text>
              </View>
            </View>

            {/* Assigned State Jurisdiction */}
            <View className="mt-3 mb-3">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {currentUser?.role === 'uniosun' ? 'National Surveillance Grid' : 'Assigned State Jurisdiction'}
                </Text>
                <View className="flex-row items-center bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <Text className="text-[10px] font-bold text-emerald-800">
                    {currentUser?.role === 'uniosun' ? 'All States (UNIOSUN HQ)' : 'Mandated Territory'}
                  </Text>
                </View>
              </View>

              {currentUser?.role === 'uniosun' ? (
                /* State Selection Chips for National Director */
                <View className="flex-row space-x-1.5 mb-3">
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
                          : 'bg-white border-slate-200 active:bg-slate-50'
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
              ) : (
                /* Locked State Card for State / Field Officers */
                <View className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 rounded-xl bg-emerald-600/10 border border-emerald-500/20 items-center justify-center mr-2.5">
                      <MapPin size={16} color="#059669" />
                    </View>
                    <View>
                      <Text className="text-[13px] font-extrabold text-slate-900 leading-tight">
                        {selectedState} State
                      </Text>
                      <Text className="text-[10.5px] text-slate-500 font-medium">
                        Operational zone for {currentUser?.name || 'Officer'}
                      </Text>
                    </View>
                  </View>
                  <View className="px-2 py-1 rounded-lg bg-slate-200/70">
                    <Text className="text-[9.5px] font-bold text-slate-600 uppercase">
                      Locked
                    </Text>
                  </View>
                </View>
              )}

              {/* LGA Centroid Selection strictly within this State */}
              <Text className="text-[10px] font-bold text-slate-500 uppercase mb-1.5 tracking-wider">
                Target LGA Centroid ({selectedState})
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {getLGAsForState(selectedState).map((lga) => (
                  <Pressable
                    key={lga}
                    onPress={() => setSelectedLga(lga)}
                    className={`px-3 py-1.5 mr-1.5 rounded-xl border ${
                      selectedLga === lga
                        ? 'bg-emerald-600 border-emerald-600'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-semibold ${
                        selectedLga === lga ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {lga}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* Breeding Habitat Type Chips */}
            <View className="mb-3">
              <Text className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">
                Breeding Habitat Type
              </Text>
              <View className="flex-row flex-wrap">
                {HABITAT_TYPES.map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => setHabitatType(h)}
                    className={`px-3 py-2 mr-2 mb-2 rounded-xl border ${
                      habitatType === h
                        ? 'bg-emerald-50 border-emerald-500'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-medium ${
                        habitatType === h
                          ? 'text-emerald-900 font-bold'
                          : 'text-slate-600'
                      }`}
                    >
                      {h}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Dips / Larvae Count Stepper */}
            <View className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex-row items-center justify-between mb-3">
              <View>
                <Text className="text-[13px] font-bold text-slate-800">
                  Dips / Larvae Count
                </Text>
                <Text className="text-[11px] text-slate-500">
                  Density:{' '}
                  <Text className="font-bold text-emerald-700">
                    {larvaePerDip} / dip
                  </Text>
                </Text>
              </View>

              <View className="flex-row items-center space-x-2">
                <Pressable
                  onPress={() => setTotalLarvae(Math.max(0, totalLarvae - 20))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 items-center justify-center mr-2 active:bg-slate-100"
                >
                  <Text className="font-bold text-slate-700">-</Text>
                </Pressable>
                <Text className="text-[13px] font-extrabold w-10 text-center text-slate-900">
                  {totalLarvae}
                </Text>
                <Pressable
                  onPress={() => setTotalLarvae(totalLarvae + 20)}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 items-center justify-center ml-2 active:bg-slate-100"
                >
                  <Text className="font-bold text-slate-700">+</Text>
                </Pressable>
              </View>
            </View>

            {/* WHO Bioassay Tube-Test Calculation */}
            <View className="p-3 bg-slate-50 rounded-2xl border border-slate-200 mb-3">
              <Text className="text-[12px] font-bold text-slate-800 uppercase mb-2">
                WHO Tube-Test Bioassay
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

            {/* GPS Accuracy & Geofence Validator */}
            <GPSAccuracyMeter
              selectedState={selectedState}
              selectedLga={selectedLga}
              initialLat={currentUser?.defaultLat || 7.7827}
              initialLon={currentUser?.defaultLon || 4.5418}
              onLocationChange={handleLocationChange}
            />

            {/* Geofence confirmation */}
            <View className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex-row items-center space-x-2 mb-4">
              <CheckCircle2 size={16} color="#059669" />
              <Text className="text-[11px] font-medium text-emerald-800 ml-2">
                GPS Validated: Inside {selectedLga} ({selectedState}) centroid (±{gpsData.accuracy || 6.5}m).
              </Text>
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting || gpsData.isBlocked}
              className={`py-3.5 rounded-2xl items-center justify-center flex-row shadow-md ${
                gpsData.isBlocked ? 'bg-slate-300' : 'bg-emerald-600 active:bg-emerald-700'
              }`}
            >
              <Send size={16} color="#FFFFFF" />
              <Text className="text-white font-bold text-[13px] ml-2">
                {isSubmitting
                  ? 'Staging Record...'
                  : `Queue Scan for ${currentUser?.firstName || 'Officer'}`}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
