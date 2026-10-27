import React from 'react';
import { Pressable, ActivityIndicator, View, Text, GestureResponderEvent } from 'react-native';

export type AppButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';

export interface AppButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
  variant?: AppButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

export const AppButton = React.memo(({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  fullWidth = true,
  className = '',
}: AppButtonProps) => {
  let containerClasses = 'flex-row items-center justify-center rounded-xl px-5 py-3.5 transition-all';
  let textClass = 'text-[15px] font-semibold';
  let indicatorColor = '#FFFFFF';

  if (fullWidth) {
    containerClasses += ' w-full';
  }

  switch (variant) {
    case 'primary':
      containerClasses += disabled
        ? ' bg-teal-300'
        : ' bg-teal-600 active:bg-teal-700 shadow-sm';
      textClass += ' text-white';
      indicatorColor = '#FFFFFF';
      break;
    case 'secondary':
      containerClasses += disabled
        ? ' bg-slate-100 border border-slate-200'
        : ' bg-slate-100 active:bg-slate-200 border border-slate-200';
      textClass += disabled ? ' text-slate-400' : ' text-slate-700';
      indicatorColor = '#334155';
      break;
    case 'outline':
      containerClasses += disabled
        ? ' bg-transparent border border-slate-200'
        : ' bg-transparent border border-teal-600 active:bg-teal-50';
      textClass += disabled ? ' text-slate-400' : ' text-teal-700';
      indicatorColor = '#0D9488';
      break;
    case 'danger':
      containerClasses += disabled
        ? ' bg-red-200'
        : ' bg-red-600 active:bg-red-700';
      textClass += ' text-white';
      indicatorColor = '#FFFFFF';
      break;
    case 'ghost':
      containerClasses += ' bg-transparent';
      textClass += disabled ? ' text-slate-400' : ' text-slate-600';
      indicatorColor = '#64748B';
      break;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`${containerClasses} ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={indicatorColor} size="small" />
      ) : (
        <View className="flex-row items-center justify-center">
          {leftIcon && <View className="mr-2">{leftIcon}</View>}
          <Text className={textClass}>{label}</Text>
          {rightIcon && <View className="ml-2">{rightIcon}</View>}
        </View>
      )}
    </Pressable>
  );
});

AppButton.displayName = 'AppButton';
