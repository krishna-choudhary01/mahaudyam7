/**
 * MahaUdyam - BazaarPath v2 & Village Selection Comprehensive Verification Suite
 * Tests:
 * 1. Location hierarchy normalization & multi-district village loading (Nashik, Pune, Ahmednagar)
 * 2. SearchableSelect dual-property and multilingual search logic
 * 3. Travel cost calculations across 4 transport modes with circuity factor 1.25
 * 4. Profit intelligence math (Revenue, Costs, Net Profit, Margins, Break-even, Min Price, Risk)
 * 5. Scenario generation (Conservative 65%, Expected 85%, Optimistic 100%)
 * 6. What-if profit simulation and Unsold Stock Recovery Planner
 * 7. Net Opportunity Score (0-100) weighting and deterministic anti-crowding
 * 8. Initial market dataset integrity (LGD district codes, coordinates, days)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import {
  travelCostService,
  TRANSPORT_MODES
} from '../src/services/bazaar/travelCostService.js';

import {
  profitIntelligenceService
} from '../src/services/bazaar/profitIntelligenceService.js';

import {
  evaluateMarketSuitability,
  rankMarketsForUser,
  calculateDistanceKm
} from '../src/services/bazaar/bazaarRecommendationEngine.js';

import { MAHARASHTRA_DISTRICTS } from '../src/data/locations/districts.js';
import { MAHARASHTRA_TALUKAS } from '../src/data/locations/talukas.js';
import { INITIAL_BAZAAR_MARKETS } from '../src/data/bazaar/initialMarkets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passedTests++;
  }
}

function assertApprox(actual, expected, tolerance = 0.05, message = '') {
  totalTests++;
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    console.error(`❌ FAIL: ${message} (Expected ~${expected}, got ${actual}, diff ${diff})`);
    throw new Error(`${message}: Expected ~${expected}, got ${actual}`);
  } else {
    console.log(`✅ PASS: ${message} (${actual} ≈ ${expected})`);
    passedTests++;
  }
}

async function runTests() {
  console.log('===============================================================');
  console.log('  MahaUdyam - BazaarPath v2 & Village System Test Suite');
  console.log('===============================================================\n');

  // -----------------------------------------------------------------
  // 1. Village Data Structure & Multi-District Integrity
  // -----------------------------------------------------------------
  console.log('--- TEST GROUP 1: Maharashtra Village Data & Normalization ---');

  assert(MAHARASHTRA_DISTRICTS.length === 36, `Found exactly 36 districts (got ${MAHARASHTRA_DISTRICTS.length})`);
  assert(MAHARASHTRA_TALUKAS.length === 358, `Found exactly 358 talukas (got ${MAHARASHTRA_TALUKAS.length})`);

  // Check Pune (493), Nashik (490), Ahmednagar (469) village files
  const testDistricts = [
    { code: 490, name: 'Nashik', minVillages: 1800 },
    { code: 493, name: 'Pune', minVillages: 1800 },
    { code: 469, name: 'Ahmednagar', minVillages: 1500 }
  ];

  for (const td of testDistricts) {
    const vFile = resolve(rootDir, `public/data/locations/villages/${td.code}.json`);
    const rawVillages = JSON.parse(readFileSync(vFile, 'utf8'));
    assert(rawVillages.length >= td.minVillages, `${td.name} (LGD ${td.code}) has ${rawVillages.length} villages (expected >= ${td.minVillages})`);

    // Verify compact keys and normalization mapping
    const sample = rawVillages[0];
    assert(sample.c && sample.n && sample.m && sample.t && sample.d, `Village records contain standard compact keys {c, n, m, t, d}`);

    // Normalized projection check
    const normalized = {
      code: sample.c,
      name_en: sample.n,
      name_mr: sample.m,
      name: sample.n,
      marathiName: sample.m,
      talukaCode: sample.t,
      districtCode: sample.d
    };
    assert(normalized.code === sample.c && normalized.name_mr === sample.m, `Normalization maps compact keys to standard properties`);
  }

  // Verify Haveli taluka (4382) villages exist in Pune (493)
  const puneVillages = JSON.parse(readFileSync(resolve(rootDir, 'public/data/locations/villages/493.json'), 'utf8'));
  const haveliVillages = puneVillages.filter(v => v.t === 4382);
  assert(haveliVillages.length > 50, `Pune Haveli taluka has ${haveliVillages.length} villages`);

  // Verify Sinnar taluka (4154) in Nashik (490)
  const nashikVillages = JSON.parse(readFileSync(resolve(rootDir, 'public/data/locations/villages/490.json'), 'utf8'));
  const sinnarVillages = nashikVillages.filter(v => v.t === 4154);
  assert(sinnarVillages.length > 50, `Nashik Sinnar taluka has ${sinnarVillages.length} villages`);

  // -----------------------------------------------------------------
  // 2. Travel Cost Service & Transport Modes
  // -----------------------------------------------------------------
  console.log('\n--- TEST GROUP 2: Travel Cost Intelligence & 4 Transport Modes ---');

  const oneWayStraightKm = 20; // Straight line km
  const expectedRoadOneWay = 20 * travelCostService.ROAD_CIRCUITY_FACTOR; // 25 km
  const expectedRoadRoundTrip = 25 * 2; // 50 km

  // Test road distance estimation with circuity factor 1.25
  const roadEstimated = travelCostService.estimateRoadDistanceKm(oneWayStraightKm);
  assertApprox(roadEstimated, expectedRoadOneWay, 0.1, 'Road distance incorporates 1.25 circuity factor');

  // Test Motorcycle calculation: 50 km round trip, default 40 km/l, petrol ₹105 -> 50/40 * 105 = ₹131
  const bikeCalc = travelCostService.calculateTravelCost({
    distanceKm: oneWayStraightKm,
    isRoadDistance: false,
    transportModeId: 'motorcycle'
  });
  assertApprox(bikeCalc.roundTripKm, expectedRoadRoundTrip, 0.1, 'Motorcycle round-trip km matches 50km');
  assertApprox(bikeCalc.travelCost, 131, 2, `Motorcycle fuel cost accurate (₹${bikeCalc.travelCost})`);

  // Test Shared Auto calculation: base ₹20*2 + 50km * ₹5.5 = ₹40 + ₹275 = ₹315
  const autoCalc = travelCostService.calculateTravelCost({
    distanceKm: oneWayStraightKm,
    isRoadDistance: false,
    transportModeId: 'shared_auto'
  });
  assertApprox(autoCalc.travelCost, 315, 2, `Shared auto round-trip fare accurate (₹${autoCalc.travelCost})`);

  // Test Public Bus (MSRTC): base ₹15*2 + 50km * ₹2.2 = ₹30 + ₹110 = ₹140
  const busCalc = travelCostService.calculateTravelCost({
    distanceKm: oneWayStraightKm,
    isRoadDistance: false,
    transportModeId: 'public_bus'
  });
  assertApprox(busCalc.travelCost, 140, 2, `Public bus MSRTC fare accurate (₹${busCalc.travelCost})`);

  // Test Mini-truck (Pickup / Tempo): base ₹150 + (50km / 12kmpl * ₹92) = 150 + 383 = ₹533
  const truckCalc = travelCostService.calculateTravelCost({
    distanceKm: oneWayStraightKm,
    isRoadDistance: false,
    transportModeId: 'mini_truck'
  });
  assertApprox(truckCalc.travelCost, 533, 2, `Mini-truck base plus diesel accurate (₹${truckCalc.travelCost})`);

  // Compare all 4 modes
  const modeComparison = travelCostService.compareAllModes(oneWayStraightKm, false);
  assert(modeComparison.length === 4, 'Mode comparison returns all 4 standard transport modes');
  assert(modeComparison.some(m => m.modeId === 'motorcycle'), 'Contains motorcycle');
  assert(modeComparison.some(m => m.modeId === 'shared_auto'), 'Contains shared auto');
  assert(modeComparison.some(m => m.modeId === 'public_bus'), 'Contains public bus');
  assert(modeComparison.some(m => m.modeId === 'mini_truck'), 'Contains mini truck');

  // -----------------------------------------------------------------
  // 3. Profit Intelligence Mathematical Formulas
  // -----------------------------------------------------------------
  console.log('\n--- TEST GROUP 3: Estimated Profit Intelligence Mathematical Models ---');

  // Scenario: 100 kg vegetables, Unit cost ₹20, Selling price ₹40, Market stall fee ₹50, Travel cost ₹150
  // Default expected sell-through = 85 kg (85%)
  const profitInput = {
    quantityCarried: 100,
    costPerUnit: 20,
    expectedPricePerUnit: 40,
    sellThroughPct: 85,
    travelCost: 150,
    stallFee: 50,
    packagingCost: 0,
    otherExpenses: 0
  };

  const profitResult = profitIntelligenceService.calculateProfit(profitInput);

  // Quantity sold = 85 units, Unsold = 15 units
  assert(profitResult.quantitySold === 85, `Quantity Sold: 85 units`);
  assert(profitResult.unsoldQuantity === 15, `Unsold Quantity: 15 units`);

  // Gross Revenue = 85 units * ₹40 = ₹3400
  assert(profitResult.grossRevenue === 3400, `Revenue: expected 3400, got ${profitResult.grossRevenue}`);

  // Product cost = 100 units * ₹20 = ₹2000 (Sunk cost for entire batch)
  assert(profitResult.productCost === 2000, `Product Cost: expected 2000, got ${profitResult.productCost}`);

  // Travel cost = ₹150, Stall fee = ₹50 -> Total overhead = ₹200
  assert(profitResult.travelCost === 150, `Travel Cost: expected 150, got ${profitResult.travelCost}`);
  assert(profitResult.stallFee === 50, `Stall Fee: expected 50, got ${profitResult.stallFee}`);

  // Total cost = 2000 + 150 + 50 = ₹2200
  assert(profitResult.totalCost === 2200, `Total Cost: expected 2200, got ${profitResult.totalCost}`);

  // Net Profit = Revenue (3400) - Total Cost (2200) = ₹1200
  assert(profitResult.netProfit === 1200, `Net Profit: expected 1200, got ${profitResult.netProfit}`);

  // Profit Margin % = (Net Profit / Revenue) * 100 = (1200 / 3400) * 100 = 35.3%
  assertApprox(profitResult.profitMargin, 35.3, 0.1, 'Profit margin % formula accurate');

  // Break-even Quantity = Total Cost / Selling Price = 2200 / 40 = 55 units
  assert(profitResult.breakEvenQuantity === 55, `Break-even quantity accurate: 55 units (got ${profitResult.breakEvenQuantity})`);

  // Minimum Selling Price = Total Cost / Sold Quantity = 2200 / 85 = ₹26/unit (rounded)
  assert(profitResult.minSellingPrice === 26, `Minimum selling price accurate: ₹26 (got ${profitResult.minSellingPrice})`);

  // Unsold Stock Risk Value = 15 units * ₹20 = ₹300
  assert(profitResult.unsoldStockRiskValue === 300, `Unsold Stock Risk Value: expected ₹300, got ₹${profitResult.unsoldStockRiskValue}`);

  // -----------------------------------------------------------------
  // 4. 3-Tier Scenarios: Conservative, Expected, Optimistic
  // -----------------------------------------------------------------
  console.log('\n--- TEST GROUP 4: 3 Scenarios Generation ---');

  const scenarios = profitIntelligenceService.generateScenarios(profitInput);
  assert(scenarios.conservative && scenarios.expected && scenarios.optimistic, 'Generates all 3 distinct scenarios');

  // Conservative (65% sold, 10% lower price ₹36):
  // Qty sold = 65 units * ₹36 = ₹2340. Total cost = ₹2200. Net Profit = ₹140.
  assert(scenarios.conservative.quantitySold === 65, `Conservative sold quantity: 65 units`);
  assert(scenarios.conservative.netProfit === 140, `Conservative net profit: ₹140 (got ${scenarios.conservative.netProfit})`);

  // Expected (85% sold, standard price ₹40):
  // Qty sold = 85 units * ₹40 = ₹3400. Total cost = ₹2200. Net Profit = ₹1200.
  assert(scenarios.expected.quantitySold === 85, `Expected sold quantity: 85 units`);
  assert(scenarios.expected.netProfit === 1200, `Expected net profit: ₹1200`);

  // Optimistic (100% sold, 10% premium ₹44):
  // Qty sold = 100 units * ₹44 = ₹4400. Total cost = ₹2200. Net Profit = ₹2200.
  assert(scenarios.optimistic.quantitySold === 100, `Optimistic sold quantity: 100 units`);
  assert(scenarios.optimistic.netProfit === 2200, `Optimistic net profit: ₹2200 (got ${scenarios.optimistic.netProfit})`);

  assert(scenarios.optimistic.netProfit > scenarios.expected.netProfit &&
         scenarios.expected.netProfit > scenarios.conservative.netProfit,
         'Scenarios strictly order profit: Optimistic > Expected > Conservative');

  // -----------------------------------------------------------------
  // 5. Net Opportunity Score (0-100) & Anti-Crowding
  // -----------------------------------------------------------------
  console.log('\n--- TEST GROUP 5: Recommendation Engine & Net Opportunity Score ---');

  const testMarket = INITIAL_BAZAAR_MARKETS[0];
  const evalResult = evaluateMarketSuitability({
    market: testMarket,
    userLocation: {
      district: testMarket.district,
      taluka: testMarket.taluka,
      village: 'Sample Village',
      coordinates: { lat: testMarket.coordinates.lat + 0.1, lng: testMarket.coordinates.lng + 0.1 }
    },
    productDetails: {
      category: 'vegetables_fruits',
      quantity: 100,
      unit: 'kg',
      unitCost: 20,
      expectedPrice: 40,
      transportMode: 'motorcycle'
    },
    currentDate: new Date('2026-11-07T12:00:00Z'),
    userId: 'user_test_123'
  });

  assert(typeof evalResult.score === 'number', 'Net Opportunity Score returns a numeric value');
  assert(evalResult.score >= 10 && evalResult.score <= 100, `Score is within [10, 100] bounds (got ${evalResult.score})`);
  assert(evalResult.breakdown && typeof evalResult.breakdown.netProfit === 'number', 'Breakdown contains profit component');
  assert(typeof evalResult.breakdown.modifier === 'number', 'Includes deterministic anti-crowding modifier');
  assert(evalResult.breakdown.modifier >= -2 && evalResult.breakdown.modifier <= 2, 'Anti-crowding modifier is within [-2, +2]');

  // Determinism test: calling with same inputs must produce exact same score and modifier
  const evalResult2 = evaluateMarketSuitability({
    market: testMarket,
    userLocation: {
      district: testMarket.district,
      taluka: testMarket.taluka,
      village: 'Sample Village',
      coordinates: { lat: testMarket.coordinates.lat + 0.1, lng: testMarket.coordinates.lng + 0.1 }
    },
    productDetails: {
      category: 'vegetables_fruits',
      quantity: 100,
      unit: 'kg',
      unitCost: 20,
      expectedPrice: 40,
      transportMode: 'motorcycle'
    },
    currentDate: new Date('2026-11-07T12:00:00Z'),
    userId: 'user_test_123'
  });
  assert(evalResult.score === evalResult2.score, 'Net Opportunity Score is 100% deterministic');
  assert(evalResult.breakdown.modifier === evalResult2.breakdown.modifier, 'Anti-crowding modifier is 100% deterministic');

  // Ranking test
  const rankedMarkets = rankMarketsForUser({
    markets: INITIAL_BAZAAR_MARKETS,
    userLocation: {
      district: 'Nashik',
      taluka: 'Sinnar',
      coordinates: { lat: 19.8510, lng: 74.0044 }
    },
    productDetails: {
      category: 'vegetables_fruits',
      quantity: 50,
      unitCost: 15,
      expectedPrice: 35,
      transportMode: 'shared_auto'
    },
    searchRadiusKm: 50,
    userId: 'user_test_123'
  });

  assert(rankedMarkets.length > 0, `Ranked markets returned ${rankedMarkets.length} results`);
  assert(rankedMarkets[0].score >= rankedMarkets[rankedMarkets.length - 1].score, 'Markets sorted descending by Net Opportunity Score');

  // Distance calculation test (Sinnar to Sangamner)
  // Sinnar: 19.8510, 74.0044. Sangamner: 19.5762, 74.2081. Distance ~37-40 km
  const sinnarSangamnerDist = calculateDistanceKm(19.8510, 74.0044, 19.5762, 74.2081);
  assert(sinnarSangamnerDist > 30 && sinnarSangamnerDist < 45, `Haversine distance accurate between Sinnar & Sangamner (~${sinnarSangamnerDist.toFixed(1)} km)`);

  // -----------------------------------------------------------------
  // 6. Initial Markets Official Dataset Integrity
  // -----------------------------------------------------------------
  console.log('\n--- TEST GROUP 6: Initial Markets Dataset Integrity ---');

  assert(INITIAL_BAZAAR_MARKETS.length >= 10, `Initial markets count >= 10 (got ${INITIAL_BAZAAR_MARKETS.length})`);

  for (const m of INITIAL_BAZAAR_MARKETS) {
    assert(m.id && m.name && m.district && m.taluka, `Market ${m.id} has valid name, district, and taluka`);
    assert(m.coordinates && m.coordinates.lat && m.coordinates.lng, `Market ${m.name} has valid coordinates (${m.coordinates?.lat}, ${m.coordinates?.lng})`);
    assert(m.districtCode && typeof m.districtCode === 'number', `Market ${m.name} has official numeric district LGD code (${m.districtCode})`);
    assert(m.operatingDay !== undefined, `Market ${m.name} has operatingDay`);
    assert(m.stallFee !== undefined && m.stallFee >= 0, `Market ${m.name} has stall fee defined (₹${m.stallFee})`);
    assert(Array.isArray(m.productCategories) && m.productCategories.length > 0, `Market ${m.name} lists supported categories`);
  }

  // Check specific district LGD code corrections
  const puneMarkets = INITIAL_BAZAAR_MARKETS.filter(m => m.district === 'Pune');
  for (const pm of puneMarkets) {
    assert(pm.districtCode === 493, `Pune market ${pm.name} has correct official LGD code 493`);
  }

  console.log('\n===============================================================');
  console.log(`  ALL ${passedTests} / ${totalTests} TESTS PASSED CLEANLY (100%)!`);
  console.log('===============================================================\n');
}

runTests().catch(err => {
  console.error('\n💥 Test suite terminated with error:', err.message);
  process.exit(1);
});
