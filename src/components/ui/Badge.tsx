import React from 'react';
import { View, Text, Pressable } from 'react-native';

export type BadgeVariant = 'emerald' | 'amber' | 'rose' | 'slate' | 'sky';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  onPress?: () => void;
  className?: string;
  icon?: React.ReactNode;
}

export const Badge = React.memo(({
  label,
  variant = 'slate',
  onPress,
  className = '',
  icon,
}: BadgeProps) => {
  const Wrapper = onPress ? Pressable : View;

  let bgClass = 'bg-slate-100 border border-slate-200';
  let textClass = 'text-slate-700';

  switch (variant) {
    case 'emerald':
      bgClass = 'bg-emerald-50 border border-emerald-200';
      textClass = 'text-emerald-800';
      break;
    case 'amber':
      bgClass = 'bg-amber-50 border border-amber-200';
      textClass = 'text-amber-800';
      break;
    case 'rose':
      bgClass = 'bg-rose-50 border border-rose-200';
      textClass = 'text-rose-800';
      break;
    case 'sky':
      bgClass = 'bg-sky-50 border border-sky-200';
      textClass = 'text-sky-800';
      break;
    case 'slate':
      bgClass = 'bg-slate-100 border border-slate-200';
      textClass = 'text-slate-700';
      break;
  }

  return (
    <Wrapper
      onPress={onPress}
      className={`flex-row items-center self-start px-2.5 py-1 rounded-full ${bgClass} ${className}`}
    >
      {icon && <View className="mr-1.5">{icon}</View>}
      <Text className={`text-[12px] font-semibold ${textClass}`}>
        {label}
      </Text>
    </Wrapper>
  );
});

Badge.displayName = 'Badge';
