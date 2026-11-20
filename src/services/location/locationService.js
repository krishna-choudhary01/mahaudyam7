import { MAHARASHTRA_DISTRICTS } from '../../data/locations/districts.js';
import { MAHARASHTRA_TALUKAS } from '../../data/locations/talukas.js';
import { db } from '../db/index.js';

/**
 * Location Service for Maharashtra Administrative Hierarchy
 * Authoritative dataset reference: Maharashtra Common Village Master & LGD
 * 36 Districts, 358 Talukas, 44,929 Villages
 * 
 * Features:
 * - Dual property normalization: supports both compact {c, n, m, t, d} and descriptive {code, name_en, name_mr, etc.}
 * - IndexedDB caching via Dexie with multi-district persistent storage
 * - Search in both Marathi and English
 * - Pagination / incremental retrieval to avoid DOM freeze
 * - Location dataset refresh mechanism
 */

// In-memory memory cache for active session fast lookup
const sessionVillageCache = new Map();

export const locationService = {
  /**
   * Returns all 36 official districts
   */
  getAllDistricts() {
    return MAHARASHTRA_DISTRICTS;
  },

  /**
   * Returns district by LGD code
   */
  getDistrictByCode(code) {
    if (!code) return null;
    const numCode = Number(code);
    return MAHARASHTRA_DISTRICTS.find((d) => d.code === numCode) || null;
  },

  /**
   * Returns all talukas belonging to a district LGD code
   */
  getTalukasForDistrict(districtCode) {
    if (!districtCode) return [];
    const numCode = Number(districtCode);
    return MAHARASHTRA_TALUKAS.filter((t) => t.districtCode === numCode);
  },

  /**
   * Returns taluka by LGD code
   */
  getTalukaByCode(code) {
    if (!code) return null;
    const numCode = Number(code);
    return MAHARASHTRA_TALUKAS.find((t) => t.code === numCode) || null;
  },

  /**
   * Normalize village record to support any property naming convention used by components
   */
  normalizeVillage(v) {
    if (!v) return null;
    const code = Number(v.c || v.code);
    const talukaCode = Number(v.t || v.talukaCode);
    const districtCode = Number(v.d || v.districtCode);
    const name_en = v.n || v.name_en || v.name || '';
    const name_mr = v.m || v.name_mr || v.marathiName || name_en;

    return {
      // Primary keys & compact
      c: code,
      n: name_en,
      m: name_mr,
      t: talukaCode,
      d: districtCode,

      // Descriptive keys
      code: code,
      name_en: name_en,
      name_mr: name_mr,
      name: name_en,
      marathiName: name_mr,
      talukaCode: talukaCode,
      districtCode: districtCode
    };
  },

  /**
   * Fetches district village package from public directory
   * Uses robust relative base URL resolution
   */
  async fetchDistrictVillagesFile(districtCode) {
    const dCode = Number(districtCode);
    const baseUrl = import.meta.env?.BASE_URL || '/';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const url = `${cleanBase}data/locations/villages/${dCode}.json`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`District village package not available at ${url} (HTTP ${response.status})`);
    }
    const rawList = await response.json();
    if (!Array.isArray(rawList)) return [];

    return rawList.map(this.normalizeVillage);
  },

  /**
   * Loads all villages for a taluka with offline Dexie caching
   * 1. Checks in-memory session cache first
   * 2. Checks Dexie IndexedDB cache (100% offline)
   * 3. Fetches district package on-demand if missing
   * 4. Caches full district into Dexie for permanent offline availability
   * 
   * Returns a hybrid array-object so both Array methods (res.map, Array.isArray)
   * and object property access (res.villages, res.source) work flawlessly.
   * 
   * @param {number|string} districtCode 
   * @param {number|string} talukaCode 
   * @param {boolean} forceRefresh 
   * @returns {Promise<Array & { villages: Array, source: string, error?: string }>}
   */
  async getVillagesForTaluka(districtCode, talukaCode, forceRefresh = false) {
    const wrap = (list, source, error = null) => {
      const arr = Array.isArray(list) ? [...list] : [];
      arr.villages = arr;
      arr.source = source;
      if (error) arr.error = error;
      return arr;
    };

    const dCode = Number(districtCode);
    const tCode = Number(talukaCode);

    if (!dCode || !tCode) {
      return wrap([], 'empty');
    }

    const cacheKey = `${dCode}_${tCode}`;

    // 1. Session memory check
    if (!forceRefresh && sessionVillageCache.has(cacheKey)) {
      const memList = sessionVillageCache.get(cacheKey);
      if (memList && memList.length > 0) {
        return wrap(memList, 'Fast Memory Cache');
      }
    }

    try {
      // 2. Check local IndexedDB cache if not forcing refresh
      if (!forceRefresh && db && db.cachedVillages) {
        try {
          if (!db.isOpen()) {
            await db.open();
          }
          const cached = await db.cachedVillages.where('t').equals(tCode).toArray();
          if (cached && cached.length > 0) {
            const normalized = cached.map(this.normalizeVillage);
            sessionVillageCache.set(cacheKey, normalized);
            return wrap(normalized, 'IndexedDB (Offline Cache)');
          }
        } catch (dbReadErr) {
          console.warn('Dexie village read warning, falling back to network', dbReadErr);
        }
      }

      // 3. Fetch district package
      const districtVillages = await this.fetchDistrictVillagesFile(dCode);

      // 4. Cache into Dexie IndexedDB
      if (db && db.cachedVillages && districtVillages.length > 0) {
        try {
          if (!db.isOpen()) {
            await db.open();
          }
          // Bulk put normalized objects (primary key is c)
          await db.cachedVillages.bulkPut(districtVillages);
        } catch (dbPutErr) {
          console.warn('Failed to bulkPut villages into Dexie', dbPutErr);
        }
      }

      // 5. Filter for target taluka
      const talukaVillages = districtVillages.filter((v) => Number(v.t) === tCode);
      sessionVillageCache.set(cacheKey, talukaVillages);

      return wrap(
        talukaVillages,
        forceRefresh ? 'Refreshed from Official Dataset' : 'Downloaded & Saved to Offline Storage'
      );
    } catch (err) {
      console.error('Error loading villages for taluka', err);

      // Check fallback in IndexedDB even if network failed
      try {
        if (db && db.cachedVillages) {
          if (!db.isOpen()) await db.open();
          const fallback = await db.cachedVillages.where('t').equals(tCode).toArray();
          if (fallback.length > 0) {
            const normalized = fallback.map(this.normalizeVillage);
            sessionVillageCache.set(cacheKey, normalized);
            return wrap(normalized, 'IndexedDB (Offline Fallback)');
          }
        }
      } catch (fallbackErr) {
        console.warn('Dexie fallback also unavailable', fallbackErr);
      }

      return wrap(
        [],
        'unavailable',
        `Could not load villages: ${err.message}. Connect to internet to cache this district.`
      );
    }
  },

  /**
   * Search villages across a taluka with pagination support
   */
  async searchVillages({ districtCode, talukaCode, query = '', limit = 50, offset = 0 }) {
    const { villages, source, error } = await this.getVillagesForTaluka(districtCode, talukaCode);
    if (error || !villages) {
      return { items: [], total: 0, source, error };
    }

    const cleanQuery = query.trim().toLowerCase();
    let filtered = villages;

    if (cleanQuery) {
      filtered = villages.filter((v) => {
        const matchEn = (v.name_en || '').toLowerCase().includes(cleanQuery);
        const matchMr = (v.name_mr || '').includes(query.trim());
        const matchCode = String(v.code).includes(cleanQuery);
        return matchEn || matchMr || matchCode;
      });
    }

    const paginated = filtered.slice(offset, offset + limit);
    return {
      items: paginated,
      total: filtered.length,
      hasMore: offset + limit < filtered.length,
      source
    };
  },

  /**
   * Check if a district's villages are already cached in IndexedDB
   */
  async isDistrictCached(districtCode) {
    try {
      if (!db || !db.cachedVillages) return false;
      if (!db.isOpen()) await db.open();
      const dCode = Number(districtCode);
      const count = await db.cachedVillages.where('d').equals(dCode).count();
      return count > 0;
    } catch {
      return false;
    }
  },

  /**
   * Force refresh official location dataset for a district
   */
  async refreshDistrict(districtCode) {
    const dCode = Number(districtCode);
    const talukas = this.getTalukasForDistrict(dCode);
    // Clear session cache for this district's talukas
    talukas.forEach((t) => sessionVillageCache.delete(`${dCode}_${t.code}`));

    const result = await this.fetchDistrictVillagesFile(dCode);
    if (result && result.length > 0 && db && db.cachedVillages) {
      if (!db.isOpen()) await db.open();
      await db.cachedVillages.bulkPut(result);
    }
    return { success: true, count: result.length };
  }
};
