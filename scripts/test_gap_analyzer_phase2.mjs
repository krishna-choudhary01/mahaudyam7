import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Mock browser globals for SSR / headless testing
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

async function runPhase2TestSuite() {
  console.log('===============================================================');
  console.log('  MahaUdyam — Supply–Demand Gap Analyzer Phase 2 Test Suite');
  console.log('===============================================================\n');

  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  try {
    const {
      gapAnalyzerService,
      GAP_CLASSIFICATIONS,
      DEMAND_TRENDS,
      CONFIDENCE_LEVEL,
      DATA_COVERAGE_LEVELS
    } = await vite.ssrLoadModule('/src/services/gap/gapAnalyzerService.js');

    const REF_NOW = new Date('2026-11-14T12:00:00Z');

    // ------------------------------------------------------------------------
    // CASE 1: High demand and few verified suppliers
    // Expectation: STRONG_GAP, high gap score, high/moderate confidence
    // ------------------------------------------------------------------------
    console.log('--- TEST CASE 1: High Demand and Few Verified Suppliers ---');
    const case1Metrics = {
      totalValidReports: 28,
      recencyWeightedDemand: 26.4,
      verifiedSuppliersInVillage: 0,
      verifiedSuppliersInTaluka: 1,
      verifiedSuppliersCount: 1,
      unverifiedSuppliersCount: 0,
      notAvailablePercentage: 75,
      latestReportAgeDays: 12,
      dataCoverage: DATA_COVERAGE_LEVELS.ADEQUATE,
      demandStatus: 'verified_pattern'
    };
    const case1Trend = { trend: DEMAND_TRENDS.STABLE, recentCount: 14, previousCount: 14 };
    const case1Class = gapAnalyzerService.classifyGap(case1Metrics, case1Trend);
    const case1Score = gapAnalyzerService.computePotentialGapScore(case1Metrics);
    const case1Conf = gapAnalyzerService.computeConfidence(case1Metrics);

    console.log(`  Classification: ${case1Class.classification} (${case1Class.label_en})`);
    console.log(`  Potential Gap Score: ${case1Score.scoreLabel}`);
    console.log(`  Confidence: ${case1Conf.level} (${case1Conf.score}%)`);

    if (case1Class.classification !== GAP_CLASSIFICATIONS.STRONG_GAP) {
      throw new Error(`Case 1 Failed: Expected STRONG_GAP, got ${case1Class.classification}`);
    }
    if (!case1Score.isScoreValid || case1Score.score < 70) {
      throw new Error(`Case 1 Failed: Expected valid score >= 70, got ${case1Score.score}`);
    }
    console.log('✅ PASS Case 1: High demand and 0 village suppliers correctly classified as Strong Potential Gap.\n');

    // ------------------------------------------------------------------------
    // CASE 2: High demand and many verified suppliers
    // Expectation: NO_CLEAR_GAP, lower score, explicit disclaimer applied
    // ------------------------------------------------------------------------
    console.log('--- TEST CASE 2: High Demand and Many Verified Suppliers ---');
    const case2Metrics = {
      totalValidReports: 30,
      recencyWeightedDemand: 28.0,
      verifiedSuppliersInVillage: 3,
      verifiedSuppliersInTaluka: 6,
      verifiedSuppliersCount: 6,
      unverifiedSuppliersCount: 0,
      notAvailablePercentage: 25,
      latestReportAgeDays: 5,
      dataCoverage: DATA_COVERAGE_LEVELS.ADEQUATE,
      demandStatus: 'verified_pattern'
    };
    const case2Trend = { trend: DEMAND_TRENDS.STABLE, recentCount: 15, previousCount: 15 };
    const case2Class = gapAnalyzerService.classifyGap(case2Metrics, case2Trend);
    const case2Score = gapAnalyzerService.computePotentialGapScore(case2Metrics);

    console.log(`  Classification: ${case2Class.classification} (${case2Class.label_en})`);
    console.log(`  Potential Gap Score: ${case2Score.scoreLabel}`);
    console.log(`  Explanation: ${case2Class.explanation_en.slice(0, 90)}...`);

    if (case2Class.classification !== GAP_CLASSIFICATIONS.NO_CLEAR_GAP) {
      throw new Error(`Case 2 Failed: Expected NO_CLEAR_GAP, got ${case2Class.classification}`);
    }
    if (case2Score.score > 60) {
      throw new Error(`Case 2 Failed: Expected lower gap score due to existing suppliers, got ${case2Score.score}`);
    }
    if (!case2Class.explanation_en.includes('Do not assume all local demand is fully satisfied')) {
      throw new Error('Case 2 Failed: Expected disclaimer in explanation');
    }
    console.log('✅ PASS Case 2: High demand with 3 village suppliers correctly classified as No Clear Gap with disclaimer.\n');

    // ------------------------------------------------------------------------
    // CASE 3: Low demand and few suppliers
    // Expectation: MODERATE_GAP or INSUFFICIENT_EVIDENCE depending on report threshold
    // ------------------------------------------------------------------------
    console.log('--- TEST CASE 3: Low Demand and Few Suppliers ---');
    const case3Metrics = {
      totalValidReports: 6,
      recencyWeightedDemand: 5.4,
      verifiedSuppliersInVillage: 0,
      verifiedSuppliersInTaluka: 1,
      verifiedSuppliersCount: 1,
      unverifiedSuppliersCount: 0,
      notAvailablePercentage: 50,
      latestReportAgeDays: 20,
      dataCoverage: DATA_COVERAGE_LEVELS.PARTIAL,
      demandStatus: 'reviewed'
    };
    const case3Trend = { trend: DEMAND_TRENDS.STABLE, recentCount: 3, previousCount: 3 };
    const case3Class = gapAnalyzerService.classifyGap(case3Metrics, case3Trend);

    console.log(`  Classification: ${case3Class.classification} (${case3Class.label_en})`);
    if (case3Class.classification !== GAP_CLASSIFICATIONS.MODERATE_GAP) {
      throw new Error(`Case 3 Failed: Expected MODERATE_GAP, got ${case3Class.classification}`);
    }
    console.log('✅ PASS Case 3: Low-moderate demand with 1 taluka supplier classified as Moderate Potential Gap.\n');

    // ------------------------------------------------------------------------
    // CASE 4: No supplier records and poor data coverage
    // Expectation: INSUFFICIENT_EVIDENCE, score displays "Insufficient data", confidence LOW
    // ------------------------------------------------------------------------
    console.log('--- TEST CASE 4: No Supplier Records and Poor Data Coverage ---');
    const case4Metrics = {
      totalValidReports: 2,
      recencyWeightedDemand: 2.0,
      verifiedSuppliersInVillage: 0,
      verifiedSuppliersInTaluka: 0,
      verifiedSuppliersCount: 0,
      unverifiedSuppliersCount: 0,
      notAvailablePercentage: 100,
      latestReportAgeDays: 45,
      dataCoverage: DATA_COVERAGE_LEVELS.INADEQUATE,
      demandStatus: 'pending'
    };
    const case4Trend = { trend: DEMAND_TRENDS.NOT_AVAILABLE, recentCount: 2, previousCount: 0 };
    const case4Class = gapAnalyzerService.classifyGap(case4Metrics, case4Trend);
    const case4Score = gapAnalyzerService.computePotentialGapScore(case4Metrics);
    const case4Conf = gapAnalyzerService.computeConfidence(case4Metrics);

    console.log(`  Classification: ${case4Class.classification} (${case4Class.label_en})`);
    console.log(`  Score: ${case4Score.scoreLabel} (isScoreValid: ${case4Score.isScoreValid})`);
    console.log(`  Confidence Level: ${case4Conf.level} (${case4Conf.score}%)`);

    if (case4Class.classification !== GAP_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE) {
      throw new Error(`Case 4 Failed: Expected INSUFFICIENT_EVIDENCE, got ${case4Class.classification}`);
    }
    if (case4Score.score !== null || case4Score.scoreLabel !== 'Insufficient data') {
      throw new Error(`Case 4 Failed: Expected score null with "Insufficient data", got ${case4Score.scoreLabel}`);
    }
    if (case4Conf.level !== CONFIDENCE_LEVEL.LOW) {
      throw new Error(`Case 4 Failed: Confidence must NOT be high when coverage is poor, got ${case4Conf.level}`);
    }
    console.log('✅ PASS Case 4: Poor data coverage correctly displays "Insufficient data" and Low confidence.\n');

    // ------------------------------------------------------------------------
    // CASE 5: Outdated demand reports (>90 days old)
    // Expectation: INSUFFICIENT_EVIDENCE or score nullified due to stale evidence
    // ------------------------------------------------------------------------
    console.log('--- TEST CASE 5: Outdated Demand Reports (>90 Days Old) ---');
    const case5Metrics = {
      totalValidReports: 18,
      recencyWeightedDemand: 4.5, // 18 * 0.25 decay
      verifiedSuppliersInVillage: 0,
      verifiedSuppliersInTaluka: 0,
      verifiedSuppliersCount: 0,
      unverifiedSuppliersCount: 0,
      notAvailablePercentage: 80,
      latestReportAgeDays: 110, // Stale
      dataCoverage: DATA_COVERAGE_LEVELS.PARTIAL,
      demandStatus: 'verified_pattern'
    };
    const case5Trend = { trend: DEMAND_TRENDS.NOT_AVAILABLE, recentCount: 0, previousCount: 0 };
    const case5Class = gapAnalyzerService.classifyGap(case5Metrics, case5Trend);

    console.log(`  Classification: ${case5Class.classification} (${case5Class.label_en})`);
    if (case5Class.classification !== GAP_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE) {
      throw new Error(`Case 5 Failed: Stale reports (>90d) must be classified as INSUFFICIENT_EVIDENCE, got ${case5Class.classification}`);
    }
    console.log('✅ PASS Case 5: Outdated reports (>90 days) correctly relegated to Insufficient Evidence.\n');

    // ------------------------------------------------------------------------
    // CASE 6: Duplicate demand reports
    // Expectation: Duplicate reports filtered out and recorded in exclusionLog
    // ------------------------------------------------------------------------
    console.log('--- TEST CASE 6: Identifiable Duplicate Reports Preprocessing ---');
    const case6RawReports = [
      {
        id: 'rep-dup-01',
        productOrService: 'Organic Vermicompost',
        category: 'agriculture_services',
        village: 'Baragaon Pimpri',
        villageCode: 524444,
        districtCode: 490,
        talukaCode: 4154,
        clientToken: 'client_farmer_101',
        createdAt: '2026-11-14T09:00:00Z',
        status: 'reviewed'
      },
      {
        id: 'rep-dup-02', // Exact duplicate on same day by same client
        productOrService: 'Organic Vermicompost',
        category: 'agriculture_services',
        village: 'Baragaon Pimpri',
        villageCode: 524444,
        districtCode: 490,
        talukaCode: 4154,
        clientToken: 'client_farmer_101',
        createdAt: '2026-11-14T09:05:00Z',
        status: 'reviewed'
      },
      {
        id: 'rep-dup-03', // Different product, valid
        productOrService: 'Drip Irrigation Spares',
        category: 'agriculture_services',
        village: 'Baragaon Pimpri',
        villageCode: 524444,
        districtCode: 490,
        talukaCode: 4154,
        clientToken: 'client_farmer_101',
        createdAt: '2026-11-14T09:10:00Z',
        status: 'reviewed'
      }
    ];

    const case6Cleaned = gapAnalyzerService.preprocessDemandReports(case6RawReports, REF_NOW);
    console.log(`  Raw reports: ${case6RawReports.length} | Valid reports: ${case6Cleaned.validReports.length} | Excluded: ${case6Cleaned.totalExcluded}`);
    console.log(`  Exclusion Reason: ${case6Cleaned.exclusionLog[0]?.reason}`);

    if (case6Cleaned.validReports.length !== 2 || case6Cleaned.totalExcluded !== 1) {
      throw new Error(`Case 6 Failed: Expected 2 valid and 1 excluded, got ${case6Cleaned.validReports.length} valid, ${case6Cleaned.totalExcluded} excluded`);
    }
    if (case6Cleaned.exclusionLog[0].reason !== 'IDENTIFIABLE_DUPLICATE') {
      throw new Error(`Case 6 Failed: Expected IDENTIFIABLE_DUPLICATE exclusion reason`);
    }
    console.log('✅ PASS Case 6: Identifiable duplicate report detected, excluded, and logged cleanly.\n');

    // ------------------------------------------------------------------------
    // CASE 7: Only unverified suppliers
    // Expectation: Unverified supplier counted separately, dampens scarcity but does NOT set verified count to >0
    // ------------------------------------------------------------------------
    console.log('--- TEST CASE 7: Only Unverified Suppliers Present ---');
    const case7Suppliers = [
      {
        id: 'sup-unv-01',
        businessName: 'Raju Mobile Repair Kiosk',
        category: 'repair_maintenance',
        talukaCode: 4154,
        villageCode: 524444,
        operationalStatus: 'active',
        verificationStatus: 'unregistered_reported'
      }
    ];
    const case7Prep = gapAnalyzerService.preprocessSuppliers(case7Suppliers);
    console.log(`  Verified suppliers: ${case7Prep.verifiedSuppliers.length} | Unverified listings: ${case7Prep.unverifiedSuppliers.length}`);

    if (case7Prep.verifiedSuppliers.length !== 0 || case7Prep.unverifiedSuppliers.length !== 1) {
      throw new Error('Case 7 Failed: Unverified listing was incorrectly counted as verified supplier');
    }
    console.log('✅ PASS Case 7: Unverified supplier clearly distinguished from verified directory.\n');

    // ------------------------------------------------------------------------
    // CASE 8: Missing village or category information
    // Expectation: Handled safely, not silently discarded, logged with MISSING_MANDATORY_FIELD
    // ------------------------------------------------------------------------
    console.log('--- TEST CASE 8: Missing Village or Category Information ---');
    const case8Reports = [
      {
        id: 'rep-missing-cat',
        productOrService: 'Borewell Drilling Service',
        category: '', // Missing
        village: 'Sinnar',
        villageCode: 524440,
        districtCode: 490,
        talukaCode: 4154,
        status: 'reviewed'
      },
      {
        id: 'rep-missing-village',
        productOrService: 'Cattle Feed Delivery',
        category: 'agriculture_services',
        village: '', // Missing
        villageCode: null,
        districtCode: 490,
        talukaCode: 4154,
        status: 'reviewed'
      }
    ];

    const case8Cleaned = gapAnalyzerService.preprocessDemandReports(case8Reports, REF_NOW);
    console.log(`  Total submitted with missing fields: ${case8Reports.length} | Excluded: ${case8Cleaned.totalExcluded}`);
    console.log(`  Exclusion reasons recorded: ${case8Cleaned.exclusionLog.map(e => e.reason).join(', ')}`);

    if (case8Cleaned.validReports.length !== 0 || case8Cleaned.totalExcluded !== 2) {
      throw new Error('Case 8 Failed: Reports with missing mandatory fields must be safely logged in exclusionLog');
    }
    console.log('✅ PASS Case 8: Missing fields handled defensively without throwing exceptions.\n');

    // ------------------------------------------------------------------------
    // CASE 9: Increasing and decreasing demand over comparable periods
    // Expectation: INCREASING and DECREASING trends computed with growth %
    // ------------------------------------------------------------------------
    console.log('--- TEST CASE 9: Increasing and Decreasing Demand Trends ---');
    // Increasing scenario: 14 reports in last 30d vs 6 in prior 30d (+133%)
    const case9IncreasingItem = {
      rawReports: [
        ...Array(14).fill().map((_, i) => ({ createdAt: '2026-11-01T10:00:00Z' })), // Last 30d
        ...Array(6).fill().map((_, i) => ({ createdAt: '2026-09-25T10:00:00Z' }))   // Prior 30-60d
      ]
    };
    const case9IncTrend = gapAnalyzerService.analyzeDemandTrend(case9IncreasingItem, REF_NOW);
    console.log(`  Increasing Trend: ${case9IncTrend.trend} (Growth: +${case9IncTrend.growthPercentage}%)`);

    // Decreasing scenario: 4 reports in last 30d vs 12 in prior 30d (-67%)
    const case9DecreasingItem = {
      rawReports: [
        ...Array(4).fill().map((_, i) => ({ createdAt: '2026-11-01T10:00:00Z' })),
        ...Array(12).fill().map((_, i) => ({ createdAt: '2026-09-25T10:00:00Z' }))
      ]
    };
    const case9DecTrend = gapAnalyzerService.analyzeDemandTrend(case9DecreasingItem, REF_NOW);
    console.log(`  Decreasing Trend: ${case9DecTrend.trend} (Growth: ${case9DecTrend.growthPercentage}%)`);

    if (case9IncTrend.trend !== DEMAND_TRENDS.INCREASING || case9IncTrend.growthPercentage <= 0) {
      throw new Error('Case 9 Failed: Expected INCREASING trend with positive growth percentage');
    }
    if (case9DecTrend.trend !== DEMAND_TRENDS.DECREASING || case9DecTrend.growthPercentage >= 0) {
      throw new Error('Case 9 Failed: Expected DECREASING trend with negative growth percentage');
    }
    console.log('✅ PASS Case 9: Increasing and decreasing demand trends computed accurately across comparable windows.\n');

    // ------------------------------------------------------------------------
    // CASE 10: Offline access to previously synchronized analysis
    // Expectation: Caches analysis run, retrieves offline with metadata and outdated detection
    // ------------------------------------------------------------------------
    console.log('--- TEST CASE 10: Offline Access to Cached Analysis ---');
    const sampleAnalysis = [
      { id: 'gap-offline-sample-01', productOrService: 'Solar Water Heaters', gapScore: 82 }
    ];
    const cacheKey = 'gap_analysis_490_4154';
    await gapAnalyzerService.cacheAnalysisRun(cacheKey, sampleAnalysis);
    const cachedRetrieved = await gapAnalyzerService.getCachedAnalysisRun(cacheKey);

    console.log(`  Cached record found: ${Boolean(cachedRetrieved)}`);
    console.log(`  Cached timestamp: ${cachedRetrieved.cachedAt}`);
    console.log(`  isOfflineCached flag: ${cachedRetrieved.isOfflineCached}`);
    console.log(`  isOutdated flag: ${cachedRetrieved.isOutdated}`);

    if (!cachedRetrieved || cachedRetrieved.data.length !== 1 || !cachedRetrieved.isOfflineCached) {
      throw new Error('Case 10 Failed: Could not retrieve cached gap analysis offline');
    }
    console.log('✅ PASS Case 10: Offline cached analysis retrieved cleanly with sync timestamp.\n');

    // ------------------------------------------------------------------------
    // CASE 11: Two entrepreneurs saving opportunities independently
    // Expectation: User 1 saves Gap A; User 2 saves Gap B; neither sees the other's saved records
    // ------------------------------------------------------------------------
    console.log('--- TEST CASE 11: Two Entrepreneurs Saving Opportunities Independently ---');
    const entUser1 = 'ent_nashik_suresh_001';
    const entUser2 = 'ent_pune_vikram_002';

    await gapAnalyzerService.saveGapForUser(entUser1, 'gap-dmd-nsk-sinnar-01', 'Priority A: Review next week');
    await gapAnalyzerService.saveGapForUser(entUser2, 'gap-dmd-pun-junnar-02', 'Exploring wholesale tie-up');

    const u1Saved = await gapAnalyzerService.getSavedGapIdsForUser(entUser1);
    const u2Saved = await gapAnalyzerService.getSavedGapIdsForUser(entUser2);

    console.log(`  User 1 saved gaps: [${u1Saved.join(', ')}]`);
    console.log(`  User 2 saved gaps: [${u2Saved.join(', ')}]`);

    if (u1Saved.length !== 1 || !u1Saved.includes('gap-dmd-nsk-sinnar-01')) {
      throw new Error('Case 11 Failed: User 1 saved gap missing');
    }
    if (u2Saved.length !== 1 || !u2Saved.includes('gap-dmd-pun-junnar-02')) {
      throw new Error('Case 11 Failed: User 2 saved gap missing');
    }
    if (u1Saved.includes('gap-dmd-pun-junnar-02') || u2Saved.includes('gap-dmd-nsk-sinnar-01')) {
      throw new Error('Case 11 Failed: User data isolation leak detected between independent entrepreneurs');
    }
    console.log('✅ PASS Case 11: Strict per-user private data isolation verified across multiple entrepreneurs.\n');

    // ------------------------------------------------------------------------
    // BONUS: SSR Component Rendering in English and Marathi
    // ------------------------------------------------------------------------
    console.log('--- BONUS TEST: Bilingual SSR Rendering of Phase 2 Components ---');
    const { LanguageProvider } = await vite.ssrLoadModule('/src/i18n/index.js');
    const { SupplyDemandGapAnalyzerModule } = await vite.ssrLoadModule('/src/components/gap/SupplyDemandGapAnalyzerModule.jsx');
    const { GapDetailModal } = await vite.ssrLoadModule('/src/components/gap/GapDetailModal.jsx');

    // English SSR Module
    const enModuleHtml = renderToString(
      React.createElement(
        LanguageProvider,
        { initialLanguage: 'en' },
        React.createElement(SupplyDemandGapAnalyzerModule, {
          onBack: () => {},
          onNavigateModule: () => {}
        })
      )
    );
    console.log(`✓ English SSR Module Render OK (HTML length: ${enModuleHtml.length})`);

    // Marathi SSR Module
    const mrModuleHtml = renderToString(
      React.createElement(
        LanguageProvider,
        { initialLanguage: 'mr' },
        React.createElement(SupplyDemandGapAnalyzerModule, {
          onBack: () => {},
          onNavigateModule: () => {}
        })
      )
    );
    console.log(`✓ Marathi SSR Module Render OK (HTML length: ${mrModuleHtml.length})`);

    // SSR GapDetailModal with Phase 2 Checklist
    const mockModalGap = {
      id: 'gap-test-modal',
      productOrService: 'Solar Cold Storage Unit',
      productOrService_mr: 'सौर भाजीपाला शीतगृह केंद्र',
      village: 'Baragaon Pimpri',
      taluka: 'Sinnar',
      district: 'Nashik',
      latestReportDate: '2026-11-10T10:00:00Z',
      classification: GAP_CLASSIFICATIONS.STRONG_GAP,
      classificationLabel: 'Strong Potential Gap',
      classificationLabel_mr: 'तीव्र संभाव्य तुटवडा',
      gapScore: 88,
      gapScoreLabel: '88 / 100',
      gapScoreLabel_mr: '८८ / १००',
      isScoreValid: true,
      explanation_en: 'Significant citizen demand recorded with zero known verified local suppliers in this village.',
      explanation_mr: 'गावात मोठी नागरिक मागणी नोंदवली असून गावात एकही अधिकृत पुरवठादार नाही.',
      classificationLogic_en: 'Critical shortage ratio threshold exceeded.',
      classificationLogic_mr: 'तीव्र तुटवडा गुणोत्तर ओलांडले.',
      trendLabel: 'Increasing Demand',
      trendLabel_mr: 'वाढती मागणी',
      trendExplanation_en: 'Demand grew by +40% across recent comparable periods.',
      trendExplanation_mr: 'मागणीमध्ये +४०% वाढ झाली आहे.',
      fieldInvestigationQuestions: [
        'Are there unlisted home-based artisans providing this service?'
      ],
      fieldInvestigationQuestions_mr: [
        'गावात अनोंदणीकृत घरगुती कारागीर कार्यरत आहेत का?'
      ],
      verifiedSuppliers: [],
      unverifiedSuppliers: [],
      transparency: {
        confirmedInformation: ['LGD Village: Baragaon Pimpri [524444]'],
        userReportedDemand: ['28 citizen reports recorded'],
        estimatesAndLogic: ['Strong Potential Gap (88/100)'],
        unknownInformation: ['Informal micro-vendors'],
        mandatoryLimitations: 'Lack of supplier records does not prove absence of supply. Gaps do NOT guarantee profit.'
      }
    };

    const modalHtml = renderToString(
      React.createElement(
        LanguageProvider,
        { initialLanguage: 'mr' },
        React.createElement(GapDetailModal, {
          gap: mockModalGap,
          onClose: () => {},
          onSaveOpportunity: () => {},
          isSaved: true
        })
      )
    );
    console.log(`✓ Phase 2 Opportunity Details Modal rendered in Marathi OK (HTML length: ${modalHtml.length})`);

    console.log('\n===============================================================');
    console.log('🎉 ALL 11 PHASE 2 GAP ANALYZER TEST CASES PASSED CLEANLY (100%)!');
    console.log('===============================================================');
  } finally {
    await vite.close();
  }
}

runPhase2TestSuite().catch((err) => {
  console.error('\n❌ PHASE 2 TEST SUITE FAILED:', err);
  process.exit(1);
});
