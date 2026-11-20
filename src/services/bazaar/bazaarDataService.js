import { db } from '../db/index.js';
import { INITIAL_BAZAAR_MARKETS } from '../../data/bazaar/initialMarkets.js';

/**
 * BazaarPath Data Service
 * Provides offline-first retrieval, IndexedDB caching, and personalized data isolation for weekly markets.
 */
class BazaarDataService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initializes market catalog into Dexie IndexedDB
   * Ensures previously loaded markets are accessible 100% offline.
   */
  async init() {
    if (this.isInitialized) return;
    try {
      if (db && !db.isOpen()) {
        await db.open();
      }
      const count = await db.bazaarMarkets.count();
      if (count < INITIAL_BAZAAR_MARKETS.length) {
        // Seed and update full statewide verified and sample market master records
        await db.bazaarMarkets.bulkPut(INITIAL_BAZAAR_MARKETS);
      }
      this.isInitialized = true;
    } catch (err) {
      console.warn('BazaarDataService: IndexedDB seed deferred or running in fallback mode', err);
    }
  }

  /**
   * Retrieve all markets currently in offline storage
   */
  async getAllMarkets() {
    await this.init();
    try {
      const records = await db.bazaarMarkets.toArray();
      if (records && records.length > 0) return records;
    } catch (e) {
      console.warn('Could not read markets from IndexedDB; fallback to initial memory set', e);
    }
    return INITIAL_BAZAAR_MARKETS;
  }

  /**
   * Retrieve a single market by unique ID
   */
  async getMarketById(marketId) {
    await this.init();
    try {
      const found = await db.bazaarMarkets.get(marketId);
      if (found) return found;
    } catch (e) {
      console.warn('IndexedDB lookup failed for market ID', marketId, e);
    }
    return INITIAL_BAZAAR_MARKETS.find((m) => m.id === marketId) || null;
  }

  /**
   * Search markets with filters
   * @param {Object} filters - { districtCode, talukaCode, villageCode, category, operatingDay }
   */
  async searchMarkets(filters = {}) {
    const all = await this.getAllMarkets();
    const { districtCode, talukaCode, category, operatingDay } = filters;

    return all.filter((m) => {
      // 1. District match (if provided)
      if (districtCode && Number(m.districtCode) !== Number(districtCode)) {
        return false;
      }

      // 2. Taluka filter (optional narrowing)
      if (talukaCode && Number(m.talukaCode) !== Number(talukaCode)) {
        return false;
      }

      // 3. Category filter
      if (category && category !== 'all') {
        const hasCategory = m.productCategories?.includes(category);
        if (!hasCategory) return false;
      }

      // 4. Operating Day filter
      if (operatingDay && operatingDay !== 'all') {
        if (m.operatingDay !== operatingDay) return false;
      }

      return true;
    });
  }

  // --- PERSONALIZED FAVORITES (STRICT USER ISOLATION) ---

  /**
   * Get list of favorite market IDs strictly belonging to the given user
   */
  async getUserFavorites(userId) {
    if (!userId) return [];
    try {
      const favs = await db.userFavorites.where('userId').equals(userId).toArray();
      return favs.map((f) => f.marketId);
    } catch (e) {
      console.warn('Error reading user favorites from IndexedDB', e);
      return [];
    }
  }

  /**
   * Toggle favorite market for the given user
   */
  async toggleFavorite(userId, marketId) {
    if (!userId) {
      throw new Error('Authentication required to save favorite market.');
    }
    try {
      const existing = await db.userFavorites
        .where('userId')
        .equals(userId)
        .and((f) => f.marketId === marketId)
        .first();

      if (existing) {
        await db.userFavorites.delete(existing.id);
        return { isFavorite: false };
      } else {
        const id = `fav_${userId}_${marketId}_${Date.now()}`;
        await db.userFavorites.put({
          id,
          userId,
          marketId,
          createdAt: new Date().toISOString()
        });
        return { isFavorite: true };
      }
    } catch (e) {
      console.error('Failed to toggle favorite market', e);
      throw e;
    }
  }

  // --- RECENT SEARCHES (STRICT USER ISOLATION) ---

  /**
   * Get recent search queries for active user
   */
  async getRecentSearches(userId) {
    if (!userId) return [];
    try {
      const list = await db.recentSearches.where('userId').equals(userId).toArray();
      return list.sort((a, b) => new Date(b.searchedAt) - new Date(a.searchedAt)).slice(0, 5);
    } catch (e) {
      console.warn('Error reading recent searches', e);
      return [];
    }
  }

  /**
   * Save search query under active user
   */
  async saveRecentSearch(userId, searchParams) {
    if (!userId) return;
    try {
      const id = `srch_${userId}_${Date.now()}`;
      await db.recentSearches.put({
        id,
        userId,
        ...searchParams,
        searchedAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Could not save recent search in IndexedDB', e);
    }
  }

  // --- COMMUNITY CORRECTIONS & MARKET SUBMISSIONS ---

  /**
   * Submit a market correction or unverified market proposal
   * Stored in IndexedDB for queued synchronization with backend
   */
  async submitMarketCorrection(submission) {
    const { userId, marketId, proposedData, reason } = submission;
    const id = `sub_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const record = {
      id,
      userId: userId || 'guest',
      marketId: marketId || null,
      proposedData,
      reason,
      status: 'pending_verification',
      createdAt: new Date().toISOString()
    };

    if (db && db.marketSubmissions) {
      if (!db.isOpen()) await db.open();
      await db.marketSubmissions.put(record);
    }

    return {
      success: true,
      submissionId: id,
      message: 'बाजार दुरुस्ती नोंद जतन झाली. पडताळणी प्रलंबित आहे (Correction queued for verification).'
    };
  }

  /**
   * Check if data is considered outdated (> 7 days old)
   */
  isDataOutdated(lastUpdated) {
    if (!lastUpdated) return true;
    const diffDays = (new Date() - new Date(lastUpdated)) / (1000 * 60 * 60 * 24);
    return diffDays > 7;
  }
}

export const bazaarDataService = new BazaarDataService();
