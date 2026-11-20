import http from 'node:http';
import { createServer } from '../server/index.js';

console.log('Testing Central Server Initialization & Core API Endpoints...');

const server = createServer();
server.listen(3002, '127.0.0.1', async () => {
  try {
    // 1. Health Check
    const health = await fetch('http://127.0.0.1:3002/api/v1/health').then(r => r.json());
    console.log('1. Health response:', health);
    if (health.status !== 'UP') throw new Error('Health check failed');

    // 2. Login with Demo Account
    const loginRes = await fetch('http://127.0.0.1:3002/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: '9999999999', password: 'Maha@123' })
    }).then(r => r.json());
    console.log('2. Demo Login response:', loginRes.success, 'User ID:', loginRes.user?.userId);
    if (!loginRes.success || !loginRes.token) throw new Error('Login failed');

    // 3. Push Mutation
    const token = loginRes.token;
    const pushRes = await fetch('http://127.0.0.1:3002/api/v1/sync/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        idempotencyKey: 'test_key_01',
        mutations: [
          {
            storeName: 'unsoldStock',
            recordId: 'stock_test_101',
            operation: 'PUT',
            payload: { productName: 'Fresh Alphonso Mangoes', quantity: 50, price: 120 }
          }
        ]
      })
    }).then(r => r.json());
    console.log('3. Push response:', pushRes);
    if (!pushRes.success || pushRes.appliedCount !== 1) throw new Error('Push failed');

    // 4. Pull Changes
    const pullRes = await fetch('http://127.0.0.1:3002/api/v1/sync/pull?cursor=0', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json());
    console.log('4. Pull response:', pullRes.changeCount, 'changes found.');
    if (!pullRes.success || pullRes.changeCount < 1) throw new Error('Pull failed');
    console.log('   Payload pulled:', pullRes.changes[0].payload);

    console.log('\n✅ Server basic tests PASSED!');
  } catch (err) {
    console.error('❌ Server test failed:', err);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
});
