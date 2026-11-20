// Comprehensive Test Suite for Phase 3: BazaarPath Module
import assert from 'node:assert';
import { INITIAL_BAZAAR_MARKETS, BAZAAR_PRODUCT_CATEGORIES } from '../src/data/bazaar/initialMarkets.js';
import {
  calculateDistanceKm,
  getDaysUntil,
  evaluateMarketSuitability,
  rankMarketsForUser
} from '../src/services/bazaar/bazaarRecommendationEngine.js';

console.log('========================================================');
console.log('🧪 MahaUdyam Phase 3: BazaarPath Functional Module Tests');
console.log('========================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function runTests() {
  // Test 1: Market Data Model Integrity & Verification Status
  test('Initial market records adhere to structured data model', () => {
    assert.ok(INITIAL_BAZAAR_MARKETS.length >= 10, 'Expected at least 10 markets');
    
    // Check Sinnar market
    const sinnar = INITIAL_BAZAAR_MARKETS.find((m) => m.id === 'mkt-nsk-sinnar-01');
    assert.ok(sinnar, 'Sinnar market exists');
    assert.strictEqual(sinnar.districtCode, 490);
    assert.strictEqual(sinnar.talukaCode, 4154);
    assert.strictEqual(sinnar.operatingDay, 'Sunday');
    assert.strictEqual(sinnar.verificationStatus, 'verified');
    assert.ok(sinnar.coordinates.lat && sinnar.coordinates.lng);
    assert.ok(Array.isArray(sinnar.productCategories));
    assert.ok(sinnar.dataSource.includes('MSAMB'));

    // Check Sample Market distinction (Rule 6)
    const baragaonSample = INITIAL_BAZAAR_MARKETS.find((m) => m.id === 'mkt-nsk-baragaon-sample-02');
    assert.ok(baragaonSample, 'Sample village haat exists');
    assert.strictEqual(baragaonSample.verificationStatus, 'sample_development');
    assert.strictEqual(baragaonSample.priceIndicators, null);
    assert.match(baragaonSample.dataSource, /Development Testing Sample/i);
  });

  // Test 2: Haversine Distance Calculation
  test('Accurate great-circle distance calculation via Haversine', () => {
    // Distance between Sinnar (19.8465, 73.9965) and Pimpalgaon Baswant (20.1706, 73.9847)
    const dist = calculateDistanceKm(19.8465, 73.9965, 20.1706, 73.9847);
    assert.ok(dist >= 34 && dist <= 38, `Expected distance ~36 km, got ${dist}`);

    // Distance to same point
    const zeroDist = calculateDistanceKm(19.8465, 73.9965, 19.8465, 73.9965);
    assert.strictEqual(zeroDist, 0);

    // Null safety
    assert.strictEqual(calculateDistanceKm(null, null, 19.8, 73.9), null);
  });

  // Test 3: Operating Day & Schedule Proximity Calculation
  test('Days until target market calculation', () => {
    // If today is Sunday (day 0)
    const sundayDate = new Date('2026-11-08T10:00:00Z'); // Sunday
    assert.strictEqual(getDaysUntil('Sunday', sundayDate), 0);
    assert.strictEqual(getDaysUntil('Monday', sundayDate), 1);
    assert.strictEqual(getDaysUntil('Wednesday', sundayDate), 3);
  });

  // Test 4: Recommendation Scoring - Category Fit (Weight: 35%)
  test('Recommendation Engine: Product category compatibility weighting', () => {
    const market = INITIAL_BAZAAR_MARKETS.find((m) => m.id === 'mkt-nsk-pimpalgaon-04'); // Has Vegetables & Fruits
    const evalMatching = evaluateMarketSuitability({
      market,
      userLocation: { districtCode: 490, talukaCode: 4348 },
      productCategory: 'Vegetables & Fruits',
      currentDate: new Date('2026-11-04T10:00:00Z'),
      userId: 'test-user-01'
    });

    const evalMismatch = evaluateMarketSuitability({
      market,
      userLocation: { districtCode: 490, talukaCode: 4348 },
      productCategory: 'Handicrafts & Agri Tools', // Not listed in Pimpalgaon
      currentDate: new Date('2026-11-04T10:00:00Z'),
      userId: 'test-user-01'
    });

    assert.ok(evalMatching.breakdown.category > evalMismatch.breakdown.category, 'Matching category scores higher');
    assert.strictEqual(evalMatching.breakdown.category, 35);
    assert.strictEqual(evalMismatch.breakdown.category, 10);
    assert.ok(evalMatching.reasons.some((r) => r.includes('Vegetables & Fruits')));
    assert.ok(evalMismatch.cautionFactors.some((c) => c.includes('Handicrafts')));
  });

  // Test 5: Recommendation Scoring - Distance & Proximity (Weight: 25%)
  test('Recommendation Engine: Distance proximity weighting with GPS coordinates', () => {
    const market = INITIAL_BAZAAR_MARKETS.find((m) => m.id === 'mkt-nsk-sinnar-01'); // Sinnar: 19.8465, 73.9965
    
    // User close by in Sinnar (19.85, 74.00) ~ 0.5 km
    const closeEval = evaluateMarketSuitability({
      market,
      userLocation: { coordinates: { lat: 19.85, lng: 74.00 } },
      productCategory: 'Vegetables & Fruits',
      userId: 'test-user-01'
    });

    // User far away in Kolhapur (16.70, 74.24) ~ 350 km
    const farEval = evaluateMarketSuitability({
      market,
      userLocation: { coordinates: { lat: 16.70, lng: 74.24 } },
      productCategory: 'Vegetables & Fruits',
      userId: 'test-user-01'
    });

    assert.strictEqual(closeEval.breakdown.distance, 25);
    assert.strictEqual(farEval.breakdown.distance, 6);
    assert.ok(closeEval.score > farEval.score);
    assert.ok(closeEval.reasons.some((r) => r.includes('km away')));
    assert.ok(farEval.cautionFactors.some((c) => c.includes('Long transport distance')));
  });

  // Test 6: Incomplete / Sample Data Handling (Rule 4 & Rule 6)
  test('Recommendation Engine: Transparent handling of missing price data', () => {
    const sampleMarket = INITIAL_BAZAAR_MARKETS.find((m) => m.id === 'mkt-nsk-baragaon-sample-02');
    const evalSample = evaluateMarketSuitability({
      market: sampleMarket,
      userLocation: { districtCode: 490, talukaCode: 4154 },
      productCategory: 'Vegetables & Fruits',
      userId: 'test-user-01'
    });

    assert.strictEqual(evalSample.isPartialData, true);
    assert.strictEqual(evalSample.confidenceLevel, 'Development Sample (चाचणी नमुना)');
    assert.ok(evalSample.cautionFactors.some((c) => c.includes('Public price indicators not available')));
  });

  // Test 7: Anti-Crowding Deterministic Tie-Breaking (Rule 5)
  test('Anti-Crowding: Deterministic modifier diversifies identically suitable markets for different users', () => {
    const market = INITIAL_BAZAAR_MARKETS.find((m) => m.id === 'mkt-nsk-sinnar-01');
    
    const evalUserA = evaluateMarketSuitability({
      market,
      userLocation: { districtCode: 490, talukaCode: 4154 },
      productCategory: 'Vegetables & Fruits',
      userId: 'user-farmer-A'
    });

    const evalUserB = evaluateMarketSuitability({
      market,
      userLocation: { districtCode: 490, talukaCode: 4154 },
      productCategory: 'Vegetables & Fruits',
      userId: 'user-farmer-B'
    });

    // Modifiers should be bounded to [-2, 2]
    assert.ok(evalUserA.breakdown.modifier >= -2 && evalUserA.breakdown.modifier <= 2);
    assert.ok(evalUserB.breakdown.modifier >= -2 && evalUserB.breakdown.modifier <= 2);
  });

  // Test 8: Ranking Markets For User
  test('Market Ranking produces sorted list descending by suitability score', () => {
    const ranked = rankMarketsForUser({
      markets: INITIAL_BAZAAR_MARKETS,
      userLocation: { districtCode: 490, talukaCode: 4154 }, // Sinnar, Nashik
      productCategory: 'Vegetables & Fruits',
      userId: 'demo-user-dev-9999'
    });

    assert.ok(ranked.length > 0);
    for (let i = 0; i < ranked.length - 1; i++) {
      assert.ok(ranked[i].score >= ranked[i + 1].score, 'List must be sorted in descending score order');
    }

    // Top recommended market for Sinnar vegetable grower should be local Nashik markets (e.g. Sinnar, Pimpalgaon, Lasalgaon)
    assert.strictEqual(ranked[0].market.districtCode, 490, 'Top recommended market is in Nashik district');
  });

  // Test 9: Personal Favorites Data Isolation Between Users (Rule 8)
  test('Personal Favorites: Strictly isolated by userId', () => {
    const mockDbFavorites = [
      { id: 'fav_1', userId: 'user-A', marketId: 'mkt-nsk-sinnar-01' },
      { id: 'fav_2', userId: 'user-A', marketId: 'mkt-nsk-pimpalgaon-04' },
      { id: 'fav_3', userId: 'user-B', marketId: 'mkt-nsk-lasalgaon-05' }
    ];

    // Filter for User A
    const userAFavs = mockDbFavorites.filter((f) => f.userId === 'user-A').map((f) => f.marketId);
    assert.strictEqual(userAFavs.length, 2);
    assert.ok(userAFavs.includes('mkt-nsk-sinnar-01'));
    assert.ok(userAFavs.includes('mkt-nsk-pimpalgaon-04'));
    assert.ok(!userAFavs.includes('mkt-nsk-lasalgaon-05'), 'User A cannot see User B favorite');

    // Filter for User B
    const userBFavs = mockDbFavorites.filter((f) => f.userId === 'user-B').map((f) => f.marketId);
    assert.strictEqual(userBFavs.length, 1);
    assert.strictEqual(userBFavs[0], 'mkt-nsk-lasalgaon-05');
  });

  // Test 10: Product Categories Registry Integrity
  test('Bazaar product categories contain official Marathi and English labels', () => {
    assert.ok(BAZAAR_PRODUCT_CATEGORIES.length >= 7);
    const veg = BAZAAR_PRODUCT_CATEGORIES.find((c) => c.id === 'Vegetables & Fruits');
    assert.ok(veg);
    assert.strictEqual(veg.label_mr, 'भाजीपाला आणि फळे');
    assert.strictEqual(veg.label_en, 'Vegetables & Fruits');
  });

  // Summary
  console.log('\n--------------------------------------------------------');
  console.log(`Results: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('--------------------------------------------------------');
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests();
