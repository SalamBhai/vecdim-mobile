import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { X, ShieldAlert, Flame } from 'lucide-react-native';

interface AlertsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({ visible, onClose }) => {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/60 justify-end">
        <View className="bg-white rounded-t-[32px] p-5 max-h-[85%] shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3.5 border-b border-slate-100">
            <View className="flex-row items-center">
              <View className="w-9 h-9 rounded-xl bg-rose-600 items-center justify-center mr-3 shadow-xs">
                <ShieldAlert size={18} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-[19px] font-extrabold text-slate-900 font-bricolage">
                  Early Warning Alerts
                </Text>
                <Text className="text-[11.5px] text-slate-400 font-medium mt-0.5">
                  Osun Vector Surge Triggers
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

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 14 }}>
            {/* Alert Item 1 - Critical */}
            <View className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 mb-3.5 shadow-xs">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-[13.5px] font-extrabold text-rose-950 font-bricolage">
                  Osogbo • Ward 04 (Oja-Oba)
                </Text>
                <View className="px-2.5 py-0.5 rounded-full bg-rose-600">
                  <Text className="text-white text-[9px] font-black uppercase">CRITICAL</Text>
                </View>
              </View>
              <Text className="text-[12px] text-rose-900 font-medium leading-relaxed">
                Larval density (24.0/dip) breached the 95th percentile epidemic threshold. Immediate targeted IRS & larviciding dispatched.
              </Text>
            </View>

            {/* Alert Item 2 - Warning */}
            <View className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 mb-3.5 shadow-xs">
              <View className="flex-row items-center justify-between mb-1.5">
                <Text className="text-[13.5px] font-extrabold text-amber-950 font-bricolage">
                  Olorunda • Ward 02 (Igbonna)
                </Text>
                <View className="px-2.5 py-0.5 rounded-full bg-amber-600">
                  <Text className="text-white text-[9px] font-black uppercase">WARNING</Text>
                </View>
              </View>
              <Text className="text-[12px] text-amber-900 font-medium leading-relaxed">
                Larval index at 11.0/dip in excavation puddle. Habitat source reduction and community CHEWs mobilized.
              </Text>
            </View>

            {/* Alert Item 3 */}
            <View className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[13px] font-bold text-blue-950">
                  Ife Central • Ward 01 (Ilare)
                </Text>
                <View className="px-2 py-0.5 rounded-full bg-blue-600">
                  <Text className="text-white text-[9px] font-bold">WATCH TIER</Text>
                </View>
              </View>
              <Text className="text-[11px] text-blue-800 font-medium leading-relaxed">
                Anopheles gambiae s.l. confirmed Permethrin mortality under 88%. Suspected pyrethroid knockdown resistance.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
