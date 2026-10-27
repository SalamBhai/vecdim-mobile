import React, { useState } from 'react';
import { View, TextInput, TextInputProps, Text } from 'react-native';

export interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const AppInput = React.memo(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  placeholder,
  value,
  onChangeText,
  containerClassName = '',
  className = '',
  onFocus,
  onBlur,
  ...props
}: AppInputProps) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`w-full mb-3.5 ${containerClassName}`}>
      {label && (
        <Text className="text-[13px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
          {label}
        </Text>
      )}

      <View
        className={`flex-row items-center rounded-xl bg-white px-3.5 py-3 border ${
          error
            ? 'border-red-400 bg-red-50/20'
            : isFocused
            ? 'border-teal-600 bg-teal-50/10 shadow-sm'
            : 'border-slate-200'
        }`}
      >
        {leftIcon && <View className="mr-2.5">{leftIcon}</View>}

        <TextInput
          className={`flex-1 text-[15px] text-slate-900 p-0 ${className}`}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />

        {rightIcon && <View className="ml-2.5">{rightIcon}</View>}
      </View>

      {error ? (
        <Text className="text-[12px] font-medium text-red-600 mt-1 pl-1">
          {error}
        </Text>
      ) : helperText ? (
        <Text className="text-[12px] text-slate-400 mt-1 pl-1">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
});

AppInput.displayName = 'AppInput';
