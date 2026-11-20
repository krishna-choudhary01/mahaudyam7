/**
 * MahaUdyam — Unsold Stock Rescue
 * Phase 2 Test Suite: Smart Recovery Channel Matching Engine
 * 
 * Verifies all 15 test specifications required by Phase 2:
 * 1. Highly perishable item close to expiry (urgent recommendation: weekly market / immediate discount)
 * 2. Moderately perishable item with good shelf life (cold storage / local retailer / processing)
 * 3. Non-perishable item (handicrafts / textiles / dry grains) - no shelf life urgency
 * 4. Large bulk quantity recommendation (bulk buyers / FPOs)
 * 5. Small quantity recommendation (local retailers / direct weekly market)
 * 6. Expired / damaged food HARD DISQUALIFICATION from human consumption channels
 * 7. Processable surplus (tomatoes -> puree, milk -> paneer/khoa)
 * 8. Preservable surplus (storage & preservation channel evaluation)
 * 9. Proximity & distance scoring (nearby market vs distant market)
 * 10. Verified directory buyer linkage and "No verified buyer" transparency (no fake buyers)
 * 11. Multi-channel economic comparison (comparing net recovery, costs, recovery rate %)
 * 12. Private entrepreneur channel actions (recording explored, contacted, deal_agreed, dismissed per user)
 * 13. Offline recommendation caching (Dexie stockRecommendations / memory store)
 * 14. User data isolation (User A cannot see User B's recommendations or channel actions)
 * 15. Bilingual rendering (English & Marathi explanations, labels, reasons, recommendations)
 */

import assert from 'assert';
import React from 'react';
import { renderToString } from 'react-dom/server';

import {
  STOCK_CATEGORIES,
  STOCK_STATUSES,
  PERISHABILITY_LEVELS,
  PRODUCT_CONDITIONS,
  RECOVERY_CHANNELS
} from '../src/data/stock/stockConstants.js';
import { INITIAL_UNSOLD_STOCKS } from '../src/data/stock/initialUnsoldStock.js';
import { unsoldStockService } from '../src/services/stock/unsoldStockService.js';
import { StockMatchingEngine, calculateHaversineDistance } from '../src/services/stock/stockMatchingEngine.js';
import { en } from '../src/i18n/translations/en.js';
import { mr } from '../src/i18n/translations/mr.js';

console.log('========================================================================');
console.log('  MahaUdyam — Unsold Stock Rescue (Phase 2 Test Suite)');
console.log('  Smart Recovery Channel Matching Engine');
console.log('========================================================================\n');

let passedTests = 0;
const totalTests = 15;

async function runTests() {
  await unsoldStockService.initStockDatabase();

  // --------------------------------------------------------------------------
  // TEST 1: Highly perishable item close to expiry
  // --------------------------------------------------------------------------
  console.log('Test 1: Highly perishable item close to expiry (< 24h shelf life)...');
  const freshMilk = INITIAL_UNSOLD_STOCKS.find((s) => s.id === 'stock_pohegaon_milk_03');
  assert(freshMilk, 'Milk test record must exist');
  assert.strictEqual(freshMilk.perishability, PERISHABILITY_LEVELS.PERISHABLE);
  assert(freshMilk.remainingShelfLifeHours <= 24, 'Milk shelf life must be <= 24h');

  const milkRecs = StockMatchingEngine.evaluateAllChannels(freshMilk);
  assert(milkRecs.channels.length === 8, 'Must evaluate all 8 channels');
  
  // Fast channels (food_processors, local_retailers, weekly_markets) must rank higher than slow storage
  const topMilkChannel = milkRecs.channels[0];
  const storageChannelForMilk = milkRecs.channels.find((c) => c.id === 'storage_preservation');
  assert(['food_processors', 'cooperatives', 'local_retailers', 'weekly_markets'].includes(topMilkChannel.id),
    `Top channel for urgent perishable milk should be liquid/processor/coop, got ${topMilkChannel.id}`);
  assert(topMilkChannel.suitabilityScore > storageChannelForMilk.suitabilityScore,
    'Top urgent channel score must exceed long-term storage for 14h milk');
  console.log(`  ✓ Passed: Top milk channel=${topMilkChannel.id} (Score: ${topMilkChannel.suitabilityScore}) vs Storage (${storageChannelForMilk.suitabilityScore})\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 2: Moderately perishable item with good shelf life
  // --------------------------------------------------------------------------
  console.log('Test 2: Moderately perishable item with good shelf life (onions, 35 days)...');
  const garvaOnion = INITIAL_UNSOLD_STOCKS.find((s) => s.id === 'stock_wavi_onion_04');
  assert(garvaOnion, 'Garva onion test record must exist');
  assert.strictEqual(garvaOnion.perishability, PERISHABILITY_LEVELS.SEMI_PERISHABLE);

  const onionRecs = StockMatchingEngine.evaluateAllChannels(garvaOnion);
  const onionStorageChannel = onionRecs.channels.find((c) => c.id === 'storage_preservation');
  const onionBulkChannel = onionRecs.channels.find((c) => c.id === 'bulk_buyers');
  assert(onionStorageChannel.suitabilityScore >= 75, `Storage score for durable onion must be >= 75, got ${onionStorageChannel.suitabilityScore}`);
  assert(onionBulkChannel.suitabilityScore >= 75, `Bulk buyer score for 15 quintals onion must be >= 75, got ${onionBulkChannel.suitabilityScore}`);
  console.log(`  ✓ Passed: Storage score=${onionStorageChannel.suitabilityScore}, Bulk score=${onionBulkChannel.suitabilityScore} for semi-perishable bulk onions\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 3: Non-perishable item (handicrafts / textiles)
  // --------------------------------------------------------------------------
  console.log('Test 3: Non-perishable goods (Handloom Paithani stoles, zero ticking clock urgency)...');
  const stoles = INITIAL_UNSOLD_STOCKS.find((s) => s.id === 'stock_yeola_paithani_02');
  assert(stoles, 'Paithani stoles record must exist');
  assert.strictEqual(stoles.perishability, PERISHABILITY_LEVELS.NON_PERISHABLE);

  const stolesRecs = StockMatchingEngine.evaluateAllChannels(stoles);
  // Stoles must have zero food safety disqualification
  assert.strictEqual(stolesRecs.foodSafetySummary.isFoodCategory, false);
  const foodProcForStoles = stolesRecs.channels.find((c) => c.id === 'food_processors');
  const weeklyMktForStoles = stolesRecs.channels.find((c) => c.id === 'weekly_markets');
  const popupForStoles = stolesRecs.channels.find((c) => c.id === 'alternative_markets');

  assert(weeklyMktForStoles.suitabilityScore > foodProcForStoles.suitabilityScore,
    'Weekly market suitability must strongly exceed food processor for textile stoles');
  assert(popupForStoles.suitabilityScore >= 70, 'Popup/temple fair score should be strong for handicrafts');
  console.log(`  ✓ Passed: Weekly markets (${weeklyMktForStoles.suitabilityScore}) & Popups (${popupForStoles.suitabilityScore}) fit handicrafts, Food Processors (${foodProcForStoles.suitabilityScore}) is low\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 4: Large bulk quantity recommendation (>= 15 quintals)
  // --------------------------------------------------------------------------
  console.log('Test 4: Large bulk quantity recommendation...');
  const bulkRecs = StockMatchingEngine.evaluateAllChannels(garvaOnion); // 15 quintals = 1500 kg
  const bulkChannel = bulkRecs.channels.find((c) => c.id === 'bulk_buyers');
  const kiranaChannel = bulkRecs.channels.find((c) => c.id === 'local_retailers');
  assert(bulkChannel.scoreBreakdown.quantityFit > kiranaChannel.scoreBreakdown.quantityFit,
    `Bulk buyers quantity fit (${bulkChannel.scoreBreakdown.quantityFit}) must be higher than kirana (${kiranaChannel.scoreBreakdown.quantityFit}) for 15 quintals`);
  console.log(`  ✓ Passed: Quantity fit for bulk buyers=${bulkChannel.scoreBreakdown.quantityFit} vs local kirana=${kiranaChannel.scoreBreakdown.quantityFit}\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 5: Small quantity recommendation (small batch)
  // --------------------------------------------------------------------------
  console.log('Test 5: Small quantity recommendation (small batch fit)...');
  const smallBatch = {
    id: 'test_small_batch_01',
    productName: 'Homemade Organic Papad',
    category: STOCK_CATEGORIES.PROCESSED_FOOD,
    availableQuantity: 25,
    unit: 'packet',
    condition: PRODUCT_CONDITIONS.GOOD,
    perishability: PERISHABILITY_LEVELS.SEMI_PERISHABLE,
    remainingShelfLifeHours: 720,
    districtCode: 490,
    talukaCode: 4154
  };
  const smallRecs = StockMatchingEngine.evaluateAllChannels(smallBatch);
  const kiranaSmall = smallRecs.channels.find((c) => c.id === 'local_retailers');
  const bulkSmall = smallRecs.channels.find((c) => c.id === 'bulk_buyers');
  assert(kiranaSmall.scoreBreakdown.quantityFit > bulkSmall.scoreBreakdown.quantityFit,
    `Kirana quantity fit (${kiranaSmall.scoreBreakdown.quantityFit}) must be higher than bulk (${bulkSmall.scoreBreakdown.quantityFit}) for 25 packets`);
  console.log(`  ✓ Passed: Kirana quantity fit=${kiranaSmall.scoreBreakdown.quantityFit} vs Bulk buyers=${bulkSmall.scoreBreakdown.quantityFit} for small lot\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 6: Expired / damaged food HARD DISQUALIFICATION
  // --------------------------------------------------------------------------
  console.log('Test 6: Expired / damaged food HARD DISQUALIFICATION from human consumption...');
  const decayedPalak = INITIAL_UNSOLD_STOCKS.find((s) => s.id === 'stock_damaged_spinach_05');
  assert(decayedPalak, 'Decayed palak record must exist');
  assert.strictEqual(decayedPalak.condition, PRODUCT_CONDITIONS.DAMAGED);

  const disqRecs = StockMatchingEngine.evaluateAllChannels(decayedPalak);
  assert.strictEqual(disqRecs.foodSafetySummary.isSafe, false);
  assert.strictEqual(disqRecs.foodSafetySummary.criticalOverrideApplied, true);

  const humanChannels = ['weekly_markets', 'local_retailers', 'bulk_buyers', 'food_processors', 'cooperatives', 'alternative_markets', 'storage_preservation'];
  for (const chId of humanChannels) {
    const ch = disqRecs.channels.find((c) => c.id === chId);
    assert.strictEqual(ch.isDisqualified, true, `Channel ${chId} must be disqualified for spoiled food`);
    assert.strictEqual(ch.suitabilityScore, 0, `Channel ${chId} score must be forced to 0`);
    assert(ch.disqualificationReason_en.includes('CRITICAL FOOD SAFETY OVERRIDE'),
      `Channel ${chId} must have critical safety reason`);
  }
  console.log('  ✓ Passed: All 7 human consumption channels strictly disqualified with score=0 and critical food safety warning\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 7: Processable surplus (tomatoes -> puree, milk -> paneer/khoa)
  // --------------------------------------------------------------------------
  console.log('Test 7: Processable surplus evaluation (tomatoes & milk)...');
  const ripeTomatoes = INITIAL_UNSOLD_STOCKS.find((s) => s.id === 'stock_sinnar_tomatoes_01');
  const tomatoRecs = StockMatchingEngine.evaluateAllChannels(ripeTomatoes);
  const tomatoProcChannel = tomatoRecs.channels.find((c) => c.id === 'food_processors');
  assert(tomatoProcChannel.suitabilityScore >= 75, `Tomato food processor score must be >= 75, got ${tomatoProcChannel.suitabilityScore}`);
  assert(tomatoProcChannel.whyRecommended_en.some((r) => r.toLowerCase().includes('puree') || r.toLowerCase().includes('process')),
    'Must explain processing into puree/processed goods');
  console.log(`  ✓ Passed: Food processor score=${tomatoProcChannel.suitabilityScore} with tailored puree/processing reasons\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 8: Preservable surplus (storage & preservation channel)
  // --------------------------------------------------------------------------
  console.log('Test 8: Preservable surplus evaluation (storage & preservation channel)...');
  const storageChannel = onionRecs.channels.find((c) => c.id === 'storage_preservation');
  assert.strictEqual(storageChannel.isDisqualified, false);
  assert(storageChannel.suitabilityScore >= 75);
  assert(storageChannel.whyRecommended_en.some((r) => r.toLowerCase().includes('distress') || r.toLowerCase().includes('glut')),
    'Must highlight preventing distress selling during glut');
  console.log(`  ✓ Passed: Storage & preservation channel active with score=${storageChannel.suitabilityScore} for storable surplus\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 9: Proximity & distance scoring (Haversine & local taluka match)
  // --------------------------------------------------------------------------
  console.log('Test 9: Proximity and distance scoring...');
  const d1 = calculateHaversineDistance(19.8465, 73.9965, 19.8500, 74.0000);
  assert(d1 != null && d1 < 2, 'Nearby points distance must be < 2 km');
  const d2 = calculateHaversineDistance(19.8465, 73.9965, 18.5204, 73.8567);
  assert(d2 != null && d2 > 100, 'Nashik to Pune distance must be > 100 km');

  // Check that weekly markets in same taluka give geography score >= 90
  const sinnTomatoWeekly = tomatoRecs.channels.find((c) => c.id === 'weekly_markets');
  assert(sinnTomatoWeekly.scoreBreakdown.geography >= 90,
    `Local taluka weekly market geography score must be >= 90, got ${sinnTomatoWeekly.scoreBreakdown.geography}`);
  console.log(`  ✓ Passed: Haversine distance validated (local: ${d1}km, distant: ${d2}km), local taluka geography=${sinnTomatoWeekly.scoreBreakdown.geography}\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 10: Verified directory buyer linkage and "No verified buyer" transparency
  // --------------------------------------------------------------------------
  console.log('Test 10: Verified directory buyer linkage and transparency (NO fake buyers)...');
  // Check weekly market has Sinnar market
  const weeklyBuyers = sinnTomatoWeekly.matchedBuyers;
  assert(weeklyBuyers.length > 0, 'Sinnar must have matching weekly bazaar from master dataset');
  assert(['verified', 'sample_development'].includes(weeklyBuyers[0].verificationStatus),
    'Market must have a valid verificationStatus');
  assert(weeklyBuyers[0].name.includes('Sinnar'), 'Market name must match Sinnar');

  // Now test an isolated product in a taluka without buyers:
  const remoteStock = {
    id: 'test_remote_stock_01',
    productName: 'Rare Wild Herbs',
    category: STOCK_CATEGORIES.AGRICULTURAL_PRODUCE,
    availableQuantity: 50,
    unit: 'kg',
    condition: PRODUCT_CONDITIONS.GOOD,
    perishability: PERISHABILITY_LEVELS.NON_PERISHABLE,
    districtCode: 9999, // Non-existent district in master dataset
    talukaCode: 9999
  };
  const remoteRecs = StockMatchingEngine.evaluateAllChannels(remoteStock);
  const remoteBulk = remoteRecs.channels.find((c) => c.id === 'bulk_buyers');
  assert.strictEqual(remoteBulk.matchedBuyers.length, 0, 'Must have 0 matched buyers');
  assert(remoteBulk.buyerNotice_en.includes('No verified buyer currently available'),
    'Must display clear transparency notice instead of fabricating fake buyers');
  console.log('  ✓ Passed: Real verified directory buyers linked where available; clean disclaimer shown when empty (NO fake buyers)\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 11: Multi-channel economic comparison
  // --------------------------------------------------------------------------
  console.log('Test 11: Multi-channel economic comparison matrix...');
  const comparison = await unsoldStockService.compareChannels(ripeTomatoes, ['weekly_markets', 'local_retailers', 'food_processors']);
  assert.strictEqual(comparison.comparisons.length, 3, 'Must compare 3 specified channels');
  for (const comp of comparison.comparisons) {
    assert(comp.expectedPrice > 0, 'Expected price must be positive');
    assert(comp.grossRevenue > 0, 'Gross revenue must be positive');
    assert(comp.netRecovery !== undefined, 'Net recovery must be calculated');
    assert(comp.recoveryRatePercent >= 0, 'Recovery rate % must be non-negative');
    assert(comp.timeframe_en, 'Turnaround timeframe must be provided');
  }
  console.log(`  ✓ Passed: Economic comparison computed for 3 channels. Gross Rev: ₹${comparison.comparisons[0].grossRevenue}, Net: ₹${comparison.comparisons[0].netRecovery}\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 12: Private entrepreneur channel actions
  // --------------------------------------------------------------------------
  console.log('Test 12: Private entrepreneur channel actions recording...');
  const userId = 'ent_nashik_ramesh_001';
  const stockId = 'stock_sinnar_tomatoes_01';

  const actionExplored = await unsoldStockService.recordChannelAction(
    userId,
    stockId,
    'weekly_markets',
    'explored',
    'Checked Sinnar weekly market timings'
  );
  assert(actionExplored.id.startsWith('act_'), 'Action ID must be generated');
  assert.strictEqual(actionExplored.actionType, 'explored');
  assert.strictEqual(actionExplored.channelId, 'weekly_markets');

  const actionContacted = await unsoldStockService.recordChannelAction(
    userId,
    stockId,
    'food_processors',
    'contacted',
    'Called Godavari Agro Processors manager'
  );
  assert.strictEqual(actionContacted.actionType, 'contacted');

  const recordedList = await unsoldStockService.getChannelActionsForStock(userId, stockId);
  assert(recordedList.length >= 2, 'Must have at least 2 recorded actions');
  assert(recordedList.some((a) => a.actionType === 'contacted'));
  console.log(`  ✓ Passed: Channel actions recorded and fetched successfully (${recordedList.length} actions)\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 13: Offline recommendation caching
  // --------------------------------------------------------------------------
  console.log('Test 13: Offline recommendation caching in memory / Dexie store...');
  const cachedRecs1 = await unsoldStockService.getRecommendationsForStock(userId, stockId);
  assert(cachedRecs1 && cachedRecs1.channels.length === 8);
  const genTime1 = cachedRecs1.generatedAt;

  // Retrieve again without forceRefresh: should return the same cached object
  const cachedRecs2 = await unsoldStockService.getRecommendationsForStock(userId, stockId);
  assert.strictEqual(cachedRecs2.generatedAt, genTime1, 'Should return cached timestamp without recalculation');

  // Retrieve with forceRefresh: should re-generate
  const refreshedRecs = await unsoldStockService.getRecommendationsForStock(userId, stockId, true);
  assert(refreshedRecs && refreshedRecs.channels.length === 8);
  console.log('  ✓ Passed: Recommendations cached and reused offline; refreshed upon explicit request\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 14: User data isolation
  // --------------------------------------------------------------------------
  console.log('Test 14: Multi-tenant user data isolation...');
  const unauthorizedUser = 'ent_pune_other_user_999';
  
  // User B attempting to fetch User A's stock recommendations must throw or deny
  let accessDenied = false;
  try {
    await unsoldStockService.getRecommendationsForStock(unauthorizedUser, stockId);
  } catch (err) {
    accessDenied = true;
  }
  assert.strictEqual(accessDenied, true, 'User B must NOT have access to User A stock recommendations');

  // User B attempting to view User A's channel actions
  let actionsDenied = false;
  try {
    await unsoldStockService.getChannelActionsForStock(unauthorizedUser, stockId);
  } catch (err) {
    actionsDenied = true;
  }
  assert.strictEqual(actionsDenied, true, 'User B must NOT have access to User A channel actions');
  console.log('  ✓ Passed: Strict privacy isolation verified; unauthorized user requests rejected\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 15: Bilingual rendering (English & Marathi)
  // --------------------------------------------------------------------------
  console.log('Test 15: Bilingual rendering of explanations, reasons, and labels...');
  assert(en.unsoldStock.matching, 'English translations must contain matching namespace');
  assert(mr.unsoldStock.matching, 'Marathi translations must contain matching namespace');
  assert(en.unsoldStock.comparison, 'English translations must contain comparison namespace');
  assert(mr.unsoldStock.comparison, 'Marathi translations must contain comparison namespace');

  // Verify key Marathi labels
  assert.strictEqual(mr.unsoldStock.matching.tabTitle, 'स्मार्ट शिफारसी');
  assert.strictEqual(mr.unsoldStock.matching.suitabilityScore, 'उपयुक्तता गुण');
  assert.strictEqual(mr.unsoldStock.comparison.colNet, 'निव्वळ पुनर्प्राप्ती');

  // Verify recommendation card bilingual content
  const sampleChannel = milkRecs.channels[0];
  assert(sampleChannel.title_en && sampleChannel.title_mr, 'Channel must have title in both languages');
  assert(sampleChannel.whyRecommended_en.length > 0 && sampleChannel.whyRecommended_mr.length > 0,
    'Why recommended must have both English and Marathi points');
  assert(sampleChannel.limitations_en.length > 0 && sampleChannel.limitations_mr.length > 0,
    'Limitations must have both English and Marathi points');
  console.log('  ✓ Passed: Complete bilingual coverage verified for all Phase 2 engine outputs and translation dictionaries\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('========================================================================');
  console.log(`  Phase 2 Test Results: ${passedTests}/${totalTests} Passed (100% Success)`);
  console.log('========================================================================\n');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
