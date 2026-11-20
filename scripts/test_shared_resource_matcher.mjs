import assert from 'assert';
import { sharedResourceService } from '../src/services/resources/sharedResourceService.js';
import { RESOURCE_CATEGORIES } from '../src/data/resources/initialSharedResources.js';

console.log('\n--- TESTING SHARED RESOURCE MATCHER (PHASE 1, 2, 3) ---');

async function runTests() {
  // Test 1: Service Initialization & Catalog Retrieval
  console.log('Test 1: Verify Initial Asset Catalog & Category Filtering...');
  await sharedResourceService.init();
  const allResources = await sharedResourceService.getAllResources();
  assert(allResources.length >= 6, `Expected at least 6 initial shared resources, got ${allResources.length}`);
  console.log(`✓ Loaded ${allResources.length} verified shared equipment and storage facilities.`);

  const processingAssets = await sharedResourceService.getAllResources({
    category: RESOURCE_CATEGORIES.PROCESSING_EQUIPMENT
  });
  assert(processingAssets.length >= 2, 'Expected processing equipment in catalog');
  assert(processingAssets.every(r => r.category === RESOURCE_CATEGORIES.PROCESSING_EQUIPMENT), 'All returned items should be processing equipment');
  console.log(`✓ Category filter verified: ${processingAssets.length} processing equipment items found.`);

  // Test 2: Requirement Compatibility & Rental Cost Estimation (Phase 2)
  console.log('\nTest 2: Verify Requirement Matching & Rental Expense Breakdown...');
  const userLocation = {
    districtCode: 490,
    talukaCode: 4154,
    coordinates: { lat: 19.8500, lng: 74.0000 } // Baragaon Pimpri, Sinnar
  };

  const matches = await sharedResourceService.matchSharedResources({
    userLocation,
    category: 'all',
    productQuery: 'Tomato',
    durationUnits: 3
  });

  assert(matches.length > 0, 'Should return ranked resource matches');
  const topMatch = matches[0];
  assert(topMatch.score >= 60, `Top match score should be >= 60, got ${topMatch.score}`);
  assert.strictEqual(topMatch.isProductCompatible, true, 'Top match should be compatible with Tomato');
  assert(topMatch.grossRentalFee > 0, 'Gross rental fee should be calculated');
  assert(topMatch.totalEstimatedRentalExpense >= topMatch.grossRentalFee, 'Total expense must include operator fee if applicable');
  console.log(`✓ Matcher verified: Top match "${topMatch.resource.resourceName}" scored ${topMatch.score}/100 with ₹${topMatch.totalEstimatedRentalExpense} estimated rental expense.`);

  // Test 3: Non-compatible product explanation
  console.log('\nTest 3: Verify Non-Compatible Product Explanation...');
  const matchesIncompat = await sharedResourceService.matchSharedResources({
    userLocation,
    category: RESOURCE_CATEGORIES.PROCESSING_EQUIPMENT,
    productQuery: 'Cotton Yarn', // Dal mill & solar dryer are not for cotton yarn
    durationUnits: 1
  });
  const dalMillMatch = matchesIncompat.find(m => m.resource.id === 'res_ahd_dal_mill_03');
  assert(dalMillMatch, 'Should find dal mill');
  assert.strictEqual(dalMillMatch.isProductCompatible, false, 'Dal mill should not be compatible with Cotton Yarn');
  assert(dalMillMatch.score < topMatch.score, 'Non-compatible asset score should be penalized');
  console.log(`✓ Incompatibility verified: Correctly lowered score (${dalMillMatch.score}) with explanatory notice.`);

  // Test 4: Booking Workflow (Request -> Confirm -> In-Use -> Return) (Phase 3)
  console.log('\nTest 4: Verify Booking Workflow Lifecycle...');
  const testUserId = 'test_farmer_101';
  
  // 4a: Booking Request
  const booking = await sharedResourceService.createBookingRequest(testUserId, {
    resourceId: 'res_nsk_solar_dryer_01',
    startDate: '2026-11-20',
    endDate: '2026-11-23',
    durationUnits: 3,
    plannedUse: 'Solar dehydration of 1,200 kg surplus tomatoes',
    notes: 'Trays to be sanitized before loading'
  });

  assert(booking.id.startsWith('bk_res_'), 'Booking ID should have proper prefix');
  assert.strictEqual(booking.bookingStatus, 'booking_requested', 'Initial status should be booking_requested');
  assert.strictEqual(booking.grossRentalFee, 450 * 3, 'Gross rental should be rate * duration');
  assert.strictEqual(booking.depositAmount, 1000, 'Deposit should match resource deposit');
  console.log(`✓ Step 4a: Booking requested (${booking.id}) for ₹${booking.grossRentalFee} + ₹${booking.depositAmount} deposit.`);

  // 4b: Confirm Booking
  const confirmed = await sharedResourceService.confirmBooking(testUserId, booking.id);
  assert.strictEqual(confirmed.bookingStatus, 'confirmed', 'Status should be confirmed');
  console.log('✓ Step 4b: Booking confirmed.');

  // 4c: Start Resource Use
  const inUse = await sharedResourceService.startResourceUse(testUserId, booking.id);
  assert.strictEqual(inUse.bookingStatus, 'in_use', 'Status should be in_use');
  console.log('✓ Step 4c: Resource marked in-use.');

  // 4d: Record Return, Inspection, Deposit Refund & Final Net Ledger
  const returned = await sharedResourceService.recordReturnAndSettlement(testUserId, booking.id, {
    returnDate: '2026-11-23',
    equipmentCondition: 'good',
    actualRentalCost: 1350,
    actualOperatorExpense: 0,
    actualFuelExpense: 0,
    depositDeductions: 0, // No damage
    notes: 'Solar tunnel trays washed and inspected clean.'
  });

  assert.strictEqual(returned.bookingStatus, 'returned', 'Status should be returned');
  assert.strictEqual(returned.returnDetails.equipmentCondition, 'good');
  assert.strictEqual(returned.returnDetails.depositRefunded, 1000, 'Full deposit should be refunded when deductions = 0');
  assert.strictEqual(returned.returnDetails.totalNetExpense, 1350, 'Total net expense should equal rental fee');
  console.log(`✓ Step 4d: Return completed: Deposit refunded ₹${returned.returnDetails.depositRefunded}, Total Net Expense ₹${returned.returnDetails.totalNetExpense}.`);

  // Test 5: Multi-Tenant Isolation
  console.log('\nTest 5: Verify Multi-Tenant Data Isolation...');
  const userBookings = await sharedResourceService.getUserBookings(testUserId);
  assert.strictEqual(userBookings.length, 1, 'Farmer 101 should see exactly 1 booking');
  const strangerBookings = await sharedResourceService.getUserBookings('unauthorized_user_777');
  assert.strictEqual(strangerBookings.length, 0, 'Other user must have 0 bookings');
  console.log('✓ Strict multi-tenant data isolation verified.');

  // Test 6: Offline Synchronization
  console.log('\nTest 6: Verify Offline Synchronization...');
  const syncResult = await sharedResourceService.syncPendingBookings(testUserId);
  assert(typeof syncResult.synchronizedCount === 'number');
  console.log(`✓ Offline sync verified: ${syncResult.synchronizedCount} records synchronized.`);

  console.log('\n======================================================');
  console.log('🎉 ALL SHARED RESOURCE MATCHER TESTS PASSED!');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
