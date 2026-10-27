import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
} from 'react-native';
import {
  Check,
  Plus,
  LogOut,
  X,
  Sun,
  Moon,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { DemoUser } from '../../data/demoUsers';
import { LocalFieldRecord } from '../../storage/db';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
  records: LocalFieldRecord[];
  onUserChanged?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  visible,
  onClose,
  onUserChanged,
}) => {
  const { currentUser, switchUser, allUsers, logout } = useAuth();

  // Theme switch state: default to false (White / Light theme) so user sees the white theme immediately
  const [isDark, setIsDark] = useState<boolean>(false);

  // Split into field workers and supervisor accounts (like Image 4)
  const fieldAccounts = allUsers.filter((u) => u.role === 'field');
  const otherAccounts = allUsers.filter((u) => u.role !== 'field');

  const handleSelectAccount = async (user: DemoUser) => {
    if (user.id !== currentUser?.id) {
      await switchUser(user.id);
      if (onUserChanged) onUserChanged();
    }
    onClose();
  };

  const handleLogOut = async () => {
    onClose();
    await logout();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-black/60 justify-end">
        <View
          className={`rounded-t-[32px] pt-3 pb-8 px-5 max-h-[85%] shadow-2xl ${
            isDark ? 'bg-[#18181B]' : 'bg-white border-t border-slate-200/80'
          }`}
        >
          {/* Top Pill Drag Handle */}
          <View
            className={`w-10 h-1 rounded-full mx-auto mb-4 ${
              isDark ? 'bg-zinc-600' : 'bg-slate-300'
            }`}
          />

          {/* Header Row with Theme Switcher and Close Button */}
          <View
            className={`flex-row items-center justify-between pb-3 border-b mb-2 ${
              isDark ? 'border-zinc-800' : 'border-slate-100'
            }`}
          >
            <Text
              className={`text-[16px] font-extrabold tracking-tight ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}
            >
              Switch Account
            </Text>

            <View className="flex-row items-center space-x-2">
              {/* Interactive Theme Switcher Pill */}
              <Pressable
                onPress={() => setIsDark(!isDark)}
                className={`flex-row items-center px-2.5 py-1 rounded-full border mr-1.5 active:opacity-75 ${
                  isDark
                    ? 'bg-zinc-800/90 border-zinc-700'
                    : 'bg-slate-100 border-slate-200'
                }`}
              >
                {isDark ? (
                  <>
                    <Moon size={12} color="#FBBF24" />
                    <Text className="text-[11px] font-bold text-zinc-300 ml-1.5">
                      Dark
                    </Text>
                  </>
                ) : (
                  <>
                    <Sun size={12} color="#D97706" />
                    <Text className="text-[11px] font-bold text-slate-700 ml-1.5">
                      Light
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Close Button */}
              <Pressable
                onPress={onClose}
                className={`w-7 h-7 rounded-full items-center justify-center ${
                  isDark
                    ? 'bg-zinc-800 active:bg-zinc-700'
                    : 'bg-slate-100 active:bg-slate-200'
                }`}
              >
                <X size={14} color={isDark ? '#A1A1AA' : '#64748B'} />
              </Pressable>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
            {/* Field Officer Accounts (Primary List) */}
            <View className="space-y-1 mb-4">
              {fieldAccounts.map((account) => {
                const isActive = account.id === currentUser?.id;
                return (
                  <Pressable
                    key={account.id}
                    onPress={() => handleSelectAccount(account)}
                    className={`flex-row items-center justify-between py-3 px-2 rounded-2xl ${
                      isDark
                        ? 'active:bg-zinc-800/60'
                        : 'active:bg-slate-50'
                    }`}
                  >
                    <View className="flex-row items-center flex-1 mr-3">
                      {/* Circular Avatar */}
                      <View
                        className={`w-11 h-11 rounded-full items-center justify-center mr-3.5 border shadow-xs ${
                          isDark ? 'border-zinc-700/60' : 'border-slate-200'
                        }`}
                        style={{ backgroundColor: account.avatarColor }}
                      >
                        <Text className="text-white font-bold text-[13px]">
                          {account.initials}
                        </Text>
                      </View>

                      {/* Name & Subtitle */}
                      <View className="flex-1">
                        <Text
                          className={`text-[14px] leading-tight ${
                            isDark
                              ? 'text-white font-semibold'
                              : 'text-slate-900 font-extrabold'
                          }`}
                        >
                          {account.id}{' '}
                          <Text
                            className={`font-normal ${
                              isDark ? 'text-zinc-400' : 'text-slate-500'
                            }`}
                          >
                            ({account.name})
                          </Text>
                        </Text>
                        <Text
                          className={`text-[12px] mt-0.5 ${
                            isDark ? 'text-zinc-400' : 'text-slate-500'
                          }`}
                        >
                          • {account.state} State • {account.title}
                        </Text>
                      </View>
                    </View>

                    {/* Checkmark for Active Account */}
                    {isActive ? (
                      <View className="w-6 h-6 rounded-full bg-[#0095F6] items-center justify-center shadow-xs">
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    ) : (
                      <View
                        className={`w-6 h-6 rounded-full border ${
                          isDark ? 'border-zinc-700' : 'border-slate-300'
                        }`}
                      />
                    )}
                  </Pressable>
                );
              })}

              {/* Add / Switch Account Action */}
              <Pressable
                onPress={handleLogOut}
                className={`flex-row items-center py-3 px-2 rounded-2xl ${
                  isDark ? 'active:bg-zinc-800/60' : 'active:bg-slate-50'
                }`}
              >
                <View
                  className={`w-11 h-11 rounded-full border items-center justify-center mr-3.5 ${
                    isDark
                      ? 'border-zinc-700 bg-zinc-900/60'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <Plus size={20} color={isDark ? '#FFFFFF' : '#0F172A'} />
                </View>
                <Text
                  className={`text-[14px] font-bold ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Add another account / Sign in
                </Text>
              </Pressable>
            </View>

            {/* Other Profiles Section (Supervisors & National HQ) */}
            <View
              className={`mb-4 pt-3 border-t ${
                isDark ? 'border-zinc-800/80' : 'border-slate-100'
              }`}
            >
              <Text
                className={`text-[11px] font-bold uppercase tracking-wider mb-2 px-2 ${
                  isDark ? 'text-zinc-400' : 'text-slate-400'
                }`}
              >
                Other profiles
              </Text>

              {otherAccounts.map((account) => {
                const isActive = account.id === currentUser?.id;
                return (
                  <Pressable
                    key={account.id}
                    onPress={() => handleSelectAccount(account)}
                    className={`flex-row items-center justify-between py-2.5 px-2 rounded-2xl ${
                      isDark ? 'active:bg-zinc-800/60' : 'active:bg-slate-50'
                    }`}
                  >
                    <View className="flex-row items-center flex-1 mr-3">
                      <View
                        className={`w-10 h-10 rounded-full items-center justify-center mr-3.5 border ${
                          isDark ? 'border-zinc-700' : 'border-slate-200'
                        }`}
                        style={{ backgroundColor: account.avatarColor }}
                      >
                        <Text className="text-white font-bold text-[12px]">
                          {account.initials}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`text-[13.5px] font-bold leading-tight ${
                            isDark ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {account.name}
                        </Text>
                        <Text
                          className={`text-[11.5px] mt-0.5 ${
                            isDark ? 'text-zinc-400' : 'text-slate-500'
                          }`}
                        >
                          • {account.state} {account.role === 'uniosun' ? 'Consortium' : 'Supervisor'}
                        </Text>
                      </View>
                    </View>

                    {isActive && (
                      <View className="w-5 h-5 rounded-full bg-[#0095F6] items-center justify-center">
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Bottom Full-Width Pill Action Button */}
            <Pressable
              onPress={handleLogOut}
              className={`py-3.5 px-4 rounded-full items-center justify-center flex-row mt-2 border ${
                isDark
                  ? 'bg-zinc-800/90 border-zinc-700 active:bg-zinc-700'
                  : 'bg-rose-50 border-rose-200/80 active:bg-rose-100'
              }`}
            >
              <LogOut size={15} color={isDark ? '#F43F5E' : '#E11D48'} />
              <Text
                className={`font-bold text-[13.5px] ml-2 ${
                  isDark ? 'text-white' : 'text-rose-700'
                }`}
              >
                Log Out
              </Text>
            </Pressable>

            {/* Subtle Institutional Brand Footer */}
            <View className="items-center mt-5 mb-2">
              <Text
                className={`text-[10px] font-bold tracking-wider uppercase ${
                  isDark ? 'text-zinc-500' : 'text-slate-400'
                }`}
              >
                GeoSmart Nigeria • VECDIM
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
