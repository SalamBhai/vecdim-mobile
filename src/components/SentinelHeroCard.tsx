import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Compass, MapPin } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

interface SentinelHeroCardProps {
  onPressProfile?: () => void;
}

export const SentinelHeroCard: React.FC<SentinelHeroCardProps> = ({ onPressProfile }) => {
  const { currentUser } = useAuth();

  const avatarColor = currentUser?.avatarColor || '#047857';
  const state = currentUser?.state || 'Osun';
  const sentinelSite = currentUser?.sentinelSite || 'OS-774-WARD4 • Oja-Oba Central';
  const officerName = currentUser?.name || 'Tega Babalola';
  const officerBadge = currentUser?.badge || 'Officer #042';
  const division = currentUser?.division || 'Osun Field Division • Active';

  return (
    <View
      className="rounded-[28px] p-5 shadow-lg shadow-emerald-950/20 overflow-hidden mb-4"
      style={{ backgroundColor: avatarColor }}
    >
      {/* Top Pill & Circular 72% Gauge */}
      <View className="flex-row items-center justify-between mb-3.5">
        <View className="flex-row items-center bg-black/25 px-3 py-1 rounded-full border border-white/10">
          <View className="w-1.5 h-1.5 rounded-full bg-emerald-300 mr-1.5" />
          <Text className="text-[10px] font-bold text-white uppercase tracking-wider">
            • Live Surveillance • {state}
          </Text>
        </View>

        {/* Circular Gauge Ring (72% target) */}
        <View className="w-11 h-11 items-center justify-center relative">
          <Svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <Path
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="3.2"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <Path
              stroke="#FFFFFF"
              strokeDasharray="72, 100"
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </Svg>
          <Text className="absolute text-[11px] font-black text-white tracking-tight">
            72%
          </Text>
        </View>
      </View>

      {/* Surveillance Title & Details */}
      <View className="mb-3.5">
        <Text className="text-[20px] font-extrabold text-white tracking-tight leading-tight">
          Sentinel Site Inspection
        </Text>
        <Text className="text-[12px] text-white/80 font-medium mt-0.5">
          {sentinelSite}
        </Text>
        <Text className="text-[12px] text-white/95 font-semibold mt-1">
          Next dip collection • 4:30 PM (WAT)
        </Text>
      </View>

      {/* Inset Sub-Banner: Field Officer & GPS Transect Path */}
      <Pressable
        onPress={onPressProfile}
        className="bg-black/25 rounded-2xl p-3 flex-row items-center justify-between border border-white/10 active:bg-black/35"
      >
        <View className="flex-row items-center flex-1 mr-2">
          <View className="w-8 h-8 rounded-full bg-black/40 border-2 border-white/50 items-center justify-center mr-2.5 shadow-xs">
            <Text className="text-[13px]">🔬</Text>
          </View>
          <View className="flex-1">
            <Text className="text-[12px] font-bold text-white leading-tight" numberOfLines={1}>
              {officerName} • {officerBadge}
            </Text>
            <Text className="text-[10px] text-white/75 font-medium">
              {division}
            </Text>
          </View>
        </View>

        {/* Route compass & pin indicator */}
        <View className="flex-row items-center space-x-1 opacity-90">
          <View className="w-1.5 h-1.5 rounded-full bg-white/70" />
          <View className="w-3 border-t border-dashed border-white/50 mx-1" />
          <Compass size={14} color="#FFFFFF" />
          <View className="w-3 border-t border-dashed border-white/50 mx-1" />
          <MapPin size={14} color="#FFFFFF" />
        </View>
      </Pressable>
    </View>
  );
};
