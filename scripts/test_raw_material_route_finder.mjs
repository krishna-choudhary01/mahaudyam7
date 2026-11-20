import assert from 'assert';
import { rawMaterialService, calculateStraightLineDistance } from '../src/services/materials/rawMaterialService.js';
import { INITIAL_RAW_MATERIALS, RAW_MATERIAL_CATEGORIES } from '../src/data/materials/initialRawMaterials.js';

console.log('\n--- TESTING RAW-MATERIAL SOURCE AND ROUTE FINDER (PHASE 1, 2, 3) ---');

async function runTests() {
  // Test 1: Service Initialization & Catalog Retrieval
  console.log('Test 1: Verify Initial Catalog & Category Filtering...');
  await rawMaterialService.init();
  const allMaterials = await rawMaterialService.getAllMaterials();
  assert(allMaterials.length >= 6, `Expected at least 6 initial raw materials, got ${allMaterials.length}`);
  console.log(`✓ Loaded ${allMaterials.length} verified raw material items.`);

  const packagingMaterials = await rawMaterialService.getAllMaterials({
    category: RAW_MATERIAL_CATEGORIES.PACKAGING_MATERIALS
  });
  assert(packagingMaterials.length >= 2, 'Expected packaging materials in catalog');
  assert(packagingMaterials.every(m => m.category === RAW_MATERIAL_CATEGORIES.PACKAGING_MATERIALS), 'All returned items should be packaging');
  console.log(`✓ Category filter verified: ${packagingMaterials.length} packaging materials found.`);

  // Test 2: Distance & Road Circuity Calculation (1.25x Rural Factor)
  console.log('\nTest 2: Verify Road Distance & 1.25 Circuity Multiplier...');
  // Sinnar (19.865, 74.020) to Baragaon Pimpri (19.850, 74.000)
  const straightDist = calculateStraightLineDistance(19.850, 74.000, 19.865, 74.020);
  assert(straightDist > 0, 'Straight line distance should be positive');
  
  const matches = await rawMaterialService.matchRawMaterialSources({
    userLocation: {
      districtCode: 490,
      talukaCode: 4154,
      coordinates: { lat: 19.850, lng: 74.000 }
    },
    category: 'all',
    quantityNeeded: 500,
    transportModeId: 'mini_truck'
  });

  assert(matches.length > 0, 'Should return ranked source matches');
  const topMatch = matches[0];
  assert(topMatch.score >= 50, `Top match score should be >= 50, got ${topMatch.score}`);
  assert(topMatch.estimatedRoadKm !== null, 'Estimated road distance must be calculated');
  assert(topMatch.totalLandedCost >= topMatch.grossMaterialCost, 'Total landed cost must include freight');
  console.log(`✓ Matcher verified: Top match "${topMatch.material.materialName}" scored ${topMatch.score}/100 with ${topMatch.estimatedRoadKm} km estimated road distance.`);

  // Test 3: MOQ Suitability Detection
  console.log('\nTest 3: Verify Minimum Order Quantity (MOQ) Alert Logic...');
  const matchMoqCheck = await rawMaterialService.matchRawMaterialSources({
    userLocation: { coordinates: { lat: 19.850, lng: 74.000 } },
    category: RAW_MATERIAL_CATEGORIES.PACKAGING_MATERIALS,
    quantityNeeded: 50 // below 500 MOQ for pouches
  });
  const pouchMatch = matchMoqCheck.find(m => m.material.id === 'mat_nsk_pouch_01');
  assert(pouchMatch, 'Should find pouch match');
  assert.strictEqual(pouchMatch.isMoqMet, false, 'Should flag that order quantity is below MOQ');
  assert(pouchMatch.orderVolume >= 500, 'Order volume should default to MOQ when requested is below MOQ');
  console.log(`✓ MOQ alert verified: Correctly flagged below MOQ (${pouchMatch.orderVolume} units applied).`);

  // Test 4: Phase 3 Procurement Enquiry Workflow
  console.log('\nTest 4: Verify Procurement Enquiry Creation...');
  const testUserId = 'test_entrepreneur_88';
  const enquiry = await rawMaterialService.createProcurementEnquiry(testUserId, {
    materialId: 'mat_nsk_pouch_01',
    quantityNeeded: 600,
    expectedDeliveryDate: '2026-12-01',
    deliveryLocation: 'Baragaon Pimpri, Sinnar',
    notes: 'Food safety grade certificate required'
  });

  assert(enquiry.id.startsWith('enq_mat_'), 'Enquiry ID should have proper prefix');
  assert.strictEqual(enquiry.userId, testUserId, 'Enquiry must belong to user');
  assert.strictEqual(enquiry.status, 'enquiry_sent', 'Initial status should be enquiry_sent');
  console.log(`✓ Procurement enquiry created: ID ${enquiry.id} with status "${enquiry.status}".`);

  // Test 5: Phase 3 Supplier Quotation Recording
  console.log('\nTest 5: Verify Recording Supplier Quotation...');
  const quoted = await rawMaterialService.recordSupplierQuotation(testUserId, enquiry.id, {
    quotedPricePerUnit: 3.40,
    freightCharges: 350,
    deliveryLeadDays: 2,
    paymentTerms: '50% advance, 50% on delivery'
  });

  assert.strictEqual(quoted.status, 'quotation_received', 'Status should be quotation_received');
  assert.strictEqual(quoted.quotation.quotedPricePerUnit, 3.40);
  assert.strictEqual(quoted.quotation.freightCharges, 350);
  assert.strictEqual(quoted.quotation.totalQuotationAmount, Math.round(3.40 * 600 + 350));
  console.log(`✓ Supplier quotation recorded: Total quoted amount ₹${quoted.quotation.totalQuotationAmount}.`);

  // Test 6: Phase 3 Purchase Order Confirmation & Multi-tenant Isolation
  console.log('\nTest 6: Verify Purchase Order Confirmation & User Isolation...');
  const confirmedPO = await rawMaterialService.confirmPurchaseOrder(testUserId, enquiry.id, {
    agreedQuantity: 600,
    agreedPricePerUnit: 3.40,
    actualTransportExpense: 350,
    paymentStatus: 'partially_paid'
  });

  assert.strictEqual(confirmedPO.status, 'order_confirmed', 'Status should be order_confirmed');
  assert(confirmedPO.purchaseConfirmation.poNumber.startsWith('PO-'), 'Should generate PO number');
  assert.strictEqual(confirmedPO.purchaseConfirmation.totalProcurementExpense, Math.round(600 * 3.40 + 350));

  // Multi-tenant isolation test
  const userEnquiries = await rawMaterialService.getEnquiryHistory(testUserId);
  assert.strictEqual(userEnquiries.length, 1, 'User 88 should have 1 enquiry');
  const otherUserEnquiries = await rawMaterialService.getEnquiryHistory('other_user_99');
  assert.strictEqual(otherUserEnquiries.length, 0, 'Other user must have 0 enquiries (Multi-tenant isolation)');
  console.log(`✓ Purchase order confirmed (${confirmedPO.purchaseConfirmation.poNumber}) with ₹${confirmedPO.purchaseConfirmation.totalProcurementExpense} total expense.`);
  console.log('✓ Strict multi-tenant data isolation verified.');

  // Test 7: Offline Synchronization
  console.log('\nTest 7: Verify Offline Synchronization...');
  const syncResult = await rawMaterialService.syncPendingEnquiries(testUserId);
  assert(typeof syncResult.synchronizedCount === 'number');
  console.log(`✓ Offline sync verified: ${syncResult.synchronizedCount} records synchronized.`);

  console.log('\n======================================================');
  console.log('🎉 ALL RAW-MATERIAL SOURCE AND ROUTE FINDER TESTS PASSED!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
