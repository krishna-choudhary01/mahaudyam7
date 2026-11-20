import assert from 'node:assert';
import { bazaarPerformanceService } from '../src/services/bazaar/bazaarPerformanceService.js';
import { rankMarketsForUser, evaluateMarketSuitability } from '../src/services/bazaar/bazaarRecommendationEngine.js';

console.log('========================================================================');
console.log('  MahaUdyam — BazaarPath (Phase 3 Test Suite)');
console.log('  Market Performance, Actual Sales/Expenses & Feedback Refinement');
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

  await bazaarPerformanceService.init();

  // Test 1: Record market visit validation
  await test('Validation: Rejects quantity sold greater than quantity carried', async () => {
    let errCaught = false;
    try {
      await bazaarPerformanceService.recordMarketVisit('user_ramesh', {
        marketId: 'mkt-nsk-sinnar-01',
        quantityTaken: 50,
        quantitySold: 70, // Exceeds carried!
        actualSellingPricePerUnit: 20
      });
    } catch (e) {
      errCaught = true;
      assert(e.message.includes('cannot exceed quantity carried'));
    }
    assert(errCaught, 'Must reject overage sales');
  });

  // Test 2: Accurate itemized financial calculation
  await test('Calculates revenue, itemized expenses, unsold inventory and net profit', async () => {
    const visit = await bazaarPerformanceService.recordMarketVisit('user_ramesh', {
      marketId: 'mkt-nsk-sinnar-01',
      marketName: 'Sinnar Sunday Weekly Bazaar',
      visitDate: '2026-11-15T09:00:00.000Z',
      productCategory: 'Vegetables',
      productName: 'Tomatoes',
      quantityTaken: 100,
      quantitySold: 85,
      quantityUnit: 'kg',
      productCostPerUnit: 14,
      expectedPricePerUnit: 24,
      actualSellingPricePerUnit: 22,
      expenses: {
        travelExpense: 130,
        stallFee: 50,
        packagingExpense: 35,
        otherExpenses: 15
      },
      notes: 'Good Sunday morning turnout.'
    });

    // 85 sold * ₹22 = ₹1870
    assert.strictEqual(visit.actualRevenue, 1870);
    // Unsold loss = 15 * ₹14 = ₹210
    assert.strictEqual(visit.expenses.unsoldLoss, 210);
    // Total expenses = 130 + 50 + 35 + 210 + 15 = ₹440
    assert.strictEqual(visit.expenses.totalExpenses, 440);
    // Net profit = 1870 - (85*14) - (130+50+35+15) = 1870 - 1190 - 230 = ₹450
    assert.strictEqual(visit.actualNetProfit, 450);
    assert.strictEqual(visit.sellThroughRate, 85);
  });

  // Test 3: Multi-tenant user isolation
  await test('Strict Multi-Tenant Isolation: User A cannot see User B market visits', async () => {
    await bazaarPerformanceService.recordMarketVisit('user_geeta', {
      marketId: 'mkt-nsk-yeola-07',
      quantityTaken: 10,
      quantitySold: 8,
      actualSellingPricePerUnit: 1500,
      productCostPerUnit: 1000
    });

    const rameshVisits = await bazaarPerformanceService.getVisitHistory('user_ramesh');
    const geetaVisits = await bazaarPerformanceService.getVisitHistory('user_geeta');

    assert(rameshVisits.every((v) => v.userId === 'user_ramesh'), 'Ramesh must only see his own visits');
    assert(geetaVisits.every((v) => v.userId === 'user_geeta'), 'Geeta must only see her own visits');
    assert(geetaVisits.length >= 1, 'Geeta has at least 1 visit');
  });

  // Test 4: Expected vs Actual Variance analysis
  await test('Expected vs Actual Variance analysis computes price and profit differences', async () => {
    const visits = await bazaarPerformanceService.getVisitHistory('user_ramesh');
    const targetVisit = visits[0];
    const analysis = await bazaarPerformanceService.getExpectedVsActualAnalysis('user_ramesh', targetVisit.id);

    assert(analysis !== null, 'Analysis should not be null');
    assert.strictEqual(typeof analysis.variances.profitVariance, 'number');
    assert.strictEqual(typeof analysis.variances.priceVariance, 'number');
    assert.strictEqual(analysis.variances.isProfitable, true);
  });

  // Test 5: Market Performance Aggregations
  await test('Performance Intelligence aggregates visits, average profit, and top market', async () => {
    const intel = await bazaarPerformanceService.getMarketPerformanceIntelligence('user_ramesh');
    assert(intel.totalVisits > 0, 'Total visits should be > 0');
    assert(intel.totalNetProfit > 0, 'Total net profit should be > 0');
    assert(intel.avgSellThroughRate >= 80, 'Sell-through rate should be >= 80%');
    assert(intel.topMarket !== null, 'Top market should be identified');
  });

  // Test 6: Personalized Feedback Loop in Recommendation Score
  await test('Feedback Loop: Past successful visits grant confidence score boost in recommendation engine', async () => {
    const rameshVisits = await bazaarPerformanceService.getVisitHistory('user_ramesh');
    const targetMarket = {
      id: 'mkt-nsk-sinnar-01',
      name: 'Sinnar Sunday Weekly Bazaar',
      districtCode: 490,
      talukaCode: 4154,
      operatingDay: 'Sunday',
      productCategories: ['Vegetables'],
      verificationStatus: 'verified'
    };

    // Evaluate without visit history
    const evalWithoutHistory = evaluateMarketSuitability({
      market: targetMarket,
      productDetails: { category: 'Vegetables', quantityCarried: 50, costPerUnit: 14, expectedPricePerUnit: 22 },
      userId: 'user_ramesh',
      userVisitHistory: []
    });

    // Evaluate with visit history
    const evalWithHistory = evaluateMarketSuitability({
      market: targetMarket,
      productDetails: { category: 'Vegetables', quantityCarried: 50, costPerUnit: 14, expectedPricePerUnit: 22 },
      userId: 'user_ramesh',
      userVisitHistory: rameshVisits
    });

    assert(evalWithHistory.score >= evalWithoutHistory.score, 'History of profitable visits must improve score');
    assert(evalWithHistory.reasons.some((r) => r.includes('मागील प्रत्यक्ष अनुभव') || r.includes('भेटींचा')), 'Must include explanation of past visit proof');
  });

  // Test 7: Citizen Market Proposal Submission
  await test('Citizen market proposal submission stores proposal in pending_verification status', async () => {
    const proposal = await bazaarPerformanceService.submitNewMarketProposal('citizen_user_01', {
      name: 'Ozar Friday Agro Haat',
      name_mr: 'ओझर शुक्रवार कृषी हाट',
      districtCode: 490,
      talukaCode: 4153,
      villageName: 'Ozar Mig',
      operatingDay: 'Friday',
      stallFee: 40,
      facilities: ['Drinking Water', 'Parking']
    });

    assert(proposal.success, 'Proposal submission should succeed');
    assert(proposal.submissionId, 'Proposal should return an ID');

    const adminSubmissions = await bazaarPerformanceService.getAdminMarketSubmissions('admin_01');
    const found = adminSubmissions.find((s) => s.id === proposal.submissionId);
    assert(found, 'Admin should see pending market proposal');
    assert.strictEqual(found.status, 'pending_verification');
  });

  // Test 8: Admin Verification & Community Publishing Workflow
  await test('Admin verification approves proposal and publishes into active directory', async () => {
    const adminSubmissions = await bazaarPerformanceService.getAdminMarketSubmissions('admin_01');
    const targetProposal = adminSubmissions[0];

    const verifyResult = await bazaarPerformanceService.verifyMarketSubmission('admin_user_super', targetProposal.id, {
      status: 'verified',
      adminNotes: 'Field audit verified by Taluka Agricultural Officer.'
    });

    assert(verifyResult.success, 'Verification should succeed');
    assert.strictEqual(verifyResult.status, 'verified');
  });

  // Test 9: Offline visit synchronization
  await test('Offline synchronization idempotently confirms pending visits', async () => {
    const syncRes = await bazaarPerformanceService.syncPendingVisits('user_ramesh');
    assert(typeof syncRes.synchronizedCount === 'number', 'Returns sync count');
  });

  console.log(`\nResults: ${passed} / ${total} tests passed.`);
  if (passed === total) {
    console.log('🎉 All BazaarPath Phase 3 tests passed successfully!\n');
  } else {
    process.exit(1);
  }
}

runTests();
