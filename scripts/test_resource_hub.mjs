import assert from 'assert';
import { learningResourceService, BUSINESS_LAUNCH_MILESTONES } from '../src/services/learning/learningResourceService.js';
import { RESOURCE_HUB_CATEGORIES } from '../src/data/learning/initialLearningResources.js';

console.log('\n--- TESTING RESOURCE HUB (PHASE 1, 2, 3) ---');

async function runTests() {
  // Test 1: Service Initialization & Catalog Retrieval
  console.log('Test 1: Verify Initial Library & Category Filtering...');
  await learningResourceService.init();
  const allResources = await learningResourceService.getAllResources();
  assert(allResources.length >= 6, `Expected at least 6 initial learning resources, got ${allResources.length}`);
  console.log(`✓ Loaded ${allResources.length} verified government schemes, compliance guides, and bankable DPRs.`);

  const schemes = await learningResourceService.getAllResources({
    category: RESOURCE_HUB_CATEGORIES.GOVERNMENT_SCHEMES
  });
  assert(schemes.length >= 2, 'Expected government schemes in catalog');
  assert(schemes.every(s => s.category === RESOURCE_HUB_CATEGORIES.GOVERNMENT_SCHEMES), 'All returned items should be government schemes');
  console.log(`✓ Category filter verified: ${schemes.length} schemes found.`);

  // Test 2: Subsidy Estimator & Scheme Matcher (Phase 2)
  console.log('\nTest 2: Verify Subsidy & Capital Requirement Calculation...');
  const generalMatches = await learningResourceService.matchGovernmentSchemes({
    businessCategory: 'Food Processing',
    proposedInvestment: 1000000, // ₹10 Lakh
    isRural: true,
    socialCategory: 'General',
    isWomanEntrepreneur: false
  });

  assert(generalMatches.length >= 2, 'Should return matching schemes');
  const pmfmeGeneral = generalMatches.find(m => m.scheme.id === 'sch_pmfme_01');
  assert(pmfmeGeneral, 'Should match PMFME for food processing');
  assert.strictEqual(pmfmeGeneral.applicableSubsidyPct, 35, 'PMFME subsidy should be 35%');
  assert.strictEqual(pmfmeGeneral.estimatedSubsidy, 350000, '35% of ₹10L is ₹3,50,000');
  assert.strictEqual(pmfmeGeneral.entrepreneurMarginMoney, 100000, '10% margin on ₹10L is ₹1,00,000');
  assert.strictEqual(pmfmeGeneral.bankLoanRequired, 900000, 'Bank loan required is ₹9,00,000');
  console.log(`✓ General scheme calculation verified: ₹10L investment -> ₹3.5L subsidy, ₹1L margin, ₹9L bank loan.`);

  // Test 2b: Special Category Subsidy Booster (e.g. Women / SC / ST under CMEGP)
  console.log('\nTest 2b: Verify Special Category Subsidy Rate (35% under CMEGP)...');
  const specialMatches = await learningResourceService.matchGovernmentSchemes({
    businessCategory: 'Manufacturing',
    proposedInvestment: 1000000,
    isRural: true,
    socialCategory: 'Women',
    isWomanEntrepreneur: true
  });
  const cmegpSpecial = specialMatches.find(m => m.scheme.id === 'sch_cmegp_02');
  assert(cmegpSpecial, 'Should match CMEGP');
  assert.strictEqual(cmegpSpecial.applicableSubsidyPct, 35, 'CMEGP special category subsidy should be 35%');
  assert.strictEqual(cmegpSpecial.marginPct, 5, 'Special category margin should be 5%');
  console.log(`✓ Special category booster verified: 35% subsidy and 5% margin applied.`);

  // Test 3: 7-Step Business Launch Milestone Tracker (Phase 3)
  console.log('\nTest 3: Verify 7-Step Business Launch Tracker...');
  assert.strictEqual(BUSINESS_LAUNCH_MILESTONES.length, 7, 'Must have exactly 7 structured milestones');
  const testUserId = 'test_entrepreneur_launch_77';

  // 3a: Initial state (0% progress)
  const initialProg = await learningResourceService.getUserLaunchProgress(testUserId);
  assert.strictEqual(initialProg.progressPercent, 0, 'Initial progress should be 0%');
  assert.strictEqual(initialProg.completedCount, 0);
  assert.strictEqual(initialProg.totalSteps, 7);
  console.log('✓ Step 3a: Initial state correctly initialized with 0% completion.');

  // 3b: Complete Step 1 (Idea validation) and Step 2 (Udyam)
  await learningResourceService.toggleMilestoneStep(testUserId, 'ms_1_idea_validation', true, 'Surplus 8 MT onions identified at Baragaon Pimpri');
  const progAfterStep1 = await learningResourceService.toggleMilestoneStep(testUserId, 'ms_2_legal_registration', true, 'Udyam certificate #UDYAM-MH-26-0091823 obtained');
  
  assert.strictEqual(progAfterStep1.completedCount, 2, 'Completed count should be 2');
  assert.strictEqual(progAfterStep1.progressPercent, 29, '2 out of 7 steps is ~29%');
  const ms1 = progAfterStep1.milestones.find(m => m.id === 'ms_1_idea_validation');
  assert.strictEqual(ms1.isCompleted, true);
  assert(ms1.notes.includes('Baragaon Pimpri'), 'Personal notes should be preserved');
  console.log(`✓ Step 3b: Steps 1 & 2 completed (${progAfterStep1.progressPercent}% progress) with notes preserved.`);

  // Test 4: Multi-Tenant Data Isolation
  console.log('\nTest 4: Verify Multi-Tenant Progress Isolation...');
  const otherUserProg = await learningResourceService.getUserLaunchProgress('isolated_stranger_user_99');
  assert.strictEqual(otherUserProg.progressPercent, 0, 'Other user must have 0% progress');
  assert.strictEqual(otherUserProg.completedCount, 0, 'Other user must have 0 completed steps');
  console.log('✓ Strict multi-tenant data isolation verified.');

  // Test 5: Offline Synchronization
  console.log('\nTest 5: Verify Offline Synchronization...');
  const syncResult = await learningResourceService.syncUserProgress(testUserId);
  assert(typeof syncResult.synchronizedCount === 'number');
  console.log(`✓ Offline sync verified: ${syncResult.synchronizedCount} records synchronized.`);

  console.log('\n======================================================');
  console.log('🎉 ALL RESOURCE HUB TESTS PASSED!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
