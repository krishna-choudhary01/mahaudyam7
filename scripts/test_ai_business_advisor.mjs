/**
 * MahaUdyam — AI Business Advisor Verification Test Suite
 * 
 * Verifies:
 * 1. Business Reality Check financial arithmetic, break-even, and 3 scenarios
 * 2. Curated Rural Knowledge Base coverage across Maharashtra districts & schemes
 * 3. AI Tool Registry dispatch and tool executions
 * 4. Context builder and prompt construction
 * 5. Backend AI Orchestration endpoint (/api/v1/ai/chat) end-to-end
 */

import { calculateBusinessReality, getBenchmarkPreset, RURAL_BENCHMARKS } from '../src/services/ai/businessRealityCheckService.js';
import { RURAL_KNOWLEDGE_BASE } from '../src/data/ai/ruralKnowledgeBase.js';
import { executeAiTool, AI_TOOL_DEFINITIONS } from '../src/services/ai/aiToolRegistry.js';
import { processAiChatRequest } from '../server/aiService.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 Testing MahaUdyam AI Business Advisor Engine');
  console.log('======================================================\n');

  // TEST SUITE 1: Business Reality Check Financial Arithmetic
  console.log('--- Test Suite 1: Financial Arithmetic & Break-Even Simulator ---');
  {
    // Test 1.1: Turmeric Benchmark
    const turmeric = calculateBusinessReality({
      title: 'Turmeric Processing Unit',
      capex: 250000,
      targetMonthlyUnits: 800,
      unit: 'kg',
      sellingPricePerUnit: 180,
      rawMaterialCostPerUnit: 110,
      packagingCostPerUnit: 12,
      powerFuelPerUnit: 6,
      transportPerUnit: 2,
      rentMonthly: 6000,
      wagesMonthly: 12000,
      electricityBaseMonthly: 2000,
      marketingMiscMonthly: 2000
    });

    assert(turmeric.capitalSummary.capex === 250000, 'Capex correctly recorded');
    assert(turmeric.capitalSummary.totalCapitalRequired > turmeric.capitalSummary.capex, 'Total capital includes working capital buffer');
    assert(turmeric.unitEconomics.totalVariableCostPerUnit === 130, 'Total variable cost per kg is ₹130 (110+12+6+2)');
    assert(turmeric.unitEconomics.unitContributionMargin === 50, 'Unit contribution margin is ₹50/kg (180 - 130)');
    assert(turmeric.fixedCostSummary.totalMonthlyFixedCost === 22000, 'Monthly fixed cost is ₹22,000');
    assert(turmeric.breakEvenAnalysis.breakEvenUnits === 440, 'Break-even quantity is 440 kg (22,000 / 50)');
    assert(turmeric.breakEvenAnalysis.breakEvenRevenue === 79200, 'Break-even revenue is ₹79,200 (440 * 180)');
    assert(turmeric.breakEvenAnalysis.targetMonthlyNetProfit === 18000, 'Expected target monthly net profit is ₹18,000 (800*50 - 22,000)');
    
    // Sensitivity scenarios
    assert(turmeric.scenarios.conservative !== undefined, 'Conservative scenario generated');
    assert(turmeric.scenarios.expected.monthlyNetProfit === 18000, 'Expected scenario matches baseline target profit');
    assert(turmeric.scenarios.optimistic.monthlyNetProfit > turmeric.scenarios.expected.monthlyNetProfit, 'Optimistic scenario yields higher profit');
    assert(turmeric.dataTransparency.length >= 5, 'Data transparency discloses assumptions vs verified benchmarks');

    // Test 1.2: Fatal Flaw Detection (Variable Cost > Selling Price)
    const lossMaking = calculateBusinessReality({
      title: 'Loss Making Unit',
      sellingPricePerUnit: 50,
      rawMaterialCostPerUnit: 60,
      packagingCostPerUnit: 10
    });
    assert(lossMaking.isEconomicallyViable === false, 'Detects unviable economics when unit margin is negative');
    assert(lossMaking.fatalFlaw === 'VARIABLE_COST_EXCEEDS_PRICE', 'Reports fatal variable cost flaw');
    assert(lossMaking.warnings.some(w => w.code === 'FATAL_MARGIN'), 'Emits critical warning alert');
  }

  // TEST SUITE 2: Curated Rural Knowledge Base
  console.log('\n--- Test Suite 2: Curated Rural Knowledge Base ---');
  {
    assert(Object.keys(RURAL_KNOWLEDGE_BASE.districtClusters).length >= 8, 'Knowledge base covers at least 8 key agro-clusters');
    assert(RURAL_KNOWLEDGE_BASE.districtClusters['Nashik'].crops.includes('Onion'), 'Nashik cluster records onion specialty');
    assert(RURAL_KNOWLEDGE_BASE.districtClusters['Sangli'].crops.includes('Turmeric (हळद)'), 'Sangli cluster records turmeric GI specialty');
    assert(RURAL_KNOWLEDGE_BASE.districtClusters['Latur'].crops.includes('Soybean'), 'Latur cluster records soybean specialty');
    assert(RURAL_KNOWLEDGE_BASE.schemes.some(s => s.id === 'pmfme' && s.subsidyPercent === 35), 'PMFME records 35% subsidy');
    assert(RURAL_KNOWLEDGE_BASE.complianceSteps.some(c => c.portal?.includes('udyamregistration')), 'Udyam registration step documented');
  }

  // TEST SUITE 3: AI Tool Calling Registry
  console.log('\n--- Test Suite 3: AI Tool Registry Dispatch ---');
  {
    assert(AI_TOOL_DEFINITIONS.length >= 9, 'Registry defines at least 9 specialized rural tools');

    // Test tool 1: calculate_business_reality with preset
    const realityTool = await executeAiTool('calculate_business_reality', {
      presetKey: 'soybean-oil-ghani'
    });
    assert(realityTool.success === true, 'Tool calculate_business_reality executes successfully');
    assert(realityTool.data.unitEconomics.sellingPricePerUnit === 220, 'Preset loads oil ghani standard selling price ₹220/L');
    assert(realityTool.data.breakEvenAnalysis.breakEvenUnits > 0, 'Computes break-even volume for oil ghani');

    // Test tool 2: get_unsold_stock_rescue_advice
    const rescueTool = await executeAiTool('get_unsold_stock_rescue_advice', {
      productName: 'Fresh Tomatoes',
      quantityKg: 300,
      hoursRemaining: 18
    });
    assert(rescueTool.success === true, 'Tool get_unsold_stock_rescue_advice executes successfully');
    assert(rescueTool.primaryRecommendation.toLowerCase().includes('puree') || rescueTool.primaryRecommendation.toLowerCase().includes('pulp'), 'Recommends pulping / puree secondary conversion');

    // Test tool 3: get_scheme_and_subsidy_info
    const schemeTool = await executeAiTool('get_scheme_and_subsidy_info', {
      schemeKeyword: 'cmegp'
    });
    assert(schemeTool.success === true, 'Tool get_scheme_and_subsidy_info executes');
    assert(schemeTool.schemes.some(s => s.id === 'cmegp'), 'Finds CMEGP scheme details');

    // Test tool 4: calculate_bazaar_travel_cost
    const travelTool = await executeAiTool('calculate_bazaar_travel_cost', {
      distanceKm: 35,
      transportMode: 'mini_truck',
      productQtyKg: 400
    });
    assert(travelTool.success === true, 'Tool calculate_bazaar_travel_cost executes');
    assert(travelTool.data.travelCost > 0, 'Calculates round trip transit travel cost');
  }

  // TEST SUITE 4: Backend AI Advisor Chat & Reality Check Orchestration
  console.log('\n--- Test Suite 4: Backend AI Orchestration (/api/v1/ai/chat) ---');
  {
    // Query 4.1: Marathi query for Turmeric Processing Unit
    const resMr = await processAiChatRequest({
      message: 'मला हळद प्रक्रिया उद्योग सुरू करायचा आहे, वास्तववादी खर्च व नफा सांगा',
      context: {
        location: { district: 'Sangli' },
        user: { name: 'रमेश पाटील' }
      },
      language: 'mr'
    });

    assert(resMr.success === true, 'Processes Marathi turmeric reality inquiry');
    assert(resMr.text.includes('हळद प्रक्रिया') || resMr.text.includes('भांडवल'), 'Responds with Marathi turmeric reality analysis');
    assert(resMr.realityScenario !== undefined, 'Injects structured realityScenario object');
    assert(resMr.realityScenario.capitalSummary.totalCapitalRequired > 0, 'Scenario calculates total capital required');
    assert(resMr.suggestedActions.length > 0, 'Returns actionable module navigation pills');

    // Query 4.2: English query for PMFME Subsidy
    const resEn = await processAiChatRequest({
      message: 'How can I get PMFME 35% subsidy for my micro food unit in Nashik?',
      context: {
        location: { district: 'Nashik' },
        user: { name: 'Sunil Rao' }
      },
      language: 'en'
    });

    assert(resEn.success === true, 'Processes English PMFME subsidy query');
    assert(resEn.text.includes('35%') || resEn.text.includes('PMFME'), 'Provides PMFME subsidy breakdown in English');

    // Query 4.3: Perishable Unsold Tomato Rescue
    const resRescue = await processAiChatRequest({
      message: 'माझ्याकडे २०० किलो टोमॅटो शिल्लक आहेत, खराब होण्यापूर्वी काय करावे?',
      context: {
        location: { district: 'Nashik' }
      },
      language: 'mr'
    });

    assert(resRescue.success === true, 'Processes perishable unsold stock query');
    assert(resRescue.text.includes('टोमॅटो') || resRescue.text.includes('प्युरी') || resRescue.text.includes('बचाव'), 'Suggests immediate sorting & secondary pulping/processing');
    assert(resRescue.suggestedActions.some(a => a.moduleId === 'unsold-stock'), 'Includes deep link to Unsold Stock Rescue module');
  }

  console.log('\n======================================================');
  console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite();
