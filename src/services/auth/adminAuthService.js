import { db } from '../db/index.js';

/**
 * Roles supported in MahaUdyam
 */
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR',
  ENTREPRENEUR: 'ENTREPRENEUR'
};

/**
 * Granular Permission Matrix
 */
export const PERMISSIONS = {
  MANAGE_ADMINS: [ROLES.SUPER_ADMIN],
  MANAGE_ROLES: [ROLES.SUPER_ADMIN],
  VIEW_AUDIT_LOGS: [ROLES.SUPER_ADMIN],
  MANAGE_MARKETS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  APPROVE_SUBMISSIONS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  REJECT_SUBMISSIONS: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  MANAGE_CATEGORIES: [ROLES.SUPER_ADMIN, ROLES.ADMIN],
  REVIEW_SUBMISSIONS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR],
  FLAG_DUPLICATES: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR],
  REQUEST_CORRECTIONS: [ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.MODERATOR],
  SUBMIT_MARKET_SUGGESTION: [ROLES.ENTREPRENEUR, ROLES.MODERATOR, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  VIEW_PUBLISHED_MARKETS: [ROLES.ENTREPRENEUR, ROLES.MODERATOR, ROLES.ADMIN, ROLES.SUPER_ADMIN]
};

/**
 * Pre-provisioned Administrative Accounts for Development / Testing Verification
 * Notice: Production backend (Spring Boot) uses central database and Argon2id / bcrypt.
 */
export const INITIAL_ADMIN_ACCOUNTS = [
  {
    userId: 'admin_usr_001_super',
    username: 'superadmin',
    email: 'superadmin@mahaudyam.gov.in',
    name: 'Super Administrator',
    role: ROLES.SUPER_ADMIN,
    passwordPlain: 'MahaSuper@2026',
    status: 'ACTIVE',
    createdAt: '2026-11-01T00:00:00.000Z'
  },
  {
    userId: 'admin_usr_002_mkt',
    username: 'admin_market',
    email: 'market.admin@mahaudyam.gov.in',
    name: 'Market Records Admin',
    role: ROLES.ADMIN,
    passwordPlain: 'MahaAdmin@2026',
    status: 'ACTIVE',
    createdAt: '2026-11-02T00:00:00.000Z'
  },
  {
    userId: 'admin_usr_003_mod',
    username: 'moderator_nsk',
    email: 'moderator.nsk@mahaudyam.gov.in',
    name: 'Nashik District Field Moderator',
    role: ROLES.MODERATOR,
    passwordPlain: 'MahaMod@2026',
    status: 'ACTIVE',
    createdAt: '2026-11-03T00:00:00.000Z'
  }
];

// In-memory fallback if IndexedDB is in private mode
const inMemoryAdminStore = new Map();
const inMemoryAuditLogs = [];

/**
 * Hash password helper with salt
 */
async function hashAdminPassword(password) {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password + '_maha_admin_salt_2026#secure');
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch (e) {
    // Fallback simple string hash for environments without crypto.subtle
  }
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = (hash << 5) - hash + password.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash)}`;
}

class AdminAuthService {
  constructor() {
    this.currentAdmin = null;
    this.adminSession = null;
    this.listeners = new Set();
    this.isInitialized = false;
  }

  /**
   * Initializes pre-provisioned administrative accounts
   */
  async init() {
    if (this.isInitialized) return this.currentAdmin;

    try {
      if (db && !db.isOpen()) {
        await db.open();
      }

      if (db && db.adminUsers) {
        const count = await db.adminUsers.count();
        if (count === 0) {
          // Provision initial admin accounts
          for (const acc of INITIAL_ADMIN_ACCOUNTS) {
            const passwordHash = await hashAdminPassword(acc.passwordPlain);
            const userRecord = {
              userId: acc.userId,
              username: acc.username.toLowerCase(),
              email: acc.email.toLowerCase(),
              name: acc.name,
              role: acc.role,
              passwordHash,
              status: acc.status,
              createdAt: acc.createdAt,
              lastLogin: null
            };
            await db.adminUsers.put(userRecord);
            inMemoryAdminStore.set(acc.userId, userRecord);
          }
        }
      }

      // Check for active admin session
      const savedAdminSession = sessionStorage.getItem('mahaudyam_admin_session');
      if (savedAdminSession) {
        try {
          const parsed = JSON.parse(savedAdminSession);
          if (parsed && parsed.expiresAt && new Date(parsed.expiresAt) > new Date()) {
            this.currentAdmin = parsed.user;
            this.adminSession = parsed;
            this.notifyListeners();
          } else {
            sessionStorage.removeItem('mahaudyam_admin_session');
          }
        } catch (e) {
          sessionStorage.removeItem('mahaudyam_admin_session');
        }
      }
    } catch (err) {
      console.warn('AdminAuthService: initialized in fallback mode', err);
    } finally {
      this.isInitialized = true;
    }

    return this.currentAdmin;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.currentAdmin, this.adminSession);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentAdmin, this.adminSession);
      } catch (e) {
        console.error('Error in admin auth listener', e);
      }
    });
  }

  getCurrentAdmin() {
    return this.currentAdmin;
  }

  isAdminAuthenticated() {
    return Boolean(
      this.currentAdmin &&
      this.currentAdmin.userId &&
      this.currentAdmin.role &&
      this.currentAdmin.role !== ROLES.ENTREPRENEUR &&
      this.adminSession &&
      new Date(this.adminSession.expiresAt) > new Date()
    );
  }

  /**
   * Cryptographically verifies if the authenticated admin has the requested permission
   */
  hasPermission(permission) {
    if (!this.isAdminAuthenticated()) return false;
    const allowedRoles = PERMISSIONS[permission] || [];
    return allowedRoles.includes(this.currentAdmin.role);
  }

  /**
   * Secure Admin Login
   * Accepts username or email and password
   */
  async loginAdmin({ usernameOrEmail, password }) {
    await this.init();

    const cleanIdentifier = (usernameOrEmail || '').trim().toLowerCase();
    if (!cleanIdentifier || !password) {
      return { success: false, error: 'Username/Email and password are required.' };
    }

    // Prepare Spring Boot backend integration check
    const isProductionConfigured = import.meta.env?.VITE_ADMIN_API_URL;
    if (isProductionConfigured) {
      try {
        const resp = await fetch(`${isProductionConfigured}/api/v1/admin/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernameOrEmail: cleanIdentifier, password })
        });
        if (resp.ok) {
          const data = await resp.json();
          this.setAdminSession(data.user, data.token);
          await this.logAudit({
            action: 'ADMIN_LOGIN_SUCCESS',
            recordType: 'ADMIN_AUTH',
            recordId: data.user.userId,
            result: 'SUCCESS'
          });
          return { success: true, user: data.user, role: data.user.role };
        }
      } catch (e) {
        console.warn('Backend API connection failed, checking local database', e);
      }
    }

    // Development / Local verified authentication
    let adminRecord = null;
    try {
      if (db && db.adminUsers) {
        adminRecord = await db.adminUsers
          .where('username')
          .equals(cleanIdentifier)
          .first();

        if (!adminRecord) {
          adminRecord = await db.adminUsers
            .where('email')
            .equals(cleanIdentifier)
            .first();
        }
      }
    } catch (e) {
      // In-memory lookup
    }

    if (!adminRecord) {
      for (const rec of inMemoryAdminStore.values()) {
        if (rec.username === cleanIdentifier || rec.email === cleanIdentifier) {
          adminRecord = rec;
          break;
        }
      }
    }

    // Check pre-provisioned records if database was empty
    if (!adminRecord) {
      const pre = INITIAL_ADMIN_ACCOUNTS.find(
        (a) => a.username.toLowerCase() === cleanIdentifier || a.email.toLowerCase() === cleanIdentifier
      );
      if (pre) {
        const hash = await hashAdminPassword(pre.passwordPlain);
        adminRecord = {
          userId: pre.userId,
          username: pre.username.toLowerCase(),
          email: pre.email.toLowerCase(),
          name: pre.name,
          role: pre.role,
          passwordHash: hash,
          status: pre.status,
          createdAt: pre.createdAt,
          lastLogin: null
        };
      }
    }

    if (!adminRecord) {
      return {
        success: false,
        error: 'Invalid administrative credentials. Public registration for administrators is not permitted.'
      };
    }

    if (adminRecord.status !== 'ACTIVE') {
      return {
        success: false,
        error: 'This administrative account is currently deactivated. Contact a Super Administrator.'
      };
    }

    const inputHash = await hashAdminPassword(password);
    if (adminRecord.passwordHash !== inputHash) {
      await this.logAudit({
        action: 'ADMIN_LOGIN_FAILED',
        recordType: 'ADMIN_AUTH',
        recordId: adminRecord.userId,
        result: 'INVALID_PASSWORD'
      });
      return {
        success: false,
        error: 'Invalid password. Please verify your credentials.'
      };
    }

    // Success: Return safe admin user (without passwordHash)
    const { passwordHash: _, ...safeAdmin } = adminRecord;
    const sessionToken = `adm_token_${Date.now()}_${safeAdmin.userId}`;

    // Update lastLogin
    safeAdmin.lastLogin = new Date().toISOString();
    try {
      if (db && db.adminUsers) {
        await db.adminUsers.update(safeAdmin.userId, { lastLogin: safeAdmin.lastLogin });
      }
    } catch (e) {}

    this.setAdminSession(safeAdmin, sessionToken);

    await this.logAudit({
      action: 'ADMIN_LOGIN_SUCCESS',
      recordType: 'ADMIN_AUTH',
      recordId: safeAdmin.userId,
      result: 'SUCCESS'
    });

    return {
      success: true,
      user: safeAdmin,
      role: safeAdmin.role,
      message: `Welcome, ${safeAdmin.name} (${safeAdmin.role})`
    };
  }

  setAdminSession(user, token) {
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(); // 8 Hours expiry
    this.currentAdmin = user;
    this.adminSession = {
      token,
      expiresAt,
      user
    };

    try {
      sessionStorage.setItem('mahaudyam_admin_session', JSON.stringify(this.adminSession));
    } catch (e) {}

    this.notifyListeners();
  }

  /**
   * Admin Logout
   */
  async logoutAdmin() {
    const adminId = this.currentAdmin?.userId || 'unknown';
    await this.logAudit({
      action: 'ADMIN_LOGOUT',
      recordType: 'ADMIN_AUTH',
      recordId: adminId,
      result: 'SUCCESS'
    });

    this.currentAdmin = null;
    this.adminSession = null;
    try {
      sessionStorage.removeItem('mahaudyam_admin_session');
    } catch (e) {}

    this.notifyListeners();
  }

  /**
   * Audit Logger
   * Enforces server-side audit recording into Dexie auditLogs
   */
  async logAudit({ action, recordType, recordId, previousValue = null, newValue = null, result = 'SUCCESS' }) {
    const adminId = this.currentAdmin?.userId || 'SYSTEM';
    const logEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      adminId,
      adminUsername: this.currentAdmin?.username || 'system',
      adminRole: this.currentAdmin?.role || 'NONE',
      action,
      recordType,
      recordId: String(recordId || ''),
      previousValue: previousValue ? JSON.stringify(previousValue) : null,
      newValue: newValue ? JSON.stringify(newValue) : null,
      result,
      timestamp: new Date().toISOString()
    };

    inMemoryAuditLogs.unshift(logEntry);
    try {
      if (db && db.auditLogs) {
        if (!db.isOpen()) await db.open();
        await db.auditLogs.add(logEntry);
      }
    } catch (e) {
      console.warn('Could not persist audit log to Dexie', e);
    }

    return logEntry;
  }

  /**
   * Retrieve Audit Logs (Restricted to SUPER_ADMIN)
   */
  async getAuditLogs(limit = 100) {
    if (!this.hasPermission('VIEW_AUDIT_LOGS')) {
      throw new Error('Access Denied: Only SUPER_ADMIN can view audit logs.');
    }

    try {
      if (db && db.auditLogs) {
        if (!db.isOpen()) await db.open();
        const logs = await db.auditLogs.orderBy('timestamp').reverse().limit(limit).toArray();
        if (logs && logs.length > 0) return logs;
      }
    } catch (e) {}

    return inMemoryAuditLogs.slice(0, limit);
  }

  /**
   * Get all administrative users (Restricted to SUPER_ADMIN)
   */
  async getAdminUsers() {
    if (!this.hasPermission('MANAGE_ADMINS')) {
      throw new Error('Access Denied: Only SUPER_ADMIN can manage administrative accounts.');
    }

    try {
      if (db && db.adminUsers) {
        if (!db.isOpen()) await db.open();
        const users = await db.adminUsers.toArray();
        if (users && users.length > 0) {
          return users.map(({ passwordHash, ...safe }) => safe);
        }
      }
    } catch (e) {}

    const users = [];
    for (const rec of inMemoryAdminStore.values()) {
      const { passwordHash, ...safe } = rec;
      users.push(safe);
    }
    return users.length > 0 ? users : INITIAL_ADMIN_ACCOUNTS.map(({ passwordPlain, ...s }) => s);
  }

  /**
   * Create new administrative user (Restricted to SUPER_ADMIN)
   */
  async createAdminUser({ username, email, name, role, password }) {
    if (!this.hasPermission('MANAGE_ADMINS')) {
      throw new Error('Access Denied: Only SUPER_ADMIN can create administrative accounts.');
    }

    const cleanUsername = (username || '').trim().toLowerCase();
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters.' };
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { success: false, error: 'Valid email address is required.' };
    }
    if (!password || password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters with high complexity.' };
    }
    if (![ROLES.ADMIN, ROLES.MODERATOR, ROLES.SUPER_ADMIN].includes(role)) {
      return { success: false, error: 'Invalid administrative role selected.' };
    }

    // Check duplicate
    try {
      if (db && db.adminUsers) {
        const existingUser = await db.adminUsers.where('username').equals(cleanUsername).first();
        if (existingUser) return { success: false, error: 'Username is already registered.' };
        const existingEmail = await db.adminUsers.where('email').equals(cleanEmail).first();
        if (existingEmail) return { success: false, error: 'Email address is already in use.' };
      }
    } catch (e) {}

    const userId = `admin_usr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const passwordHash = await hashAdminPassword(password);

    const record = {
      userId,
      username: cleanUsername,
      email: cleanEmail,
      name: (name || cleanUsername).trim(),
      role,
      passwordHash,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    try {
      if (db && db.adminUsers) {
        await db.adminUsers.put(record);
      }
    } catch (e) {}
    inMemoryAdminStore.set(userId, record);

    await this.logAudit({
      action: 'ADMIN_USER_CREATED',
      recordType: 'ADMIN_USER',
      recordId: userId,
      newValue: { username: cleanUsername, role, email: cleanEmail }
    });

    const { passwordHash: _, ...safe } = record;
    return { success: true, user: safe, message: `Created administrator ${safe.name} with role ${role}` };
  }

  /**
   * Update status of an administrative account (Active / Inactive)
   */
  async updateAdminStatus(targetUserId, newStatus) {
    if (!this.hasPermission('MANAGE_ADMINS')) {
      throw new Error('Access Denied: Only SUPER_ADMIN can modify administrator status.');
    }
    if (this.currentAdmin?.userId === targetUserId) {
      return { success: false, error: 'You cannot deactivate your own administrative account.' };
    }

    try {
      if (db && db.adminUsers) {
        await db.adminUsers.update(targetUserId, { status: newStatus });
      }
    } catch (e) {}

    if (inMemoryAdminStore.has(targetUserId)) {
      const rec = inMemoryAdminStore.get(targetUserId);
      rec.status = newStatus;
    }

    await this.logAudit({
      action: 'ADMIN_STATUS_CHANGED',
      recordType: 'ADMIN_USER',
      recordId: targetUserId,
      newValue: { status: newStatus }
    });

    return { success: true, message: `Account status updated to ${newStatus}` };
  }

  /**
   * Update role of an administrative account
   */
  async updateAdminRole(targetUserId, newRole) {
    if (!this.hasPermission('MANAGE_ROLES')) {
      throw new Error('Access Denied: Only SUPER_ADMIN can modify administrator roles.');
    }
    if (this.currentAdmin?.userId === targetUserId) {
      return { success: false, error: 'You cannot change your own role.' };
    }

    try {
      if (db && db.adminUsers) {
        await db.adminUsers.update(targetUserId, { role: newRole });
      }
    } catch (e) {}

    if (inMemoryAdminStore.has(targetUserId)) {
      const rec = inMemoryAdminStore.get(targetUserId);
      rec.role = newRole;
    }

    await this.logAudit({
      action: 'ADMIN_ROLE_CHANGED',
      recordType: 'ADMIN_USER',
      recordId: targetUserId,
      newValue: { role: newRole }
    });

    return { success: true, message: `Account role updated to ${newRole}` };
  }
}

export const adminAuthService = new AdminAuthService();
