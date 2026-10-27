import React from 'react';
import { View, Text } from 'react-native';
import { calculateWHOMortality, WHOCalculationResult } from '../utils/whoCalculator';
import { Badge } from './ui/Badge';

interface WHOMortalityBadgeProps {
  nExposed: number;
  nDead: number;
}

export const WHOMortalityBadge: React.FC<WHOMortalityBadgeProps> = ({ nExposed, nDead }) => {
  const result: WHOCalculationResult | null = calculateWHOMortality(nExposed, nDead);

  if (!result) {
    return (
      <View className="bg-slate-50 p-3.5 rounded-xl border border-dashed border-slate-300 items-center justify-center my-2">
        <Text className="text-[13px] text-slate-400 font-medium">
          Enter exposed & dead counts for live WHO resistance classification
        </Text>
      </View>
    );
  }

  let badgeVariant: 'emerald' | 'amber' | 'rose' = 'rose';
  if (result.whoClass === 'Susceptible') badgeVariant = 'emerald';
  if (result.whoClass === 'Possible Resistance') badgeVariant = 'amber';

  return (
    <View className={`p-4 rounded-xl border ${result.badgeBg} ${result.badgeBorder} my-2`}>
      {/* Row 1: Label on left, WHO classification badge on right */}
      <View className="flex-row items-center justify-between mb-1.5">
        <Text className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
          MORTALITY RATE
        </Text>
        <Badge label={result.whoClass} variant={badgeVariant} />
      </View>

      {/* Row 2: Percentage */}
      <View className="flex-row items-baseline mb-1">
        <Text className="text-[24px] font-mono font-black text-slate-900">
          {result.mortalityPct.toFixed(1)}%
        </Text>
      </View>

      {/* Row 3: WHO Description */}
      <Text className={`text-[11.5px] font-medium leading-relaxed ${result.badgeText}`}>
        {result.description}
      </Text>
    </View>
  );
};
