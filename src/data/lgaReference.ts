export interface LGAReference {
  state: 'Lagos' | 'Kano' | 'Osun';
  lga: string;
  refLat: number;
  refLon: number;
  maxKm: number;
}

export const LGA_REFERENCES: LGAReference[] = [
  // Lagos State LGAs
  { state: 'Lagos', lga: 'Ikorodu', refLat: 6.62, refLon: 3.51, maxKm: 25 },
  { state: 'Lagos', lga: 'Alimosho', refLat: 6.60, refLon: 3.25, maxKm: 25 },
  { state: 'Lagos', lga: 'Epe', refLat: 6.58, refLon: 3.98, maxKm: 25 },
  { state: 'Lagos', lga: 'Badagry', refLat: 6.43, refLon: 2.88, maxKm: 25 },
  { state: 'Lagos', lga: 'Eti-Osa', refLat: 6.45, refLon: 3.60, maxKm: 25 },

  // Kano State LGAs
  { state: 'Kano', lga: 'Dala', refLat: 12.00, refLon: 8.52, maxKm: 25 },
  { state: 'Kano', lga: 'Nasarawa', refLat: 12.00, refLon: 8.55, maxKm: 25 },
  { state: 'Kano', lga: 'Gwale', refLat: 11.98, refLon: 8.49, maxKm: 25 },
  { state: 'Kano', lga: 'Tarauni', refLat: 11.97, refLon: 8.54, maxKm: 25 },
  { state: 'Kano', lga: 'Ungogo', refLat: 12.05, refLon: 8.48, maxKm: 25 },

  // Osun State LGAs
  { state: 'Osun', lga: 'Osogbo', refLat: 7.77, refLon: 4.56, maxKm: 25 },
  { state: 'Osun', lga: 'Ife Central', refLat: 7.48, refLon: 4.56, maxKm: 25 },
  { state: 'Osun', lga: 'Ilesa East', refLat: 7.62, refLon: 4.73, maxKm: 25 },
  { state: 'Osun', lga: 'Iwo', refLat: 7.63, refLon: 4.18, maxKm: 25 },
  { state: 'Osun', lga: 'Ede North', refLat: 7.74, refLon: 4.43, maxKm: 25 },
];

export const STATES = ['Lagos', 'Kano', 'Osun'] as const;

export function getLGAsForState(state: string): string[] {
  return LGA_REFERENCES.filter((item) => item.state === state).map((item) => item.lga);
}

export function getLGARef(state: string, lga: string): LGAReference | undefined {
  return LGA_REFERENCES.find(
    (item) => item.state.toLowerCase() === state.toLowerCase() && item.lga.toLowerCase() === lga.toLowerCase()
  );
}
