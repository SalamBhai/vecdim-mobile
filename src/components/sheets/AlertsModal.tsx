import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import { X, ShieldAlert } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

interface AlertsModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({ visible, onClose }) => {
  const { currentUser } = useAuth();
  const state = currentUser?.state || 'Osun';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-end">
        <Pressable className="flex-1" onPress={onClose} />
        <View className="bg-white rounded-t-[32px] p-5 max-h-[88%] shadow-2xl">
          {/* Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-slate-100">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-xl bg-rose-600 items-center justify-center mr-2.5 shadow-xs">
                <ShieldAlert size={16} color="#FFFFFF" />
              </View>
              <View>
                <Text className="text-[18px] font-extrabold text-slate-900 font-bricolage">
                  Early Warning Alerts
                </Text>
                <Text className="text-[11px] text-slate-500 font-medium">
                  {state === 'National' ? 'Nationwide Vector Surge Triggers' : `${state} & National Vector Surge Triggers`}
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

          {/* National Tier Statistics (The 3 metric blocks) */}
          <View className="flex-row my-3 space-x-2 gap-2">
            <View className="flex-1 bg-rose-50 p-2.5 rounded-xl border border-rose-200 items-center">
              <Text className="text-[16px] font-black text-rose-700 font-mono">86</Text>
              <Text className="text-[10px] font-bold text-rose-800 uppercase font-bricolage">Alert</Text>
            </View>
            <View className="flex-1 bg-amber-50 p-2.5 rounded-xl border border-amber-200 items-center">
              <Text className="text-[16px] font-black text-amber-700 font-mono">135</Text>
              <Text className="text-[10px] font-bold text-amber-800 uppercase font-bricolage">Warning</Text>
            </View>
            <View className="flex-1 bg-blue-50 p-2.5 rounded-xl border border-blue-200 items-center">
              <Text className="text-[16px] font-black text-blue-700 font-mono">426</Text>
              <Text className="text-[10px] font-bold text-blue-800 uppercase font-bricolage">Watch</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Alert Item 1 - Critical Surge */}
            <View className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 mb-3 shadow-xs">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[13px] font-bold text-rose-950 font-bricolage">
                  {state === 'Lagos' ? 'Ikorodu • Ward 03 (Ijede)' : state === 'Kano' ? 'Dala • Ward 01 (Madabo)' : 'Osogbo • Ward 04 (Oja-Oba)'}
                </Text>
                <View className="px-2 py-0.5 rounded-full bg-rose-600">
                  <Text className="text-white text-[9px] font-black uppercase">CRITICAL SURGE</Text>
                </View>
              </View>
              <Text className="text-[11px] text-rose-800 font-medium leading-relaxed">
                Larval density (24.0/dip) breached the 95th percentile epidemic threshold. Immediate targeted IRS & larviciding dispatched.
              </Text>
            </View>

            {/* Alert Item 2 - Warning Level */}
            <View className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 mb-3 shadow-xs">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[13px] font-bold text-amber-950 font-bricolage">
                  {state === 'Lagos' ? 'Epe • Ward 02 (Poka)' : state === 'Kano' ? 'Gwale • Ward 04 (Diso)' : 'Olorunda • Ward 02 (Igbonna)'}
                </Text>
                <View className="px-2 py-0.5 rounded-full bg-amber-600">
                  <Text className="text-white text-[9px] font-black uppercase">WARNING LEVEL</Text>
                </View>
              </View>
              <Text className="text-[11px] text-amber-800 font-medium leading-relaxed">
                Larval index at 11.0/dip in excavation puddle. Habitat source reduction and community CHEWs mobilized.
              </Text>
            </View>

            {/* Alert Item 3 - Watch Tier */}
            <View className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 shadow-xs">
              <View className="flex-row items-center justify-between mb-1">
                <Text className="text-[13px] font-bold text-blue-950 font-bricolage">
                  {state === 'Lagos' ? 'Alimosho • Ward 01 (Egbeda)' : state === 'Kano' ? 'Nassarawa • Ward 02 (Kaura)' : 'Ife Central • Ward 01 (Ilare)'}
                </Text>
                <View className="px-2 py-0.5 rounded-full bg-blue-600">
                  <Text className="text-white text-[9px] font-black uppercase">WATCH TIER</Text>
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
