import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { Badge } from './ui/Badge';
import { checkLGAProximity, ProximityCheckResult } from '../utils/haversine';
import { getLGARef } from '../data/lgaReference';

export interface GPSLocationData {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  isBlocked: boolean; // True if accuracy > 50m
  proximityResult: ProximityCheckResult | null;
}

interface GPSAccuracyMeterProps {
  selectedState: string;
  selectedLga: string;
  onLocationChange: (data: GPSLocationData) => void;
  initialLat?: number;
  initialLon?: number;
  initialAccuracy?: number;
}

export const GPSAccuracyMeter: React.FC<GPSAccuracyMeterProps> = ({
  selectedState,
  selectedLga,
  onLocationChange,
  initialLat,
  initialLon,
  initialAccuracy,
}) => {
  const [latitude, setLatitude] = useState<number | null>(initialLat || null);
  const [longitude, setLongitude] = useState<number | null>(initialLon || null);
  const [accuracy, setAccuracy] = useState<number | null>(initialAccuracy || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const fetchGPS = useCallback(async () => {
    setLoading(true);
    setPermissionError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionError('Location permission denied. Please enable GPS.');
        setLoading(false);
        return;
      }

      // Query highest accuracy GPS hardware
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });

      const lat = Math.round(location.coords.latitude * 10000) / 10000;
      const lon = Math.round(location.coords.longitude * 10000) / 10000;
      const rawAcc = location.coords.accuracy ?? 10.0;
      const acc = Math.round(rawAcc * 10) / 10;

      setLatitude(lat);
      setLongitude(lon);
      setAccuracy(acc);

      // Check LGA proximity against reference centroid
      let proximity: ProximityCheckResult | null = null;
      const ref = getLGARef(selectedState, selectedLga);
      if (ref) {
        proximity = checkLGAProximity(lat, lon, ref.refLat, ref.refLon, selectedLga, ref.maxKm);
      }

      onLocationChange({
        latitude: lat,
        longitude: lon,
        accuracy: acc,
        isBlocked: acc > 50.0,
        proximityResult: proximity,
      });
    } catch (err: any) {
      setPermissionError(err.message || 'Failed to acquire GPS fix');
    } finally {
      setLoading(false);
    }
  }, [selectedState, selectedLga, onLocationChange]);

  // Recalculate proximity if state or LGA changes
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      const ref = getLGARef(selectedState, selectedLga);
      let proximity: ProximityCheckResult | null = null;
      if (ref) {
        proximity = checkLGAProximity(latitude, longitude, ref.refLat, ref.refLon, selectedLga, ref.maxKm);
      }
      onLocationChange({
        latitude,
        longitude,
        accuracy,
        isBlocked: (accuracy || 0) > 50.0,
        proximityResult: proximity,
      });
    }
  }, [selectedState, selectedLga, latitude, longitude, accuracy, onLocationChange]);

  // Initial fix if empty
  useEffect(() => {
    if (latitude === null) {
      fetchGPS();
    }
  }, []);

  // Determine accuracy category
  let accuracyBadge = <Badge label="No GPS Signal" variant="slate" />;
  let isBlocked = false;

  if (accuracy !== null) {
    if (accuracy <= 10.0) {
      accuracyBadge = <Badge label={`High Accuracy (±${accuracy}m)`} variant="emerald" />;
    } else if (accuracy <= 50.0) {
      accuracyBadge = <Badge label={`Moderate Accuracy (±${accuracy}m)`} variant="amber" />;
    } else {
      isBlocked = true;
      accuracyBadge = <Badge label={`Low Accuracy (±${accuracy}m) • Blocked`} variant="rose" />;
    }
  }

  // Calculate proximity warning
  const ref = getLGARef(selectedState, selectedLga);
  let proximity: ProximityCheckResult | null = null;
  if (ref && latitude !== null && longitude !== null) {
    proximity = checkLGAProximity(latitude, longitude, ref.refLat, ref.refLon, selectedLga, ref.maxKm);
  }

  const setDemoGPS = () => {
    const ref = getLGARef(selectedState, selectedLga);
    const demoLat = ref ? Math.round((ref.refLat + 0.008) * 10000) / 10000 : 7.7712;
    const demoLon = ref ? Math.round((ref.refLon + 0.005) * 10000) / 10000 : 4.5621;
    const demoAcc = 6.8;

    setLatitude(demoLat);
    setLongitude(demoLon);
    setAccuracy(demoAcc);
    setPermissionError(null);

    const proximity = ref
      ? checkLGAProximity(demoLat, demoLon, ref.refLat, ref.refLon, selectedLga, ref.maxKm)
      : null;

    onLocationChange({
      latitude: demoLat,
      longitude: demoLon,
      accuracy: demoAcc,
      isBlocked: false,
      proximityResult: proximity,
    });
  };

  return (
    <View className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 mb-3.5">
      <View className="flex-row items-center justify-between mb-2.5">
        <Text className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">
          GPS Coordinates & Accuracy
        </Text>
        <View className="flex-row items-center">
          <Pressable
            onPress={setDemoGPS}
            className="mr-2 bg-teal-50 px-2 py-1 rounded-lg border border-teal-200 active:bg-teal-100"
          >
            <Text className="text-[11px] font-semibold text-teal-800">Demo Fix</Text>
          </Pressable>

          <Pressable
            onPress={fetchGPS}
            disabled={loading}
            className="flex-row items-center bg-white px-2.5 py-1 rounded-lg border border-slate-200 active:bg-slate-100"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#0D9488" />
            ) : (
              <Text className="text-[12px] font-semibold text-teal-700">Refresh GPS</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* Lat/Lon readings */}
      <View className="flex-row items-center justify-between bg-white rounded-lg p-2.5 border border-slate-200/70 mb-2.5">
        <View className="flex-1">
          <Text className="text-[11px] font-semibold text-slate-400">LATITUDE</Text>
          <Text className="text-[14px] font-mono font-bold text-slate-800">
            {latitude !== null ? `${latitude}°` : 'Acquiring...'}
          </Text>
        </View>
        <View className="h-6 w-px bg-slate-200 mx-2" />
        <View className="flex-1">
          <Text className="text-[11px] font-semibold text-slate-400">LONGITUDE</Text>
          <Text className="text-[14px] font-mono font-bold text-slate-800">
            {longitude !== null ? `${longitude}°` : 'Acquiring...'}
          </Text>
        </View>
      </View>

      {/* Accuracy Status Badge */}
      <View className="flex-row items-center justify-between">{accuracyBadge}</View>

      {/* High error warning */}
      {isBlocked && (
        <View className="mt-2.5 bg-red-50 p-2.5 rounded-lg border border-red-200">
          <Text className="text-[12px] font-semibold text-red-800">
            GPS accuracy exceeds 50m threshold (±{accuracy}m). Move away from buildings or dense canopies before submitting.
          </Text>
        </View>
      )}

      {/* 25km LGA Proximity Alert */}
      {proximity && !proximity.isWithinThreshold && (
        <View className="mt-2.5 bg-amber-50 p-2.5 rounded-lg border border-amber-300">
          <Text className="text-[12px] font-bold text-amber-900">
            ⚠️ 25km LGA Boundary Warning
          </Text>
          <Text className="text-[12px] text-amber-800 mt-0.5">
            {proximity.warningMessage}
          </Text>
        </View>
      )}

      {permissionError && (
        <View className="mt-2 bg-red-50 p-2 rounded-lg border border-red-200">
          <Text className="text-[12px] text-red-700">{permissionError}</Text>
        </View>
      )}
    </View>
  );
};
