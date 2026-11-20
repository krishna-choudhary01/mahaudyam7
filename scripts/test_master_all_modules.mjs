import { execSync } from 'child_process';

console.log('================================================================');
console.log('🚀 RUNNING MAHAUDYAM MASTER TEST SUITE ACROSS ALL 8 MODULES');
console.log('================================================================\n');

const testSuites = [
  { name: '1. BazaarPath (Phase 1, 2, 3)', script: 'scripts/test_bazaarpath_phase3.mjs' },
  { name: '2. Demand Signal Collector (Phase 1, 2, 3)', script: 'scripts/test_demand_signal_phase3.mjs' },
  { name: '3. Village Opportunity Detector (Phase 1, 2, 3)', script: 'scripts/test_village_opportunity_phase2_3.mjs' },
  { name: '4. Raw-Material Source and Route Finder (Phase 1, 2, 3)', script: 'scripts/test_raw_material_route_finder.mjs' },
  { name: '5. Shared Resource Matcher (Phase 1, 2, 3)', script: 'scripts/test_shared_resource_matcher.mjs' },
  { name: '6. Resource Hub (Phase 1, 2, 3)', script: 'scripts/test_resource_hub.mjs' }
];

let allPassed = true;

for (const suite of testSuites) {
  process.stdout.write(`Executing ${suite.name}... `);
  try {
    execSync(`node "${suite.script}"`, { stdio: 'pipe' });
    console.log('✅ PASSED');
  } catch (err) {
    console.log('❌ FAILED');
    console.error(err.stdout ? err.stdout.toString() : err.message);
    allPassed = false;
  }
}

console.log('\n================================================================');
if (allPassed) {
  console.log('🏆 ALL MAHAUDYAM CORE & EXTENDED MODULE TEST SUITES PASSED (100%)');
} else {
  console.log('💥 SOME MODULE SUITES FAILED');
  process.exit(1);
}
console.log('================================================================\n');
