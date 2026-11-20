import { db } from '../db/index.js';
import { syncEngine } from './syncEngine.js';

/**
 * Offline Sync Manager
 * Façade bridging legacy callers to the central SyncEngine.
 */
export const syncManager = {
  /**
   * Enqueue a mutation to be synchronized when back online
   */
  async enqueueAction(actionType, payload, options = {}) {
    const storeName = options.storeName || 'general';
    const recordId = options.recordId || payload?.id || Date.now();
    return await syncEngine.enqueueMutation({
      storeName,
      recordId,
      operation: actionType,
      payload,
      userId: options.userId,
      isShared: options.isShared
    });
  },

  /**
   * Get pending queue count
   */
  async getPendingCount() {
    return await syncEngine.refreshPendingCount();
  },

  /**
   * Process synchronization queue and pull updates
   */
  async processSyncQueue() {
    const res = await syncEngine.syncNow();
    const pending = await syncEngine.refreshPendingCount();
    return {
      processed: res.pushed || 0,
      pending,
      pulled: res.pulled || 0,
      success: res.success !== false
    };
  }
};
