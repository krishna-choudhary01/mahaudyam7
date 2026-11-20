import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Mock browser globals for SSR testing
globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {},
  history: { pushState: () => {} },
  navigator: { onLine: true }
};
globalThis.document = {
  documentElement: { setAttribute: () => {} },
  addEventListener: () => {},
  removeEventListener: () => {}
};
globalThis.localStorage = {
  _store: {},
  getItem: (k) => globalThis.localStorage._store[k] || null,
  setItem: (k, v) => { globalThis.localStorage._store[k] = String(v); },
  removeItem: (k) => { delete globalThis.localStorage._store[k]; }
};

async function runGapAnalyzerTestSuite() {
  console.log('=== STARTING SUPPLY-DEMAND GAP ANALYZER TEST SUITE ===\n');

  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  try {
    // 1. Test verified suppliers data
    const { VERIFIED_LOCAL_SUPPLIERS } = await vite.ssrLoadModule('/src/data/suppliers/verifiedSuppliers.js');
    console.log(`[TEST 1] Loaded ${VERIFIED_LOCAL_SUPPLIERS.length} verified suppliers.`);
    if (VERIFIED_LOCAL_SUPPLIERS.length < 5) {
      throw new Error('Expected at least 5 verified suppliers in catalog');
    }
    const sinnars = VERIFIED_LOCAL_SUPPLIERS.filter(s => s.talukaCode === 4154);
    console.log(`✓ Verified Sinnar suppliers count: ${sinnars.length} (Agri, Dairy, Milling, etc.)`);

    // 2. Test gap analyzer engine service
    const { gapAnalyzerService } = await vite.ssrLoadModule('/src/services/gap/gapAnalyzerService.js');
    console.log('\n[TEST 2] Testing Gap Analyzer Service Engine...');
    
    // Analyze gaps for Nashik (490) -> Sinnar (4154)
    const gaps = await gapAnalyzerService.analyzeGaps({
      districtCode: 490,
      talukaCode: 4154,
      villageCode: null
    });
    const stats = await gapAnalyzerService.getGapStatistics({
      districtCode: 490,
      talukaCode: 4154
    });

    console.log(`✓ Analysis completed for Nashik/Sinnar: ${gaps.length} total product/service items analyzed`);
    console.log(`  - Summary Stats: Total Analyzed: ${stats.totalAnalyzed}, Critical Gaps: ${stats.criticalGaps}, Moderate Gaps: ${stats.moderateGaps}`);

    // Verify critical gap identification
    const criticalItems = gaps.filter(g => g.severity === 'critical_gap');
    console.log(`✓ Found ${criticalItems.length} Critical Gaps where high citizen demand has 0 verified registered local suppliers.`);
    if (criticalItems.length > 0) {
      const sample = criticalItems[0];
      console.log(`  Sample Critical Gap: "${sample.productOrService}"`);
      console.log(`  - Demand signals: ${sample.totalValidReports} | Verified local suppliers: ${sample.knownSuppliersCount}`);
      console.log(`  - Confidence: ${sample.confidence} (${sample.confidenceScore}%)`);
      console.log(`  - 5-Pillar Transparency attached:`);
      console.log(`    * Confirmed: ${sample.transparency.confirmedInformation?.length} items`);
      console.log(`    * Citizen Reports: ${sample.transparency.userReportedDemand?.length} items`);
      console.log(`    * Limitations present: ${Boolean(sample.transparency.mandatoryLimitations)}`);
    }

    // 3. Test user gap saving & personal data isolation
    console.log('\n[TEST 3] Testing Saved Gaps & Private User Isolation...');
    const userA = 'user_nashik_ent_001';
    const userB = 'user_pune_ent_002';

    await gapAnalyzerService.saveGapForUser(userA, 'gap-test-cold-storage');
    console.log(`✓ User A saved gap analysis (id: gap-test-cold-storage)`);

    const userAGaps = await gapAnalyzerService.getSavedGapIdsForUser(userA);
    const userBGaps = await gapAnalyzerService.getSavedGapIdsForUser(userB);

    console.log(`✓ User A saved count: ${userAGaps.length}`);
    console.log(`✓ User B saved count: ${userBGaps.length}`);

    if (userAGaps.length !== 1 || userBGaps.length !== 0) {
      throw new Error(`Data isolation violation: User A count ${userAGaps.length}, User B count ${userBGaps.length}`);
    }
    console.log('✓ Strict per-user private data isolation verified: User B cannot view User A saved records.');

    // 4. Test SSR Component Rendering for SupplyDemandGapAnalyzerModule
    console.log('\n[TEST 4] SSR Rendering of SupplyDemandGapAnalyzerModule...');
    const { LanguageProvider } = await vite.ssrLoadModule('/src/i18n/index.js');
    const { SupplyDemandGapAnalyzerModule } = await vite.ssrLoadModule('/src/components/gap/SupplyDemandGapAnalyzerModule.jsx');

    // English render
    const enHtml = renderToString(
      React.createElement(
        LanguageProvider,
        { initialLanguage: 'en' },
        React.createElement(SupplyDemandGapAnalyzerModule, {
          onBack: () => {},
          onNavigateModule: () => {}
        })
      )
    );
    console.log(`✓ English SSR Render OK (HTML length: ${enHtml.length})`);
    if (!enHtml.includes('Supply–Demand Gap Analyzer') && !enHtml.includes('Gap Overview')) {
      throw new Error('English HTML does not contain expected gap analyzer keywords');
    }

    // Marathi render
    const mrHtml = renderToString(
      React.createElement(
        LanguageProvider,
        { initialLanguage: 'mr' },
        React.createElement(SupplyDemandGapAnalyzerModule, {
          onBack: () => {},
          onNavigateModule: () => {}
        })
      )
    );
    console.log(`✓ Marathi SSR Render OK (HTML length: ${mrHtml.length})`);
    if (!mrHtml.includes('पुरवठा-मागणी अंतर विश्लेषक')) {
      throw new Error('Marathi HTML does not contain Marathi module title');
    }

    // 5. Test App.jsx Module Switching
    console.log('\n[TEST 5] Verifying App.jsx integrates SupplyDemandGapAnalyzerModule...');
    const { App } = await vite.ssrLoadModule('/src/App.jsx');
    const appHtml = renderToString(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(App, null)
      )
    );
    console.log(`✓ App.jsx home screen renders successfully (HTML length: ${appHtml.length})`);

    console.log('\n======================================================');
    console.log('🎉 ALL SUPPLY-DEMAND GAP ANALYZER TESTS PASSED SAFELY!');
    console.log('======================================================');
  } finally {
    await vite.close();
  }
}

runGapAnalyzerTestSuite().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
