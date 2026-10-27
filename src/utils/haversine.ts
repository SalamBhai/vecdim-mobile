/**
 * Haversine formula calculating great-circle distance between two coordinates in kilometers.
 * Exact mathematical parity with R pipeline and Go backend validation rules.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const earthRadiusKm = 6371.0;

  const toRad = (degree: number) => (degree * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

export interface ProximityCheckResult {
  distanceKm: number;
  maxKm: number;
  isWithinThreshold: boolean;
  warningMessage?: string;
}

export function checkLGAProximity(
  currentLat: number,
  currentLon: number,
  refLat: number,
  refLon: number,
  lgaName: string,
  maxKm = 25
): ProximityCheckResult {
  const distanceKm = calculateHaversineDistanceKm(currentLat, currentLon, refLat, refLon);
  const roundedDist = Math.round(distanceKm * 10) / 10;
  const isWithin = distanceKm <= maxKm;

  return {
    distanceKm: roundedDist,
    maxKm,
    isWithinThreshold: isWithin,
    warningMessage: isWithin
      ? undefined
      : `Current GPS position is ${roundedDist}km from the ${lgaName} centroid (exceeds ${maxKm}km LGA threshold).`,
  };
}
