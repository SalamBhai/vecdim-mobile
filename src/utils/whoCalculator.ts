export type WHOClass = 'Susceptible' | 'Possible Resistance' | 'Confirmed Resistance';

export interface WHOCalculationResult {
  mortalityPct: number;
  whoClass: WHOClass;
  color: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  description: string;
}

/**
 * Calculates WHO bioassay mortality percentage and resistance classification.
 * Matches WHO standard tube-test protocol and candidate pack R pipeline logic.
 */
export function calculateWHOMortality(nExposed: number, nDead: number): WHOCalculationResult | null {
  if (nExposed <= 0 || nDead < 0 || nDead > nExposed) {
    return null;
  }

  // Exact 1-decimal rounding matching R round(dead / exposed * 100, 1)
  const rawPct = (nDead / nExposed) * 100;
  const mortalityPct = Math.round(rawPct * 10) / 10;

  if (mortalityPct >= 98.0) {
    return {
      mortalityPct,
      whoClass: 'Susceptible',
      color: '#10B981', // Emerald 500
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-700',
      badgeBorder: 'border-emerald-300',
      description: 'Mosquito population is susceptible to insecticide (≥98%).',
    };
  }

  if (mortalityPct >= 90.0) {
    return {
      mortalityPct,
      whoClass: 'Possible Resistance',
      color: '#F59E0B', // Amber 500
      badgeBg: 'bg-amber-50',
      badgeText: 'text-amber-700',
      badgeBorder: 'border-amber-300',
      description: 'Possible resistance detected (90.0% – 97.9%). Further bioassay testing required.',
    };
  }

  return {
    mortalityPct,
    whoClass: 'Confirmed Resistance',
    color: '#EF4444', // Red 500
    badgeBg: 'bg-red-50',
    badgeText: 'text-red-700',
    badgeBorder: 'border-red-300',
    description: 'Confirmed resistance (<90%). High operational risk for ITN/IRS efficacy.',
  };
}
