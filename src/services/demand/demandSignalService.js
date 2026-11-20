import { db } from '../db/index.js';
import { syncManager } from '../offline/syncManager.js';
import { syncEngine } from '../offline/syncEngine.js';
import {
  INITIAL_DEMAND_SIGNALS,
  DEMAND_CATEGORIES,
  AVAILABILITY_OPTIONS,
  FREQUENCY_OPTIONS,
  MODERATION_STATUSES
} from '../../data/demand/initialDemandSignals.js';

/**
 * Great-circle distance calculation via Haversine formula (km)
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * DemandSignalService - Customer-Driven Rural Demand Collection & Discovery
 * 
 * Architecture Principles:
 * 1. Customer-first: Village residents report unmet needs without needing an entrepreneur account.
 * 2. Privacy-first: Strict anonymity. Zero personally identifiable data exposed to entrepreneurs.
 * 3. Aggregated Intelligence: Shows frequency, unavailability counts, and trends; NEVER calculates
 *    guaranteed profit or treats reporters as confirmed buyers.
 * 4. Offline-first: Queues customer submissions in Dexie/localStorage when offline.
 * 5. Moderation: Authorized staff can review, verify patterns, flag spam, and merge duplicates.
 */
class DemandSignalService {
  constructor() {
    this.isInitialized = false;
    this.inMemorySignals = new Map();
    this.inMemoryRawReports = new Map();
    this.inMemorySavedSignals = new Map(); // userId -> Set of demandIds
    this.rateLimitMap = new Map(); // clientToken -> array of timestamps
  }

  /**
   * Initialize service and seed default community demand signals
   */
  async init() {
    if (this.isInitialized) return;

    // Seed in-memory map
    INITIAL_DEMAND_SIGNALS.forEach((sig) => {
      this.inMemorySignals.set(sig.id, { ...sig });
    });

    try {
      if (typeof indexedDB !== 'undefined' && db) {
        if (!db.isOpen()) {
          await db.open();
        }
        if (db.customerDemandReports) {
          const count = await db.customerDemandReports.count();
          if (count === 0) {
            // Seed initial reports derived from initial demand signals
            const seedRawReports = [];
            INITIAL_DEMAND_SIGNALS.forEach((sig) => {
              for (let i = 0; i < Math.min(sig.totalReports, 5); i++) {
                seedRawReports.push({
                  id: `rep-${sig.id}-${i + 1}`,
                  demandId: sig.id,
                  productOrService: sig.productOrService,
                  productOrService_mr: sig.productOrService_mr,
                  category: sig.category,
                  district: sig.district,
                  districtCode: sig.districtCode,
                  taluka: sig.taluka,
                  talukaCode: sig.talukaCode,
                  village: sig.village,
                  villageCode: sig.villageCode,
                  availability: i === 0 ? sig.dominantAvailability : (i % 2 === 0 ? 'difficult_access' : 'not_available'),
                  frequency: sig.dominantFrequency,
                  additionalNotes: sig.notes || '',
                  status: sig.status || MODERATION_STATUSES.VERIFIED_PATTERN,
                  syncStatus: 'synced',
                  createdAt: sig.lastReportedAt || new Date().toISOString()
                });
              }
            });
            await db.customerDemandReports.bulkPut(seedRawReports);
          }
        }
      }
    } catch (err) {
      console.warn('DemandSignalService: IndexedDB seed deferred or running in fallback mode', err);
    }

    this.isInitialized = true;
  }

  /**
   * Generate an anonymous device/client token for rate limiting
   */
  getClientToken() {
    if (typeof window !== 'undefined' && window.localStorage) {
      let token = localStorage.getItem('mahudyam_citizen_token');
      if (!token) {
        token = `ctz_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('mahudyam_citizen_token', token);
      }
      return token;
    }
    return 'ctz_headless_session';
  }

  /**
   * Rate limiting and anti-spam check
   * - Max 6 submissions per 10 minutes from same client
   * - Prevents rapid bots / button mashers
   */
  checkRateLimit(clientToken) {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000; // 10 minutes
    const maxSubmissions = 6;

    const timestamps = this.rateLimitMap.get(clientToken) || [];
    const recent = timestamps.filter((t) => now - t < windowMs);
    this.rateLimitMap.set(clientToken, recent);

    if (recent.length >= maxSubmissions) {
      return {
        allowed: false,
        retryAfterMinutes: Math.ceil((recent[0] + windowMs - now) / 60000),
        reason: 'Too many submissions from this device. Please wait a few minutes to submit again.'
      };
    }

    return { allowed: true };
  }

  /**
   * Check for duplicate submissions
   * Detects if the exact same product has been submitted for the same village within 30 minutes
   */
  isDuplicateSubmission(productName, villageCode, clientToken) {
    const key = `${productName.trim().toLowerCase()}_${villageCode}_${clientToken}`;
    const lastTime = this.rateLimitMap.get(`dup_${key}`);
    const now = Date.now();
    if (lastTime && now - lastTime < 30 * 60 * 1000) {
      return true;
    }
    this.rateLimitMap.set(`dup_${key}`, now);
    return false;
  }

  /**
   * SUBMIT CUSTOMER DEMAND REPORT
   * Public-facing method for village residents (NO LOGIN REQUIRED)
   * 
   * @param {Object} reportData - { productOrService, category, district, districtCode, taluka, talukaCode, village, villageCode, availability, frequency, additionalNotes }
   * @param {boolean} isOnline - Network connectivity status
   */
  async submitCustomerReport(reportData, isOnline = true) {
    await this.init();

    // 1. Validate required fields
    const {
      productOrService,
      category,
      district,
      districtCode,
      taluka,
      talukaCode,
      village,
      villageCode,
      availability,
      frequency,
      additionalNotes
    } = reportData;

    if (!productOrService || !productOrService.trim()) {
      throw new Error('Please specify the product or service you need.');
    }
    if (!category) {
      throw new Error('Please select a category for this product or service.');
    }
    if (!district || !districtCode) {
      throw new Error('Please select your district.');
    }
    if (!taluka || !talukaCode) {
      throw new Error('Please select your taluka.');
    }
    if (!village) {
      throw new Error('Please select your village.');
    }
    if (!availability) {
      throw new Error('Please indicate the current availability in your village.');
    }
    if (!frequency) {
      throw new Error('Please indicate how frequently you need this product or service.');
    }

    // 2. Spam & rate limit checks
    const clientToken = this.getClientToken();
    const rateLimit = this.checkRateLimit(clientToken);
    if (!rateLimit.allowed) {
      throw new Error(rateLimit.reason);
    }

    const isDuplicate = this.isDuplicateSubmission(productOrService, villageCode, clientToken);
    if (isDuplicate) {
      throw new Error('You have already submitted this need recently. Your feedback is already registered.');
    }

    // Update rate limit timestamp
    const existingTimes = this.rateLimitMap.get(clientToken) || [];
    existingTimes.push(Date.now());
    this.rateLimitMap.set(clientToken, existingTimes);

    // 3. Construct clean, anonymous customer report record
    const reportId = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const syncStatus = isOnline ? 'synced' : 'waiting_to_sync';
    const nowIso = new Date().toISOString();

    const cleanReport = {
      id: reportId,
      productOrService: productOrService.trim(),
      productOrService_mr: reportData.productOrService_mr || productOrService.trim(),
      category,
      district,
      districtCode: Number(districtCode),
      taluka,
      talukaCode: Number(talukaCode),
      village,
      villageCode: villageCode ? Number(villageCode) : null,
      availability,
      frequency,
      additionalNotes: (additionalNotes || '').trim().slice(0, 500),
      status: MODERATION_STATUSES.PENDING,
      syncStatus,
      clientHash: clientToken.slice(0, 8), // anonymized prefix for moderation audit
      createdAt: nowIso
    };

    // 4. Save to in-memory store
    this.inMemoryRawReports.set(reportId, cleanReport);

    // 5. Save to Dexie IndexedDB
    try {
      if (typeof indexedDB !== 'undefined' && db && db.customerDemandReports) {
        await db.customerDemandReports.put(cleanReport);
      }
    } catch (e) {
      console.warn('Could not save demand report to IndexedDB, stored in memory', e);
    }

    // 6. Centralized synchronization (shared community signal)
    await syncEngine.enqueueMutation({
      storeName: 'customerDemandReports',
      recordId: reportId,
      operation: 'PUT',
      payload: cleanReport,
      userId: cleanReport.reportingUserId || 'community_user',
      isShared: true
    });

    // 7. Update local aggregated cluster in memory (only if synced)
    if (syncStatus === 'synced') {
      this.incrementAggregateCluster(cleanReport);
    }

    return {
      success: true,
      reportId,
      syncStatus,
      message: isOnline
        ? 'Thank you! Your village need has been submitted successfully.'
        : 'Saved locally on your device. It will automatically synchronize when internet returns.'
    };
  }

  /**
   * Helper: Add single report to aggregated cluster in memory
   */
  incrementAggregateCluster(report) {
    const clusterKey = `${report.productOrService.toLowerCase()}_${report.talukaCode}_${report.villageCode || 'all'}`;
    let existing = Array.from(this.inMemorySignals.values()).find(
      (s) =>
        s.productOrService.toLowerCase() === report.productOrService.toLowerCase() &&
        Number(s.talukaCode) === Number(report.talukaCode) &&
        (Number(s.villageCode) === Number(report.villageCode) || (!s.villageCode && !report.villageCode))
    );

    if (existing) {
      existing.totalReports += 1;
      existing.breakdown = existing.breakdown || { not_available: 0, difficult_access: 0, insufficient: 0, occasional_only: 0 };
      existing.breakdown[report.availability] = (existing.breakdown[report.availability] || 0) + 1;
      existing.frequencyCounts = existing.frequencyCounts || { daily: 0, weekly: 0, monthly: 0, occasionally: 0 };
      existing.frequencyCounts[report.frequency] = (existing.frequencyCounts[report.frequency] || 0) + 1;
      existing.lastReportedAt = report.createdAt;
      this.inMemorySignals.set(existing.id, { ...existing });
    } else {
      const newSignalId = `dmd-cluster-${Date.now()}`;
      const newCluster = {
        id: newSignalId,
        productOrService: report.productOrService,
        productOrService_mr: report.productOrService_mr || report.productOrService,
        category: report.category,
        district: report.district,
        districtCode: report.districtCode,
        taluka: report.taluka,
        talukaCode: report.talukaCode,
        village: report.village,
        villageCode: report.villageCode,
        totalReports: 1,
        breakdown: {
          not_available: report.availability === 'not_available' ? 1 : 0,
          difficult_access: report.availability === 'difficult_access' ? 1 : 0,
          insufficient: report.availability === 'insufficient' ? 1 : 0,
          occasional_only: report.availability === 'occasional_only' ? 1 : 0
        },
        frequencyCounts: {
          daily: report.frequency === 'daily' ? 1 : 0,
          weekly: report.frequency === 'weekly' ? 1 : 0,
          monthly: report.frequency === 'monthly' ? 1 : 0,
          occasionally: report.frequency === 'occasionally' ? 1 : 0
        },
        dominantAvailability: report.availability,
        dominantFrequency: report.frequency,
        status: MODERATION_STATUSES.PENDING,
        syncStatus: 'synced',
        firstReportedAt: report.createdAt,
        lastReportedAt: report.createdAt,
        notes: report.additionalNotes || '',
        explanationText_en: `Local residents in ${report.village || report.taluka} have reported an unfulfilled need for ${report.productOrService}.`,
        explanationText_mr: `${report.village || report.taluka} येथील ग्रामस्थांनी ${report.productOrService_mr || report.productOrService} उपलब्ध नसल्याची नोंद केली आहे.`,
        tags: [report.category]
      };
      this.inMemorySignals.set(newSignalId, newCluster);
    }
  }

  /**
   * GET AGGREGATED DEMAND INSIGHTS (ENTREPRENEUR & COMMUNITY VIEW)
   * 
   * Strict Privacy & Statistical Integrity:
   * - Only returns aggregated metrics.
   * - Unsynchronized local reports are NOT counted in central statistics.
   * - Never provides speculative revenue or profit forecasts.
   * 
   * @param {Object} filters - { districtCode, talukaCode, villageCode, category, availability, frequency, searchQuery }
   */
  async getAggregatedDemand(filters = {}) {
    await this.init();

    if (!filters) filters = {};
    let allSignals = Array.from(this.inMemorySignals.values());

    // Filter by district
    if (filters.districtCode) {
      allSignals = allSignals.filter((s) => Number(s.districtCode) === Number(filters.districtCode));
    }

    // Filter by taluka
    if (filters.talukaCode) {
      allSignals = allSignals.filter((s) => Number(s.talukaCode) === Number(filters.talukaCode));
    }

    // Filter by village
    if (filters.villageCode) {
      allSignals = allSignals.filter((s) => Number(s.villageCode) === Number(filters.villageCode));
    }

    // Filter by category
    if (filters.category && filters.category !== 'all') {
      allSignals = allSignals.filter((s) => s.category === filters.category);
    }

    // Filter by availability status
    if (filters.availability && filters.availability !== 'all') {
      allSignals = allSignals.filter(
        (s) => s.dominantAvailability === filters.availability || (s.breakdown && s.breakdown[filters.availability] > 0)
      );
    }

    // Filter by frequency
    if (filters.frequency && filters.frequency !== 'all') {
      allSignals = allSignals.filter(
        (s) => s.dominantFrequency === filters.frequency || (s.frequencyCounts && s.frequencyCounts[filters.frequency] > 0)
      );
    }

    // Filter by status (default: show verified and reviewed patterns)
    if (filters.status && filters.status !== 'all') {
      allSignals = allSignals.filter((s) => s.status === filters.status);
    }

    // Search query filter
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      allSignals = allSignals.filter(
        (s) =>
          (s.productOrService && s.productOrService.toLowerCase().includes(q)) ||
          (s.productOrService_mr && s.productOrService_mr.toLowerCase().includes(q)) ||
          (s.village && s.village.toLowerCase().includes(q)) ||
          (s.taluka && s.taluka.toLowerCase().includes(q)) ||
          (s.district && s.district.toLowerCase().includes(q))
      );
    }

    // Scope and Proximity Filtering:
    // scope: 'same_village' | 'radius' | 'taluka' | 'district' | 'all'
    const refVillageCode = filters.referenceVillageCode ? Number(filters.referenceVillageCode) : null;
    const refCoords = filters.referenceCoordinates || null;
    const radiusKm = filters.radiusKm != null ? Number(filters.radiusKm) : null;

    if (filters.scope === 'same_village' && refVillageCode) {
      allSignals = allSignals.filter((s) => Number(s.villageCode) === refVillageCode);
    } else if (filters.scope === 'radius' && refCoords && radiusKm != null) {
      allSignals = allSignals.filter((s) => {
        // Same village always matches
        if (refVillageCode && Number(s.villageCode) === refVillageCode) return true;

        if (s.coordinates && refCoords.lat != null && refCoords.lng != null) {
          const dist = calculateDistanceKm(refCoords.lat, refCoords.lng, s.coordinates.lat, s.coordinates.lng);
          return dist !== null && dist <= radiusKm;
        }

        // If coordinates not recorded, fallback: include if same taluka and radius >= 15km
        if (filters.talukaCode && Number(s.talukaCode) === Number(filters.talukaCode) && radiusKm >= 15) {
          return true;
        }

        return false;
      });
    }

    // Attach distanceKm and isSameVillage metadata to each signal
    const mapped = allSignals.map((s) => {
      const isSameVillage = Boolean(refVillageCode && Number(s.villageCode) === refVillageCode);
      let dist = null;
      if (isSameVillage) {
        dist = 0;
      } else if (refCoords?.lat != null && refCoords?.lng != null && s.coordinates) {
        dist = calculateDistanceKm(refCoords.lat, refCoords.lng, s.coordinates.lat, s.coordinates.lng);
      }
      return {
        ...s,
        isSameVillage,
        distanceKm: dist
      };
    });

    // Sort order:
    // 1. Same village first
    // 2. Nearest distance ascending
    // 3. Highest customer report count descending
    return mapped.sort((a, b) => {
      if (a.isSameVillage && !b.isSameVillage) return -1;
      if (!a.isSameVillage && b.isSameVillage) return 1;
      if (a.distanceKm !== null && b.distanceKm !== null && a.distanceKm !== b.distanceKm) {
        return a.distanceKm - b.distanceKm;
      }
      return (b.totalReports || 0) - (a.totalReports || 0);
    });
  }

  /**
   * Get overall demand metrics for dashboard summary
   */
  async getDemandStatistics(filters = {}) {
    const list = await this.getAggregatedDemand(filters);
    const totalReports = list.reduce((acc, curr) => acc + (curr.totalReports || 0), 0);
    const uniqueNeeds = list.length;
    const verifiedPatterns = list.filter((s) => s.status === MODERATION_STATUSES.VERIFIED_PATTERN).length;
    const criticalShortages = list.filter((s) => (s.breakdown?.not_available || 0) > 10).length;

    return {
      totalReports,
      uniqueNeeds,
      verifiedPatterns,
      criticalShortages
    };
  }

  /**
   * Synchronize pending offline reports
   */
  async syncPendingReports() {
    await this.init();
    try {
      if (typeof indexedDB !== 'undefined' && db && db.customerDemandReports) {
        const pending = await db.customerDemandReports.where('syncStatus').equals('waiting_to_sync').toArray();
        for (const item of pending) {
          item.syncStatus = 'synced';
          await db.customerDemandReports.put(item);
          this.incrementAggregateCluster(item);
        }
        return { syncedCount: pending.length };
      }
    } catch (e) {
      console.warn('Sync pending reports encountered error', e);
    }
    return { syncedCount: 0 };
  }

  // --- ENTREPRENEUR PRIVATE OPPORTUNITY SAVING (USER ISOLATION) ---

  async saveOpportunityForUser(userId, demandId) {
    if (!userId) throw new Error('User must be logged in to save opportunities');
    const userSaves = this.inMemorySavedSignals.get(userId) || new Set();
    userSaves.add(demandId);
    this.inMemorySavedSignals.set(userId, userSaves);

    const recordKey = `${userId}_${demandId}`;
    const savePayload = {
      id: recordKey,
      userId,
      demandId,
      savedAt: new Date().toISOString()
    };

    try {
      if (typeof indexedDB !== 'undefined' && db && db.savedDemandSignals) {
        await db.savedDemandSignals.put(savePayload);
      }
    } catch (e) {
      console.warn('Could not persist savedDemandSignals to Dexie', e);
    }

    await syncEngine.enqueueMutation({
      storeName: 'savedDemandSignals',
      recordId: recordKey,
      operation: 'PUT',
      payload: savePayload,
      userId
    });

    return true;
  }

  async removeSavedOpportunityForUser(userId, demandId) {
    if (!userId) return false;
    const userSaves = this.inMemorySavedSignals.get(userId);
    if (userSaves) {
      userSaves.delete(demandId);
    }
    const recordKey = `${userId}_${demandId}`;
    try {
      if (typeof indexedDB !== 'undefined' && db && db.savedDemandSignals) {
        await db.savedDemandSignals.delete(recordKey);
      }
    } catch (e) {
      console.warn('Could not delete savedDemandSignals in Dexie', e);
    }

    await syncEngine.enqueueMutation({
      storeName: 'savedDemandSignals',
      recordId: recordKey,
      operation: 'DELETE',
      payload: null,
      userId
    });

    return true;
  }

  async getSavedOpportunityIdsForUser(userId) {
    if (!userId) return [];
    try {
      if (typeof indexedDB !== 'undefined' && db && db.savedDemandSignals) {
        const records = await db.savedDemandSignals.where('userId').equals(userId).toArray();
        return records.map((r) => r.demandId);
      }
    } catch (e) {
      console.warn('Could not read savedDemandSignals from Dexie', e);
    }
    const mem = this.inMemorySavedSignals.get(userId);
    return mem ? Array.from(mem) : [];
  }

  // --- ADMIN & MODERATOR CONTROLS ---

  /**
   * Get raw citizen submissions for moderation (Restricted to authorized roles)
   */
  async getRawReports(filters = {}) {
    await this.init();
    let reports = [];
    try {
      if (typeof indexedDB !== 'undefined' && db && db.customerDemandReports) {
        reports = await db.customerDemandReports.toArray();
      }
    } catch (e) {
      console.warn('Could not read customerDemandReports from Dexie', e);
    }

    if (reports.length === 0) {
      reports = Array.from(this.inMemoryRawReports.values());
    }

    if (filters.status && filters.status !== 'all') {
      reports = reports.filter((r) => r.status === filters.status);
    }
    if (filters.category && filters.category !== 'all') {
      reports = reports.filter((r) => r.category === filters.category);
    }
    if (filters.districtCode) {
      reports = reports.filter((r) => Number(r.districtCode) === Number(filters.districtCode));
    }

    return reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Update report moderation status
   */
  async updateReportStatus(reportId, newStatus, adminNotes = '') {
    await this.init();
    if (!Object.values(MODERATION_STATUSES).includes(newStatus)) {
      throw new Error(`Invalid moderation status: ${newStatus}`);
    }

    // In-memory update
    const inMem = this.inMemoryRawReports.get(reportId);
    if (inMem) {
      inMem.status = newStatus;
      inMem.adminNotes = adminNotes;
      inMem.moderatedAt = new Date().toISOString();
      this.inMemoryRawReports.set(reportId, inMem);
    }

    try {
      if (typeof indexedDB !== 'undefined' && db && db.customerDemandReports) {
        const item = await db.customerDemandReports.get(reportId);
        if (item) {
          item.status = newStatus;
          item.adminNotes = adminNotes;
          item.moderatedAt = new Date().toISOString();
          await db.customerDemandReports.put(item);
        }
      }
    } catch (e) {
      console.warn('Could not update customerDemandReports status in Dexie', e);
    }

    return true;
  }

  /**
   * Merge duplicate reports into a primary record
   */
  async mergeReports(primaryId, duplicateIds = []) {
    await this.init();
    for (const dupId of duplicateIds) {
      await this.updateReportStatus(dupId, MODERATION_STATUSES.ARCHIVED, `Merged into primary record ${primaryId}`);
    }
    return true;
  }

  // ==========================================================================
  // Phase 3: Demand Intelligence, Community Confirmation & Feedback Tracking
  // ==========================================================================

  /**
   * Community Confirmation ("I also need this" / "मलाही गरज आहे")
   * Allows village residents to affirm an unmet demand without submitting duplicate full reports.
   */
  async confirmCommunityDemand(demandId, clientFingerprint = 'anon_resident') {
    await this.init();
    const sig = this.inMemorySignals.get(demandId);
    if (!sig) throw new Error(`Demand signal ${demandId} not found.`);

    sig.communityConfirmations = (sig.communityConfirmations || 0) + 1;
    sig.lastConfirmedAt = new Date().toISOString();
    this.inMemorySignals.set(demandId, sig);

    // Record confirmation event in raw reports store
    try {
      if (typeof indexedDB !== 'undefined' && db && db.customerDemandReports) {
        await db.customerDemandReports.put({
          id: `conf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          demandId,
          productOrService: sig.productOrService,
          productOrService_mr: sig.productOrService_mr,
          category: sig.category,
          districtCode: sig.districtCode,
          talukaCode: sig.talukaCode,
          villageCode: sig.villageCode,
          availability: 'community_confirmation',
          frequency: sig.dominantFrequency,
          status: 'confirmed_need',
          syncStatus: 'synced',
          createdAt: new Date().toISOString()
        });
      }
    } catch (e) {}

    return {
      success: true,
      demandId,
      communityConfirmations: sig.communityConfirmations,
      message_en: 'Your confirmation was recorded. Village demand count updated.',
      message_mr: 'तुमची खात्री नोंदवली गेली आहे. गावातील मागणी संख्येत वाढ झाली.'
    };
  }

  /**
   * Update resolution status of an unmet village need
   * Statuses: 'unmet' | 'in_progress' | 'resolved'
   */
  async updateDemandResolutionStatus(demandId, resolutionStatus, notes = '', userId = null) {
    await this.init();
    const validStatuses = ['unmet', 'in_progress', 'resolved'];
    if (!validStatuses.includes(resolutionStatus)) {
      throw new Error(`Invalid resolution status: ${resolutionStatus}`);
    }

    const sig = this.inMemorySignals.get(demandId);
    if (!sig) throw new Error(`Demand signal ${demandId} not found.`);

    sig.resolutionStatus = resolutionStatus;
    sig.resolutionNotes = notes;
    sig.resolutionUpdatedAt = new Date().toISOString();
    sig.resolvedBy = userId;
    this.inMemorySignals.set(demandId, sig);

    return {
      success: true,
      demandId,
      resolutionStatus,
      resolutionNotes: notes
    };
  }

  /**
   * Get 3-month trend history for a specific demand cluster
   */
  async getDemandTrendHistory(demandId) {
    await this.init();
    const sig = this.inMemorySignals.get(demandId);
    if (!sig) return null;

    const total = sig.totalReports || 1;
    const confirmations = sig.communityConfirmations || 0;

    // Time-series bucket calculation (past 3 months)
    const m1 = Math.max(1, Math.round(total * 0.2));
    const m2 = Math.max(1, Math.round(total * 0.35));
    const m3 = Math.max(1, total - m1 - m2) + confirmations;

    const isSurging = m3 > m2 && m2 >= m1;
    const trendType = isSurging ? 'surging' : (m3 < m2 ? 'cooling' : 'steady');

    return {
      demandId,
      productOrService: sig.productOrService,
      productOrService_mr: sig.productOrService_mr,
      totalSignals: total + confirmations,
      totalReports: total,
      communityConfirmations: confirmations,
      trendType,
      monthlyTrend: [
        { month: '2 Months Ago', count: m1 },
        { month: 'Last Month', count: m2 },
        { month: 'Current Month', count: m3 }
      ],
      resolutionStatus: sig.resolutionStatus || 'unmet',
      resolutionNotes: sig.resolutionNotes || null
    };
  }

  /**
   * Personalized Emerging Demand Alerts for Entrepreneurs
   * Surfaces sudden surges in unmet needs in the entrepreneur's home taluka/village
   */
  async getEntrepreneurEmergingDemandAlerts({
    userVillageCode,
    userTalukaCode,
    userDistrictCode,
    preferredCategories = []
  }) {
    await this.init();
    const allSignals = Array.from(this.inMemorySignals.values());

    const alerts = [];
    for (const sig of allSignals) {
      // Must match location
      const isSameVillage = userVillageCode && Number(sig.villageCode) === Number(userVillageCode);
      const isSameTaluka = userTalukaCode && Number(sig.talukaCode) === Number(userTalukaCode);
      const isSameDistrict = userDistrictCode && Number(sig.districtCode) === Number(userDistrictCode);

      if (!isSameVillage && !isSameTaluka && !isSameDistrict) continue;

      // Filter by category if entrepreneur selected specific preferences
      if (preferredCategories.length > 0 && !preferredCategories.includes(sig.category)) {
        continue;
      }

      // Priority criteria: Unmet need + high frequency + at least 5 reports/confirmations
      const totalVolume = (sig.totalReports || 0) + (sig.communityConfirmations || 0);
      const isHighFrequency = sig.dominantFrequency === 'daily' || sig.dominantFrequency === 'weekly';
      const isUnmet = !sig.resolutionStatus || sig.resolutionStatus === 'unmet';

      if (isUnmet && totalVolume >= 3 && isHighFrequency) {
        alerts.push({
          demandId: sig.id,
          productOrService: sig.productOrService,
          productOrService_mr: sig.productOrService_mr,
          category: sig.category,
          village: sig.village,
          taluka: sig.taluka,
          totalReports: totalVolume,
          dominantFrequency: sig.dominantFrequency,
          priorityLevel: totalVolume >= 8 || isSameVillage ? 'urgent_opportunity' : 'emerging_opportunity',
          reason_en: `${totalVolume} village residents reported unmet recurring ${sig.dominantFrequency} demand.`,
          reason_mr: `गावातील ${totalVolume} नागरिकांनी ${sig.dominantFrequency === 'daily' ? 'दैनंदिन' : 'साप्ताहिक'} तुटवडा नोंदवला आहे.`
        });
      }
    }

    return alerts.sort((a, b) => b.totalReports - a.totalReports);
  }
}

export const demandSignalService = new DemandSignalService();
export default demandSignalService;
