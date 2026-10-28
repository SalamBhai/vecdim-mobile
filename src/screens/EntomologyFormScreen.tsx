import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Modal,
} from 'react-native';
import { Screen } from '../components/ui/Screen';
import { Card } from '../components/ui/Card';
import { AppInput } from '../components/ui/AppInput';
import { AppButton } from '../components/ui/AppButton';
import { Badge } from '../components/ui/Badge';
import { GPSAccuracyMeter, GPSLocationData } from '../components/GPSAccuracyMeter';
import { WHOMortalityBadge } from '../components/WHOMortalityBadge';
import { STATES, getLGAsForState } from '../data/lgaReference';
import {
  saveFormDraft,
  getFormDraft,
  clearFormDraft,
  saveFieldRecord,
  LocalFieldRecord,
} from '../storage/db';
import { generateUUID } from '../utils/uuid';

const SPECIES_OPTIONS = [
  'Anopheles gambiae s.l.',
  'Anopheles funestus',
  'Anopheles arabiensis',
  'Anopheles coluzzii',
];

const INSECTICIDE_OPTIONS = [
  'Permethrin',
  'Deltamethrin',
  'Bendiocarb',
  'Pirimiphos-methyl',
  'Clothianidin',
  'Chlorfenapyr',
];

export const EntomologyFormScreen: React.FC<{ onNavigateToOutbox?: () => void }> = ({
  onNavigateToOutbox,
}) => {
  // Form fields
  const [recordId, setRecordId] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('Osun');
  const [selectedLga, setSelectedLga] = useState<string>('Osogbo');
  const [ward, setWard] = useState<string>('Ward 01');
  const [collectionDate, setCollectionDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [species, setSpecies] = useState<string>(SPECIES_OPTIONS[0]);
  const [insecticide, setInsecticide] = useState<string>(INSECTICIDE_OPTIONS[0]);
  const [nExposed, setNExposed] = useState<string>('100');
  const [nDead, setNDead] = useState<string>('84');
  const [larvalDensity, setLarvalDensity] = useState<string>('12.5');
  const [urban, setUrban] = useState<boolean>(false);
  const [irsCovered, setIrsCovered] = useState<boolean>(true);
  const [itnUsePct, setItnUsePct] = useState<string>('65');

  // GPS State
  const [gpsData, setGpsData] = useState<GPSLocationData>({
    latitude: 7.7712,
    longitude: 4.5621,
    accuracy: 6.5,
    isBlocked: false,
    proximityResult: null,
  });

  // Draft recovery state
  const [draftModalVisible, setDraftModalVisible] = useState<boolean>(false);
  const [draftTimestamp, setDraftTimestamp] = useState<string>('');
  const [pendingDraftData, setPendingDraftData] = useState<any>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Debounce ref for autosave
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check for saved draft on mount
  useEffect(() => {
    (async () => {
      const draft = await getFormDraft();
      if (draft && draft.formData) {
        setPendingDraftData(draft.formData);
        const date = new Date(draft.updatedAt);
        setDraftTimestamp(date.toLocaleTimeString());
        setDraftModalVisible(true);
      }
    })();
  }, []);

  // Autosave listener (debounced every 1.5s)
  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = setTimeout(async () => {
      const draftData = {
        recordId,
        selectedState,
        selectedLga,
        ward,
        collectionDate,
        species,
        insecticide,
        nExposed,
        nDead,
        larvalDensity,
        urban,
        irsCovered,
        itnUsePct,
      };

      await saveFormDraft(draftData);
      setLastSavedTime(new Date().toLocaleTimeString());
    }, 1500);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [
    recordId,
    selectedState,
    selectedLga,
    ward,
    collectionDate,
    species,
    insecticide,
    nExposed,
    nDead,
    larvalDensity,
    urban,
    irsCovered,
    itnUsePct,
  ]);

  const handleResumeDraft = () => {
    if (pendingDraftData) {
      if (pendingDraftData.selectedState) setSelectedState(pendingDraftData.selectedState);
      if (pendingDraftData.selectedLga) setSelectedLga(pendingDraftData.selectedLga);
      if (pendingDraftData.ward) setWard(pendingDraftData.ward);
      if (pendingDraftData.collectionDate) setCollectionDate(pendingDraftData.collectionDate);
      if (pendingDraftData.species) setSpecies(pendingDraftData.species);
      if (pendingDraftData.insecticide) setInsecticide(pendingDraftData.insecticide);
      if (pendingDraftData.nExposed) setNExposed(pendingDraftData.nExposed);
      if (pendingDraftData.nDead) setNDead(pendingDraftData.nDead);
      if (pendingDraftData.larvalDensity) setLarvalDensity(pendingDraftData.larvalDensity);
      if (pendingDraftData.urban !== undefined) setUrban(pendingDraftData.urban);
      if (pendingDraftData.irsCovered !== undefined) setIrsCovered(pendingDraftData.irsCovered);
      if (pendingDraftData.itnUsePct) setItnUsePct(pendingDraftData.itnUsePct);
    }
    setDraftModalVisible(false);
  };

  const handleDiscardDraft = async () => {
    await clearFormDraft();
    setDraftModalVisible(false);
  };

  const handleLocationUpdate = useCallback((data: GPSLocationData) => {
    setGpsData(data);
  }, []);

  // Update LGA when state changes
  const handleStateChange = (state: string) => {
    setSelectedState(state);
    const availableLgas = getLGAsForState(state);
    if (availableLgas.length > 0) {
      setSelectedLga(availableLgas[0]);
    }
  };

  const expNum = parseInt(nExposed, 10) || 0;
  const deadNum = parseInt(nDead, 10) || 0;

  // Validation rules
  const isMortalityInvalid = expNum <= 0 || deadNum < 0 || deadNum > expNum;
  const isGPSBlocked = gpsData.isBlocked || gpsData.latitude === null;

  const handleSubmitToOutbox = async () => {
    if (isMortalityInvalid) {
      Alert.alert('Validation Error', 'Mosquito dead count cannot exceed exposed count, and exposed must be > 0.');
      return;
    }

    if (isGPSBlocked) {
      Alert.alert('GPS Accuracy Error', 'GPS accuracy exceeds 50m limit. Step outside to acquire better fix before saving.');
      return;
    }

    setIsSubmitting(true);

    try {
      const rawPct = (deadNum / expNum) * 100;
      const mortalityPct = Math.round(rawPct * 10) / 10;
      let whoClass = 'Confirmed Resistance';
      if (mortalityPct >= 98.0) whoClass = 'Susceptible';
      else if (mortalityPct >= 90.0) whoClass = 'Possible Resistance';

      const uuid = recordId || generateUUID();

      const record: LocalFieldRecord = {
        id: uuid,
        state: selectedState,
        lga: selectedLga,
        ward: ward.trim() || 'Ward 01',
        collection_date: collectionDate,
        latitude: gpsData.latitude || 7.77,
        longitude: gpsData.longitude || 4.56,
        gps_accuracy_m: gpsData.accuracy || 8.0,
        species,
        insecticide,
        n_exposed: expNum,
        n_dead: deadNum,
        mortality_pct: mortalityPct,
        who_class: whoClass,
        larval_density: parseFloat(larvalDensity) || 0,
        urban,
        irs_covered: irsCovered,
        itn_use_pct: parseFloat(itnUsePct) || 0,
        sync_status: 'pending_sync',
        server_error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await saveFieldRecord(record);
      await clearFormDraft();

      Alert.alert(
        'Saved to Outbox',
        `Record for ${selectedLga} (${whoClass}) queued for synchronization.`,
        [
          { text: 'Add Another', onPress: resetForm },
          { text: 'View Outbox', onPress: onNavigateToOutbox },
        ]
      );
    } catch (err: any) {
      Alert.alert('Storage Error', err.message || 'Failed to save record to local SQLite.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRecordId('');
    setNExposed('100');
    setNDead('84');
    setLarvalDensity('12.5');
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header with Autosave Status */}
        <View className="flex-row items-center justify-between mb-4 mt-2">
          <View>
            <Text className="text-[22px] font-bold text-slate-900 tracking-tight">
              NMEP Form E-1
            </Text>
            <Text className="text-[13px] text-slate-500">
              Vector Entomological Field Surveillance
            </Text>
          </View>

          {lastSavedTime ? (
            <Badge
              label={`Autosaved ${lastSavedTime}`}
              variant="emerald"
            />
          ) : (
            <Badge label="Local Storage Ready" variant="slate" />
          )}
        </View>

        {/* Section 1: Geospatial & Field Location */}
        <Card title="1. Geospatial & Administrative Context" subtitle="Select location and capture GPS fix">
          {/* State Selector */}
          <Text className="text-[12px] font-bold text-slate-600 mb-1.5 uppercase">
            State
          </Text>
          <View className="flex-row mb-3">
            {STATES.map((st) => (
              <Pressable
                key={st}
                onPress={() => handleStateChange(st)}
                className={`flex-1 py-2 px-3 mr-2 rounded-xl border items-center ${
                  selectedState === st
                    ? 'bg-teal-600 border-teal-600'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-[13px] font-semibold ${
                    selectedState === st ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  {st}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* LGA Selector */}
          <Text className="text-[12px] font-bold text-slate-600 mb-1.5 uppercase">
            LGA (Filtered for {selectedState})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3.5">
            {getLGAsForState(selectedState).map((lga) => (
              <Pressable
                key={lga}
                onPress={() => setSelectedLga(lga)}
                className={`py-1.5 px-3 mr-2 rounded-lg border ${
                  selectedLga === lga
                    ? 'bg-slate-900 border-slate-900'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-[12px] font-medium ${
                    selectedLga === lga ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  {lga}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View className="flex-row">
            <View className="flex-1 mr-2">
              <AppInput
                label="Ward"
                value={ward}
                onChangeText={setWard}
                placeholder="e.g. Ward 04"
              />
            </View>
            <View className="flex-1">
              <AppInput
                label="Collection Date"
                value={collectionDate}
                onChangeText={setCollectionDate}
                placeholder="YYYY-MM-DD"
              />
            </View>
          </View>

          {/* GPS Accuracy Meter & 25km Warning Widget */}
          <GPSAccuracyMeter
            selectedState={selectedState}
            selectedLga={selectedLga}
            onLocationChange={handleLocationUpdate}
          />
        </Card>

        {/* Section 2: WHO Bioassay & Resistance */}
        <Card
          title="2. Bioassay & Insecticide Resistance"
          subtitle="WHO standard tube-test live calculation"
        >
          {/* Species Selector */}
          <Text className="text-[12px] font-bold text-slate-600 mb-1.5 uppercase">
            Vector Species
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3.5">
            {SPECIES_OPTIONS.map((sp) => (
              <Pressable
                key={sp}
                onPress={() => setSpecies(sp)}
                className={`py-1.5 px-3 mr-2 rounded-lg border ${
                  species === sp
                    ? 'bg-teal-700 border-teal-700'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-[12px] font-medium ${
                    species === sp ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  {sp}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Insecticide Selector */}
          <Text className="text-[12px] font-bold text-slate-600 mb-1.5 uppercase">
            Insecticide Compound
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3.5">
            {INSECTICIDE_OPTIONS.map((ins) => (
              <Pressable
                key={ins}
                onPress={() => setInsecticide(ins)}
                className={`py-1.5 px-3 mr-2 rounded-lg border ${
                  insecticide === ins
                    ? 'bg-slate-800 border-slate-800'
                    : 'bg-white border-slate-200'
                }`}
              >
                <Text
                  className={`text-[12px] font-medium ${
                    insecticide === ins ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  {ins}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Count inputs */}
          <View className="flex-row">
            <View className="flex-1 mr-2">
              <AppInput
                label="Mosquitoes Exposed"
                value={nExposed}
                onChangeText={setNExposed}
                keyboardType="numeric"
                placeholder="100"
              />
            </View>
            <View className="flex-1">
              <AppInput
                label="Mosquitoes Dead"
                value={nDead}
                onChangeText={setNDead}
                keyboardType="numeric"
                placeholder="84"
              />
            </View>
          </View>

          {/* Live WHO Calculation Card */}
          <WHOMortalityBadge nExposed={expNum} nDead={deadNum} />
        </Card>

        {/* Section 3: Environmental Covariates */}
        <Card title="3. Environmental & Intervention Covariates" subtitle="Intervention coverage indicators">
          <View className="flex-row">
            <View className="flex-1 mr-2">
              <AppInput
                label="Larval Density"
                value={larvalDensity}
                onChangeText={setLarvalDensity}
                keyboardType="decimal-pad"
                placeholder="12.5"
                helperText="Dip count avg"
              />
            </View>
            <View className="flex-1">
              <AppInput
                label="ITN Bednet Use (%)"
                value={itnUsePct}
                onChangeText={setItnUsePct}
                keyboardType="numeric"
                placeholder="65"
                helperText="0 - 100%"
              />
            </View>
          </View>

          <View className="flex-row items-center justify-between py-2 border-t border-slate-100 mt-1">
            <View>
              <Text className="text-[14px] font-semibold text-slate-800">
                IRS (Indoor Residual Spray)
              </Text>
              <Text className="text-[12px] text-slate-400">
                Structure sprayed in last 6 months
              </Text>
            </View>
            <Switch
              value={irsCovered}
              onValueChange={setIrsCovered}
              trackColor={{ false: '#CBD5E1', true: '#0D9488' }}
            />
          </View>

          <View className="flex-row items-center justify-between py-2 border-t border-slate-100 mt-1">
            <View>
              <Text className="text-[14px] font-semibold text-slate-800">
                Urban Settlement Classification
              </Text>
              <Text className="text-[12px] text-slate-400">
                {urban ? 'Urban settlement' : 'Rural / Peri-urban'}
              </Text>
            </View>
            <Switch
              value={urban}
              onValueChange={setUrban}
              trackColor={{ false: '#CBD5E1', true: '#0D9488' }}
            />
          </View>
        </Card>

        {/* Action Button */}
        <View className="mt-2 mb-8">
          <AppButton
            label="Save to Outbox"
            onPress={handleSubmitToOutbox}
            loading={isSubmitting}
            disabled={isMortalityInvalid || isGPSBlocked}
          />
          {isGPSBlocked && (
            <Text className="text-center text-[12px] text-red-500 mt-2 font-medium">
              Submission locked until high-accuracy GPS fix is acquired.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Autosaved Draft Recovery Modal */}
      <Modal
        visible={draftModalVisible}
        transparent
        animationType="fade"
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-5">
          <View className="bg-white rounded-2xl p-6 w-full max-w-sm border border-slate-200 shadow-xl">
            <View className="items-center mb-3">
              <View className="h-12 w-12 rounded-full bg-teal-50 items-center justify-center mb-2">
                <Text className="text-2xl">📋</Text>
              </View>
              <Text className="text-[18px] font-bold text-slate-900 text-center">
                Unsaved Draft Found
              </Text>
              <Text className="text-[13px] text-slate-500 text-center mt-1">
                A previously autosaved form from {draftTimestamp} is available in offline storage.
              </Text>
            </View>

            <View className="mt-4 space-y-2">
              <AppButton
                label="Resume Draft"
                variant="primary"
                onPress={handleResumeDraft}
                className="mb-2"
              />
              <AppButton
                label="Discard & Start Fresh"
                variant="secondary"
                onPress={handleDiscardDraft}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};
