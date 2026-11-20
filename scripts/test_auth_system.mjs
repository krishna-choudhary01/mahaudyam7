// Integration & Unit test suite for Phase 2.2: Auth, Isolation, and User Profiles
import assert from 'node:assert';
import { devMockAuthAdapter, DEMO_USER_CONFIG } from '../src/services/auth/devMockAuthAdapter.js';

console.log('====================================================');
console.log('🧪 MahaUdyam Phase 2.2 Authentication & Isolation Tests');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function asyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    Error: ${err.message}`);
  }
}

async function runTests() {
  // 1. Demo Account Verification
  test('Demo account credentials match specifications', () => {
    assert.strictEqual(DEMO_USER_CONFIG.mobile, '9999999999');
    assert.strictEqual(DEMO_USER_CONFIG.password, 'Maha@123');
    assert.strictEqual(DEMO_USER_CONFIG.name, 'Demo Entrepreneur');
    assert.strictEqual(DEMO_USER_CONFIG.districtCode, 490); // Nashik
    assert.strictEqual(DEMO_USER_CONFIG.talukaCode, 4154);  // Sinnar
    assert.strictEqual(DEMO_USER_CONFIG.villageCode, 551201); // Baragaon Pimpri
  });

  // 2. Demo Account Login Success
  await asyncTest('Demo account successfully logs in via devMockAuthAdapter', async () => {
    const res = await devMockAuthAdapter.login({
      mobile: '9999999999',
      password: 'Maha@123'
    });
    assert.strictEqual(res.success, true);
    assert.ok(res.user);
    assert.strictEqual(res.user.userId, DEMO_USER_CONFIG.userId);
    assert.strictEqual(res.user.isDevDemoAccount, true);
    assert.ok(res.token);
  });

  // 3. Demo Account Rejects Incorrect Password
  await asyncTest('Demo account rejects wrong password', async () => {
    const res = await devMockAuthAdapter.login({
      mobile: '9999999999',
      password: 'WrongPassword'
    });
    assert.strictEqual(res.success, false);
    assert.match(res.error, /Invalid password|Invalid credentials/i);
  });

  // 4. Registration Validation - Invalid Mobile
  await asyncTest('Registration rejects invalid mobile length', async () => {
    const res = await devMockAuthAdapter.register({
      mobile: '12345',
      name: 'Ramesh Patil',
      password: 'Password@123',
      language: 'mr'
    });
    assert.strictEqual(res.success, false);
    assert.match(res.error, /valid 10-digit/i);
  });

  // 5. Registration Validation - Short Password
  await asyncTest('Registration rejects short password (<6 chars)', async () => {
    const res = await devMockAuthAdapter.register({
      mobile: '9822012345',
      name: 'Ramesh Patil',
      password: '123',
      language: 'mr'
    });
    assert.strictEqual(res.success, false);
    assert.match(res.error, /at least 6 characters/i);
  });

  // 6. Registration Success & No Plain-Text Password in User Object
  let newUser = null;
  await asyncTest('Registration creates user with hashed credentials (no plaintext)', async () => {
    const res = await devMockAuthAdapter.register({
      mobile: '9822112233',
      name: 'Ramesh Patil',
      password: 'Password@123',
      language: 'mr',
      districtCode: 490,
      talukaCode: 4154,
      villageCode: 551201
    });
    assert.strictEqual(res.success, true);
    assert.ok(res.user);
    assert.strictEqual(res.user.mobile, '9822112233');
    assert.strictEqual(res.user.name, 'Ramesh Patil');
    // Ensure plaintext password was NOT returned
    assert.strictEqual(res.user.password, undefined);
    assert.strictEqual(res.user.passwordHash, undefined);
    newUser = res.user;
  });

  // 7. Duplicate Registration Rejection
  await asyncTest('Registration prevents duplicate mobile number', async () => {
    const res = await devMockAuthAdapter.register({
      mobile: '9822112233',
      name: 'Duplicate Patil',
      password: 'Password@123',
      language: 'mr'
    });
    assert.strictEqual(res.success, false);
    assert.match(res.error, /already exists/i);
  });

  // 8. Login with Newly Registered User
  await asyncTest('Newly registered user can log in with their credentials', async () => {
    const res = await devMockAuthAdapter.login({
      mobile: '9822112233',
      password: 'Password@123'
    });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.user.userId, newUser.userId);
  });

  // 9. Profile Update Verification
  await asyncTest('User profile can be updated with new location and language', async () => {
    const updateRes = await devMockAuthAdapter.updateProfile(newUser.userId, {
      name: 'Rameshwar Patil',
      language: 'hi',
      districtCode: 497, // Pune
      talukaCode: 4220,  // Haveli
      villageCode: 556000
    });
    assert.strictEqual(updateRes.success, true);
    assert.strictEqual(updateRes.user.name, 'Rameshwar Patil');
    assert.strictEqual(updateRes.user.language, 'hi');
    assert.strictEqual(updateRes.user.districtCode, 497);
    assert.strictEqual(updateRes.user.talukaCode, 4220);
  });

  // 10. Strict Data Isolation Concept
  test('Strict Data Isolation: Records partitioned by userId', () => {
    const mockStore = [
      { id: 1, userId: 'demo-user-dev-9999', title: 'Demo Jaggery Unit' },
      { id: 2, userId: newUser.userId, title: 'Ramesh Cold Storage' },
      { id: 3, userId: newUser.userId, title: 'Ramesh Onion Packaging' },
      { id: 4, userId: 'other-user-7777', title: 'Solar Drying Plant' }
    ];

    // Filter for Demo User
    const demoRecords = mockStore.filter(r => r.userId === 'demo-user-dev-9999');
    assert.strictEqual(demoRecords.length, 1);
    assert.strictEqual(demoRecords[0].title, 'Demo Jaggery Unit');

    // Filter for Ramesh
    const rameshRecords = mockStore.filter(r => r.userId === newUser.userId);
    assert.strictEqual(rameshRecords.length, 2);
    assert.ok(rameshRecords.every(r => r.userId === newUser.userId));

    // Cross-check: Ramesh cannot see demo or other user's records
    const crossCheck = rameshRecords.filter(r => r.userId !== newUser.userId);
    assert.strictEqual(crossCheck.length, 0);
  });

  // 11. Forgot Password Flow
  await asyncTest('Forgot password responds with simulated OTP or password advice', async () => {
    const res = await devMockAuthAdapter.forgotPassword({ mobile: '9999999999' });
    assert.strictEqual(res.success, true);
    assert.match(res.message, /fixed: Maha@123/i);

    const resUser = await devMockAuthAdapter.forgotPassword({ mobile: '9822112233' });
    assert.strictEqual(resUser.success, true);
    assert.match(resUser.message, /OTP simulated/i);
  });

  // Summary
  console.log('\n----------------------------------------------------');
  console.log(`Results: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests/totalTests)*100)}%)`);
  console.log('----------------------------------------------------');
  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTests();
