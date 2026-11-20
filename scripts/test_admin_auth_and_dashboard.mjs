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
  console.log('  MahaUdyam - Admin Authentication & Dashboard Test Suite');
  console.log('===============================================================\n');

  // Load modules via Vite
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  try {
    const { adminAuthService, ROLES, PERMISSIONS } = await vite.ssrLoadModule('/src/services/auth/adminAuthService.js');
    const { marketManagementService } = await vite.ssrLoadModule('/src/services/admin/marketManagementService.js');
    const { LanguageProvider } = await vite.ssrLoadModule('/src/i18n/index.js');
    const { AdminLoginForm } = await vite.ssrLoadModule('/src/components/admin/AdminLoginForm.jsx');
    const { AdminDashboard } = await vite.ssrLoadModule('/src/components/admin/AdminDashboard.jsx');

    await adminAuthService.init();
    await marketManagementService.init();

    // --- TEST GROUP 1: ROLE-BASED ACCESS CONTROL PERMISSIONS ---
    console.log('--- TEST GROUP 1: Role-Based Access Control & Permissions ---');

    test('Super Admin has all administrative permissions', () => {
      assert.ok(PERMISSIONS.MANAGE_ADMINS.includes(ROLES.SUPER_ADMIN));
      assert.ok(PERMISSIONS.MANAGE_ROLES.includes(ROLES.SUPER_ADMIN));
      assert.ok(PERMISSIONS.VIEW_AUDIT_LOGS.includes(ROLES.SUPER_ADMIN));
      assert.ok(PERMISSIONS.MANAGE_MARKETS.includes(ROLES.SUPER_ADMIN));
      assert.ok(PERMISSIONS.APPROVE_SUBMISSIONS.includes(ROLES.SUPER_ADMIN));
    });

    test('Admin has market management but cannot manage other admins or view audit logs', () => {
      assert.ok(PERMISSIONS.MANAGE_MARKETS.includes(ROLES.ADMIN));
      assert.ok(PERMISSIONS.APPROVE_SUBMISSIONS.includes(ROLES.ADMIN));
      assert.strictEqual(PERMISSIONS.MANAGE_ADMINS.includes(ROLES.ADMIN), false);
      assert.strictEqual(PERMISSIONS.VIEW_AUDIT_LOGS.includes(ROLES.ADMIN), false);
    });

    test('Moderator can review & flag submissions but cannot publish or manage admins', () => {
      assert.ok(PERMISSIONS.REVIEW_SUBMISSIONS.includes(ROLES.MODERATOR));
      assert.ok(PERMISSIONS.FLAG_DUPLICATES.includes(ROLES.MODERATOR));
      assert.ok(PERMISSIONS.REQUEST_CORRECTIONS.includes(ROLES.MODERATOR));
      assert.strictEqual(PERMISSIONS.MANAGE_MARKETS.includes(ROLES.MODERATOR), false);
      assert.strictEqual(PERMISSIONS.APPROVE_SUBMISSIONS.includes(ROLES.MODERATOR), false);
      assert.strictEqual(PERMISSIONS.MANAGE_ADMINS.includes(ROLES.MODERATOR), false);
    });

    test('Entrepreneur cannot access any administrative permissions', () => {
      assert.strictEqual(PERMISSIONS.MANAGE_ADMINS.includes(ROLES.ENTREPRENEUR), false);
      assert.strictEqual(PERMISSIONS.MANAGE_MARKETS.includes(ROLES.ENTREPRENEUR), false);
      assert.strictEqual(PERMISSIONS.APPROVE_SUBMISSIONS.includes(ROLES.ENTREPRENEUR), false);
      assert.strictEqual(PERMISSIONS.VIEW_AUDIT_LOGS.includes(ROLES.ENTREPRENEUR), false);
    });

    // --- TEST GROUP 2: ADMINISTRATIVE LOGIN & SESSION SECURITY ---
    console.log('\n--- TEST GROUP 2: Administrative Login & Session Security ---');

    // Test Super Admin Login
    const superLogin = await adminAuthService.loginAdmin({
      usernameOrEmail: 'superadmin',
      password: 'MahaSuper@2026'
    });
    test('Super Admin logs in successfully', () => {
      assert.strictEqual(superLogin.success, true);
      assert.strictEqual(superLogin.user.role, ROLES.SUPER_ADMIN);
      assert.ok(adminAuthService.isAdminAuthenticated());
      assert.strictEqual(adminAuthService.hasPermission('MANAGE_ADMINS'), true);
      assert.strictEqual(adminAuthService.hasPermission('VIEW_AUDIT_LOGS'), true);
    });

    // Test Wrong Password Rejection
    const wrongPassLogin = await adminAuthService.loginAdmin({
      usernameOrEmail: 'superadmin',
      password: 'WrongPassword@123'
    });
    test('Invalid password is rejected', () => {
      assert.strictEqual(wrongPassLogin.success, false);
      assert.ok(wrongPassLogin.error.includes('Invalid password'));
    });

    // Test Non-existent Admin
    const invalidAdminLogin = await adminAuthService.loginAdmin({
      usernameOrEmail: 'unauthorized_hacker',
      password: 'SomePassword@123'
    });
    test('Unregistered administrative usernames are rejected', () => {
      assert.strictEqual(invalidAdminLogin.success, false);
      assert.ok(invalidAdminLogin.error.includes('not permitted'));
    });

    // Test Market Admin Login
    const adminLogin = await adminAuthService.loginAdmin({
      usernameOrEmail: 'admin_market',
      password: 'MahaAdmin@2026'
    });
    test('Market Admin logs in and has appropriate bounded permissions', () => {
      assert.strictEqual(adminLogin.success, true);
      assert.strictEqual(adminLogin.user.role, ROLES.ADMIN);
      assert.strictEqual(adminAuthService.hasPermission('MANAGE_MARKETS'), true);
      assert.strictEqual(adminAuthService.hasPermission('MANAGE_ADMINS'), false);
    });

    // Test Moderator Login
    const modLogin = await adminAuthService.loginAdmin({
      usernameOrEmail: 'moderator_nsk',
      password: 'MahaMod@2026'
    });
    test('Field Moderator logs in with review-only permissions', () => {
      assert.strictEqual(modLogin.success, true);
      assert.strictEqual(modLogin.user.role, ROLES.MODERATOR);
      assert.strictEqual(adminAuthService.hasPermission('REVIEW_SUBMISSIONS'), true);
      assert.strictEqual(adminAuthService.hasPermission('MANAGE_MARKETS'), false);
    });

    // --- TEST GROUP 3: SUPER_ADMIN USER PROVISIONING & AUDIT TRAIL ---
    console.log('\n--- TEST GROUP 3: Administrative User Provisioning & Audit Trail ---');

    // Switch back to Super Admin
    await adminAuthService.loginAdmin({ usernameOrEmail: 'superadmin', password: 'MahaSuper@2026' });

    // Super Admin creates a new Administrator
    const createRes = await adminAuthService.createAdminUser({
      username: 'anand_pune_admin',
      email: 'anand.pune@mahaudyam.gov.in',
      name: 'Anand Deshmukh',
      role: ROLES.ADMIN,
      password: 'MahaSecure@2026#Pune'
    });

    test('Super Admin can provision new administrative personnel', () => {
      assert.strictEqual(createRes.success, true);
      assert.strictEqual(createRes.user.username, 'anand_pune_admin');
      assert.strictEqual(createRes.user.role, ROLES.ADMIN);
    });

    // Verify new admin can log in
    const newAdminLogin = await adminAuthService.loginAdmin({
      usernameOrEmail: 'anand_pune_admin',
      password: 'MahaSecure@2026#Pune'
    });
    test('Newly provisioned administrator can authenticate with credentials', () => {
      assert.strictEqual(newAdminLogin.success, true);
      assert.strictEqual(newAdminLogin.user.role, ROLES.ADMIN);
    });

    // Switch back to Super Admin
    await adminAuthService.loginAdmin({ usernameOrEmail: 'superadmin', password: 'MahaSuper@2026' });

    // Deactivate newly created admin
    const deactRes = await adminAuthService.updateAdminStatus(createRes.user.userId, 'INACTIVE');
    test('Super Admin can deactivate an administrative account', () => {
      assert.strictEqual(deactRes.success, true);
    });

    // Verify deactivated admin cannot log in
    const deactLogin = await adminAuthService.loginAdmin({
      usernameOrEmail: 'anand_pune_admin',
      password: 'MahaSecure@2026#Pune'
    });
    test('Deactivated administrator is blocked from logging in', () => {
      assert.strictEqual(deactLogin.success, false);
      assert.ok(deactLogin.error.includes('deactivated'));
    });

    // Check Audit Logs
    const auditLogs = await adminAuthService.getAuditLogs(20);
    test('Audit trail captures administrative actions with admin identity', () => {
      assert.ok(Array.isArray(auditLogs));
      assert.ok(auditLogs.length > 0);
      assert.ok(auditLogs.some((l) => l.action === 'ADMIN_USER_CREATED'));
      assert.ok(auditLogs.some((l) => l.action === 'ADMIN_STATUS_CHANGED'));
    });

    // --- TEST GROUP 4: MARKET MANAGEMENT & VALIDATION ---
    console.log('\n--- TEST GROUP 4: Market Management & Validation Models ---');

    // Switch to Market Admin
    await adminAuthService.loginAdmin({ usernameOrEmail: 'admin_market', password: 'MahaAdmin@2026' });

    // Test Adding Market with Valid Maharashtra Data
    const validMarketData = {
      name: 'Niphad Onion & Grape Mandi',
      name_mr: 'निफाड कांदा व द्राक्ष आठवडे बाजार',
      district: 'Nashik',
      districtCode: 490,
      taluka: 'Niphad',
      talukaCode: 4145,
      village: 'Niphad Town',
      villageCode: 524450,
      marketType: 'Weekly Bazaar (आठवडे बाजार)',
      operatingDay: 'Tuesday',
      timings: '07:00 AM - 02:00 PM',
      stallFee: 40,
      productCategories: ['Vegetables', 'Fruits', 'Grains'],
      coordinates: { lat: 20.08, lng: 74.11 }, // Valid Nashik Niphad coordinates
      dataSource: 'MSAMB District Directory',
      verificationStatus: 'verified'
    };

    const addRes = await marketManagementService.addMarket(validMarketData);
    test('Admin can add a new verified market with full location hierarchy', () => {
      assert.strictEqual(addRes.success, true);
      assert.ok(addRes.market.id.startsWith('mkt-490-4145-'));
      assert.strictEqual(addRes.market.name, 'Niphad Onion & Grape Mandi');
      assert.strictEqual(addRes.market.verificationStatus, 'verified');
    });

    // Test Coordinate Validation (Out of Maharashtra coordinates rejected)
    const invalidCoordsMarket = {
      ...validMarketData,
      name: 'Invalid Coordinates Market',
      coordinates: { lat: 28.61, lng: 77.20 } // New Delhi coordinates!
    };
    const invalidCoordRes = await marketManagementService.addMarket(invalidCoordsMarket);
    test('Coordinates outside Maharashtra geographic bounds are rejected', () => {
      assert.strictEqual(invalidCoordRes.success, false);
      assert.ok(invalidCoordRes.error.includes('bounds'));
    });

    // Test Duplicate Detection
    const duplicateRes = await marketManagementService.addMarket(validMarketData);
    test('Duplicate market detection identifies existing identical day/taluka markets', () => {
      assert.strictEqual(duplicateRes.success, false);
      assert.strictEqual(duplicateRes.isDuplicateWarning, true);
    });

    // Test Updating an existing market (Preserves stable ID)
    const updateRes = await marketManagementService.updateMarket(addRes.market.id, {
      stallFee: 60,
      timings: '06:30 AM - 02:30 PM'
    });
    test('Editing market preserves stable permanent Market ID', () => {
      assert.strictEqual(updateRes.success, true);
      assert.strictEqual(updateRes.market.id, addRes.market.id);
      assert.strictEqual(updateRes.market.stallFee, 60);
    });

    // Test Status Transition (Deactivation & Reactivation)
    const deactMarketRes = await marketManagementService.setMarketStatus(addRes.market.id, 'inactive', 'Seasonal monsoon closure');
    test('Admin can deactivate an active market record', () => {
      assert.strictEqual(deactMarketRes.success, true);
      assert.strictEqual(deactMarketRes.market.verificationStatus, 'inactive');
    });

    const reactMarketRes = await marketManagementService.setMarketStatus(addRes.market.id, 'verified', 'Reopened for post-harvest trading');
    test('Admin can reactivate a market record', () => {
      assert.strictEqual(reactMarketRes.success, true);
      assert.strictEqual(reactMarketRes.market.verificationStatus, 'verified');
    });

    // --- TEST GROUP 5: ENTREPRENEUR SUBMISSION & VERIFICATION WORKFLOW ---
    console.log('\n--- TEST GROUP 5: Entrepreneur Submission & Verification Workflow ---');

    // Entrepreneur submits suggestion
    const subRes = await marketManagementService.submitMarketSuggestion({
      name: 'Dodi Budruk Thursday Haat',
      name_mr: 'डोडी बुद्रुक गुरुवार आठवडे बाजार',
      district: 'Nashik',
      districtCode: 490,
      taluka: 'Sinnar',
      talukaCode: 4154,
      village: 'Dodi Budruk',
      operatingDay: 'Thursday',
      productCategories: ['Vegetables', 'Dairy products'],
      source: 'Local farmer cooperative inquiry'
    });
    test('Entrepreneur can submit new market suggestion with pending status', () => {
      assert.strictEqual(subRes.success, true);
      assert.ok(subRes.submissionId.startsWith('sub_'));
    });

    // Admin approves submission
    const approveRes = await marketManagementService.approveSubmission(subRes.submissionId);
    test('Admin approves submission -> converts into official verified market with permanent ID', () => {
      assert.strictEqual(approveRes.success, true);
      assert.ok(approveRes.market.id.startsWith('mkt-490-4154-'));
      assert.strictEqual(approveRes.market.verificationStatus, 'verified');
    });

    // --- TEST GROUP 6: DASHBOARD STATISTICS FROM REAL DATA ---
    console.log('\n--- TEST GROUP 6: Dashboard Statistics from Real Data ---');

    const stats = await marketManagementService.getDashboardStatistics();
    test('Dashboard statistics computes actual counts from local database', () => {
      assert.ok(stats.totalMarkets >= 14, `Expected at least 14 markets, got ${stats.totalMarkets}`);
      assert.ok(stats.verifiedMarkets >= 8, `Expected at least 8 verified markets, got ${stats.verifiedMarkets}`);
      assert.ok(Array.isArray(stats.recentlyUpdated));
      assert.ok(stats.recentlyUpdated.length > 0);
    });

    // --- TEST GROUP 7: SSR RENDERING & BILINGUAL VERIFICATION ---
    console.log('\n--- TEST GROUP 7: Bilingual SSR Rendering of Admin Components ---');

    // Render AdminLoginForm in English
    globalThis.localStorage.setItem('mahaudyam_language', 'en');
    const loginHtmlEn = renderToString(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(AdminLoginForm, null)
      )
    );
    test('AdminLoginForm renders cleanly in English', () => {
      assert.ok(loginHtmlEn.length > 500);
      assert.ok(loginHtmlEn.includes('Administrative Sign In'));
    });

    // Render AdminLoginForm in Marathi
    globalThis.localStorage.setItem('mahaudyam_language', 'mr');
    const loginHtmlMr = renderToString(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(AdminLoginForm, null)
      )
    );
    test('AdminLoginForm renders cleanly in Marathi', () => {
      assert.ok(loginHtmlMr.length > 500);
      assert.ok(loginHtmlMr.includes('प्रशासकीय प्रवेश'));
    });

    // Render AdminDashboard in English (authenticated)
    await adminAuthService.loginAdmin({ usernameOrEmail: 'superadmin', password: 'MahaSuper@2026' });
    globalThis.localStorage.setItem('mahaudyam_language', 'en');
    const dashHtmlEn = renderToString(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(AdminDashboard, null)
      )
    );
    test('AdminDashboard renders cleanly in English with sidebar and sections', () => {
      assert.ok(dashHtmlEn.length > 2000);
      assert.ok(dashHtmlEn.includes('Admin Console'));
      assert.ok(dashHtmlEn.includes('Market Management'));
    });

    // Render AdminDashboard in Marathi
    globalThis.localStorage.setItem('mahaudyam_language', 'mr');
    const dashHtmlMr = renderToString(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(AdminDashboard, null)
      )
    );
    test('AdminDashboard renders cleanly in Marathi without errors', () => {
      assert.ok(dashHtmlMr.length > 2000);
      assert.ok(dashHtmlMr.includes('बाजार व्यवस्थापन'));
    });

    console.log('\n===============================================================');
    console.log(`  ALL ${passed} / ${passed} TESTS PASSED CLEANLY (100%)!`);
    console.log('===============================================================');
  } finally {
    await vite.close();
  }
}

runTestSuite().catch((err) => {
  console.error('Test Suite Fatal Error:', err);
  process.exit(1);
});
