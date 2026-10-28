import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Rect, Circle, Path } from 'react-native-svg';
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState<string>('u_field_03');
  const [password, setPassword] = useState<string>('••••••••');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    if (!username.trim()) {
      setErrorMessage('Please enter your officer ID or username.');
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await login(username);
      if (!res.success) {
        setErrorMessage(res.error || 'Authentication failed. Please verify your officer credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected connection error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top', 'bottom']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center', paddingVertical: 40 }}
      >
        {/* Brand Header — Exact Match to GeoSmart Nigeria Specification */}
        <View className="items-center mb-8">
          <View className="flex-row items-center mb-1.5">
            {/* Dark Squircle Radar Target Icon */}
            <View className="w-11 h-11 rounded-2xl bg-[#090D16] items-center justify-center mr-3 shadow-md shadow-emerald-950/20">
              <Svg width="26" height="26" viewBox="0 0 44 44">
                {/* Outer concentric radar circle */}
                <Circle cx="22" cy="22" r="15" stroke="#059669" strokeWidth="2.2" fill="none" opacity="0.6" />
                {/* Inner radar ring */}
                <Circle cx="22" cy="22" r="8.5" stroke="#10B981" strokeWidth="2.2" fill="none" />
                {/* Crosshair reticle ticks */}
                <Path d="M22 2 L22 10" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" />
                <Path d="M22 34 L22 42" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" />
                <Path d="M2 22 L10 22" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" />
                <Path d="M34 22 L42 22" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" />
                {/* Radar center point */}
                <Circle cx="22" cy="22" r="3" fill="#34D399" />
              </Svg>
            </View>

            <View>
              <Text className="text-[22px] font-black text-slate-900 tracking-tight leading-none">
                GeoSmart <Text className="text-[#059669]">Nigeria</Text>
              </Text>
              <Text className="text-[10px] text-slate-400 font-extrabold tracking-[0.18em] uppercase mt-1">
                VECTOR SURVEILLANCE & EWS
              </Text>
            </View>
          </View>
        </View>

        {/* Clean Sign-in Card */}
        <View className="bg-white rounded-[28px] p-6 shadow-sm border border-slate-200/70 mb-6">
          <View className="mb-5">
            <Text className="text-[20px] font-extrabold text-slate-900 tracking-tight">
              Sign In
            </Text>
            <Text className="text-[12.5px] text-slate-500 font-medium mt-1">
              Access your field surveillance grid and sentinel surveys
            </Text>
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 mb-4">
              <Text className="text-[12px] font-semibold text-rose-800 leading-tight">
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Username / Officer ID */}
          <View className="mb-4">
            <Text className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Officer Identifier / Username
            </Text>
            <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3.5 focus:border-emerald-600 focus:bg-white">
              <User size={18} color="#64748B" />
              <TextInput
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setErrorMessage(null);
                }}
                placeholder="Username or Officer ID"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 ml-2.5 text-[14px] font-medium text-slate-900"
              />
              {username.length > 0 && (
                <Pressable onPress={() => setUsername('')} className="p-1">
                  <Text className="text-slate-400 text-xs font-bold">✕</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Password / PIN */}
          <View className="mb-6">
            <Text className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Passcode / PIN
            </Text>
            <View className="flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-3.5 focus:border-emerald-600 focus:bg-white">
              <Lock size={18} color="#64748B" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password or Security PIN"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                className="flex-1 ml-2.5 text-[14px] font-medium text-slate-900"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} className="p-1">
                {showPassword ? (
                  <EyeOff size={18} color="#64748B" />
                ) : (
                  <Eye size={18} color="#64748B" />
                )}
              </Pressable>
            </View>
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSignIn}
            disabled={loading}
            className="py-4 rounded-2xl bg-[#047857] active:bg-[#065F46] items-center justify-center flex-row shadow-md shadow-emerald-900/20"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text className="text-white font-extrabold text-[14px] mr-2">
                  Sign In
                </Text>
                <ArrowRight size={17} color="#FFFFFF" />
              </>
            )}
          </Pressable>


        </View>

        {/* Institutional Footer */}
        <View className="items-center">
          <Text className="text-[11px] text-slate-400 font-medium">
            Osun State University • NMEP • MOOD Africa
          </Text>
          <Text className="text-[10px] text-slate-400 font-medium mt-0.5">
            National Vector Intelligence Network
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
