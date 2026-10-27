import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Rect, Path, G, Circle, Text as SvgText } from 'react-native-svg';
import { useAuth } from '../context/AuthContext';

interface TransectRouteMapProps {
  onPressDetails?: () => void;
}

export const TransectRouteMap: React.FC<TransectRouteMapProps> = ({ onPressDetails }) => {
  const { currentUser } = useAuth();
  const state = currentUser?.state || 'Osun';

  // Landmarks tailored to active officer jurisdiction
  const landmarks =
    state === 'Lagos'
      ? { l1: 'Ikorodu', l2: 'Alausa', l3: 'Epe', l4: 'Badagry', sector: 'Lagos Sector 02 (Urban)' }
      : state === 'Kano'
      ? { l1: 'Nasarawa', l2: 'Dala', l3: 'Gwale', l4: 'Bompai', sector: 'Kano Sector 01 (Arid)' }
      : { l1: 'Osogbo', l2: 'Oja-Oba', l3: 'Olorunda', l4: 'Ede South', sector: 'Osun Sector 04 (Rainforest)' };

  return (
    <View className="mb-4">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-[14px] font-bold text-slate-900 tracking-tight">
          Active Transect Route ({state})
        </Text>
        <Pressable onPress={onPressDetails}>
          <Text className="text-[12px] font-bold text-emerald-600">
            View details
          </Text>
        </Pressable>
      </View>

      {/* Styled Route Canvas Card */}
      <Pressable
        onPress={onPressDetails}
        className="h-32 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden relative shadow-xs"
      >
        <Svg width="100%" height="100%" viewBox="0 0 340 128">
          <Rect width="340" height="128" fill="#F1F5F9" />

          {/* Road Grid */}
          <Path d="M-20 40 L360 40" stroke="#E2E8F0" strokeWidth="6" />
          <Path d="M-20 90 L360 85" stroke="#E2E8F0" strokeWidth="4" />
          <Path d="M60 -10 L70 140" stroke="#E2E8F0" strokeWidth="5" />
          <Path d="M180 -10 L190 140" stroke="#E2E8F0" strokeWidth="6" />
          <Path d="M280 -10 L275 140" stroke="#E2E8F0" strokeWidth="4" />

          {/* Green Surveillance Transect Path */}
          <Path
            d="M 20 70 Q 70 60 110 75 T 200 65 T 260 70 T 310 60"
            stroke="#059669"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />

          {/* Dynamic Landmarks */}
          <SvgText x="25" y="55" fill="#64748B" fontSize="9" fontWeight="bold">
            {landmarks.l1}
          </SvgText>
          <SvgText x="100" y="50" fill="#64748B" fontSize="9" fontWeight="bold">
            {landmarks.l2}
          </SvgText>
          <SvgText x="195" y="52" fill="#64748B" fontSize="9" fontWeight="bold">
            {landmarks.l3}
          </SvgText>
          <SvgText x="275" y="85" fill="#64748B" fontSize="9" fontWeight="bold">
            {landmarks.l4}
          </SvgText>

          {/* Field rover badge at active centroid */}
          <G x="195" y="40">
            <Rect width="18" height="18" rx="5" fill="#059669" />
            <Circle cx="9" cy="9" r="4" fill="#FFFFFF" />
          </G>

          {/* Focus pin */}
          <G x="302" y="54">
            <Circle cx="6" cy="6" r="6" fill="#0F172A" />
            <Circle cx="6" cy="6" r="2.5" fill="#FFFFFF" />
          </G>
        </Svg>

        <View className="absolute bottom-2 right-2 bg-white/95 px-2 py-0.5 rounded-md border border-slate-200 shadow-xs">
          <Text className="text-[9px] font-bold text-slate-600">
            {landmarks.sector}
          </Text>
        </View>
      </Pressable>
    </View>
  );
};
