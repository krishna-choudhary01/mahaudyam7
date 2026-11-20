import { AuthInterface } from './authInterface.js';
import { db } from '../db/index.js';

/**
 * Development-Only Mock Authentication Adapter
 * 
 * NOTICE:
 * This adapter is isolated strictly for local development, UI testing, and architectural verification.
 * It contains the official Demo Entrepreneur account requested for Idea Lab evaluation.
 * 
 * HOW TO DISABLE BEFORE PRODUCTION:
 * 1. Set environment variable VITE_ENABLE_DEV_DEMO=false in .env.production
 * 2. In authService.js, set defaultAdapter to ProductionAuthAdapter.
 */
export const DEMO_USER_CONFIG = {
  mobile: '9999999999',
  password: 'Maha@123',
  userId: 'demo-user-dev-9999',
  name: 'Demo Entrepreneur',
  preferredLanguage: 'mr',
  districtCode: 490, // Nashik
  talukaCode: 4154,  // Sinnar
  villageCode: 551201, // Baragaon Pimpri (official LGD village)
  isDevDemoAccount: true,
  createdAt: '2026-11-06T00:00:00.000Z'
};

// Resilient memory cache fallback if IndexedDB is inaccessible (e.g. CLI test environment or private browsing)
const inMemoryProfiles = new Map();

async function getProfileFromStore(userId) {
  try {
    if (db && db.isOpen && !db.isOpen()) {
      await db.open();
    }
    const rec = await db.userProfiles.get(userId);
    if (rec) return rec;
  } catch (e) {
    // fall through to in-memory fallback
  }
  return inMemoryProfiles.get(userId) || null;
}

async function putProfileToStore(profile) {
  inMemoryProfiles.set(profile.userId, profile);
  try {
    if (db && db.isOpen && !db.isOpen()) {
      await db.open();
    }
    await db.userProfiles.put(profile);
  } catch (e) {
    // In-memory fallback active
  }
}

async function findProfileByMobile(mobile) {
  try {
    if (db && db.isOpen && !db.isOpen()) {
      await db.open();
    }
    const rec = await db.userProfiles.where('mobile').equals(mobile).first();
    if (rec) return rec;
  } catch (e) {
    // fall through to in-memory search
  }
  for (const p of inMemoryProfiles.values()) {
    if (p.mobile === mobile) return p;
  }
  return null;
}

export class DevMockAuthAdapter extends AuthInterface {
  constructor() {
    super();
    this.isDevelopmentOnly = true;
  }

  /**
   * Simple client-side hash helper for dev simulation (never used in production)
   */
  async _hashPassword(plain) {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain + '_dev_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  async login(credentials) {
    const { mobile, password } = credentials || {};
    const cleanMobile = (mobile || '').trim();

    if (!cleanMobile || !password) {
      return { success: false, error: 'Mobile and password are required.' };
    }

    // 1. Check official Demo Account
    if (cleanMobile === DEMO_USER_CONFIG.mobile) {
      if (password === DEMO_USER_CONFIG.password) {
        // Ensure demo profile exists
        const existingDemo = await getProfileFromStore(DEMO_USER_CONFIG.userId);
        const userObj = existingDemo || {
          userId: DEMO_USER_CONFIG.userId,
          name: DEMO_USER_CONFIG.name,
          mobile: DEMO_USER_CONFIG.mobile,
          language: DEMO_USER_CONFIG.preferredLanguage,
          districtCode: DEMO_USER_CONFIG.districtCode,
          talukaCode: DEMO_USER_CONFIG.talukaCode,
          villageCode: DEMO_USER_CONFIG.villageCode,
          isDevDemoAccount: true,
          createdAt: DEMO_USER_CONFIG.createdAt,
          updatedAt: new Date().toISOString()
        };

        if (!existingDemo) {
          await putProfileToStore(userObj);
        }

        return {
          success: true,
          user: userObj,
          token: `dev_demo_token_${Date.now()}`,
          isDevDemoAccount: true,
          message: 'Authenticated as Development Demo Account'
        };
      } else {
        return {
          success: false,
          error: 'Invalid password for Demo Entrepreneur account.'
        };
      }
    }

    // 2. Check locally registered development test accounts
    const profile = await findProfileByMobile(cleanMobile);
    if (!profile) {
      return {
        success: false,
        error: 'No account registered with this mobile number. Please register first.'
      };
    }

    const inputHash = await this._hashPassword(password);
    if (profile.passwordHash !== inputHash) {
      return {
        success: false,
        error: 'Invalid password. Please check your credentials.'
      };
    }

    // Return safe user object (never return passwordHash)
    const { passwordHash, ...safeUser } = profile;
    return {
      success: true,
      user: safeUser,
      token: `dev_token_${Date.now()}_${safeUser.userId}`,
      message: 'Login successful (Dev Mock Adapter)'
    };
  }

  async register(registrationData) {
    const {
      mobile,
      password,
      name,
      language = 'mr',
      districtCode = null,
      talukaCode = null,
      villageCode = null
    } = registrationData || {};

    const cleanMobile = (mobile || '').trim();

    // Validation
    if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      return {
        success: false,
        error: 'Please enter a valid 10-digit Indian mobile number.'
      };
    }

    if (!name || name.trim().length < 2) {
      return {
        success: false,
        error: 'Please enter your full name (minimum 2 characters).'
      };
    }

    if (!password || password.length < 6) {
      return {
        success: false,
        error: 'Password must be at least 6 characters long.'
      };
    }

    // Check duplicate with demo account
    if (cleanMobile === DEMO_USER_CONFIG.mobile) {
      return {
        success: false,
        error: 'This mobile number is reserved for the Demo Entrepreneur account.'
      };
    }

    // Check duplicate with existing local registrations
    const existing = await findProfileByMobile(cleanMobile);
    if (existing) {
      return {
        success: false,
        error: 'An account with this mobile number already exists. Please login.'
      };
    }

    // Create unique user ID
    const userId = `user-mu-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await this._hashPassword(password);

    const userProfileRecord = {
      userId,
      mobile: cleanMobile,
      name: name.trim(),
      language,
      districtCode: districtCode ? Number(districtCode) : null,
      talukaCode: talukaCode ? Number(talukaCode) : null,
      villageCode: villageCode ? Number(villageCode) : null,
      passwordHash, // Stored as simulated hash, NEVER plain text
      isDevDemoAccount: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await putProfileToStore(userProfileRecord);

    const { passwordHash: _, ...safeUser } = userProfileRecord;
    return {
      success: true,
      user: safeUser,
      message: 'Account successfully registered (Local Dev Adapter).'
    };
  }

  async forgotPassword(payload) {
    const { mobile } = payload || {};
    const cleanMobile = (mobile || '').trim();

    if (!cleanMobile) {
      return { success: false, error: 'Mobile number is required.' };
    }

    if (cleanMobile === DEMO_USER_CONFIG.mobile) {
      return {
        success: true,
        message: 'Password for Demo Entrepreneur is fixed: Maha@123'
      };
    }

    const existing = await findProfileByMobile(cleanMobile);
    if (!existing) {
      return {
        success: false,
        error: 'No registered account found with this mobile number.'
      };
    }

    return {
      success: true,
      message: 'Password recovery OTP simulated. (Production SMS gateway will send OTP when backend is connected).'
    };
  }

  async updateProfile(userId, profileData) {
    const existing = await getProfileFromStore(userId);
    if (!existing) {
      return { success: false, error: 'User profile not found.' };
    }

    const updated = {
      ...existing,
      ...profileData,
      updatedAt: new Date().toISOString()
    };

    await putProfileToStore(updated);
    const { passwordHash, ...safeUser } = updated;
    return {
      success: true,
      user: safeUser,
      message: 'Profile updated successfully.'
    };
  }

  async logout() {
    // Local memory/session teardown
    return Promise.resolve();
  }
}

export const devMockAuthAdapter = new DevMockAuthAdapter();
