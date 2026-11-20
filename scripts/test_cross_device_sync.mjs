import assert from 'assert';
import { createServer } from '../server/index.js';
import { serverDb } from '../server/db.js';

console.log('\n================================================================');
console.log('🧪 MAHAUDYAM CROSS-DEVICE DATA SYNCHRONIZATION INTEGRATION TEST');
console.log('   Simulating Two Independent Clients (Device A & Device B)');
console.log('================================================================\n');

const TEST_PORT = 3003;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

// Client simulator helper that encapsulates independent client storage and sync state
function createSimulatedClient(clientId, baseUrl = BASE_URL) {
  return {
    clientId,
    token: null,
    user: null,
    cursor: 0,
    localStores: new Map(), // storeName -> Map<recordId, record>
    offlineQueue: [],

    async login(mobile, password) {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password })
      }).then(r => r.json());
      if (!res.success) throw new Error(`${this.clientId} login failed: ${res.error}`);
      this.token = res.token;
      this.user = res.user;
      return res;
    },

    async register(payload) {
      const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(r => r.json());
      if (!res.success) throw new Error(`${this.clientId} register failed: ${res.error}`);
      this.token = res.token;
      this.user = res.user;
      return res;
    },

    saveLocal(storeName, recordId, payload) {
      if (!this.localStores.has(storeName)) this.localStores.set(storeName, new Map());
      this.localStores.get(storeName).set(String(recordId), { ...payload, id: String(recordId) });
    },

    deleteLocal(storeName, recordId) {
      if (this.localStores.has(storeName)) {
        this.localStores.get(storeName).delete(String(recordId));
      }
    },

    getLocal(storeName, recordId) {
      if (!this.localStores.has(storeName)) return null;
      return this.localStores.get(storeName).get(String(recordId)) || null;
    },

    getAllLocal(storeName) {
      if (!this.localStores.has(storeName)) return [];
      return Array.from(this.localStores.get(storeName).values());
    },

    // Enqueue mutation in local offline queue
    enqueueMutation(storeName, recordId, operation, payload, isShared = false) {
      if (operation === 'DELETE') {
        this.deleteLocal(storeName, recordId);
      } else {
        this.saveLocal(storeName, recordId, payload);
      }
      this.offlineQueue.push({
        storeName,
        recordId: String(recordId),
        operation,
        payload,
        isShared
      });
    },

    // Outgoing push to server
    async pushSync(customIdempotencyKey = null) {
      if (this.offlineQueue.length === 0) return { pushed: 0 };
      const idempotencyKey = customIdempotencyKey || `idemp_${this.clientId}_${Date.now()}_${Math.random()}`;
      const mutations = [...this.offlineQueue];

      const res = await fetch(`${baseUrl}/api/v1/sync/push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          idempotencyKey,
          mutations
        })
      }).then(r => r.json());

      if (res.success) {
        this.offlineQueue = [];
      }
      return res;
    },

    // Incoming pull from server
    async pullSync(forceBootstrap = false) {
      const queryCursor = forceBootstrap ? 0 : this.cursor;
      const res = await fetch(`${baseUrl}/api/v1/sync/pull?cursor=${queryCursor}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      }).then(r => r.json());

      if (!res.success) throw new Error(`${this.clientId} pull failed: ${res.error}`);

      for (const ch of res.changes) {
        if (ch.operation === 'DELETE') {
          this.deleteLocal(ch.storeName, ch.recordId);
        } else {
          this.saveLocal(ch.storeName, ch.recordId, ch.payload);
        }
      }

      this.cursor = res.latestRevision;
      return res;
    }
  };
}

async function runTestSuite() {
  const server = createServer();
  await new Promise((resolve) => server.listen(TEST_PORT, '127.0.0.1', resolve));

  try {
    const clientA = createSimulatedClient('Device_A_Laptop');
    const clientB = createSimulatedClient('Device_B_Mobile');

    // TEST 1 & 2: Same Account Resolves & Record Created on Device A is Retrieved on Device B
    console.log('Test 1 & 2: Record Created on Device A (Laptop) Persists & is Retrieved on Device B (Mobile)...');
    
    // Both login with the same official account
    await clientA.login('9999999999', 'Maha@123');
    await clientB.login('9999999999', 'Maha@123');

    assert.strictEqual(clientA.user.userId, clientB.user.userId, 'Both devices must resolve to identical permanent server userId');
    console.log(`✓ Both devices authenticated as userId: ${clientA.user.userId}`);

    // Device A registers unsold stock
    const stockId = 'stock_tomato_surplus_101';
    clientA.enqueueMutation('unsoldStock', stockId, 'PUT', {
      productName: 'Surplus Fresh Tomatoes (Grade A)',
      quantity: 500,
      unit: 'kg',
      price: 14,
      condition: 'good',
      district: 'Nashik'
    });
    const pushA1 = await clientA.pushSync();
    assert.strictEqual(pushA1.success, true);
    assert.strictEqual(pushA1.appliedCount, 1);
    console.log('✓ Device A pushed unsold stock to server.');

    // Device B pulls updates
    const pullB1 = await clientB.pullSync();
    assert.strictEqual(pullB1.success, true);
    assert.strictEqual(pullB1.changes.length >= 1, true);

    const stockOnB = clientB.getLocal('unsoldStock', stockId);
    assert.notStrictEqual(stockOnB, null, 'Stock record must exist on Device B');
    assert.strictEqual(stockOnB.productName, 'Surplus Fresh Tomatoes (Grade A)');
    assert.strictEqual(stockOnB.quantity, 500);
    console.log(`✓ Verified: Device B retrieved record created on Device A (${stockOnB.productName}, ${stockOnB.quantity} kg).`);

    // TEST 3 & 4: Bidirectional Updates (Device A updates -> Device B receives, Device B updates -> Device A receives)
    console.log('\nTest 3 & 4: Bidirectional Updates Between Devices...');
    
    // Device A updates quantity from 500 to 450
    clientA.enqueueMutation('unsoldStock', stockId, 'PUT', {
      ...stockOnB,
      quantity: 450,
      status: 'recovery_in_progress'
    });
    await clientA.pushSync();
    await clientB.pullSync();

    const updatedOnB = clientB.getLocal('unsoldStock', stockId);
    assert.strictEqual(updatedOnB.quantity, 450, 'Device B should reflect updated quantity 450');
    console.log('✓ Device A update received on Device B (quantity: 450).');

    // Device B records a buyer enquiry response on Device B -> Device A receives it
    const enqId = 'enq_buyer_hotel_44';
    clientB.enqueueMutation('stockEnquiries', enqId, 'PUT', {
      stockId,
      buyerName: 'Nashik Agro Food Processors',
      offeredPrice: 13.5,
      offeredQuantity: 450,
      status: 'quotation_received'
    });
    await clientB.pushSync();
    await clientA.pullSync();

    const enqOnA = clientA.getLocal('stockEnquiries', enqId);
    assert.notStrictEqual(enqOnA, null, 'Enquiry created on Device B must be received on Device A');
    assert.strictEqual(enqOnA.offeredPrice, 13.5);
    console.log(`✓ Device B enquiry received on Device A (${enqOnA.buyerName}, ₹${enqOnA.offeredPrice}/kg).`);

    // TEST 5: Deletion Tombstones Across Devices
    console.log('\nTest 5: Verify Deletion Tombstone Propagation Across Devices...');
    clientA.enqueueMutation('stockEnquiries', enqId, 'DELETE', null);
    await clientA.pushSync();
    assert.strictEqual(clientA.getLocal('stockEnquiries', enqId), null, 'Deleted on Device A locally');

    await clientB.pullSync();
    assert.strictEqual(clientB.getLocal('stockEnquiries', enqId), null, 'Deleted on Device B after pull');
    console.log('✓ Deletion tombstone cleanly applied on Device B without resurrection.');

    // TEST 6: Offline Queuing & Reconnection Sync
    console.log('\nTest 6: Verify Offline Queuing & Reconnect Sync...');
    // Device A goes offline and registers a shared equipment booking
    const bookingId = 'bk_solar_dryer_77';
    clientA.enqueueMutation('resourceBookings', bookingId, 'PUT', {
      resourceName: 'Commercial Solar Polyhouse Tunnel Dehydrator',
      durationDays: 4,
      rentalRate: 450,
      status: 'booking_requested'
    });

    assert.strictEqual(clientA.offlineQueue.length, 1, 'Mutation should be queued in offline queue');
    console.log('✓ Mutation queued in local offline storage.');

    // Device A reconnects and flushes queue
    const flushRes = await clientA.pushSync();
    assert.strictEqual(flushRes.success, true);
    assert.strictEqual(clientA.offlineQueue.length, 0, 'Offline queue cleared after push');

    await clientB.pullSync();
    const bookingOnB = clientB.getLocal('resourceBookings', bookingId);
    assert.notStrictEqual(bookingOnB, null);
    assert.strictEqual(bookingOnB.durationDays, 4);
    console.log(`✓ Offline booking synced upon reconnect and received by Device B (${bookingOnB.resourceName}).`);

    // TEST 7: New Device First-Login Bootstrap
    console.log('\nTest 7: Verify Brand-New Device First-Login Bootstrap...');
    const clientNew = createSimulatedClient('Device_C_BrandNewTablet');
    await clientNew.login('9999999999', 'Maha@123');

    // New device starts with empty local database
    assert.strictEqual(clientNew.getAllLocal('unsoldStock').length, 0);

    // Bootstrap pull with cursor 0
    await clientNew.pullSync(true);
    const bootstrappedStock = clientNew.getLocal('unsoldStock', stockId);
    const bootstrappedBooking = clientNew.getLocal('resourceBookings', bookingId);

    assert.notStrictEqual(bootstrappedStock, null, 'New device must download existing server stock');
    assert.notStrictEqual(bootstrappedBooking, null, 'New device must download existing server bookings');
    console.log(`✓ Brand-new device bootstrapped successfully: ${clientNew.getAllLocal('unsoldStock').length} stocks and ${clientNew.getAllLocal('resourceBookings').length} bookings restored.`);

    // TEST 8: Multi-Tenant Isolation
    console.log('\nTest 8: Verify Multi-Tenant Access Isolation...');
    const clientStranger = createSimulatedClient('Device_D_OtherUser');
    // Register another user
    const otherMobile = `9822${Math.floor(100000 + Math.random() * 900000)}`;
    await clientStranger.register({
      mobile: otherMobile,
      password: 'OtherPassword@123',
      name: 'Ramesh Farmer',
      districtCode: 494
    });

    // Stranger pulls from cursor 0
    const strangerPull = await clientStranger.pullSync(true);
    // Stranger MUST NOT receive User 9999's private stock or bookings
    assert.strictEqual(clientStranger.getLocal('unsoldStock', stockId), null, 'Stranger must NOT receive User 9999 private stock');
    assert.strictEqual(clientStranger.getLocal('resourceBookings', bookingId), null, 'Stranger must NOT receive User 9999 private bookings');
    console.log('✓ Multi-tenant isolation verified: Other user accounts cannot access private records.');

    // TEST 9: Idempotency Verification
    console.log('\nTest 9: Verify Idempotency on Network Retries...');
    const idempKey = 'idemp_unique_retry_test_99';
    clientA.offlineQueue = [{
      storeName: 'rawMaterialSuppliers',
      recordId: 'sup_test_77',
      operation: 'PUT',
      payload: { materialName: 'Organic Jute Bags', price: 25 }
    }];

    const firstPush = await clientA.pushSync(idempKey);
    const revBefore = serverDb.getCurrentRevision();

    // Re-send exact same push request
    clientA.offlineQueue = [{
      storeName: 'rawMaterialSuppliers',
      recordId: 'sup_test_77',
      operation: 'PUT',
      payload: { materialName: 'Organic Jute Bags', price: 25 }
    }];
    const retryPush = await clientA.pushSync(idempKey);
    const revAfter = serverDb.getCurrentRevision();

    assert.strictEqual(firstPush.success, true);
    assert.strictEqual(retryPush.success, true);
    assert.strictEqual(revBefore, revAfter, 'Idempotent retry must not bump revision or create duplicate rows');
    console.log('✓ Idempotency verified: Retried request returned cached result without duplicating records.');

    // TEST 10: Multi-Module Cross-Device Synchronization
    console.log('\nTest 10: Verify Cross-Device Synchronization Across MahaUdyam Modules...');
    
    // A. BazaarPath (market visits)
    clientA.enqueueMutation('marketVisits', 'visit_nsk_01', 'PUT', { marketId: 'mkt_sinnar_01', netProfit: 3200 });
    // B. Resource Hub (user learning progress)
    clientA.enqueueMutation('userLearningProgress', 'prog_demo_user', 'PUT', { progressPercent: 71, completedSteps: ['ms_1', 'ms_2', 'ms_3', 'ms_4', 'ms_5'] });
    // C. Procurement Enquiry
    clientA.enqueueMutation('procurementEnquiries', 'po_box_crate_01', 'PUT', { poNumber: 'PO-8812', totalLandedCost: 4500 });
    // D. Shared Community Demand Report (isShared = true)
    clientA.enqueueMutation('customerDemandReports', 'dem_rep_solar_pump_99', 'PUT', { productOrService: 'Solar Water Pump Rental', village: 'Baragaon Pimpri' }, true);

    await clientA.pushSync();
    await clientB.pullSync();

    assert.notStrictEqual(clientB.getLocal('marketVisits', 'visit_nsk_01'), null, 'BazaarPath visits synchronized');
    assert.notStrictEqual(clientB.getLocal('userLearningProgress', 'prog_demo_user'), null, 'Learning progress synchronized');
    assert.notStrictEqual(clientB.getLocal('procurementEnquiries', 'po_box_crate_01'), null, 'Procurement PO synchronized');
    assert.notStrictEqual(clientB.getLocal('customerDemandReports', 'dem_rep_solar_pump_99'), null, 'Shared community demand synchronized');

    // And stranger also receives the shared community demand report!
    await clientStranger.pullSync();
    assert.notStrictEqual(clientStranger.getLocal('customerDemandReports', 'dem_rep_solar_pump_99'), null, 'Shared community signal reaches other users');
    console.log('✓ All modules synchronized across devices (Visits, Learning Progress, Procurement, and Community Signals).');

    console.log('\n================================================================');
    console.log('🎉 ALL 10 CROSS-DEVICE SYNCHRONIZATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ Test failed with error:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runTestSuite();
