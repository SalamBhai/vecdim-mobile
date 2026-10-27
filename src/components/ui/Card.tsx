import React from 'react';
import { View, ViewProps, Text } from 'react-native';

export interface CardProps extends ViewProps {
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  containerClassName?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  headerRight,
  containerClassName = '',
  className = '',
  children,
  style,
  ...props
}) => {
  return (
    <View
      className={`bg-white rounded-2xl p-4.5 mb-4 border border-slate-200/90 shadow-sm ${containerClassName}`}
      style={style}
      {...props}
    >
      {(title || headerRight) && (
        <View className="flex-row items-center justify-between mb-3.5 pb-2.5 border-b border-slate-100">
          <View className="flex-1 mr-2">
            {title && (
              <Text className="text-[16px] font-bold text-slate-900 tracking-tight">
                {title}
              </Text>
            )}
            {subtitle && (
              <Text className="text-[12px] text-slate-500 mt-0.5">
                {subtitle}
              </Text>
            )}
          </View>
          {headerRight && <View>{headerRight}</View>}
        </View>
      )}
      <View className={className}>{children}</View>
    </View>
  );
};
