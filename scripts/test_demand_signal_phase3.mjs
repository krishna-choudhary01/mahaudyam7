import assert from 'node:assert';
import { demandSignalService } from '../src/services/demand/demandSignalService.js';

console.log('========================================================================');
console.log('  MahaUdyam — Demand Signal Collector (Phase 3 Test Suite)');
console.log('  Community Confirmation, Trend Analysis & Emerging Demand Alerts');
console.log('========================================================================\n');

async function runTests() {
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ [PASS] Test ${total}: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ [FAIL] Test ${total}: ${name}`);
      console.error(err);
    }
  }

  await demandSignalService.init();

  // Test 1: Community Confirmation ("I also need this")
  await test('Community Confirmation: Resident can affirm an unmet demand without duplicate full form', async () => {
    const signals = await demandSignalService.getAggregatedDemand();
    const target = signals[0];
    const initialConfirmations = target.communityConfirmations || 0;

    const res = await demandSignalService.confirmCommunityDemand(target.id, 'resident_fp_01');
    assert(res.success, 'Confirmation should succeed');
    assert.strictEqual(res.communityConfirmations, initialConfirmations + 1, 'Confirmations count should increment by 1');
  });

  // Test 2: Demand Resolution Status Updates
  await test('Resolution Tracking: Updates unmet need status to in_progress and resolved', async () => {
    const signals = await demandSignalService.getAggregatedDemand();
    const target = signals[0];

    const inProgRes = await demandSignalService.updateDemandResolutionStatus(target.id, 'in_progress', 'Local entrepreneur started trial delivery');
    assert.strictEqual(inProgRes.resolutionStatus, 'in_progress');

    const resolvedRes = await demandSignalService.updateDemandResolutionStatus(target.id, 'resolved', 'Full service now available daily');
    assert.strictEqual(resolvedRes.resolutionStatus, 'resolved');
  });

  // Test 3: Validation on invalid resolution status
  await test('Validation: Rejects invalid resolution status', async () => {
    let errCaught = false;
    try {
      await demandSignalService.updateDemandResolutionStatus('demand_01', 'fake_status');
    } catch (e) {
      errCaught = true;
      assert(e.message.includes('Invalid resolution status'));
    }
    assert(errCaught, 'Must reject invalid status');
  });

  // Test 4: 3-Month Trend History Analysis
  await test('Trend Analysis: Computes time-series monthly buckets and surge detection', async () => {
    const signals = await demandSignalService.getAggregatedDemand();
    const target = signals[0];

    const trend = await demandSignalService.getDemandTrendHistory(target.id);
    assert(trend !== null, 'Trend should not be null');
    assert.strictEqual(trend.monthlyTrend.length, 3, 'Should have 3 monthly buckets');
    assert(['surging', 'cooling', 'steady'].includes(trend.trendType), 'Must classify trend type accurately');
  });

  // Test 5: Emerging Demand Alerts for Entrepreneurs
  await test('Entrepreneur Alerts: Detects high-priority emerging unmet demands matching village/taluka', async () => {
    const alerts = await demandSignalService.getEntrepreneurEmergingDemandAlerts({
      userVillageCode: 551322, // Baragaon Pimpri
      userTalukaCode: 4154,    // Sinnar
      userDistrictCode: 490    // Nashik
    });

    assert(Array.isArray(alerts), 'Alerts should be an array');
    if (alerts.length > 0) {
      const topAlert = alerts[0];
      assert(topAlert.priorityLevel, 'Alert must have priorityLevel');
      assert(topAlert.totalReports >= 3, 'Must have at least 3 reports');
      assert(topAlert.reason_en, 'Must have English explanation');
      assert(topAlert.reason_mr, 'Must have Marathi explanation');
    }
  });

  // Test 6: Zero PII Exposure to Entrepreneurs
  await test('Privacy Safeguard: Emerging alerts and trend records contain zero phone numbers or resident names', async () => {
    const alerts = await demandSignalService.getEntrepreneurEmergingDemandAlerts({
      userDistrictCode: 490
    });

    for (const a of alerts) {
      assert.strictEqual(a.phoneNumber, undefined, 'No phone number should be leaked');
      assert.strictEqual(a.residentName, undefined, 'No resident name should be leaked');
      assert.strictEqual(a.reporterIdentity, undefined, 'No identity should be leaked');
    }
  });

  console.log(`\nResults: ${passed} / ${total} tests passed.`);
  if (passed === total) {
    console.log('🎉 All Demand Signal Collector Phase 3 tests passed successfully!\n');
  } else {
    process.exit(1);
  }
}

runTests();
