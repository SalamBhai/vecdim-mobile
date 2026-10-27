import React from 'react';
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

  // Split into field workers and supervisor accounts (exact Meta/Image 4 layout)
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
        <View className="bg-[#18181B] rounded-t-[32px] pt-3 pb-8 px-5 max-h-[85%] shadow-2xl">
          {/* Top Pill Drag Handle (Meta Image 4 Style) */}
          <View className="w-10 h-1 bg-zinc-600 rounded-full mx-auto mb-4" />

          {/* Clean Header Row */}
          <View className="flex-row items-center justify-between pb-3 border-b border-zinc-800 mb-2">
            <Text className="text-[16px] font-bold text-white tracking-tight">
              Switch Account
            </Text>
            <Pressable
              onPress={onClose}
              className="w-7 h-7 rounded-full bg-zinc-800 items-center justify-center active:bg-zinc-700"
            >
              <X size={14} color="#A1A1AA" />
            </Pressable>
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
                    className="flex-row items-center justify-between py-3 px-2 rounded-2xl active:bg-zinc-800/60"
                  >
                    <View className="flex-row items-center flex-1 mr-3">
                      {/* Circular Avatar */}
                      <View
                        className="w-11 h-11 rounded-full items-center justify-center mr-3.5 border border-zinc-700/60 shadow-xs"
                        style={{ backgroundColor: account.avatarColor }}
                      >
                        <Text className="text-white font-bold text-[13px]">
                          {account.initials}
                        </Text>
                      </View>

                      {/* Name & Subtitle */}
                      <View className="flex-1">
                        <Text className="text-[14px] font-semibold text-white leading-tight">
                          {account.id}{' '}
                          <Text className="text-zinc-400 font-normal">
                            ({account.name})
                          </Text>
                        </Text>
                        <Text className="text-[12px] text-zinc-400 mt-0.5">
                          • {account.state} State • {account.title}
                        </Text>
                      </View>
                    </View>

                    {/* Blue Checkmark for Active Account */}
                    {isActive ? (
                      <View className="w-6 h-6 rounded-full bg-[#0095F6] items-center justify-center shadow-xs">
                        <Check size={14} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    ) : (
                      <View className="w-6 h-6 rounded-full border border-zinc-700" />
                    )}
                  </Pressable>
                );
              })}

              {/* Add / Switch Account Action (Meta Style) */}
              <Pressable
                onPress={handleLogOut}
                className="flex-row items-center py-3 px-2 rounded-2xl active:bg-zinc-800/60"
              >
                <View className="w-11 h-11 rounded-full border border-zinc-700 bg-zinc-900/60 items-center justify-center mr-3.5">
                  <Plus size={20} color="#FFFFFF" />
                </View>
                <Text className="text-[14px] font-semibold text-white">
                  Add another account / Sign in
                </Text>
              </Pressable>
            </View>

            {/* Other Profiles Section (Supervisors & National HQ) */}
            <View className="mb-4 pt-3 border-t border-zinc-800/80">
              <Text className="text-[12px] font-medium text-zinc-400 mb-2 px-2">
                Other profiles
              </Text>

              {otherAccounts.map((account) => {
                const isActive = account.id === currentUser?.id;
                return (
                  <Pressable
                    key={account.id}
                    onPress={() => handleSelectAccount(account)}
                    className="flex-row items-center justify-between py-2.5 px-2 rounded-2xl active:bg-zinc-800/60"
                  >
                    <View className="flex-row items-center flex-1 mr-3">
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center mr-3.5 border border-zinc-700"
                        style={{ backgroundColor: account.avatarColor }}
                      >
                        <Text className="text-white font-bold text-[12px]">
                          {account.initials}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-[13.5px] font-semibold text-white leading-tight">
                          {account.name}
                        </Text>
                        <Text className="text-[11.5px] text-zinc-400 mt-0.5">
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

            {/* Bottom Full-Width Pill Action Button (Meta Style) */}
            <Pressable
              onPress={handleLogOut}
              className="py-3.5 px-4 rounded-full bg-zinc-800/90 active:bg-zinc-700 items-center justify-center flex-row mt-2"
            >
              <LogOut size={15} color="#F43F5E" />
              <Text className="text-white font-semibold text-[13.5px] ml-2">
                Log Out
              </Text>
            </Pressable>

            {/* Subtle Institutional Brand Footer */}
            <View className="items-center mt-5 mb-2">
              <Text className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase">
                GeoSmart Nigeria • VECDIM
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
