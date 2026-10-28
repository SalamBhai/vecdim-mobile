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
  disabled?: boolean;
}

export const GPSAccuracyMeter: React.FC<GPSAccuracyMeterProps> = ({
  selectedState,
  selectedLga,
  onLocationChange,
  initialLat,
  initialLon,
  initialAccuracy,
  disabled,
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

  useEffect(() => {
    if (initialLat !== undefined && initialLon !== undefined && initialLat !== null && initialLon !== null) {
      if (latitude === null || longitude === null) {
        setLatitude(initialLat);
        setLongitude(initialLon);
        setAccuracy(initialAccuracy || 6.5);
      }
    }
  }, [initialLat, initialLon, initialAccuracy]);

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
    const demoLat = ref ? Math.round((ref.refLat + 0.0014) * 10000) / 10000 : 7.7712;
    const demoLon = ref ? Math.round((ref.refLon + 0.0008) * 10000) / 10000 : 4.5621;
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
    <View className="bg-slate-50/90 rounded-2xl p-3.5 border border-slate-200/90 mb-3.5 shadow-xs">
      <View className="flex-row items-center justify-between mb-2.5">
        <Text className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-bricolage">
          GPS Coordinates & Accuracy
        </Text>
        {!disabled ? (
          <View className="flex-row items-center">
            <Pressable
              onPress={setDemoGPS}
              className="mr-1.5 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 active:bg-emerald-100"
            >
              <Text className="text-[10.5px] font-bold text-emerald-800 font-bricolage">Demo Fix</Text>
            </Pressable>

            <Pressable
              onPress={fetchGPS}
              disabled={loading}
              className="flex-row items-center bg-white px-2.5 py-1 rounded-lg border border-slate-200 active:bg-slate-100 shadow-xs"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <Text className="text-[11px] font-semibold text-slate-700 font-bricolage">Refresh</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View className="flex-row items-center bg-slate-200/80 px-2 py-0.5 rounded-full">
            <Text className="text-[9.5px] font-bold text-slate-500">Locked</Text>
          </View>
        )}
      </View>

      {/* Lat/Lon readings */}
      <View className="flex-row items-center justify-between bg-white rounded-xl p-3 border border-slate-200/80 mb-2.5">
        <View className="flex-1">
          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LATITUDE</Text>
          <Text className="text-[15px] font-mono font-bold text-slate-900 mt-0.5">
            {latitude !== null ? `${latitude}°` : 'Acquiring...'}
          </Text>
        </View>
        <View className="h-7 w-px bg-slate-200 mx-3" />
        <View className="flex-1">
          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">LONGITUDE</Text>
          <Text className="text-[15px] font-mono font-bold text-slate-900 mt-0.5">
            {longitude !== null ? `${longitude}°` : 'Acquiring...'}
          </Text>
        </View>
      </View>

      {/* Accuracy Status Badge & Geofence Confirmation */}
      <View className="flex-row items-center justify-between flex-wrap gap-1">
        {accuracyBadge}
        {proximity && proximity.isWithinThreshold && (
          <View className="flex-row items-center bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            <Text className="text-[10px] font-bold text-emerald-800">
              Inside {selectedLga} geofence
            </Text>
          </View>
        )}
      </View>

      {/* High error warning */}
      {isBlocked && (
        <View className="mt-2.5 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
          <Text className="text-[11.5px] font-semibold text-rose-800">
            GPS accuracy exceeds 50m threshold (±{accuracy}m). Move away from buildings or dense canopies before submitting.
          </Text>
        </View>
      )}

      {/* 25km LGA Proximity Alert */}
      {proximity && !proximity.isWithinThreshold && (
        <View className="mt-2.5 bg-amber-50 p-2.5 rounded-xl border border-amber-300">
          <Text className="text-[12px] font-bold text-amber-900 font-bricolage">
            ⚠️ 25km LGA Boundary Warning
          </Text>
          <Text className="text-[11.5px] text-amber-800 mt-0.5">
            {proximity.warningMessage}
          </Text>
        </View>
      )}

      {permissionError && (
        <View className="mt-2 bg-rose-50 p-2 rounded-xl border border-rose-200">
          <Text className="text-[11.5px] text-rose-700">{permissionError}</Text>
        </View>
      )}
    </View>
  );
};
