/**
 * MahaUdyam — Central Server Persistent Database
 * 
 * Uses Node.js built-in SQLite engine (node:sqlite DatabaseSync) for fast, robust,
 * ACID-compliant, dependency-free local and server persistence.
 * Includes automatic table migrations, indexing, and seed initialization for Demo accounts.
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DATA_DIR = path.resolve(process.cwd(), 'server', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'mahaudyam.db');

export class ServerDatabase {
  constructor(dbFilePath = DB_PATH) {
    this.dbFilePath = dbFilePath;
    this.sqlite = new DatabaseSync(dbFilePath);
    this.initSchema();
  }

  initSchema() {
    // 1. Enable WAL mode for high concurrency
    this.sqlite.exec('PRAGMA journal_mode = WAL;');
    this.sqlite.exec('PRAGMA foreign_keys = ON;');

    // 2. Users table (permanent central identity)
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        mobile TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        preferred_language TEXT DEFAULT 'mr',
        district_code INTEGER,
        taluka_code INTEGER,
        village_code INTEGER,
        role TEXT DEFAULT 'entrepreneur',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
    `);

    // 3. User Sessions
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    `);

    // 4. Central Synchronized Records Store
    // Supports multi-tenant isolation, monotonic revisions, and deletion tombstones
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS sync_records (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        store_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        is_shared INTEGER DEFAULT 0,
        payload_json TEXT NOT NULL,
        revision INTEGER NOT NULL,
        is_deleted INTEGER DEFAULT 0,
        updated_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (user_id, store_name, record_id)
      );
      CREATE INDEX IF NOT EXISTS idx_sync_user_rev ON sync_records(user_id, revision);
      CREATE INDEX IF NOT EXISTS idx_sync_shared_rev ON sync_records(is_shared, revision);
      CREATE INDEX IF NOT EXISTS idx_sync_store ON sync_records(store_name);
    `);

    // 5. Global Revision Sequence Table
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS sync_meta (
        key TEXT PRIMARY KEY,
        val TEXT NOT NULL
      );
    `);

    const revRow = this.sqlite.prepare("SELECT val FROM sync_meta WHERE key = 'current_revision'").get();
    if (!revRow) {
      this.sqlite.prepare("INSERT INTO sync_meta (key, val) VALUES ('current_revision', '0')").run();
    }

    // 6. Idempotency tracking table (prevents duplicate mutation application on network retries)
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        idempotency_key TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        result_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_idempotency_created ON idempotency_keys(created_at);
    `);

    // Seed official Demo Entrepreneur account if not present
    this.seedDemoUser();
  }

  getNextRevision() {
    this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      const row = this.sqlite.prepare("SELECT val FROM sync_meta WHERE key = 'current_revision'").get();
      const currentRev = Number(row?.val || 0) + 1;
      this.sqlite.prepare("UPDATE sync_meta SET val = ? WHERE key = 'current_revision'").run(String(currentRev));
      this.sqlite.exec('COMMIT');
      return currentRev;
    } catch (err) {
      this.sqlite.exec('ROLLBACK');
      throw err;
    }
  }

  getCurrentRevision() {
    const row = this.sqlite.prepare("SELECT val FROM sync_meta WHERE key = 'current_revision'").get();
    return Number(row?.val || 0);
  }

  seedDemoUser() {
    const demoMobile = '9999999999';
    const existing = this.sqlite.prepare('SELECT user_id FROM users WHERE mobile = ?').get(demoMobile);
    if (!existing) {
      const now = new Date().toISOString();
      const hash = this.hashPassword('Maha@123');
      this.sqlite.prepare(`
        INSERT INTO users (user_id, mobile, password_hash, name, preferred_language, district_code, taluka_code, village_code, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'demo-user-dev-9999',
        demoMobile,
        hash,
        'Demo Entrepreneur',
        'mr',
        490,
        4154,
        551201,
        'entrepreneur',
        now,
        now
      );
    }
  }

  hashPassword(password) {
    return crypto.createHash('sha256').update(password + '_mahaudyam_salt_2026').digest('hex');
  }

  // --- User Authentication Methods ---
  createUser({ mobile, password, name, preferredLanguage = 'mr', districtCode, talukaCode, villageCode }) {
    const cleanMobile = mobile.trim();
    const existing = this.sqlite.prepare('SELECT user_id FROM users WHERE mobile = ?').get(cleanMobile);
    if (existing) {
      throw new Error('A user with this mobile number already exists.');
    }

    const userId = `usr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const passwordHash = this.hashPassword(password);
    const now = new Date().toISOString();

    this.sqlite.prepare(`
      INSERT INTO users (user_id, mobile, password_hash, name, preferred_language, district_code, taluka_code, village_code, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'entrepreneur', ?, ?)
    `).run(userId, cleanMobile, passwordHash, name, preferredLanguage, districtCode || null, talukaCode || null, villageCode || null, now, now);

    return {
      userId,
      user_id: userId,
      mobile: cleanMobile,
      name,
      preferredLanguage,
      preferred_language: preferredLanguage,
      districtCode: districtCode || null,
      district_code: districtCode || null,
      talukaCode: talukaCode || null,
      taluka_code: talukaCode || null,
      villageCode: villageCode || null,
      village_code: villageCode || null,
      role: 'entrepreneur',
      createdAt: now,
      created_at: now,
      updatedAt: now,
      updated_at: now
    };
  }

  authenticateUser(mobile, password) {
    const cleanMobile = mobile.trim();
    const user = this.sqlite.prepare('SELECT * FROM users WHERE mobile = ?').get(cleanMobile);
    if (!user) return null;

    const hash = this.hashPassword(password);
    if (user.password_hash !== hash) return null;

    const { password_hash, ...safeUser } = user;
    return {
      ...safeUser,
      userId: safeUser.user_id,
      preferredLanguage: safeUser.preferred_language,
      districtCode: safeUser.district_code,
      talukaCode: safeUser.taluka_code,
      villageCode: safeUser.village_code,
      createdAt: safeUser.created_at,
      updatedAt: safeUser.updated_at
    };
  }

  getUserById(userId) {
    const user = this.sqlite.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
    if (!user) return null;
    const { password_hash, ...safeUser } = user;
    return {
      ...safeUser,
      userId: safeUser.user_id,
      preferredLanguage: safeUser.preferred_language,
      districtCode: safeUser.district_code,
      talukaCode: safeUser.taluka_code,
      villageCode: safeUser.village_code,
      createdAt: safeUser.created_at,
      updatedAt: safeUser.updated_at
    };
  }

  createSession(userId) {
    const sessionId = `sess_${crypto.randomBytes(16).toString('hex')}`;
    const token = `mhy_${crypto.randomBytes(32).toString('hex')}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    this.sqlite.prepare(`
      INSERT INTO sessions (session_id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(sessionId, userId, token, expiresAt, now.toISOString());

    return { sessionId, token, expiresAt };
  }

  verifySession(token) {
    if (!token) return null;

    // 1. Direct support for development demo tokens & offline demo sessions
    if (token.startsWith('dev_demo_token_') || token === 'demo-token' || token.includes('demo')) {
      const demoUser = this.getUserById('demo-user-dev-9999');
      if (demoUser) {
        return {
          userId: demoUser.userId,
          sessionId: 'sess_demo_permanent',
          name: demoUser.name,
          mobile: demoUser.mobile,
          preferredLanguage: demoUser.preferredLanguage,
          districtCode: demoUser.districtCode,
          talukaCode: demoUser.talukaCode,
          villageCode: demoUser.villageCode,
          role: demoUser.role
        };
      }
    }

    // 2. Direct support for dev fallback tokens (dev_token_<ts>_<userId>)
    if (token.startsWith('dev_token_')) {
      const parts = token.split('_');
      const possibleUserId = parts.slice(2).join('_');
      if (possibleUserId) {
        const user = this.getUserById(possibleUserId);
        if (user) {
          return {
            userId: user.userId,
            sessionId: `sess_${user.userId}`,
            name: user.name,
            mobile: user.mobile,
            preferredLanguage: user.preferredLanguage,
            districtCode: user.districtCode,
            talukaCode: user.talukaCode,
            villageCode: user.villageCode,
            role: user.role
          };
        }
      }
    }

    // 3. Central session verification in SQLite
    const session = this.sqlite.prepare(`
      SELECT s.*, u.name, u.mobile, u.preferred_language, u.district_code, u.taluka_code, u.village_code, u.role
      FROM sessions s
      JOIN users u ON s.user_id = u.user_id
      WHERE s.token = ?
    `).get(token);

    if (!session) return null;
    if (new Date(session.expires_at) < new Date()) {
      this.sqlite.prepare('DELETE FROM sessions WHERE session_id = ?').run(session.session_id);
      return null;
    }

    return {
      userId: session.user_id,
      sessionId: session.session_id,
      name: session.name,
      mobile: session.mobile,
      preferredLanguage: session.preferred_language,
      districtCode: session.district_code,
      talukaCode: session.taluka_code,
      villageCode: session.village_code,
      role: session.role
    };
  }

  // --- Synchronization Methods ---
  getIdempotentResult(key, userId) {
    const row = this.sqlite.prepare('SELECT result_json FROM idempotency_keys WHERE idempotency_key = ? AND user_id = ?').get(key, userId);
    if (row) {
      try { return JSON.parse(row.result_json); } catch (e) { return null; }
    }
    return null;
  }

  saveIdempotentResult(key, userId, result) {
    const now = new Date().toISOString();
    this.sqlite.prepare(`
      INSERT OR REPLACE INTO idempotency_keys (idempotency_key, user_id, result_json, created_at)
      VALUES (?, ?, ?, ?)
    `).run(key, userId, JSON.stringify(result), now);
  }

  /**
   * Apply a batch of incoming mutations from an authenticated client
   */
  applyMutations(userId, mutations) {
    const applied = [];
    const now = new Date().toISOString();

    for (const mut of mutations) {
      const { storeName, recordId, operation, payload, clientRevision = 0, isShared = 0 } = mut;
      if (!storeName || !recordId || !operation) continue;

      const recordKey = `${userId}_${storeName}_${recordId}`;
      const nextRev = this.getNextRevision();
      const isDeleted = operation === 'DELETE' ? 1 : 0;
      const payloadStr = payload ? JSON.stringify(payload) : '{}';

      this.sqlite.prepare(`
        INSERT INTO sync_records (id, user_id, store_name, record_id, is_shared, payload_json, revision, is_deleted, updated_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, store_name, record_id) DO UPDATE SET
          payload_json = excluded.payload_json,
          revision = excluded.revision,
          is_deleted = excluded.is_deleted,
          is_shared = excluded.is_shared,
          updated_at = excluded.updated_at
      `).run(recordKey, userId, storeName, recordId, isShared ? 1 : 0, payloadStr, nextRev, isDeleted, now, now);

      applied.push({
        storeName,
        recordId,
        serverRevision: nextRev,
        status: 'applied',
        updatedAt: now
      });
    }

    return { applied, latestRevision: this.getCurrentRevision() };
  }

  /**
   * Pull records for a user that have changed since client revision
   */
  getChangesSince(userId, sinceRevision = 0) {
    const rev = Number(sinceRevision) || 0;
    
    // Fetch private records owned by this user AND shared community records
    const rows = this.sqlite.prepare(`
      SELECT store_name, record_id, payload_json, revision, is_deleted, updated_at, is_shared
      FROM sync_records
      WHERE (user_id = ? OR is_shared = 1) AND revision > ?
      ORDER BY revision ASC
    `).all(userId, rev);

    const changes = rows.map((r) => {
      let payload = {};
      try { payload = JSON.parse(r.payload_json); } catch (e) {}
      return {
        storeName: r.store_name,
        recordId: r.record_id,
        operation: r.is_deleted === 1 ? 'DELETE' : 'PUT',
        payload,
        revision: r.revision,
        isShared: Boolean(r.is_shared),
        updatedAt: r.updated_at
      };
    });

    return {
      changes,
      latestRevision: this.getCurrentRevision()
    };
  }

  close() {
    this.sqlite.close();
  }
}

export const serverDb = new ServerDatabase();
