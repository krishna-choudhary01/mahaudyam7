/**
 * MahaUdyam — Central Synchronization & Authentication Server
 * 
 * Provides:
 * - Persistent multi-device user identity & authentication
 * - Monotonic revision sequence synchronization engine
 * - Conflict resolution and deletion tombstone tracking
 * - Real-time Server-Sent Events (SSE) notification streaming
 * - Zero external npm dependencies (uses native Node.js HTTP & SQLite)
 */

import http from 'node:http';
import url from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import { serverDb } from './db.js';
import { processAiChatRequest } from './aiService.js';

const DEFAULT_PORT = 3005;
const PORT = process.env.PORT || DEFAULT_PORT;
const HOST = process.env.HOST || '0.0.0.0';

// Active Server-Sent Events client connections: Map<userId, Set<ServerResponse>>
const sseClients = new Map();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Idempotency-Key, X-Client-Revision, X-Device-Id'
  });
  res.end(JSON.stringify(data));
}

function serveStatic(req, res) {
  const distDir = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    return sendJson(res, 404, { success: false, error: 'Static frontend not built yet. Run npm run build.' });
  }

  const parsed = new URL(req.url, 'http://localhost');
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/') pathname = '/index.html';

  let filePath = path.join(distDir, pathname);

  // Security check: ensure path is within distDir
  if (!filePath.startsWith(distDir)) {
    return sendJson(res, 403, { error: 'Forbidden' });
  }

  // If file doesn't exist, fallback to index.html for SPA routing
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable'
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    sendJson(res, 404, { error: 'Not found' });
  }
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 10 * 1024 * 1024) { // 10MB limit
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function extractToken(req) {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const parsed = new URL(req.url, 'http://localhost');
  return parsed.searchParams.get('token');
}

function authenticate(req) {
  const token = extractToken(req);
  if (!token) return null;
  return serverDb.verifySession(token);
}

function broadcastSyncEvent(userId, eventData) {
  const payload = `data: ${JSON.stringify(eventData)}\n\n`;
  // Broadcast to all active clients of this user
  const userConns = sseClients.get(userId);
  if (userConns) {
    for (const clientRes of userConns) {
      try { clientRes.write(payload); } catch (e) { userConns.delete(clientRes); }
    }
  }

  // If shared event, broadcast to all other connected users as well
  if (eventData.isShared) {
    for (const [uid, conns] of sseClients.entries()) {
      if (uid !== userId) {
        for (const clientRes of conns) {
          try { clientRes.write(payload); } catch (e) { conns.delete(clientRes); }
        }
      }
    }
  }
}

export async function handleApiRequest(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Idempotency-Key, X-Client-Revision, X-Device-Id'
    });
    res.end();
    return true;
  }

  const parsedUrl = new URL(req.url, 'http://localhost');
  const pathname = parsedUrl.pathname;

  if (!pathname.startsWith('/api/') && pathname !== '/api') {
    return false;
  }

  try {
    // 1. Health & Server Diagnostics Endpoint
    if (pathname === '/api/v1/health' && req.method === 'GET') {
      let clientCount = 0;
      for (const conns of sseClients.values()) clientCount += conns.size;

      sendJson(res, 200, {
        status: 'UP',
        service: 'MahaUdyam Central Synchronization API',
        version: '1.0.0',
        engine: 'Node.js SQLite WAL',
        currentRevision: serverDb.getCurrentRevision(),
        activeSseClients: clientCount,
        timestamp: new Date().toISOString()
      });
      return true;
    }

    // 2. Authentication: Register
    if (pathname === '/api/v1/auth/register' && req.method === 'POST') {
      const body = await parseBody(req);
      if (!body.mobile || !body.password || !body.name) {
        sendJson(res, 400, { success: false, error: 'Mobile, password, and name are required.' });
        return true;
      }

      try {
        const user = serverDb.createUser(body);
        const session = serverDb.createSession(user.userId || user.user_id);
        sendJson(res, 201, {
          success: true,
          user: {
            userId: user.userId || user.user_id,
            mobile: user.mobile,
            name: user.name,
            preferredLanguage: user.preferredLanguage || user.preferred_language,
            language: user.preferredLanguage || user.preferred_language,
            districtCode: user.districtCode || user.district_code,
            talukaCode: user.talukaCode || user.taluka_code,
            villageCode: user.villageCode || user.village_code,
            role: user.role,
            createdAt: user.createdAt || user.created_at,
            updatedAt: user.updatedAt || user.updated_at
          },
          token: session.token,
          expiresAt: session.expiresAt
        });
        return true;
      } catch (err) {
        sendJson(res, 409, { success: false, error: err.message });
        return true;
      }
    }

    // 3. Authentication: Login
    if (pathname === '/api/v1/auth/login' && req.method === 'POST') {
      const body = await parseBody(req);
      if (!body.mobile || !body.password) {
        sendJson(res, 400, { success: false, error: 'Mobile and password are required.' });
        return true;
      }

      const user = serverDb.authenticateUser(body.mobile, body.password);
      if (!user) {
        sendJson(res, 401, { success: false, error: 'Invalid mobile number or password.' });
        return true;
      }

      const session = serverDb.createSession(user.userId || user.user_id);
      sendJson(res, 200, {
        success: true,
        user: {
          userId: user.userId || user.user_id,
          mobile: user.mobile,
          name: user.name,
          preferredLanguage: user.preferredLanguage || user.preferred_language,
          language: user.preferredLanguage || user.preferred_language,
          districtCode: user.districtCode || user.district_code,
          talukaCode: user.talukaCode || user.taluka_code,
          villageCode: user.villageCode || user.village_code,
          role: user.role,
          createdAt: user.createdAt || user.created_at,
          updatedAt: user.updatedAt || user.updated_at
        },
        token: session.token,
        expiresAt: session.expiresAt
      });
      return true;
    }

    // 4. Authentication: Verify Current User (Me)
    if (pathname === '/api/v1/auth/me' && req.method === 'GET') {
      const user = authenticate(req);
      if (!user) {
        sendJson(res, 401, { success: false, error: 'Unauthorized session.' });
        return true;
      }
      sendJson(res, 200, { success: true, user });
      return true;
    }

    // 5. Synchronization: Push Mutations
    if (pathname === '/api/v1/sync/push' && req.method === 'POST') {
      const user = authenticate(req);
      const body = await parseBody(req);
      const { mutations = [], idempotencyKey } = body;

      if (!Array.isArray(mutations)) {
        sendJson(res, 400, { success: false, error: 'Mutations must be an array.' });
        return true;
      }

      // Check authorization: allow authenticated entrepreneurs, or anonymous public community reports
      let effectiveUserId = user ? user.userId : null;
      if (!effectiveUserId) {
        const isAllCommunity = mutations.length > 0 && mutations.every(
          (m) => m.isShared || m.storeName === 'customerDemandReports'
        );
        if (isAllCommunity) {
          effectiveUserId = 'community_user';
        } else {
          sendJson(res, 401, { success: false, error: 'Authentication required to push mutations.' });
          return true;
        }
      }

      // Idempotency check: if client sent duplicate request due to retry, return stored response
      if (idempotencyKey) {
        const cached = serverDb.getIdempotentResult(idempotencyKey, effectiveUserId);
        if (cached) {
          sendJson(res, 200, cached);
          return true;
        }
      }

      const result = serverDb.applyMutations(effectiveUserId, mutations);

      const responseData = {
        success: true,
        appliedCount: result.applied.length,
        applied: result.applied,
        latestRevision: result.latestRevision,
        timestamp: new Date().toISOString()
      };

      if (idempotencyKey) {
        serverDb.saveIdempotentResult(idempotencyKey, effectiveUserId, responseData);
      }

      // Notify other connected devices in real time via SSE
      const hasShared = mutations.some((m) => m.isShared || m.storeName === 'customerDemandReports');
      broadcastSyncEvent(effectiveUserId, {
        type: 'SYNC_RECORDS_UPDATED',
        userId: effectiveUserId,
        revision: result.latestRevision,
        count: result.applied.length,
        isShared: hasShared
      });

      sendJson(res, 200, responseData);
      return true;
    }

    // 6. Synchronization: Pull Incremental Changes
    if (pathname === '/api/v1/sync/pull' && req.method === 'GET') {
      const user = authenticate(req);
      const effectiveUserId = user ? user.userId : 'community_user';

      const cursor = Number(parsedUrl.searchParams.get('cursor') || 0);
      const result = serverDb.getChangesSince(effectiveUserId, cursor);

      sendJson(res, 200, {
        success: true,
        cursor,
        latestRevision: result.latestRevision,
        changeCount: result.changes.length,
        changes: result.changes,
        timestamp: new Date().toISOString()
      });
      return true;
    }

    // 7. Synchronization: Server-Sent Events (SSE) Stream
    if (pathname === '/api/v1/sync/events' && req.method === 'GET') {
      const user = authenticate(req);
      const effectiveUserId = user ? user.userId : 'guest_listener';

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      res.write(`data: ${JSON.stringify({ type: 'CONNECTED', currentRevision: serverDb.getCurrentRevision() })}\n\n`);

      if (!sseClients.has(effectiveUserId)) {
        sseClients.set(effectiveUserId, new Set());
      }
      const userSet = sseClients.get(effectiveUserId);
      userSet.add(res);

      // Keep-alive heartbeat every 20 seconds
      const heartbeat = setInterval(() => {
        try { res.write(': heartbeat\n\n'); } catch (e) { clearInterval(heartbeat); }
      }, 20000);

      req.on('close', () => {
        clearInterval(heartbeat);
        userSet.delete(res);
        if (userSet.size === 0) sseClients.delete(effectiveUserId);
      });

      return true;
    }

    // 8. AI Business Advisor Chat & Reality Check
    if (pathname === '/api/v1/ai/chat' && req.method === 'POST') {
      const body = await parseBody(req);
      const { message, context, history, language } = body;

      const aiResponse = await processAiChatRequest({
        message,
        context,
        history,
        language
      });

      sendJson(res, 200, aiResponse);
      return true;
    }

    // 404 Route Not Found for unknown /api/ routes
    sendJson(res, 404, { success: false, error: `Route ${req.method} ${pathname} not found.` });
    return true;

  } catch (err) {
    console.error('Server error handling request:', err);
    sendJson(res, 500, { success: false, error: err.message || 'Internal Server Error' });
    return true;
  }
}

export function createServer() {
  return http.createServer(async (req, res) => {
    const urlPath = req.url ? new URL(req.url, 'http://localhost').pathname : '';
    if (urlPath.startsWith('/api/') || urlPath === '/api' || req.method === 'OPTIONS') {
      await handleApiRequest(req, res);
    } else {
      serveStatic(req, res);
    }
  });
}

function startServer(port = PORT, host = HOST, attempts = 0) {
  const server = createServer();
  server.on('error', (err) => {
    if ((err.code === 'EADDRINUSE' || err.code === 'EACCES') && attempts < 5) {
      const nextPort = Number(port) + 1;
      console.warn(`[Server] Port ${port} unavailable (${err.code}). Trying port ${nextPort}...`);
      startServer(nextPort, host, attempts + 1);
    } else {
      console.error(`[Server] Failed to bind server:`, err);
    }
  });
  server.listen(port, host, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 MahaUdyam Central Sync Server running on http://${host}:${port}`);
    console.log(`   Database: SQLite WAL in server/data/mahaudyam.db`);
    console.log(`   Health check: http://localhost:${port}/api/v1/health`);
    console.log(`======================================================\n`);
  });
  return server;
}

// Start server if executed directly
if (process.argv[1] && process.argv[1].endsWith('index.js')) {
  startServer(PORT, HOST);
}
