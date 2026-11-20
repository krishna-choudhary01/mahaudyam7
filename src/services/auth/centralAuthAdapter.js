import { AuthInterface } from './authInterface.js';
import { db } from '../db/index.js';
import { syncEngine } from '../offline/syncEngine.js';
import { DevMockAuthAdapter, DEMO_USER_CONFIG } from './devMockAuthAdapter.js';

export class CentralAuthAdapter extends AuthInterface {
  constructor() {
    super();
    this.fallbackAdapter = new DevMockAuthAdapter();
  }

  getApiBaseUrl() {
    return syncEngine.getApiBaseUrl();
  }

  async login({ mobile, password }) {
    const cleanMobile = (mobile || '').trim();
    if (!cleanMobile || !password) {
      return { success: false, error: 'Mobile and password are required.' };
    }

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (isOnline) {
      try {
        const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: cleanMobile, password })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            // Persist profile locally in Dexie for offline use
            if (db.userProfiles) {
              await db.userProfiles.put({
                ...data.user,
                updatedAt: new Date().toISOString()
              });
            }
            return {
              success: true,
              user: data.user,
              token: data.token,
              expiresAt: data.expiresAt
            };
          }
        } else if (response.status === 401) {
          const errData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errData.error || 'Invalid mobile number or password.'
          };
        }
      } catch (networkErr) {
        console.warn('[CentralAuthAdapter] Server unreachable. Falling back to local offline profile verification:', networkErr.message);
      }
    }

    // Offline or fallback to local verification
    return await this.fallbackAdapter.login({ mobile: cleanMobile, password });
  }

  async register(payload) {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (isOnline) {
      try {
        const response = await fetch(`${this.getApiBaseUrl()}/api/v1/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            if (db.userProfiles) {
              await db.userProfiles.put({
                ...data.user,
                updatedAt: new Date().toISOString()
              });
            }
            return {
              success: true,
              user: data.user,
              token: data.token,
              expiresAt: data.expiresAt
            };
          }
        } else {
          const errData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errData.error || `Registration failed (HTTP ${response.status})`
          };
        }
      } catch (networkErr) {
        console.warn('[CentralAuthAdapter] Server unreachable during registration:', networkErr.message);
      }
    }

    // If offline, delegate to local mock adapter
    return await this.fallbackAdapter.register(payload);
  }

  async forgotPassword(payload) {
    return await this.fallbackAdapter.forgotPassword(payload);
  }

  async updateProfile(userId, profileData) {
    const res = await this.fallbackAdapter.updateProfile(userId, profileData);
    if (res.success && res.user) {
      // Enqueue to sync engine so other devices get updated profile
      await syncEngine.enqueueMutation({
        storeName: 'userProfiles',
        recordId: userId,
        operation: 'PUT',
        payload: res.user,
        userId
      });
    }
    return res;
  }

  async logout() {
    return await this.fallbackAdapter.logout();
  }
}
