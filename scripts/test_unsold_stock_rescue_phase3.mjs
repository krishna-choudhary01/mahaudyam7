/**
 * MahaUdyam — Unsold Stock Rescue
 * Phase 3 Test Suite: Buyer Enquiry, Recovery Transactions & Outcome Intelligence
 * 
 * Verifies all 20 test specifications required by Phase 3 prompt:
 * 1. Creating an enquiry
 * 2. Offline enquiry creation (status pending_sync, NOT sent)
 * 3. Server-confirmed enquiry synchronization
 * 4. Missing verified buyer (clean notification, no fake buyer)
 * 5. Manually recorded unverified contact (clearly labeled unverified)
 * 6. Counteroffer handling (negotiation history update)
 * 7. Offer acceptance and rejection
 * 8. Partial recovery (quantity decrements, status -> partially_recovered)
 * 9. Complete recovery (remaining quantity = 0, status -> fully_recovered)
 * 10. Multiple transactions against one stock record
 * 11. Preventing recovery beyond available quantity (throws error)
 * 12. Correct expense and revenue calculations
 * 13. Unknown original inventory cost (no false zero assumption, labeled unrecorded)
 * 14. Food safety restrictions (expired/damaged food blocked from transaction & enquiry)
 * 15. Stock lifecycle updates with audit logging
 * 16. Multi-user data isolation (User A vs User B)
 * 17. Duplicate synchronization prevention (idempotency)
 * 18. Conflict resolution (newer server timestamp / version wins)
 * 19. English and Marathi translations
 * 20. Exclusion of demo transactions from real analytics
 */

import assert from 'assert';

import {
  STOCK_CATEGORIES,
  STOCK_STATUSES,
  PERISHABILITY_LEVELS,
  PRODUCT_CONDITIONS,
  RECOVERY_CHANNELS,
  ENQUIRY_STATUSES,
  DELIVERY_TERMS,
  TRANSACTION_COMPLETION_STATUSES,
  PAYMENT_STATUSES
} from '../src/data/stock/stockConstants.js';
import { INITIAL_UNSOLD_STOCKS } from '../src/data/stock/initialUnsoldStock.js';
import { unsoldStockService } from '../src/services/stock/unsoldStockService.js';
import { en } from '../src/i18n/translations/en.js';
import { mr } from '../src/i18n/translations/mr.js';

console.log('========================================================================');
console.log('  MahaUdyam — Unsold Stock Rescue (Phase 3 Test Suite)');
console.log('  Buyer Enquiry, Recovery Transactions & Outcome Intelligence');
console.log('========================================================================\n');

let passedTests = 0;
const totalTests = 20;

async function runTests() {
  await unsoldStockService.initStockDatabase();

  const userA = 'ent_nashik_ramesh_001';
  const userB = 'ent_pune_sneha_002';
  const tomatoStockId = 'stock_sinnar_tomatoes_01'; // 85 kg available initially
  const onionStockId = 'stock_wavi_onion_04'; // 15 quintal available initially
  const stolesStockId = 'stock_yeola_paithani_02'; // 24 pieces available initially
  const spoiledPalakId = 'stock_damaged_spinach_05'; // Damaged, unsafe

  // --------------------------------------------------------------------------
  // TEST 1: Creating an enquiry
  // --------------------------------------------------------------------------
  console.log('Test 1: Creating an enquiry with a verified buyer...');
  const enq1 = await unsoldStockService.createEnquiry(userA, {
    stockId: tomatoStockId,
    buyerId: 'sup-nsk-sinnar-01',
    recoveryChannel: 'food_processors',
    enquiryQuantity: 30,
    proposedPricePerUnit: 16,
    deliveryTerms: DELIVERY_TERMS.PICKUP,
    deliveryNotes: 'Crated in 2 plastic crates ready for early morning pickup.',
    isOffline: false
  });

  assert(enq1.id.startsWith('enq_'), 'Enquiry ID must be generated');
  assert.strictEqual(enq1.stockId, tomatoStockId);
  assert.strictEqual(enq1.userId, userA);
  assert.strictEqual(enq1.enquiryQuantity, 30);
  assert.strictEqual(enq1.status, ENQUIRY_STATUSES.SENT);
  assert.strictEqual(enq1.isVerifiedBuyer, true);
  assert.strictEqual(enq1.buyerType, 'verified_directory');
  console.log(`  ✓ Passed: Enquiry created (ID: ${enq1.id}, Status: ${enq1.status}, Verified: ${enq1.isVerifiedBuyer})\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 2: Offline enquiry creation (Must be pending_sync, NOT sent)
  // --------------------------------------------------------------------------
  console.log('Test 2: Offline enquiry creation (Must be pending_sync, NOT sent)...');
  const enqOffline = await unsoldStockService.createEnquiry(userA, {
    stockId: tomatoStockId,
    buyerId: 'sup-nsk-sinnar-01',
    recoveryChannel: 'weekly_markets',
    enquiryQuantity: 20,
    proposedPricePerUnit: 18,
    isOffline: true // Explicitly simulate offline mode
  });

  assert.strictEqual(enqOffline.status, ENQUIRY_STATUSES.PENDING_SYNC,
    'Offline enquiry status must be pending_sync, NEVER sent!');
  assert.strictEqual(enqOffline.syncStatus, 'pending_sync');
  console.log(`  ✓ Passed: Offline enquiry held in pending_sync status (${enqOffline.status})\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 3: Server-confirmed enquiry synchronization
  // --------------------------------------------------------------------------
  console.log('Test 3: Server-confirmed enquiry synchronization...');
  const syncResult = await unsoldStockService.syncPendingEnquiriesAndTransactions(userA);
  assert(syncResult.synchronizedCount >= 1, 'Must synchronize at least 1 pending enquiry');

  const enqSynced = await unsoldStockService.getEnquiryById(userA, enqOffline.id);
  assert.strictEqual(enqSynced.status, ENQUIRY_STATUSES.SENT, 'Status must transition to sent after sync');
  assert.strictEqual(enqSynced.syncStatus, 'synced');
  console.log(`  ✓ Passed: Enquiry synchronized to server (Status: ${enqSynced.status}, Sync: ${enqSynced.syncStatus})\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 4: Missing verified buyer (Clean transparency, no fake buyer)
  // --------------------------------------------------------------------------
  console.log('Test 4: Missing verified buyer transparency...');
  const remoteStock = {
    id: 'test_taluka_empty_stock_01',
    userId: userA,
    productName: 'Tribal Honey',
    category: STOCK_CATEGORIES.AGRICULTURAL_PRODUCE,
    availableQuantity: 10,
    unit: 'kg',
    condition: PRODUCT_CONDITIONS.GOOD,
    perishability: PERISHABILITY_LEVELS.NON_PERISHABLE,
    districtCode: 9999, // Unknown district with zero directory buyers
    talukaCode: 9999
  };
  unsoldStockService.memoryStore.set(remoteStock.id, remoteStock);

  const recs = await unsoldStockService.getRecommendationsForStock(userA, remoteStock.id);
  const bulkChannel = recs.channels.find((c) => c.id === 'bulk_buyers');
  assert.strictEqual(bulkChannel.matchedBuyers.length, 0, 'Must have zero matched buyers');
  assert(bulkChannel.buyerNotice_en.includes('No verified buyer currently available'),
    'Must display clear disclaimer rather than inventing fake buyers');
  console.log('  ✓ Passed: Missing verified buyer handled transparently without fake records\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 5: Manually recorded unverified contact
  // --------------------------------------------------------------------------
  console.log('Test 5: Manually recorded unverified contact (Clearly labeled unverified)...');
  const enqUnverified = await unsoldStockService.createEnquiry(userA, {
    stockId: remoteStock.id,
    buyerId: null, // No directory ID
    buyerName: 'Ganesh Local Dhaba & Hotel',
    recoveryChannel: 'alternative_markets',
    enquiryQuantity: 5,
    proposedPricePerUnit: 250,
    isManualRecording: true
  });

  assert.strictEqual(enqUnverified.isVerifiedBuyer, false, 'Must NOT be labeled verified');
  assert.strictEqual(enqUnverified.buyerType, 'unverified_external');
  assert.strictEqual(enqUnverified.buyerName, 'Ganesh Local Dhaba & Hotel');
  console.log(`  ✓ Passed: Unverified contact recorded (Verified: ${enqUnverified.isVerifiedBuyer}, Type: ${enqUnverified.buyerType})\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 6: Counteroffer handling (Negotiation history update)
  // --------------------------------------------------------------------------
  console.log('Test 6: Counteroffer handling & negotiation history...');
  const enqWithCounter = await unsoldStockService.recordBuyerResponse(userA, enq1.id, {
    responseType: 'counteroffer',
    offeredPrice: 14.5,
    offeredQuantity: 30,
    conditions: 'Payment in cash on evening pickup',
    notes: 'Trader called and offered ₹14.50 instead of proposed ₹16.00',
    recordedBy: 'manual_entrepreneur'
  });

  assert.strictEqual(enqWithCounter.status, ENQUIRY_STATUSES.COUNTEROFFER_RECEIVED);
  assert.strictEqual(enqWithCounter.negotiationHistory.length, 1);
  assert.strictEqual(enqWithCounter.negotiationHistory[0].offeredPrice, 14.5);
  assert.strictEqual(enqWithCounter.negotiationHistory[0].recordedBy, 'manual_entrepreneur');
  console.log(`  ✓ Passed: Counteroffer logged (Status: ${enqWithCounter.status}, Offer: ₹${enqWithCounter.negotiationHistory[0].offeredPrice})\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 7: Offer acceptance and rejection
  // --------------------------------------------------------------------------
  console.log('Test 7: Offer acceptance and rejection...');
  // 7a: Accept the counteroffer
  const enqAccepted = await unsoldStockService.recordBuyerResponse(userA, enq1.id, {
    responseType: 'acceptance',
    offeredPrice: 14.5,
    offeredQuantity: 30,
    notes: 'Entrepreneur agreed to ₹14.50/kg'
  });
  assert.strictEqual(enqAccepted.status, ENQUIRY_STATUSES.ACCEPTED);

  // 7b: Create another enquiry and reject it
  const enqToReject = await unsoldStockService.createEnquiry(userA, {
    stockId: tomatoStockId,
    buyerId: 'sup-nsk-sinnar-01',
    recoveryChannel: 'weekly_markets',
    enquiryQuantity: 10,
    proposedPricePerUnit: 20
  });
  const enqRejected = await unsoldStockService.recordBuyerResponse(userA, enqToReject.id, {
    responseType: 'rejection',
    notes: 'Trader has sufficient stock and declined lot'
  });
  assert.strictEqual(enqRejected.status, ENQUIRY_STATUSES.REJECTED);
  console.log('  ✓ Passed: Offer acceptance and rejection states recorded accurately\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 8: Partial recovery transaction
  // --------------------------------------------------------------------------
  console.log('Test 8: Partial recovery transaction (85 kg available -> 30 kg recovered)...');
  const initialTomatoStock = await unsoldStockService.getStockById(userA, tomatoStockId);
  const startAvailQty = Number(initialTomatoStock.availableQuantity); // 85 kg

  const partialTx = await unsoldStockService.createRecoveryTransaction(userA, {
    stockId: tomatoStockId,
    enquiryId: enqAccepted.id,
    buyerName: enqAccepted.buyerName,
    buyerId: enqAccepted.buyerId,
    recoveryChannel: 'food_processors',
    agreedQuantity: 30,
    agreedPricePerUnit: 14.5,
    expenses: {
      transportation: 50,
      packaging: 20,
      handling: 25
    },
    paymentStatus: PAYMENT_STATUSES.PAID
  });

  assert(partialTx.transaction.id.startsWith('tx_'));
  assert.strictEqual(partialTx.transaction.agreedQuantity, 30);
  assert.strictEqual(partialTx.updatedStock.availableQuantity, startAvailQty - 30); // 55 kg
  assert.strictEqual(partialTx.updatedStock.status, STOCK_STATUSES.PARTIALLY_RECOVERED);
  console.log(`  ✓ Passed: Partial recovery processed. Available: ${partialTx.updatedStock.availableQuantity} kg, Status: ${partialTx.updatedStock.status}\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 9: Complete recovery transaction
  // --------------------------------------------------------------------------
  console.log('Test 9: Complete recovery transaction (Recover remaining 55 kg -> fully_recovered)...');
  const fullTx = await unsoldStockService.createRecoveryTransaction(userA, {
    stockId: tomatoStockId,
    buyerName: 'Sinnar APMC Retailers Union',
    recoveryChannel: 'weekly_markets',
    agreedQuantity: 55, // Exact remaining quantity
    agreedPricePerUnit: 15.0,
    expenses: {
      transportation: 80,
      handling: 30
    }
  });

  assert.strictEqual(fullTx.updatedStock.availableQuantity, 0);
  assert.strictEqual(fullTx.updatedStock.status, STOCK_STATUSES.FULLY_RECOVERED);
  console.log(`  ✓ Passed: Complete recovery processed. Remaining: ${fullTx.updatedStock.availableQuantity} kg, Status: ${fullTx.updatedStock.status}\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 10: Multiple transactions against one stock record
  // --------------------------------------------------------------------------
  console.log('Test 10: Multiple transactions against one stock record...');
  const tomatoTxList = await unsoldStockService.getTransactionsForStock(userA, tomatoStockId);
  assert.strictEqual(tomatoTxList.length, 2, 'Must have exactly 2 completed transactions for tomatoes');
  const totalRecovered = tomatoTxList.reduce((acc, t) => acc + t.agreedQuantity, 0);
  assert.strictEqual(totalRecovered, 85, 'Total quantity across multiple transactions must equal 85 kg');
  console.log(`  ✓ Passed: Multiple transactions (${tomatoTxList.length}) verified totaling ${totalRecovered} kg\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 11: Preventing recovery beyond available quantity
  // --------------------------------------------------------------------------
  console.log('Test 11: Preventing recovery beyond available quantity (Strict overage guard)...');
  // Stock is now at 0 kg. Attempting to recover 1 kg must throw an error!
  let overageBlocked = false;
  try {
    await unsoldStockService.createRecoveryTransaction(userA, {
      stockId: tomatoStockId,
      agreedQuantity: 1,
      agreedPricePerUnit: 15
    });
  } catch (err) {
    overageBlocked = true;
    assert(err.message.includes('Cannot recover more than available stock quantity'));
  }
  assert.strictEqual(overageBlocked, true, 'Must strictly block recovery beyond available quantity');

  // Also test with onion stock (15 quintal available, try to recover 20 quintals)
  let onionOverageBlocked = false;
  try {
    await unsoldStockService.createRecoveryTransaction(userA, {
      stockId: onionStockId,
      agreedQuantity: 20,
      agreedPricePerUnit: 1800
    });
  } catch (err) {
    onionOverageBlocked = true;
  }
  assert.strictEqual(onionOverageBlocked, true, 'Must block 20 quintals when only 15 available');
  console.log('  ✓ Passed: Overage protection strictly enforced against both zero and partial inventory\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 12: Correct expense and revenue calculations
  // --------------------------------------------------------------------------
  console.log('Test 12: Correct expense and revenue calculations...');
  const tx = partialTx.transaction;
  // 30 kg * 14.5 = 435 gross
  assert.strictEqual(tx.grossRecoveryRevenue, 435);
  // expenses: 50 + 20 + 25 = 95
  assert.strictEqual(tx.expenses.totalExpenses, 95);
  // net: 435 - 95 = 340
  assert.strictEqual(tx.netRecoveryValue, 340);

  // Original tomato cost: 1800 / 120 kg = ₹15/kg
  // Attributable cost for 30 kg = 30 * 15 = 450
  assert.strictEqual(tx.attributableInventoryCost, 450);
  // Net vs attributable = 340 - 450 = -110
  assert.strictEqual(tx.netVsAttributable, -110);
  console.log(`  ✓ Passed: Revenue (₹${tx.grossRecoveryRevenue}), Expenses (₹${tx.expenses.totalExpenses}), Net (₹${tx.netRecoveryValue}), Attributable Cost (₹${tx.attributableInventoryCost})\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 13: Unknown original inventory cost (No false zero assumption)
  // --------------------------------------------------------------------------
  console.log('Test 13: Handling unknown original purchase costs...');
  const unrecordedCostStock = {
    id: 'test_unrecorded_cost_stock_01',
    userId: userA,
    productName: 'Farmyard Lemons',
    category: STOCK_CATEGORIES.VEGETABLES_FRUITS,
    availableQuantity: 50,
    unit: 'kg',
    originalQuantity: 50,
    originalTotalCost: null, // UNRECORDED / HOME FARM
    condition: PRODUCT_CONDITIONS.GOOD,
    perishability: PERISHABILITY_LEVELS.SEMI_PERISHABLE
  };
  unsoldStockService.memoryStore.set(unrecordedCostStock.id, unrecordedCostStock);

  const txUnknown = await unsoldStockService.createRecoveryTransaction(userA, {
    stockId: unrecordedCostStock.id,
    agreedQuantity: 20,
    agreedPricePerUnit: 30,
    expenses: { transportation: 40 }
  });

  assert.strictEqual(txUnknown.transaction.isCostKnown, false);
  assert.strictEqual(txUnknown.transaction.attributableInventoryCost, null, 'Must NOT assume 0 cost');
  assert.strictEqual(txUnknown.transaction.netVsAttributable, null);
  assert.strictEqual(txUnknown.transaction.netRecoveryValue, 600 - 40); // 560
  console.log('  ✓ Passed: Unrecorded purchase cost labeled as unknown without assuming zero\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 14: Food safety restrictions (Expired/damaged food blocked)
  // --------------------------------------------------------------------------
  console.log('Test 14: Food safety restrictions (Expired/damaged food blocked from transaction & enquiry)...');
  // Attempt to create enquiry for damaged spinach:
  let enquirySafetyBlocked = false;
  try {
    await unsoldStockService.createEnquiry(userB, {
      stockId: spoiledPalakId,
      enquiryQuantity: 10,
      proposedPricePerUnit: 5
    });
  } catch (err) {
    enquirySafetyBlocked = true;
    assert(err.message.includes('Food Safety Guard'));
  }
  assert.strictEqual(enquirySafetyBlocked, true, 'Enquiry for damaged food must be blocked');

  // Attempt to create transaction for damaged spinach:
  let txSafetyBlocked = false;
  try {
    await unsoldStockService.createRecoveryTransaction(userB, {
      stockId: spoiledPalakId,
      agreedQuantity: 10,
      agreedPricePerUnit: 5
    });
  } catch (err) {
    txSafetyBlocked = true;
    assert(err.message.includes('Food Safety Guard'));
  }
  assert.strictEqual(txSafetyBlocked, true, 'Transaction for damaged food must be blocked');
  console.log('  ✓ Passed: Expired / damaged food strictly blocked from both enquiry and recovery transactions\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 15: Stock lifecycle updates with audit logging
  // --------------------------------------------------------------------------
  console.log('Test 15: Stock lifecycle updates with audit logging...');
  const freshTomatoRecord = await unsoldStockService.getStockById(userA, tomatoStockId);
  assert.strictEqual(freshTomatoRecord.status, STOCK_STATUSES.FULLY_RECOVERED);
  assert(freshTomatoRecord.statusHistory.length >= 3);
  const lastHistory = freshTomatoRecord.statusHistory.slice(-1)[0];
  assert(lastHistory.notes.includes('Recovery transaction completed'));
  console.log(`  ✓ Passed: Status history trail preserved with ${freshTomatoRecord.statusHistory.length} audit entries\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 16: Multi-user data isolation (User A vs User B)
  // --------------------------------------------------------------------------
  console.log('Test 16: Multi-user data isolation (User A vs User B)...');
  // User B cannot access User A's enquiries
  let crossEnquiryDenied = false;
  try {
    await unsoldStockService.getEnquiryById(userB, enq1.id);
  } catch (err) {
    crossEnquiryDenied = true;
  }
  assert.strictEqual(crossEnquiryDenied, true, 'User B must not read User A enquiry');

  // User B cannot access User A's transactions
  let crossTxDenied = false;
  try {
    await unsoldStockService.getTransactionById(userB, partialTx.transaction.id);
  } catch (err) {
    crossTxDenied = true;
  }
  assert.strictEqual(crossTxDenied, true, 'User B must not read User A transaction');

  // User B cannot record transactions against User A stock
  let crossTxCreateDenied = false;
  try {
    await unsoldStockService.createRecoveryTransaction(userB, {
      stockId: tomatoStockId,
      agreedQuantity: 10,
      agreedPricePerUnit: 10
    });
  } catch (err) {
    crossTxCreateDenied = true;
  }
  assert.strictEqual(crossTxCreateDenied, true, 'User B must not transact against User A stock');
  console.log('  ✓ Passed: Multi-tenant boundaries strictly enforced across enquiries and transactions\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 17: Duplicate synchronization prevention (Idempotency)
  // --------------------------------------------------------------------------
  console.log('Test 17: Duplicate synchronization prevention (Idempotency)...');
  const sync1 = await unsoldStockService.syncPendingEnquiriesAndTransactions(userA);
  const sync2 = await unsoldStockService.syncPendingEnquiriesAndTransactions(userA);
  assert.strictEqual(sync2.synchronizedCount, 0, 'Second sync must be idempotent with 0 duplicate operations');
  console.log('  ✓ Passed: Duplicate synchronization prevented; sync operations are fully idempotent\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 18: Conflict resolution (Newer server timestamp / version wins)
  // --------------------------------------------------------------------------
  console.log('Test 18: Conflict resolution...');
  const localTx = {
    id: 'tx_conflict_test_01',
    agreedQuantity: 10,
    agreedPricePerUnit: 15,
    version: 1,
    updatedAt: '2026-11-17T10:00:00.000Z'
  };

  const remoteTx = {
    id: 'tx_conflict_test_01',
    agreedQuantity: 10,
    agreedPricePerUnit: 16.5,
    version: 2,
    updatedAt: '2026-11-17T11:00:00.000Z'
  };

  const resolved = unsoldStockService.resolveTransactionConflict(userA, localTx, remoteTx);
  assert.strictEqual(resolved.agreedPricePerUnit, 16.5, 'Newer server version must prevail');
  assert.strictEqual(resolved.conflictResolved, true);
  console.log(`  ✓ Passed: Conflict resolved in favor of version ${resolved.resolvedVersion} (Price: ₹${resolved.agreedPricePerUnit})\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 19: English and Marathi translations
  // --------------------------------------------------------------------------
  console.log('Test 19: English and Marathi translations...');
  assert(en.unsoldStock.enquiry, 'English enquiry translations missing');
  assert(mr.unsoldStock.enquiry, 'Marathi enquiry translations missing');
  assert(en.unsoldStock.transaction, 'English transaction translations missing');
  assert(mr.unsoldStock.transaction, 'Marathi transaction translations missing');
  assert(en.unsoldStock.intelligence, 'English intelligence translations missing');
  assert(mr.unsoldStock.intelligence, 'Marathi intelligence translations missing');

  assert.strictEqual(mr.unsoldStock.enquiry.tabTitle, 'खरेदीदार चौकशी');
  assert.strictEqual(mr.unsoldStock.transaction.tabTitle, 'प्रत्यक्ष व्यवहार व नोंद');
  assert.strictEqual(mr.unsoldStock.intelligence.tabTitle, 'परिणाम विश्लेषण');
  console.log('  ✓ Passed: Complete bilingual dictionaries verified for Phase 3 namespaces\n');
  passedTests++;

  // --------------------------------------------------------------------------
  // TEST 20: Exclusion of demo transactions from real analytics
  // --------------------------------------------------------------------------
  console.log('Test 20: Exclusion of demo transactions from real analytics...');
  // Add a fake demo transaction
  const demoTx = await unsoldStockService.createRecoveryTransaction(userA, {
    stockId: onionStockId,
    buyerName: 'Demo Wholesale Syndicate',
    recoveryChannel: 'bulk_buyers',
    agreedQuantity: 5,
    agreedPricePerUnit: 2000,
    isDemoTransaction: true // EXPLICIT DEMO FLAG
  });
  assert.strictEqual(demoTx.transaction.isDemoTransaction, true);

  // Compute outcome intelligence: demoTx must be strictly ignored!
  const intel = await unsoldStockService.getOutcomeIntelligence(userA);
  assert(intel.totalTransactionsCount >= 2, 'Must include genuine tomato transactions');
  // Confirm none of the demo transaction volume or revenue entered genuine stats:
  // Genuine tx are tomato (30 kg + 55 kg = 85 kg) + unrecorded lemons (20 kg) = 105 kg
  // Demo onions (5 quintals = 500 kg) must NOT be added!
  assert.strictEqual(intel.totalVolumeRecovered, 105,
    `Total volume recovered should be 105 units (excluding demo), got ${intel.totalVolumeRecovered}`);
  console.log(`  ✓ Passed: Demo transactions strictly filtered out of genuine analytics (Volume: ${intel.totalVolumeRecovered} units)\n`);
  passedTests++;

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('========================================================================');
  console.log(`  Phase 3 Test Results: ${passedTests}/${totalTests} Passed (100% Success)`);
  console.log('========================================================================\n');
}

runTests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
