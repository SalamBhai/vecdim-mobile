import React from 'react';
import { View, ViewProps, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface ScreenProps extends ViewProps {
  backgroundColor?: string;
  statusBarStyle?: 'light-content' | 'dark-content';
}

export const Screen: React.FC<ScreenProps> = ({
  children,
  className = '',
  backgroundColor = 'bg-slate-50',
  statusBarStyle = 'dark-content',
  ...props
}) => {
  return (
    <SafeAreaView className={`flex-1 ${backgroundColor}`} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={statusBarStyle} backgroundColor="#F8FAFC" />
      <View className={`flex-1 px-4 pt-2 ${className}`} {...props}>
        {children}
      </View>
    </SafeAreaView>
  );
};
