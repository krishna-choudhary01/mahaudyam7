/**
 * MahaUdyam — Central Synchronization Engine
 * 
 * Provides:
 * - Offline-first bidirectional synchronization
 * - Outgoing mutation queue with idempotency keys and exponential backoff
 * - Incoming incremental pull with monotonic revision cursors
 * - Deletion tombstone handling
 * - Real-time cross-device updates via Server-Sent Events (SSE) & polling fallback
 * - First-sync new device bootstrap (hydrates local Dexie without overwriting server data)
 * - Conflict tracking and observable sync status for UI
 */

import { db } from '../db/index.js';

export const SYNC_STATUS = {
  SYNCED: 'synced',
  SYNCING: 'syncing',
  OFFLINE: 'offline',
  PENDING: 'pending',
  FAILED: 'failed'
};

class SyncEngine {
  constructor() {
    this.status = SYNC_STATUS.SYNCED;
    this.pendingCount = 0;
    this.lastSyncTime = null;
    this.lastError = null;
    this.activeUserId = null;
    this.authToken = null;
    this.listeners = new Set();
    this.isSyncing = false;
    this.isPulling = false;
    this.sseSource = null;
    this.pollInterval = null;
    this.isInitialized = false;

    // Retry exponential backoff tracker: Map<itemId, nextRetryTimestamp>
    this.retryBackoff = new Map();
  }

  getApiBaseUrl() {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
    // Relative URL when running in browser (proxied by Vite or production reverse proxy)
    if (typeof window !== 'undefined') {
      return '';
    }
    return 'http://127.0.0.1:3005';
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    const state = this.getState();
    this.listeners.forEach((fn) => {
      try { fn(state); } catch (e) { console.error('Sync listener error:', e); }
    });
  }

  getState() {
    return {
      status: this.status,
      pendingCount: this.pendingCount,
      lastSyncTime: this.lastSyncTime,
      lastError: this.lastError,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      activeUserId: this.activeUserId
    };
  }

  async init(user, token) {
    if (user && user.userId) {
      this.activeUserId = user.userId;
      this.authToken = token || localStorage.getItem('maha_auth_token');
    }

    await this.refreshPendingCount();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[SyncEngine] Network restored. Triggering automatic sync.');
        this.status = this.pendingCount > 0 ? SYNC_STATUS.PENDING : SYNC_STATUS.SYNCED;
        this.notifyListeners();
        this.syncNow();
        this.startRealTimeUpdates();
      });

      window.addEventListener('offline', () => {
        console.log('[SyncEngine] Device went offline.');
        this.status = SYNC_STATUS.OFFLINE;
        this.notifyListeners();
        this.stopRealTimeUpdates();
      });

      // Start SSE & polling if online and user authenticated
      if (this.activeUserId && this.authToken && navigator.onLine) {
        this.startRealTimeUpdates();
      }
    }

    this.isInitialized = true;
  }

  setSession(user, token) {
    this.activeUserId = user ? user.userId : null;
    this.authToken = token;
    if (token) {
      try { localStorage.setItem('maha_auth_token', token); } catch (e) {}
    } else {
      try { localStorage.removeItem('maha_auth_token'); } catch (e) {}
    }

    if (this.activeUserId && this.authToken) {
      this.startRealTimeUpdates();
      this.syncNow(); // Perform initial sync on login
    } else {
      this.stopRealTimeUpdates();
    }
    this.notifyListeners();
  }

  async refreshPendingCount() {
    try {
      if (db && db.syncQueue) {
        if (!db.isOpen()) await db.open();
        this.pendingCount = await db.syncQueue.where('status').equals('pending').count();
      } else {
        this.pendingCount = 0;
      }
    } catch (e) {
      this.pendingCount = 0;
    }
    return this.pendingCount;
  }

  /**
   * Enqueue a local mutation into Dexie syncQueue and immediately attempt sync if online
   */
  async enqueueMutation({ storeName, recordId, operation = 'PUT', payload = {}, userId, isShared = false }) {
    const effectiveUserId = userId || this.activeUserId || 'guest_user';
    const nowIso = new Date().toISOString();
    const idempotencyKey = `idemp_${effectiveUserId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const queueItem = {
      actionType: operation,
      storeName,
      recordId: String(recordId),
      payload,
      userId: effectiveUserId,
      isShared: isShared ? 1 : 0,
      idempotencyKey,
      status: 'pending',
      retryCount: 0,
      createdAt: nowIso
    };

    try {
      if (db && db.syncQueue) {
        await db.syncQueue.add(queueItem);
      }
    } catch (e) {
      console.warn('[SyncEngine] Failed to write to syncQueue IndexedDB:', e);
    }

    await this.refreshPendingCount();

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (isOnline) {
      this.syncNow();
    } else {
      this.status = SYNC_STATUS.OFFLINE;
      this.notifyListeners();
    }

    return queueItem;
  }

  /**
   * Main sync trigger: Pushes outgoing queue, then pulls incoming remote changes
   */
  async syncNow() {
    if (this.isSyncing) return { inProgress: true };
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    if (!isOnline) {
      this.status = SYNC_STATUS.OFFLINE;
      this.notifyListeners();
      return { offline: true };
    }

    if (!this.authToken) {
      // User is not logged into central account. Check if there are public community records to push.
      await this.refreshPendingCount();
      if (this.pendingCount > 0) {
        try {
          const outgoingResult = await this.processOutgoingQueue();
          if (outgoingResult && outgoingResult.pushed > 0) {
            await this.refreshPendingCount();
            this.lastSyncTime = new Date().toISOString();
            this.status = this.pendingCount > 0 ? SYNC_STATUS.PENDING : SYNC_STATUS.SYNCED;
            this.notifyListeners();
            return { success: true, pushed: outgoingResult.pushed, pulled: 0 };
          }
        } catch (e) {
          console.warn('[SyncEngine] Background push for anonymous community item skipped:', e.message);
        }
      }
      this.status = this.pendingCount > 0 ? SYNC_STATUS.PENDING : SYNC_STATUS.SYNCED;
      this.notifyListeners();
      return { unauthenticated: true };
    }

    this.isSyncing = true;
    this.status = SYNC_STATUS.SYNCING;
    this.lastError = null;
    this.notifyListeners();

    try {
      // 1. Process Outgoing Mutations Queue
      const outgoingResult = await this.processOutgoingQueue();

      // 2. Pull Incoming Changes from Central Server
      const incomingResult = await this.pullRemoteChanges();

      await this.refreshPendingCount();

      this.lastSyncTime = new Date().toISOString();
      this.status = this.pendingCount > 0 ? SYNC_STATUS.PENDING : SYNC_STATUS.SYNCED;
      this.notifyListeners();

      return {
        success: true,
        pushed: outgoingResult.pushed,
        pulled: incomingResult.pulled,
        latestRevision: incomingResult.latestRevision
      };
    } catch (err) {
      console.warn('[SyncEngine] Sync attempt failed:', err.message);
      this.lastError = err.message || 'Sync error';
      await this.refreshPendingCount();
      // In offline-first architecture, if network/server is unreachable, retain pending status gracefully
      const currentlyOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!currentlyOnline) {
        this.status = SYNC_STATUS.OFFLINE;
      } else if (this.pendingCount > 0) {
        this.status = SYNC_STATUS.FAILED;
      } else {
        // If 0 pending local items, local records are clean and safe in IndexedDB
        this.status = SYNC_STATUS.SYNCED;
      }
      this.notifyListeners();
      return { success: false, error: err.message };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Push pending mutations from Dexie syncQueue to central API
   */
  async processOutgoingQueue() {
    if (!db || !db.syncQueue) return { pushed: 0 };
    if (!db.isOpen()) await db.open();

    const pendingItems = await db.syncQueue
      .where('status')
      .equals('pending')
      .limit(50)
      .toArray();

    if (pendingItems.length === 0) return { pushed: 0 };

    const now = Date.now();
    // Filter out items in exponential backoff delay
    const eligibleItems = pendingItems.filter((item) => {
      const nextRetry = this.retryBackoff.get(item.id);
      return !nextRetry || nextRetry <= now;
    });

    if (eligibleItems.length === 0) return { pushed: 0 };

    const batchKey = `batch_${this.activeUserId}_${Date.now()}`;
    const mutations = eligibleItems.map((item) => ({
      storeName: item.storeName,
      recordId: item.recordId,
      operation: item.actionType || 'PUT',
      payload: item.payload,
      isShared: item.isShared
    }));

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (this.authToken) {
        headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      const res = await fetch(`${this.getApiBaseUrl()}/api/v1/sync/push`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          idempotencyKey: batchKey,
          mutations
        })
      });

      if (!res.ok) {
        if (res.status === 401) {
          console.warn('[SyncEngine] Session token unauthorized (401). Clearing stale token.');
          this.authToken = null;
          try { localStorage.removeItem('maha_auth_token'); } catch (e) {}
          await this.refreshPendingCount();
          return { pushed: 0, unauthorized: true };
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with HTTP ${res.status}`);
      }

      const data = await res.json();

      // Successfully applied: Remove synced items from Dexie queue
      const syncedIds = eligibleItems.map((i) => i.id);
      await db.syncQueue.bulkDelete(syncedIds);
      for (const id of syncedIds) this.retryBackoff.delete(id);

      return { pushed: eligibleItems.length, data };
    } catch (err) {
      // Increment retryCount and apply exponential backoff (2s, 4s, 8s, max 30s)
      for (const item of eligibleItems) {
        const count = (item.retryCount || 0) + 1;
        const delayMs = Math.min(30000, Math.pow(2, count) * 1000);
        this.retryBackoff.set(item.id, Date.now() + delayMs);
        await db.syncQueue.update(item.id, { retryCount: count });
      }
      throw err;
    }
  }

  /**
   * Pull remote changes from server since client cursor and update local Dexie database
   */
  async pullRemoteChanges(isBootstrap = false) {
    if (!this.authToken) return { pulled: 0 };
    if (this.isPulling) return { pulled: 0, inProgress: true };
    this.isPulling = true;

    try {
      // Get current cursor for user from userSettings
      const cursorKey = `sync_cursor_${this.activeUserId}`;
      let cursor = 0;

      if (!isBootstrap && db.userSettings) {
        try {
          const setting = await db.userSettings.get(cursorKey);
          if (setting && setting.value) cursor = Number(setting.value);
        } catch (e) {}
      }

      const res = await fetch(`${this.getApiBaseUrl()}/api/v1/sync/pull?cursor=${cursor}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });

    if (!res.ok) {
      if (res.status === 401) {
        console.warn('[SyncEngine] Pull returned 401. Clearing stale token.');
        this.authToken = null;
        try { localStorage.removeItem('maha_auth_token'); } catch (e) {}
        return { pulled: 0, unauthorized: true };
      }
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Pull failed with HTTP ${res.status}`);
    }

    const data = await res.json();
    const { changes = [], latestRevision = cursor } = data;

    if (changes.length > 0) {
      // Group changes by Dexie store to execute bulk operations efficiently
      const changesByStore = new Map();
      for (const ch of changes) {
        if (!changesByStore.has(ch.storeName)) changesByStore.set(ch.storeName, []);
        changesByStore.get(ch.storeName).push(ch);
      }

      for (const [storeName, storeChanges] of changesByStore.entries()) {
        if (db[storeName]) {
          try {
            await db.transaction('rw', db[storeName], async () => {
              for (const ch of storeChanges) {
                if (ch.operation === 'DELETE') {
                  await db[storeName].delete(ch.recordId);
                } else if (ch.payload && Object.keys(ch.payload).length > 0) {
                  // Ensure ID is set on record
                  const rec = { ...ch.payload };
                  if (!rec.id && ch.recordId) rec.id = ch.recordId;
                  await db[storeName].put(rec);
                }
              }
            });
          } catch (e) {
            console.warn(`[SyncEngine] Error applying pulled changes to store ${storeName}:`, e);
          }
        }
      }

      // Dispatch custom event so active UI components update reactively without page refresh
      if (typeof window !== 'undefined') {
        const customEvt = new CustomEvent('maha:data_synced', {
          detail: {
            changesCount: changes.length,
            stores: Array.from(changesByStore.keys()),
            latestRevision
          }
        });
        window.dispatchEvent(customEvt);
      }
    }

    // Save updated cursor in Dexie
    if (db.userSettings) {
      try {
        await db.userSettings.put({
          id: cursorKey,
          userId: this.activeUserId,
          key: cursorKey,
          value: String(latestRevision),
          updatedAt: new Date().toISOString()
        });
      } catch (e) {}
    }

    return { pulled: changes.length, latestRevision };
    } finally {
      this.isPulling = false;
    }
  }

  /**
   * Real-Time Stream (Server-Sent Events) with automatic reconnect & polling fallback
   */
  startRealTimeUpdates() {
    this.stopRealTimeUpdates();

    if (typeof window === 'undefined' || !this.authToken) return;

    try {
      const sseUrl = `${this.getApiBaseUrl()}/api/v1/sync/events?token=${encodeURIComponent(this.authToken)}`;
      this.sseSource = new EventSource(sseUrl);

      this.sseSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type === 'SYNC_RECORDS_UPDATED') {
            console.log('[SyncEngine] Real-time SSE remote change received. Pulling updates...');
            this.pullRemoteChanges();
          }
        } catch (e) {}
      };

      this.sseSource.onerror = () => {
        // Fallback gracefully to polling if SSE is disconnected
        if (this.sseSource) {
          this.sseSource.close();
          this.sseSource = null;
        }
      };
    } catch (e) {
      console.warn('[SyncEngine] SSE not supported or blocked, relying on periodic polling.');
    }

    // Periodic polling fallback: every 15 seconds while active
    this.pollInterval = setInterval(() => {
      if (this.authToken && navigator.onLine && !this.isSyncing) {
        this.pullRemoteChanges().catch(() => {});
      }
    }, 15000);
  }

  stopRealTimeUpdates() {
    if (this.sseSource) {
      this.sseSource.close();
      this.sseSource = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}

export const syncEngine = new SyncEngine();
