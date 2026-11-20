/**
 * Authentication Service Interface
 * Defines the contract for all authentication adapters (Production Java Spring Boot & Dev Mock).
 */
export class AuthInterface {
  /**
   * Authenticate with mobile and password
   * @param {{ mobile: string, password: string }} credentials
   * @returns {Promise<{ success: boolean, user?: object, token?: string, error?: string }>}
   */
  async login(credentials) {
    throw new Error('login() must be implemented by adapter');
  }

  /**
   * Register a new rural entrepreneur account
   * @param {{ name: string, mobile: string, password: string, preferredLanguage: string, districtCode: number, talukaCode: number, villageCode: number }} payload
   * @returns {Promise<{ success: boolean, user?: object, token?: string, error?: string }>}
   */
  async register(payload) {
    throw new Error('register() must be implemented by adapter');
  }

  /**
   * Request password reset for a registered mobile number
   * @param {{ mobile: string }} payload
   * @returns {Promise<{ success: boolean, message?: string, error?: string }>}
   */
  async forgotPassword(payload) {
    throw new Error('forgotPassword() must be implemented by adapter');
  }

  /**
   * Update the user profile
   * @param {string} userId
   * @param {object} profileData
   * @returns {Promise<{ success: boolean, user?: object, error?: string }>}
   */
  async updateProfile(userId, profileData) {
    throw new Error('updateProfile() must be implemented by adapter');
  }

  /**
   * Terminate user session
   * @returns {Promise<void>}
   */
  async logout() {
    throw new Error('logout() must be implemented by adapter');
  }
}
