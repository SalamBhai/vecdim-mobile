import { calculateHaversineDistanceKm, checkLGAProximity } from '../utils/haversine';
import { calculateWHOMortality } from '../utils/whoCalculator';
import { getLGAsForState, getLGARef } from '../data/lgaReference';

function runTests() {
  console.log('🧪 Running VECDIM Mobile Domain Logic Tests...\n');

  // Test 1: Haversine distance & 25km LGA proximity
  console.log('--- Test 1: Spatial Proximity & Haversine ---');
  const osogboRef = getLGARef('Osun', 'Osogbo')!;
  console.log(`Osogbo Centroid: (${osogboRef.refLat}, ${osogboRef.refLon})`);

  // Close point (~1.5 km away)
  const closeCheck = checkLGAProximity(7.78, 4.57, osogboRef.refLat, osogboRef.refLon, 'Osogbo');
  console.log(`Near coordinate (7.78, 4.57): ${closeCheck.distanceKm} km -> Within threshold: ${closeCheck.isWithinThreshold}`);
  if (!closeCheck.isWithinThreshold) throw new Error('Expected near point to be within 25km');

  // Far point (Kano coordinate tested against Osun LGA, ~640 km away)
  const farCheck = checkLGAProximity(12.0, 8.52, osogboRef.refLat, osogboRef.refLon, 'Osogbo');
  console.log(`Far coordinate (12.0, 8.52): ${farCheck.distanceKm} km -> Within threshold: ${farCheck.isWithinThreshold}`);
  if (farCheck.isWithinThreshold) throw new Error('Expected far point to exceed 25km threshold');
  console.log(`Warning message generated: "${farCheck.warningMessage}"`);
  console.log('✅ Spatial Proximity Test Passed!\n');

  // Test 2: WHO Tube-test Mortality Classification
  console.log('--- Test 2: WHO Resistance Classification ---');
  const susceptible = calculateWHOMortality(100, 99)!;
  console.log(`100 exposed, 99 dead: ${susceptible.mortalityPct}% -> ${susceptible.whoClass}`);
  if (susceptible.whoClass !== 'Susceptible') throw new Error('Expected Susceptible');

  const possible = calculateWHOMortality(100, 94)!;
  console.log(`100 exposed, 94 dead: ${possible.mortalityPct}% -> ${possible.whoClass}`);
  if (possible.whoClass !== 'Possible Resistance') throw new Error('Expected Possible Resistance');

  const confirmed = calculateWHOMortality(100, 84)!;
  console.log(`100 exposed, 84 dead: ${confirmed.mortalityPct}% -> ${confirmed.whoClass}`);
  if (confirmed.whoClass !== 'Confirmed Resistance') throw new Error('Expected Confirmed Resistance');
  console.log('✅ WHO Bioassay Classification Test Passed!\n');

  // Test 3: LGA Reference Data Integrity
  console.log('--- Test 3: LGA Reference Data Filtering ---');
  const osunLgas = getLGAsForState('Osun');
  console.log(`Osun LGAs (${osunLgas.length}): ${osunLgas.join(', ')}`);
  if (osunLgas.length !== 5) throw new Error(`Expected 5 Osun LGAs, got ${osunLgas.length}`);

  const lagosLgas = getLGAsForState('Lagos');
  console.log(`Lagos LGAs (${lagosLgas.length}): ${lagosLgas.join(', ')}`);
  if (lagosLgas.length !== 5) throw new Error(`Expected 5 Lagos LGAs, got ${lagosLgas.length}`);

  const kanoLgas = getLGAsForState('Kano');
  console.log(`Kano LGAs (${kanoLgas.length}): ${kanoLgas.join(', ')}`);
  if (kanoLgas.length !== 5) throw new Error(`Expected 5 Kano LGAs, got ${kanoLgas.length}`);
  console.log('✅ LGA Reference Data Integrity Test Passed!\n');

  console.log('🎉 ALL VECDIM MOBILE DOMAIN TESTS PASSED WITH 100% SUCCESS!');
}

runTests();
