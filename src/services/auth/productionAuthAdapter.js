import { AuthInterface } from './authInterface.js';

/**
 * Production Authentication Adapter
 * Prepared to interface with the enterprise Java Spring Boot REST API.
 * 
 * Complies with Rule 5 & Rule 6:
 * - Does not fake production credentials.
 * - Password hashing and JWT verification are reserved for the Java Spring Boot backend.
 */
export class ProductionAuthAdapter extends AuthInterface {
  constructor(apiBaseUrl = import.meta.env.VITE_AUTH_API_URL || null) {
    super();
    this.apiBaseUrl = apiBaseUrl;
  }

  isConfigured() {
    return Boolean(this.apiBaseUrl);
  }

  async login({ mobile, password }) {
    if (!this.isConfigured()) {
      return {
        success: false,
        code: 'BACKEND_NOT_CONNECTED',
        error: 'Production Java Spring Boot authentication backend is not yet connected. For evaluation and testing, please use the development demo adapter.'
      };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, password })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || `Login failed (HTTP ${response.status})`
        };
      }

      return await response.json();
    } catch (err) {
      return {
        success: false,
        error: `Network error connecting to backend: ${err.message}`
      };
    }
  }

  async register(payload) {
    if (!this.isConfigured()) {
      return {
        success: false,
        code: 'BACKEND_NOT_CONNECTED',
        error: 'Production Java Spring Boot registration backend is not yet connected. For evaluation and testing, please use the development demo adapter.'
      };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || `Registration failed (HTTP ${response.status})`
        };
      }

      return await response.json();
    } catch (err) {
      return {
        success: false,
        error: `Network error connecting to backend: ${err.message}`
      };
    }
  }

  async forgotPassword({ mobile }) {
    if (!this.isConfigured()) {
      return {
        success: false,
        code: 'BACKEND_NOT_CONNECTED',
        error: 'Production Java Spring Boot password recovery backend is not yet connected.'
      };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return { success: false, error: err.message || 'Password reset request failed.' };
      }

      return await response.json();
    } catch (err) {
      return { success: false, error: `Network error: ${err.message}` };
    }
  }

  async updateProfile(userId, profileData) {
    if (!this.isConfigured()) {
      return {
        success: false,
        code: 'BACKEND_NOT_CONNECTED',
        error: 'Production Java Spring Boot profile update backend is not yet connected.'
      };
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/users/${userId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return { success: false, error: err.message || 'Profile update failed.' };
      }

      return await response.json();
    } catch (err) {
      return { success: false, error: `Network error: ${err.message}` };
    }
  }

  async logout() {
    // In production, notify backend to revoke refresh token
    if (this.isConfigured()) {
      try {
        await fetch(`${this.apiBaseUrl}/api/v1/auth/logout`, { method: 'POST' });
      } catch (e) {
        console.debug('Production backend logout notification skipped', e);
      }
    }
  }
}
