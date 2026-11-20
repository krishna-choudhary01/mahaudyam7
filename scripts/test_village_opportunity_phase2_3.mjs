import assert from 'node:assert';
import { opportunityDiscoveryEngine } from '../src/services/village/opportunityDiscoveryEngine.js';
import { personalDecisionSupportService } from '../src/services/village/personalDecisionSupportService.js';
import { villageOpportunityService } from '../src/services/village/villageOpportunityService.js';

console.log('========================================================================');
console.log('  MahaUdyam — Village Opportunity Detector (Phase 2 & Phase 3 Test Suite)');
console.log('  Opportunity Discovery Engine & Personalized Decision Support');
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

  await villageOpportunityService.initVillageDatabase();

  // Test 1: Generate Evidence-Backed Opportunities for Village (Baragaon Pimpri 551322)
  await test('Phase 2 Engine: Synthesizes evidence-backed opportunities for Baragaon Pimpri', async () => {
    const res = await opportunityDiscoveryEngine.generateOpportunitiesForVillage(551322);
    assert(res !== null, 'Result should not be null');
    assert(res.opportunities.length > 0, 'Should generate opportunities for Baragaon Pimpri');
    
    // Check first opportunity
    const top = res.opportunities[0];
    assert(top.viabilityScore >= 25 && top.viabilityScore <= 100, 'Score should be between 25 and 100');
    assert(top.title_en, 'Should have English title');
    assert(top.title_mr, 'Should have Marathi title');
    assert(top.investmentRange?.min > 0, 'Should define min investment');
    assert(top.investmentRange?.max > top.investmentRange?.min, 'Max investment should exceed min');
  });

  // Test 2: Evidence Grounding (Never generic ideas unrelated to village)
  await test('Evidence Grounding: Opportunities cite actual crops and skills from the village profile', async () => {
    const res = await opportunityDiscoveryEngine.generateOpportunitiesForVillage(551322);
    for (const opp of res.opportunities) {
      assert(opp.supportingEvidence, 'Must have supporting evidence block');
      assert(opp.explanation_en.includes('Recommended because'), 'Must provide transparent explanation');
      assert(opp.explanation_mr.includes('शिफारस करण्याचे कारण'), 'Must provide Marathi explanation');
    }
  });

  // Test 3: Realistic Investment Ranges & Equipment Requirements
  await test('Realistic Parameters: Includes equipment lists, infrastructure, and risk factors', async () => {
    const res = await opportunityDiscoveryEngine.generateOpportunitiesForVillage(551322);
    const dehydrationOpp = res.opportunities.find((o) => o.patternId === 'pattern_solar_dehydration');
    assert(dehydrationOpp, 'Should find solar dehydration opportunity for tomato/onion belt');
    assert(dehydrationOpp.requiredEquipment.length >= 2, 'Should list required equipment');
    assert(dehydrationOpp.risks_en.length > 10, 'Should describe real-world risks');
  });

  // Test 4: Personalized Skill & Budget Matching Engine (Phase 3)
  await test('Phase 3 Matching: Aligns entrepreneur skills and budget to rank personal opportunities', async () => {
    const matched = await personalDecisionSupportService.matchPersonalOpportunities({
      villageCode: 551322,
      userSkills: ['Solar Dehydration', 'Vegetable Sorting'],
      maxBudget: 150000
    });

    assert(matched.length > 0, 'Should return matched opportunities');
    const topMatch = matched[0];
    assert(topMatch.personalMatchPercent >= 60, 'Top match should score high on aligned skills and budget');
    assert.strictEqual(typeof topMatch.isWithinBudget, 'boolean', 'isWithinBudget must be boolean');
  });

  // Test 5: Strict Multi-Tenant User Isolation for Saved Opportunities
  await test('User Isolation: User A cannot see User B saved opportunities', async () => {
    const opp = {
      id: 'opp_test_dairy_01',
      title_en: 'Farmstead Paneer Unit',
      title_mr: 'पनीर निर्मिती उद्योग',
      category: 'dairy_livestock',
      districtCode: 490,
      villageCode: 551322,
      viabilityScore: 82
    };

    await personalDecisionSupportService.saveOpportunity('user_farmer_ramesh', opp);
    const rameshSaved = await personalDecisionSupportService.getSavedOpportunities('user_farmer_ramesh');
    const sureshSaved = await personalDecisionSupportService.getSavedOpportunities('user_farmer_suresh');

    assert(rameshSaved.some((o) => o.id === opp.id), 'Ramesh should see his saved opportunity');
    assert.strictEqual(sureshSaved.length, 0, 'Suresh must not see Ramesh saved opportunity');
  });

  // Test 6: 7-Step Business Preparation Checklist & Progress Tracking
  await test('7-Step Checklist: Toggles steps and computes accurate completion percentage', async () => {
    const oppId = 'opp_test_dal_mill_02';
    const initialChecklist = await personalDecisionSupportService.getChecklistForOpportunity(
      'user_farmer_ramesh',
      oppId,
      'agro_processing'
    );

    assert.strictEqual(initialChecklist.totalSteps, 7, 'Checklist should contain 7 standard steps');
    assert.strictEqual(initialChecklist.progressPercent, 0, 'Initial progress should be 0%');

    // Toggle Step 1 (Udyam Registration)
    const toggleRes = await personalDecisionSupportService.toggleChecklistStep(
      'user_farmer_ramesh',
      oppId,
      'step_udyam_registration'
    );
    assert.strictEqual(toggleRes.isCompleted, true, 'Step 1 should now be completed');
    assert(toggleRes.progressPercent > 0, 'Progress percentage should increase');
  });

  // Test 7: Side-by-Side Opportunity Comparison
  await test('Opportunity Comparison: Compares 2 opportunities across budget, viability, and equipment', async () => {
    const res = await opportunityDiscoveryEngine.generateOpportunitiesForVillage(551322);
    const comp = personalDecisionSupportService.compareOpportunities(res.opportunities.slice(0, 2));

    assert(comp !== null, 'Comparison should not be null');
    assert.strictEqual(comp.comparisonCount, 2, 'Should compare exactly 2 items');
    assert(comp.opportunities[0].formattedBudget, 'Should have formatted budget');
  });

  console.log(`\nResults: ${passed} / ${total} tests passed.`);
  if (passed === total) {
    console.log('🎉 All Village Opportunity Detector Phase 2 & 3 tests passed successfully!\n');
  } else {
    process.exit(1);
  }
}

runTests();
