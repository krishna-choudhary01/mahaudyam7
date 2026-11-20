import { db } from '../db/index.js';
import { ProductionAuthAdapter } from './productionAuthAdapter.js';
import { DevMockAuthAdapter, DEMO_USER_CONFIG } from './devMockAuthAdapter.js';
import { CentralAuthAdapter } from './centralAuthAdapter.js';
import { syncEngine } from '../offline/syncEngine.js';

/**
 * Unified Authentication Service Façade
 * Enforces personal data isolation, offline session restoration, and adapter delegation.
 */
class AuthService {
  constructor() {
    this.adapter = new CentralAuthAdapter();

    this.currentUser = null;
    this.currentSession = null;
    this.listeners = new Set();
    this.isInitialized = false;
  }

  /**
   * Initialize and restore existing offline-authorized session
   */
  async init() {
    if (this.isInitialized) return this.currentUser;

    try {
      const activeSession = await db.userSessions.orderBy('lastActive').reverse().first();

      if (activeSession && activeSession.userId) {
        // Verify expiry
        if (activeSession.expiresAt && new Date(activeSession.expiresAt) > new Date()) {
          const profile = await db.userProfiles.get(activeSession.userId);
          if (profile) {
            const { passwordHash, ...safeUser } = profile;
            this.currentUser = safeUser;
            this.currentSession = activeSession;
            await syncEngine.init(this.currentUser, activeSession.sessionToken);
            this.notifyListeners();
          }
        } else {
          // Session expired
          await db.userSessions.delete(activeSession.sessionId);
          await syncEngine.init(null, null);
        }
      } else {
        await syncEngine.init(null, null);
      }
    } catch (err) {
      console.warn('Could not restore offline session from IndexedDB', err);
      await syncEngine.init(null, null);
    } finally {
      this.isInitialized = true;
    }

    return this.currentUser;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    // Send immediate state
    listener(this.currentUser, this.currentSession);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentUser, this.currentSession);
      } catch (e) {
        console.error('Error in auth state listener', e);
      }
    });
  }

  getCurrentUser() {
    return this.currentUser;
  }

  getUserId() {
    return this.currentUser ? this.currentUser.userId : null;
  }

  isAuthenticated() {
    return Boolean(this.currentUser && this.currentUser.userId);
  }

  isDemoAccount() {
    return Boolean(this.currentUser && this.currentUser.isDevDemoAccount);
  }

  async login(credentials) {
    const result = await this.adapter.login(credentials);
    if (result.success && result.user) {
      this.currentUser = result.user;

      // Save persistent offline-authorized session in Dexie
      const sessionId = `sess_${result.user.userId}_${Date.now()}`;
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

      const sessionRecord = {
        sessionId,
        userId: result.user.userId,
        sessionToken: result.token || `token_${Date.now()}`,
        isOfflineAuthorized: true,
        expiresAt,
        lastActive: new Date().toISOString()
      };

      try {
        // Clear old sessions for security before storing new
        await db.userSessions.clear();
        await db.userSessions.put(sessionRecord);
        this.currentSession = sessionRecord;
      } catch (dbErr) {
        console.warn('Could not store session in IndexedDB', dbErr);
      }

      // Initialize real-time synchronization & bootstrap new device
      syncEngine.setSession(this.currentUser, sessionRecord.sessionToken);
      try {
        // Bootstrap: fetch all remote data for this user on login
        await syncEngine.pullRemoteChanges(true);
      } catch (syncErr) {
        console.warn('[AuthService] Initial device bootstrap sync had warning:', syncErr.message);
      }

      this.notifyListeners();
    }
    return result;
  }

  async register(payload) {
    // Check network for initial registration per Rule 4
    if (typeof navigator !== 'undefined' && !navigator.onLine && !this.adapter.isDevelopmentOnly) {
      return {
        success: false,
        error: 'Initial account creation requires an active internet connection. Please connect to register.'
      };
    }

    const result = await this.adapter.register(payload);
    if (result.success && result.user) {
      await this.login({ mobile: payload.mobile, password: payload.password });
    }
    return result;
  }

  async forgotPassword(payload) {
    return await this.adapter.forgotPassword(payload);
  }

  async updateProfile(profileData) {
    if (!this.isAuthenticated()) {
      return { success: false, error: 'User is not authenticated.' };
    }

    const userId = this.currentUser.userId;
    const result = await this.adapter.updateProfile(userId, profileData);

    if (result.success && result.user) {
      this.currentUser = result.user;
      this.notifyListeners();
    }
    return result;
  }

  async logout() {
    try {
      await this.adapter.logout();
    } catch (e) {
      console.debug('Adapter logout completed', e);
    }

    // Strict Personal Data Security: Clear active session and in-memory user
    syncEngine.setSession(null, null);
    this.currentUser = null;
    this.currentSession = null;

    try {
      await db.userSessions.clear();
    } catch (dbErr) {
      console.warn('Could not clear IndexedDB sessions', dbErr);
    }

    this.notifyListeners();
  }

  // --- STRICT PERSONAL DATA ISOLATION HELPERS ---

  /**
   * Retrieve saved business opportunities strictly belonging to the active user
   */
  async getUserOpportunities() {
    if (!this.isAuthenticated()) return [];
    const userId = this.getUserId();
    return await db.opportunities.where('userId').equals(userId).toArray();
  }

  /**
   * Save a business opportunity stamped with the active user's ID
   */
  async saveUserOpportunity(opportunity) {
    if (!this.isAuthenticated()) {
      throw new Error('Authentication required to save personal opportunity.');
    }
    const userId = this.getUserId();
    const stamped = {
      ...opportunity,
      userId,
      updatedAt: new Date().toISOString()
    };
    return await db.opportunities.add(stamped);
  }

  /**
   * Get user preference with personal user isolation
   */
  async getUserPreference(key, defaultValue = null) {
    if (!this.isAuthenticated()) return defaultValue;
    const userId = this.getUserId();
    const compositeKey = `${userId}_${key}`;
    const record = await db.userSettings.get(compositeKey);
    return record ? record.value : defaultValue;
  }

  /**
   * Save user preference with personal user isolation
   */
  async saveUserPreference(key, value) {
    if (!this.isAuthenticated()) return;
    const userId = this.getUserId();
    const compositeKey = `${userId}_${key}`;
    await db.userSettings.put({
      id: compositeKey,
      userId,
      key,
      value,
      updatedAt: new Date().toISOString()
    });
  }
}

export const authService = new AuthService();
export { DEMO_USER_CONFIG };
