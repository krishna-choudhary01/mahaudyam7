import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';
import assert from 'assert';

// Mock browser environment for SSR testing
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
globalThis.sessionStorage = {
  _store: {},
  getItem: (k) => globalThis.sessionStorage._store[k] || null,
  setItem: (k, v) => { globalThis.sessionStorage._store[k] = String(v); },
  removeItem: (k) => { delete globalThis.sessionStorage._store[k]; },
  clear: () => { globalThis.sessionStorage._store = {}; }
};
globalThis.window.localStorage = globalThis.localStorage;
globalThis.window.sessionStorage = globalThis.sessionStorage;

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}\n   Error: ${err.message}`);
    failed++;
  }
}

async function runTestSuite() {
  console.log('===============================================================');
  console.log('  MahaUdyam - Demand Signal Collector Test Suite');
  console.log('===============================================================\n');

  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  try {
    const { demandSignalService } = await vite.ssrLoadModule('/src/services/demand/demandSignalService.js');
    const {
      INITIAL_DEMAND_SIGNALS,
      DEMAND_CATEGORIES,
      AVAILABILITY_OPTIONS,
      FREQUENCY_OPTIONS,
      MODERATION_STATUSES
    } = await vite.ssrLoadModule('/src/data/demand/initialDemandSignals.js');
    const { en } = await vite.ssrLoadModule('/src/i18n/translations/en.js');
    const { mr } = await vite.ssrLoadModule('/src/i18n/translations/mr.js');
    const { LanguageProvider } = await vite.ssrLoadModule('/src/i18n/index.js');
    const { CustomerDemandForm } = await vite.ssrLoadModule('/src/components/demand/CustomerDemandForm.jsx');
    const { EntrepreneurDemandExplorer } = await vite.ssrLoadModule('/src/components/demand/EntrepreneurDemandExplorer.jsx');
    const { DemandModerationSection } = await vite.ssrLoadModule('/src/components/demand/DemandModerationSection.jsx');
    const { DemandSignalCollectorModule } = await vite.ssrLoadModule('/src/components/demand/DemandSignalCollectorModule.jsx');

    // --- TEST GROUP 1: SEED DATA & CATEGORIES ---
    console.log('--- TEST GROUP 1: Seed Data, Categories & Options ---');
    await demandSignalService.init();

    test('Expected 10 standard categories defined', () => {
      assert.strictEqual(DEMAND_CATEGORIES.length, 10);
    });

    test('Expected 4 availability options defined', () => {
      assert.strictEqual(AVAILABILITY_OPTIONS.length, 4);
    });

    test('Expected 4 frequency options defined', () => {
      assert.strictEqual(FREQUENCY_OPTIONS.length, 4);
    });

    test('Initial seed contains at least 8 realistic community signals', () => {
      assert(INITIAL_DEMAND_SIGNALS.length >= 8);
    });

    test('Sample signal contains valid availability and frequency breakdowns', () => {
      const sample = INITIAL_DEMAND_SIGNALS[0];
      assert(sample.productOrService && sample.district && sample.taluka);
      assert(typeof sample.breakdown.not_available === 'number');
      assert(typeof sample.frequencyCounts.weekly === 'number');
    });

    // --- TEST GROUP 2: CUSTOMER DEMAND SUBMISSION & VALIDATION ---
    console.log('\n--- TEST GROUP 2: Customer Demand Submission & Validation ---');

    await (async () => {
      try {
        await demandSignalService.submitCustomerReport({ productOrService: '' });
        test('Rejects empty product/service', () => assert.fail('Should have thrown'));
      } catch (err) {
        test('Rejects empty product/service', () => assert(err.message.includes('product or service')));
      }
    })();

    await (async () => {
      try {
        await demandSignalService.submitCustomerReport({
          productOrService: 'Organic Fertilizer',
          category: '',
          district: 'Nashik',
          districtCode: 490,
          taluka: 'Sinnar',
          talukaCode: 4154,
          village: 'Sinnar Town',
          villageCode: 524444,
          availability: 'not_available',
          frequency: 'weekly'
        });
        test('Rejects missing category', () => assert.fail('Should have thrown'));
      } catch (err) {
        test('Rejects missing category', () => assert(err.message.includes('category')));
      }
    })();

    const submissionPayload = {
      productOrService: 'Cold Storage for Grapes',
      productOrService_mr: 'द्राक्ष शीतगृह सुविधा',
      category: 'agriculture_services',
      district: 'Nashik',
      districtCode: 490,
      taluka: 'Dindori',
      talukaCode: 4342,
      village: 'Vani',
      villageCode: 524510,
      availability: 'not_available',
      frequency: 'daily',
      additionalNotes: 'Need 5-ton cooling unit during harvest.'
    };

    let submitResult;
    await (async () => {
      submitResult = await demandSignalService.submitCustomerReport(submissionPayload, true);
      test('Customer submission succeeded anonymously without login', () => {
        assert.strictEqual(submitResult.success, true);
        assert.strictEqual(submitResult.syncStatus, 'synced');
        assert(submitResult.reportId.startsWith('rep_'));
      });
    })();

    await (async () => {
      try {
        await demandSignalService.submitCustomerReport(submissionPayload, true);
        test('Duplicate immediate submission is blocked', () => assert.fail('Should have thrown duplicate'));
      } catch (err) {
        test('Duplicate immediate submission is blocked', () => {
          assert(err.message.includes('already submitted'));
        });
      }
    })();

    // --- TEST GROUP 3: DEMAND AGGREGATION & STATISTICS ---
    console.log('\n--- TEST GROUP 3: Demand Aggregation & Statistics ---');

    let allSignals;
    await (async () => {
      allSignals = await demandSignalService.getAggregatedDemand();
      test('Aggregated demand signals returned records', () => {
        assert(allSignals.length > 0);
      });
    })();

    await (async () => {
      const nashikSignals = await demandSignalService.getAggregatedDemand({ districtCode: 490 });
      test('Filter by district Nashik returns matching records', () => {
        assert(nashikSignals.length > 0);
        assert(nashikSignals.every((s) => s.districtCode === 490));
      });
    })();

    await (async () => {
      const agSignals = await demandSignalService.getAggregatedDemand({ category: 'agriculture_services' });
      test('Filter by category returns matching records', () => {
        assert(agSignals.every((s) => s.category === 'agriculture_services'));
      });
    })();

    await (async () => {
      const stats = await demandSignalService.getDemandStatistics();
      test('Demand statistics computes accurate metrics', () => {
        assert(stats.totalReports > 0);
        assert(stats.uniqueNeeds > 0);
        assert(stats.verifiedPatterns > 0);
      });
    })();

    // --- TEST GROUP 3.5: PROXIMITY & RADIUS DISTANCE FILTERING ---
    console.log('\n--- TEST GROUP 3.5: Same Village & Proximity Radius Filtering ---');

    await (async () => {
      // 1. Same village only for Baragaon Pimpri (524444)
      const sameVillageSignals = await demandSignalService.getAggregatedDemand({
        scope: 'same_village',
        referenceVillageCode: 524444,
        referenceCoordinates: { lat: 19.8124, lng: 74.0541 }
      });

      test('Same village scope strictly returns only unmet demand for Baragaon Pimpri', () => {
        assert(sameVillageSignals.length >= 3);
        assert(sameVillageSignals.every((s) => Number(s.villageCode) === 524444));
        assert(sameVillageSignals.every((s) => s.isSameVillage === true));
        assert(sameVillageSignals.every((s) => s.distanceKm === 0));
      });

      // 2. Proximity radius 15 km around Baragaon Pimpri
      const radius15Signals = await demandSignalService.getAggregatedDemand({
        scope: 'radius',
        radiusKm: 15,
        referenceVillageCode: 524444,
        referenceCoordinates: { lat: 19.8124, lng: 74.0541 }
      });

      test('Radius 15 km returns same village plus nearby Sinnar Town & Wavi', () => {
        assert(radius15Signals.length >= 5);
        const villagesIncluded = radius15Signals.map((s) => s.village);
        assert(villagesIncluded.includes('Baragaon Pimpri'));
        assert(villagesIncluded.includes('Wavi'));
        assert(villagesIncluded.includes('Sinnar Town'));
        assert(!villagesIncluded.includes('Vani'));
        assert(radius15Signals.every((s) => s.distanceKm <= 15));
      });

      // 3. Proximity radius 50 km around Baragaon Pimpri expands to Sangamner and Kopargaon
      const radius50Signals = await demandSignalService.getAggregatedDemand({
        scope: 'radius',
        radiusKm: 50,
        referenceVillageCode: 524444,
        referenceCoordinates: { lat: 19.8124, lng: 74.0541 }
      });

      test('Radius 50 km expands to include Ashwi (~34km) and Pohegaon (~41km)', () => {
        const villagesIncluded = radius50Signals.map((s) => s.village);
        assert(villagesIncluded.includes('Ashwi'));
        assert(villagesIncluded.includes('Pohegaon'));
        assert(radius50Signals.every((s) => s.distanceKm <= 50));
      });
    })();

    // --- TEST GROUP 4: ENTREPRENEUR DISCOVERY & USER DATA ISOLATION ---
    console.log('\n--- TEST GROUP 4: Entrepreneur Discovery & Private Opportunity Saving ---');

    const testUserId1 = 'usr_ent_demo_01';
    const testUserId2 = 'usr_ent_demo_02';
    const targetDemandId = INITIAL_DEMAND_SIGNALS[0].id;

    await (async () => {
      await demandSignalService.saveOpportunityForUser(testUserId1, targetDemandId);
      const user1Saves = await demandSignalService.getSavedOpportunityIdsForUser(testUserId1);
      test('User 1 successfully saved demand opportunity', () => {
        assert(user1Saves.includes(targetDemandId));
      });

      const user2Saves = await demandSignalService.getSavedOpportunityIdsForUser(testUserId2);
      test('Strict User Isolation: User 2 cannot see User 1 private saved opportunity', () => {
        assert(!user2Saves.includes(targetDemandId));
      });

      await demandSignalService.removeSavedOpportunityForUser(testUserId1, targetDemandId);
      const user1SavesAfter = await demandSignalService.getSavedOpportunityIdsForUser(testUserId1);
      test('User 1 successfully unsaved opportunity', () => {
        assert(!user1SavesAfter.includes(targetDemandId));
      });
    })();

    test('Privacy Guard: Aggregated records contain zero individual phone numbers or personal names', () => {
      const first = allSignals[0];
      assert(!first.customerPhone && !first.customerName && !first.mobile);
    });

    // --- TEST GROUP 5: OFFLINE QUEUING & SYNC ---
    console.log('\n--- TEST GROUP 5: Offline Queuing & Synchronization ---');

    await (async () => {
      const offlinePayload = {
        productOrService: 'Ayurvedic Cattle Tonic',
        productOrService_mr: 'आयुर्वेदिक पशु टॉनिक',
        category: 'healthcare_pharmacy',
        district: 'Ahmednagar',
        districtCode: 469,
        taluka: 'Sangamner',
        talukaCode: 4147,
        village: 'Ashwi',
        villageCode: 523820,
        availability: 'difficult_access',
        frequency: 'monthly',
        additionalNotes: 'Cattle feed store lacks herbal supplements.'
      };

      const offlineResult = await demandSignalService.submitCustomerReport(offlinePayload, false);
      test('Offline customer report enqueued with waiting_to_sync status', () => {
        assert.strictEqual(offlineResult.success, true);
        assert.strictEqual(offlineResult.syncStatus, 'waiting_to_sync');
      });

      const syncResult = await demandSignalService.syncPendingReports();
      test('Sync processor executes cleanly', () => {
        assert(typeof syncResult.syncedCount === 'number');
      });
    })();

    // --- TEST GROUP 6: MODERATION & QUALITY CONTROL ---
    console.log('\n--- TEST GROUP 6: Moderation & Quality Control ---');

    await (async () => {
      const rawReports = await demandSignalService.getRawReports();
      test('Admin can retrieve raw reports list', () => {
        assert(Array.isArray(rawReports));
      });

      if (rawReports.length > 0) {
        const repToMod = rawReports[0];
        await demandSignalService.updateReportStatus(repToMod.id, MODERATION_STATUSES.REVIEWED, 'Verified by field moderator');
        const updatedRaw = await demandSignalService.getRawReports();
        const checked = updatedRaw.find((r) => r.id === repToMod.id);
        test('Report status updated to reviewed', () => {
          assert.strictEqual(checked?.status, MODERATION_STATUSES.REVIEWED);
        });
      }
    })();

    // --- TEST GROUP 7: BILINGUAL TRANSLATION DICTIONARIES ---
    console.log('\n--- TEST GROUP 7: Bilingual Translations (English & Marathi) ---');

    test('English and Marathi demand hero titles exist and match specification', () => {
      assert(en.demand && en.demand.hero && en.demand.hero.title);
      assert(mr.demand && mr.demand.hero && mr.demand.hero.title);
      assert.strictEqual(mr.demand.hero.title, 'तुमच्या गावाला कशाची गरज आहे ते सांगा');
    });

    test('English and Marathi statutory disclaimers exist', () => {
      assert(en.demand.entrepreneur.disclaimerTitle && en.demand.entrepreneur.disclaimerBody);
      assert(mr.demand.entrepreneur.disclaimerTitle && mr.demand.entrepreneur.disclaimerBody);
      assert(en.demand.moderation.notice && mr.demand.moderation.notice);
    });

    // --- TEST GROUP 8: SERVER-SIDE RENDERING (SSR) RESILIENCE ---
    console.log('\n--- TEST GROUP 8: Server-Side Rendering (SSR) Resilience ---');

    const renderWithLang = (component, lang = 'en') => {
      return renderToString(
        React.createElement(
          LanguageProvider,
          { initialLanguage: lang },
          component
        )
      );
    };

    test('CustomerDemandForm renders cleanly in English', () => {
      const formHtmlEn = renderWithLang(React.createElement(CustomerDemandForm, null), 'en');
      assert(formHtmlEn.includes('Tell Us What Your Village Needs'));
    });

    test('CustomerDemandForm renders cleanly in Marathi', () => {
      const formHtmlMr = renderWithLang(React.createElement(CustomerDemandForm, null), 'mr');
      assert(formHtmlMr.includes('तुमच्या गावाला कशाची गरज आहे ते सांगा'));
    });

    test('EntrepreneurDemandExplorer renders cleanly with aggregated cards', () => {
      const explorerHtml = renderWithLang(React.createElement(EntrepreneurDemandExplorer, null), 'en');
      assert(explorerHtml.includes('Village Customer Demand Explorer'));
      assert(explorerHtml.includes('Notice on Market Demand Data'));
    });

    test('DemandModerationSection renders cleanly with notice', () => {
      const moderationHtml = renderWithLang(React.createElement(DemandModerationSection, null), 'en');
      assert(moderationHtml.includes('Citizen Demand Moderation'));
    });

    test('DemandSignalCollectorModule renders cleanly with tab navigation', () => {
      const fullModuleHtml = renderWithLang(React.createElement(DemandSignalCollectorModule, null), 'en');
      assert(fullModuleHtml.includes('Demand Signal Collector'));
    });

    console.log('\n===============================================================');
    console.log(`  RESULTS: ${passed} / ${passed + failed} TESTS PASSED CLEANLY (${Math.round((passed / (passed + failed)) * 100)}%)!`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    await vite.close();
  }
}

runTestSuite().catch((err) => {
  console.error('Unhandled test suite error:', err);
  process.exit(1);
});
