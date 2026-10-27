import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { X, Database } from 'lucide-react-native';

interface Dhis2ModalProps {
  visible: boolean;
  onClose: () => void;
}

export const Dhis2Modal: React.FC<Dhis2ModalProps> = ({ visible, onClose }) => {
  const samplePayload = {
    dataValues: [
      {
        dataElement: 'VECDIM_LARVAL_DENSITY',
        period: '202610',
        orgUnit: 'OS_OSOGBO_W4',
        value: '24.0',
        comment: 'NMEP Form E-1 Sentinel Site',
      },
      {
        dataElement: 'VECDIM_WHO_MORTALITY_PCT',
        period: '202610',
        orgUnit: 'OS_OSOGBO_W4',
        value: '84.0',
        comment: 'Confirmed Resistance - Permethrin',
      },
      {
        dataElement: 'VECDIM_GPS_ACCURACY_METERS',
        period: '202610',
        orgUnit: 'OS_OSOGBO_W4',
        value: '5.8',
        comment: 'WGS84 Satellite Geofence Pass',
      },
    ],
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-[32px] p-5 h-[85%] flex-col shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 shrink-0">
            <View className="flex-row items-center">
              <View className="p-1.5 bg-slate-900 rounded-lg mr-2">
                <Database size={16} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-[17px] font-extrabold text-slate-900 font-bricolage">
                  DHIS2 Web API Payload
                </Text>
                <Text className="text-[11px] text-slate-500">
                  Live dataValueSets Serialization
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 items-center justify-center active:bg-slate-200"
            >
              <X size={16} color="#475569" />
            </Pressable>
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={true} bounces={true} contentContainerStyle={{ paddingVertical: 15 }}>
            <View className="bg-slate-900 rounded-2xl p-4 border border-slate-800 shadow-inner">
              <Text className="text-[11px] font-mono text-emerald-400">
                {JSON.stringify(samplePayload, null, 2)}
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
