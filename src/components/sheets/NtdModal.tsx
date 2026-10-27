import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Alert,
} from 'react-native';
import { X, CheckCircle2, Waves } from 'lucide-react-native';

import { useAuth } from '../../context/AuthContext';
import { saveFieldRecord, LocalFieldRecord } from '../../storage/db';
import { GPSAccuracyMeter, GPSLocationData } from '../GPSAccuracyMeter';

const WATER_SITES = [
  'Stream / River',
  'Dam / Reservoir',
  'Pond',
  'Canal',
];

interface NtdModalProps {
  visible: boolean;
  onClose: () => void;
  onRecordSaved: () => void;
}

export const NtdModal: React.FC<NtdModalProps> = ({
  visible,
  onClose,
  onRecordSaved,
}) => {
  const { currentUser } = useAuth();
  const state = currentUser?.state === 'National' || !currentUser ? 'Osun' : currentUser.state;
  const lga = currentUser?.primaryLga || 'Osogbo';

  const [selectedSite, setSelectedSite] = useState<string>(WATER_SITES[0]);
  const [bulinusCount, setBulinusCount] = useState<number>(24);
  const [biomphalariaCount, setBiomphalariaCount] = useState<number>(12);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [gpsData, setGpsData] = useState<GPSLocationData>({
    latitude: currentUser?.defaultLat || 7.7827,
    longitude: currentUser?.defaultLon || 4.5418,
    accuracy: 5.4,
    isBlocked: false,
    proximityResult: null,
  });

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const uuid = 'rec_ntd_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 8);

      const record: LocalFieldRecord = {
        id: uuid,
        user_id: currentUser?.id || 'u_field_03',
        state,
        lga,
        ward: `${selectedSite} Contact Zone`,
        collection_date: new Date().toISOString().split('T')[0],
        latitude: gpsData.latitude || currentUser?.defaultLat || 7.7827,
        longitude: gpsData.longitude || currentUser?.defaultLon || 4.5418,
        gps_accuracy_m: gpsData.accuracy || 5.4,
        species: 'Bulinus globosus & Biomphalaria pfeifferi',
        insecticide: 'Niclosamide Molluscicide',
        n_exposed: bulinusCount,
        n_dead: biomphalariaCount,
        mortality_pct: 0,
        who_class: bulinusCount > 20 ? 'High Shedding Risk' : 'Low Shedding Risk',
        larval_density: bulinusCount + biomphalariaCount,
        urban: false,
        irs_covered: false,
        itn_use_pct: 50,
        sync_status: 'pending_sync',
        server_error: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await saveFieldRecord(record);
      setIsSubmitting(false);
      onRecordSaved();
      onClose();

      Alert.alert(
        'NTD Survey Staged',
        `Snail host assessment saved for ${selectedSite} (${record.who_class}). Staged in offline queue.`
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
        <View className="bg-white rounded-t-[32px] px-6 pt-5 pb-8 shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3.5 border-b border-slate-100">
            <View>
              <Text className="text-[19px] font-extrabold text-slate-900 font-bricolage">
                NTD Snail Host Survey
              </Text>
              <Text className="text-[11.5px] text-slate-400 font-medium mt-0.5">
                Schistosomiasis Sentinel Protocol
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
            >
              <X size={16} color="#475569" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} className="pt-3.5">
            {/* Water Contact Site (2x2 Grid) */}
            <View className="mb-4">
              <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 font-bricolage">
                WATER CONTACT SITE
              </Text>
              <View className="flex-row gap-2.5 mb-2.5">
                <Pressable
                  onPress={() => setSelectedSite(WATER_SITES[0])}
                  className={`flex-1 py-3 px-3 rounded-2xl border items-center justify-center ${
                    selectedSite === WATER_SITES[0]
                      ? 'bg-cyan-50/90 border-cyan-500 shadow-xs'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-[12px] text-center ${
                      selectedSite === WATER_SITES[0]
                        ? 'text-cyan-900 font-bold'
                        : 'text-slate-600 font-medium'
                    }`}
                  >
                    {WATER_SITES[0]}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSelectedSite(WATER_SITES[1])}
                  className={`flex-1 py-3 px-3 rounded-2xl border items-center justify-center ${
                    selectedSite === WATER_SITES[1]
                      ? 'bg-cyan-50/90 border-cyan-500 shadow-xs'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-[12px] text-center ${
                      selectedSite === WATER_SITES[1]
                        ? 'text-cyan-900 font-bold'
                        : 'text-slate-600 font-medium'
                    }`}
                  >
                    {WATER_SITES[1]}
                  </Text>
                </Pressable>
              </View>

              <View className="flex-row gap-2.5">
                <Pressable
                  onPress={() => setSelectedSite(WATER_SITES[2])}
                  className={`flex-1 py-3 px-3 rounded-2xl border items-center justify-center ${
                    selectedSite === WATER_SITES[2]
                      ? 'bg-cyan-50/90 border-cyan-500 shadow-xs'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-[12px] text-center ${
                      selectedSite === WATER_SITES[2]
                        ? 'text-cyan-900 font-bold'
                        : 'text-slate-600 font-medium'
                    }`}
                  >
                    {WATER_SITES[2]}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSelectedSite(WATER_SITES[3])}
                  className={`flex-1 py-3 px-3 rounded-2xl border items-center justify-center ${
                    selectedSite === WATER_SITES[3]
                      ? 'bg-cyan-50/90 border-cyan-500 shadow-xs'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <Text
                    className={`text-[12px] text-center ${
                      selectedSite === WATER_SITES[3]
                        ? 'text-cyan-900 font-bold'
                        : 'text-slate-600 font-medium'
                    }`}
                  >
                    {WATER_SITES[3]}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Snail Count Steppers (Two Side-by-Side in Cyan Card) */}
            <View className="p-4 bg-cyan-50/40 rounded-2xl border border-cyan-200 flex-row items-center justify-between mb-5">
              {/* Bulinus Host Stepper */}
              <View className="flex-1 mr-2">
                <Text className="text-[12.5px] font-bold text-slate-800 font-bricolage mb-2">
                  Bulinus Host
                </Text>
                <View className="flex-row items-center">
                  <Pressable
                    onPress={() => setBulinusCount(Math.max(0, bulinusCount - 2))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 items-center justify-center active:bg-slate-100 shadow-xs"
                  >
                    <Text className="font-bold text-slate-700 text-[16px]">-</Text>
                  </Pressable>
                  <Text className="text-[15px] font-extrabold w-10 text-center text-slate-900 font-mono">
                    {bulinusCount}
                  </Text>
                  <Pressable
                    onPress={() => setBulinusCount(bulinusCount + 2)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 items-center justify-center active:bg-slate-100 shadow-xs"
                  >
                    <Text className="font-bold text-slate-700 text-[16px]">+</Text>
                  </Pressable>
                </View>
              </View>

              {/* Divider */}
              <View className="w-[1px] h-10 bg-cyan-200 mx-2" />

              {/* Biomphalaria Stepper */}
              <View className="flex-1 ml-2">
                <Text className="text-[12.5px] font-bold text-slate-800 font-bricolage mb-2">
                  Biomphalaria
                </Text>
                <View className="flex-row items-center">
                  <Pressable
                    onPress={() => setBiomphalariaCount(Math.max(0, biomphalariaCount - 2))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 items-center justify-center active:bg-slate-100 shadow-xs"
                  >
                    <Text className="font-bold text-slate-700 text-[16px]">-</Text>
                  </Pressable>
                  <Text className="text-[15px] font-extrabold w-10 text-center text-slate-900 font-mono">
                    {biomphalariaCount}
                  </Text>
                  <Pressable
                    onPress={() => setBiomphalariaCount(biomphalariaCount + 2)}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 items-center justify-center active:bg-slate-100 shadow-xs"
                  >
                    <Text className="font-bold text-slate-700 text-[16px]">+</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            {/* GPS Coordinates & Accuracy Meter */}
            <GPSAccuracyMeter
              selectedState={state}
              selectedLga={lga}
              initialLat={gpsData.latitude || currentUser?.defaultLat || 7.7827}
              initialLon={gpsData.longitude || currentUser?.defaultLon || 4.5418}
              initialAccuracy={gpsData.accuracy || 5.4}
              onLocationChange={setGpsData}
            />

            {/* Submit NTD Survey Button */}
            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting || gpsData.isBlocked}
              className={`py-3.5 rounded-2xl items-center justify-center shadow-md mb-2 ${
                gpsData.isBlocked ? 'bg-slate-300' : 'bg-[#006D77] active:bg-[#00555D]'
              }`}
            >
              <Text className="text-white font-bold text-[14px] font-bricolage">
                {isSubmitting ? 'Staging NTD Record...' : 'Submit NTD Survey'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
