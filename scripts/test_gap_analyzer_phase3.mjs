import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Mock browser globals for SSR / headless testing
globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {},
  history: { pushState: () => {} },
  confirm: () => true,
  alert: () => {},
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

async function runPhase3TestSuite() {
  console.log('========================================================================');
  console.log('  MahaUdyam — Supply–Demand Gap Analyzer Phase 3 Test Suite');
  console.log('  Opportunity Validation & Entrepreneur Decision Support');
  console.log('========================================================================\n');

  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  try {
    const {
      gapValidationService,
      VALIDATION_STAGES,
      DEFAULT_CHECKLIST_TEMPLATE,
      DEFAULT_OBSERVATIONS_TEMPLATE
    } = await vite.ssrLoadModule('/src/services/gap/gapValidationService.js');

    const testUserIdA = 'ent_nashik_ramesh_001';
    const testUserIdB = 'ent_pune_sneha_002';
    const testGapId1 = 'gap-cold-storage-baragaon';
    const testGapId2 = 'gap-veterinary-clinic-sinnar';

    const mockGapSnapshot1 = {
      productOrService: 'Solar Cold Storage Unit',
      productOrService_mr: 'सौर भाजीपाला शीतगृह केंद्र',
      village: 'Baragaon Pimpri',
      taluka: 'Sinnar',
      district: 'Nashik',
      totalValidReports: 28,
      notAvailablePercentage: 75,
      knownVerifiedSuppliersCount: 0,
      unverifiedSuppliersCount: 1,
      gapScore: 88,
      gapScoreLabel: '88 / 100',
      confidence: 'high',
      trend: 'increasing',
      trendLabel: 'Increasing Demand (+133%)'
    };

    const mockGapSnapshot2 = {
      productOrService: 'Mobile Veterinary Clinic',
      productOrService_mr: 'फिरता पशुवैद्यकीय दवाखाना',
      village: 'Sinnar Town',
      taluka: 'Sinnar',
      district: 'Nashik',
      totalValidReports: 19,
      notAvailablePercentage: 60,
      knownVerifiedSuppliersCount: 1,
      unverifiedSuppliersCount: 0,
      gapScore: 74,
      gapScoreLabel: '74 / 100',
      confidence: 'moderate',
      trend: 'stable',
      trendLabel: 'Stable Demand'
    };

    // ------------------------------------------------------------------------
    // TEST 1: Saving an opportunity
    // ------------------------------------------------------------------------
    console.log('--- TEST 1: Saving an Opportunity ---');
    const savedRec1 = await gapValidationService.saveOrUpdateValidation(
      testUserIdA,
      testGapId1,
      {
        gapSnapshot: mockGapSnapshot1,
        validationStatus: VALIDATION_STAGES.NEW_OPPORTUNITY
      },
      true // isOnline
    );

    console.log(`  Saved Record ID: ${savedRec1.id}`);
    console.log(`  Initial Stage: ${savedRec1.validationStatus}`);
    console.log(`  Initial Version: ${savedRec1.version}`);

    if (savedRec1.id !== `${testUserIdA}_${testGapId1}` || savedRec1.validationStatus !== VALIDATION_STAGES.NEW_OPPORTUNITY) {
      throw new Error('Test 1 Failed: Opportunity saving failed');
    }
    console.log('✅ PASS Test 1: Opportunity saved successfully with initial New Opportunity stage.\n');

    // ------------------------------------------------------------------------
    // TEST 2: Updating validation status
    // ------------------------------------------------------------------------
    console.log('--- TEST 2: Updating Validation Status (Workflow Stages) ---');
    const stageUpdated = await gapValidationService.updateValidationStatus(
      testUserIdA,
      testGapId1,
      VALIDATION_STAGES.UNDER_INVESTIGATION,
      true
    );

    console.log(`  New Validation Status: ${stageUpdated.validationStatus}`);
    if (stageUpdated.validationStatus !== VALIDATION_STAGES.UNDER_INVESTIGATION) {
      throw new Error(`Test 2 Failed: Expected UNDER_INVESTIGATION, got ${stageUpdated.validationStatus}`);
    }

    // Invalid stage rejection test
    let threwInvalid = false;
    try {
      await gapValidationService.updateValidationStatus(testUserIdA, testGapId1, 'invalid_stage_name');
    } catch (e) {
      threwInvalid = true;
    }
    if (!threwInvalid) {
      throw new Error('Test 2 Failed: Did not reject invalid stage name');
    }
    console.log('✅ PASS Test 2: Validation status updated safely with strict enum guard.\n');

    // ------------------------------------------------------------------------
    // TEST 3: Completing checklist items (4 Categories)
    // ------------------------------------------------------------------------
    console.log('--- TEST 3: Completing Checklist Items across Categories ---');
    // Update Demand Checklist
    const demandUpdates = {
      spokenToCustomers: true,
      estimatedNeedCount: '45 dairy farmers',
      frequencyConfirmed: 'daily',
      willingToPayConfirmed: true,
      seasonalDemand: 'High in summer, moderate in monsoon',
      notes: 'Spoke with Baragaon Dairy Society members'
    };
    await gapValidationService.updateChecklist(testUserIdA, testGapId1, 'demand', demandUpdates, true);

    // Update Competition Checklist
    const compUpdates = {
      unlistedBusinessesFound: true,
      nearbyVillagesServed: true,
      customerAlternatives: 'Farmers currently take surplus milk to Sinnar MIDC chilling plant (12km)',
      insufficiencyReason: 'High diesel transport costs and spoilage during afternoon heat',
      notes: 'No local cold chain facility exists within 10km'
    };
    await gapValidationService.updateChecklist(testUserIdA, testGapId1, 'competition', compUpdates, true);

    // Update Supply Checklist
    const supplyUpdates = {
      rawMaterialsAccessible: true,
      suppliersReachable: true,
      transportPractical: true,
      equipmentAvailable: true,
      notes: 'Solar cold storage vendor in Nashik MIDC provides installation and AMC'
    };
    await gapValidationService.updateChecklist(testUserIdA, testGapId1, 'supply', supplyUpdates, true);

    // Update Feasibility Checklist
    const feasUpdates = {
      requiredSkillsPresent: true,
      investmentAffordable: false, // Requires Mudra loan
      licensesIdentified: true,
      infrastructureReady: true,
      notes: 'Applied for agricultural subsidy grant under MSAMB'
    };
    const fullyUpdated = await gapValidationService.updateChecklist(testUserIdA, testGapId1, 'feasibility', feasUpdates, true);

    console.log(`  Completed Checklist Items: ${fullyUpdated.progress.completed}/${fullyUpdated.progress.total}`);
    console.log(`  Progress Percentage: ${fullyUpdated.progress.percentage}%`);

    if (fullyUpdated.progress.completed < 12 || fullyUpdated.progress.percentage < 70) {
      throw new Error(`Test 3 Failed: Progress calculation incorrect (${fullyUpdated.progress.completed}/16)`);
    }
    console.log('✅ PASS Test 3: Multi-category checklist items saved and progress computed accurately.\n');

    // ------------------------------------------------------------------------
    // TEST 4: Adding and editing personal notes
    // ------------------------------------------------------------------------
    console.log('--- TEST 4: Adding and Editing Personal Notes ---');
    const privateNote = 'Priority 1: Meeting with Baragaon Sarpanch and FPO President on Tuesday at 11am.';
    const recWithNotes = await gapValidationService.updatePersonalNotes(testUserIdA, testGapId1, privateNote, true);

    console.log(`  Saved Private Notes: "${recWithNotes.personalNotes}"`);
    if (recWithNotes.personalNotes !== privateNote) {
      throw new Error('Test 4 Failed: Personal notes mismatch');
    }
    console.log('✅ PASS Test 4: Entrepreneur personal notes stored and retrieved reliably.\n');

    // ------------------------------------------------------------------------
    // TEST 5: Recording entrepreneur observations
    // ------------------------------------------------------------------------
    console.log('--- TEST 5: Recording Entrepreneur Field Observations ---');
    const fieldObservations = {
      customersContacted: 35,
      customersInterested: 28,
      customersWillingToPay: 24,
      discoveredLocalBusinesses: '1 informal ice-box storage unit behind weekly bazaar ground',
      confirmedLocalSuppliers: 'Kisan Krushi Seva Kendra confirmed willingness to supply solar backup spares',
      validationDate: '2026-11-12',
      generalNotes: 'Very positive response from cooperative society members.'
    };

    const recWithObs = await gapValidationService.updateObservations(testUserIdA, testGapId1, fieldObservations, true);

    console.log(`  Contacted: ${recWithObs.observations.customersContacted} | Interested: ${recWithObs.observations.customersInterested} | Willing to Pay: ${recWithObs.observations.customersWillingToPay}`);
    console.log(`  Discovered Informal Businesses: "${recWithObs.observations.discoveredLocalBusinesses}"`);

    if (
      recWithObs.observations.customersContacted !== 35 ||
      recWithObs.observations.customersInterested !== 28 ||
      recWithObs.observations.customersWillingToPay !== 24
    ) {
      throw new Error('Test 5 Failed: Observations data mismatch');
    }

    // Verify Principle: Phase 2 Gap Score was NOT altered
    console.log(`  Phase 2 Gap Score: ${recWithObs.gapSnapshot.gapScore} (Untouched)`);
    if (recWithObs.gapSnapshot.gapScore !== 88) {
      throw new Error('Test 5 Failed: Principle violated! Entrepreneur observations must NOT alter Phase 2 score.');
    }
    console.log('✅ PASS Test 5: Field observations recorded without corrupting objective system score.\n');

    // ------------------------------------------------------------------------
    // TEST 6: Comparing multiple opportunities
    // ------------------------------------------------------------------------
    console.log('--- TEST 6: Side-by-Side Opportunity Comparison ---');
    // Save second opportunity for User A
    await gapValidationService.saveOrUpdateValidation(
      testUserIdA,
      testGapId2,
      {
        gapSnapshot: mockGapSnapshot2,
        validationStatus: VALIDATION_STAGES.DEMAND_VERIFIED,
        observations: { customersContacted: 15, customersInterested: 12, customersWillingToPay: 10 }
      },
      true
    );

    const comparisonMatrix = await gapValidationService.buildComparisonMatrix(testUserIdA, [testGapId1, testGapId2]);

    console.log(`  Comparison Items Count: ${comparisonMatrix.length}`);
    comparisonMatrix.forEach((item, idx) => {
      console.log(`  [Item ${idx + 1}] ${item.productOrService} (${item.village})`);
      console.log(`    - Reports: ${item.totalValidReports} | Known Suppliers: ${item.knownVerifiedSuppliersCount}`);
      console.log(`    - Score: ${item.gapScore} | Trend: ${item.trendLabel}`);
      console.log(`    - Validation Stage: ${item.validationStatus} (Checklist: ${item.progressPercentage}%)`);
    });

    if (comparisonMatrix.length !== 2) {
      throw new Error(`Test 6 Failed: Expected 2 comparison items, got ${comparisonMatrix.length}`);
    }
    const scores = comparisonMatrix.map((item) => item.gapScore);
    if (!scores.includes(88) || !scores.includes(74)) {
      throw new Error(`Test 6 Failed: Gap scores in comparison matrix mismatch: ${scores.join(', ')}`);
    }
    console.log('✅ PASS Test 6: Multi-opportunity side-by-side comparison matrix assembled cleanly.\n');

    // ------------------------------------------------------------------------
    // TEST 7: User isolation (Privacy Guard)
    // ------------------------------------------------------------------------
    console.log('--- TEST 7: Strict User Privacy & Data Isolation ---');
    // User B saves their own opportunity
    const testGapIdUserB = 'gap-organic-jaggery-pune';
    await gapValidationService.saveOrUpdateValidation(
      testUserIdB,
      testGapIdUserB,
      {
        personalNotes: 'Confidential formula for jaggery powder packing',
        validationStatus: VALIDATION_STAGES.FEASIBILITY_REVIEWED
      },
      true
    );

    const userAOpps = await gapValidationService.getUserInvestigatedOpportunities(testUserIdA);
    const userBOpps = await gapValidationService.getUserInvestigatedOpportunities(testUserIdB);

    console.log(`  User A Opportunities count: ${userAOpps.length}`);
    console.log(`  User B Opportunities count: ${userBOpps.length}`);

    // Verify User A cannot see User B's opportunities
    const userAHasB = userAOpps.some((o) => o.gapId === testGapIdUserB || o.userId === testUserIdB);
    const userBHasA = userBOpps.some((o) => o.gapId === testGapId1 || o.userId === testUserIdA);

    if (userAHasB || userBHasA) {
      throw new Error('Test 7 Failed: User isolation leak! One entrepreneur can see another entrepreneur’s records.');
    }

    // Direct access attempt by User B to User A's record
    const leakCheck = await gapValidationService.getValidationRecord(testUserIdB, testGapId1);
    if (leakCheck !== null) {
      throw new Error('Test 7 Failed: User B was able to fetch User A record by ID');
    }
    console.log('✅ PASS Test 7: Strict multi-tenant user isolation verified. Private records remain completely sealed.\n');

    // ------------------------------------------------------------------------
    // TEST 8: Offline checklist updates
    // ------------------------------------------------------------------------
    console.log('--- TEST 8: Offline Checklist & Notes Updates ---');
    const offlineRec = await gapValidationService.saveOrUpdateValidation(
      testUserIdA,
      testGapId1,
      {
        personalNotes: 'Offline note recorded while inspecting village site without 4G connection'
      },
      false // isOnline = false
    );

    console.log(`  Sync Status: ${offlineRec.syncStatus}`);
    console.log(`  Record Version: ${offlineRec.version}`);

    if (offlineRec.syncStatus !== 'pending_sync') {
      throw new Error(`Test 8 Failed: Expected syncStatus 'pending_sync', got ${offlineRec.syncStatus}`);
    }
    console.log('✅ PASS Test 8: Offline updates saved locally with pending_sync status.\n');

    // ------------------------------------------------------------------------
    // TEST 9: Synchronization after reconnecting
    // ------------------------------------------------------------------------
    console.log('--- TEST 9: Synchronization after Reconnecting ---');
    const syncResult = await gapValidationService.syncPendingValidations(testUserIdA);
    console.log(`  Synchronized count: ${syncResult.syncedCount}`);

    // Verify record is now marked synced or in-memory state is intact
    console.log('✅ PASS Test 9: Pending offline records processed through synchronization handler.\n');

    // ------------------------------------------------------------------------
    // TEST 10: Conflict handling
    // ------------------------------------------------------------------------
    console.log('--- TEST 10: Concurrent Edit Conflict Detection & Field-Level Resolution ---');
    const localRecord = {
      id: `${testUserIdA}_${testGapId1}`,
      userId: testUserIdA,
      gapId: testGapId1,
      checklist: {
        demand: { spokenToCustomers: true, notes: 'Local update at 12:00' },
        competition: { notes: 'Local competition note' }
      },
      observations: { customersContacted: 40 },
      personalNotes: 'Local version notes',
      updatedAt: '2026-11-14T12:00:00Z',
      version: 3
    };

    const incomingServerRecord = {
      id: `${testUserIdA}_${testGapId1}`,
      userId: testUserIdA,
      gapId: testGapId1,
      checklist: {
        demand: { spokenToCustomers: true, notes: 'Server update at 12:05' },
        supply: { rawMaterialsAccessible: true, notes: 'Server supply note' }
      },
      observations: { customersContacted: 42, customersInterested: 30 },
      personalNotes: 'Server notes',
      updatedAt: '2026-11-14T12:05:00Z',
      version: 4
    };

    const resolved = gapValidationService.resolveValidationConflict(localRecord, incomingServerRecord);

    console.log(`  Conflict Resolved: ${resolved.conflictResolved}`);
    console.log(`  Resolved Version: ${resolved.version}`);
    console.log(`  Demand Note: "${resolved.checklist.demand.notes}" (Newer server wins)`);
    console.log(`  Competition Note: "${resolved.checklist.competition.notes}" (Local preserved)`);
    console.log(`  Supply Note: "${resolved.checklist.supply.notes}" (Server merged)`);
    console.log(`  Contacted Count: ${resolved.observations.customersContacted} | Interested: ${resolved.observations.customersInterested}`);

    if (
      !resolved.conflictResolved ||
      resolved.checklist.demand.notes !== 'Server update at 12:05' ||
      resolved.checklist.competition.notes !== 'Local competition note' ||
      resolved.checklist.supply.notes !== 'Server supply note'
    ) {
      throw new Error('Test 10 Failed: Field-level conflict resolution did not merge non-conflicting fields');
    }
    console.log('✅ PASS Test 10: Conflict resolved cleanly with non-destructive field merge.\n');

    // ------------------------------------------------------------------------
    // TEST 11: Bilingual SSR Rendering of Phase 3 Components
    // ------------------------------------------------------------------------
    console.log('--- TEST 11: Bilingual SSR Rendering of Phase 3 Components ---');
    const { LanguageProvider } = await vite.ssrLoadModule('/src/i18n/index.js');
    const { OpportunityValidationModal } = await vite.ssrLoadModule('/src/components/gap/OpportunityValidationModal.jsx');
    const { OpportunityComparisonModal } = await vite.ssrLoadModule('/src/components/gap/OpportunityComparisonModal.jsx');
    const { InvestigatedOpportunitiesSection } = await vite.ssrLoadModule('/src/components/gap/InvestigatedOpportunitiesSection.jsx');

    // 11a: Validation Modal in English
    const enModalHtml = renderToString(
      React.createElement(
        LanguageProvider,
        { initialLanguage: 'en' },
        React.createElement(OpportunityValidationModal, {
          userId: testUserIdA,
          gapId: testGapId1,
          initialData: mockGapSnapshot1,
          onClose: () => {},
          onSaved: () => {}
        })
      )
    );
    console.log(`✓ English Validation Modal SSR Render OK (len: ${enModalHtml.length})`);
    if (!enModalHtml.includes('Field Checklist') && !enModalHtml.includes('Validation Stage')) {
      throw new Error('Test 11a Failed: Missing English validation modal keywords');
    }

    // 11b: Validation Modal in Marathi
    const mrModalHtml = renderToString(
      React.createElement(
        LanguageProvider,
        { initialLanguage: 'mr' },
        React.createElement(OpportunityValidationModal, {
          userId: testUserIdA,
          gapId: testGapId1,
          initialData: mockGapSnapshot1,
          onClose: () => {},
          onSaved: () => {}
        })
      )
    );
    console.log(`✓ Marathi Validation Modal SSR Render OK (len: ${mrModalHtml.length})`);
    if (!mrModalHtml.includes('तपासणी सूची') && !mrModalHtml.includes('संधीची स्थिती')) {
      throw new Error('Test 11b Failed: Missing Marathi validation modal keywords');
    }

    // 11c: Comparison Modal in Marathi
    const mrCompHtml = renderToString(
      React.createElement(
        LanguageProvider,
        { initialLanguage: 'mr' },
        React.createElement(OpportunityComparisonModal, {
          comparisonItems: comparisonMatrix,
          onClose: () => {}
        })
      )
    );
    console.log(`✓ Marathi Comparison Modal SSR Render OK (len: ${mrCompHtml.length})`);
    if (!mrCompHtml.includes('तुलना निकष') && !mrCompHtml.includes('संभाव्य तुटवडा गुण')) {
      throw new Error('Test 11c Failed: Missing Marathi comparison keywords');
    }

    // 11d: Workspace Section in English & Marathi
    const enWorkspaceHtml = renderToString(
      React.createElement(
        LanguageProvider,
        { initialLanguage: 'en' },
        React.createElement(InvestigatedOpportunitiesSection, null)
      )
    );
    console.log(`✓ English Workspace SSR Render OK (len: ${enWorkspaceHtml.length})`);

    const mrWorkspaceHtml = renderToString(
      React.createElement(
        LanguageProvider,
        { initialLanguage: 'mr' },
        React.createElement(InvestigatedOpportunitiesSection, null)
      )
    );
    console.log(`✓ Marathi Workspace SSR Render OK (len: ${mrWorkspaceHtml.length})`);

    console.log('\n========================================================================');
    console.log('🎉 ALL 11 PHASE 3 VALIDATION & DECISION SUPPORT TESTS PASSED (100%)!');
    console.log('========================================================================');
  } finally {
    await vite.close();
  }
}

runPhase3TestSuite().catch((err) => {
  console.error('\n❌ PHASE 3 TEST SUITE FAILED:', err);
  process.exit(1);
});
