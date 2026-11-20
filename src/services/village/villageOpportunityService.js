/**
 * MahaUdyam — Village Opportunity Detector Service
 * Phase 1: Village Intelligence & Multi-Source Data Integration
 * 
 * Provides:
 * - Village economic intelligence profiles across 6 core dimensions:
 *   1. Agricultural Intelligence
 *   2. Raw Materials & Natural Resources
 *   3. Local Skills & Occupations
 *   4. Existing Business Ecosystem
 *   5. Citizen Demand Intelligence (cross-linked with Demand Signal Collector)
 *   6. Infrastructure & Accessibility (cross-linked with BazaarPath markets)
 * - Data Quality & Confidence Classification (verified, community_reported, estimated, outdated, unknown)
 * - Transparent Data Completeness calculation (0-100%)
 * - Admin-only modification controls with audit logging
 * - Offline-first caching via Dexie IndexedDB
 */

import { db } from '../db/index.js';
import { INITIAL_VILLAGE_INTELLIGENCE } from '../../data/village/initialVillageIntelligence.js';
import { demandSignalService } from '../demand/demandSignalService.js';
import { locationService } from '../location/locationService.js';
import { adminAuthService } from '../auth/adminAuthService.js';
import { VERIFIED_LOCAL_SUPPLIERS } from '../../data/suppliers/verifiedSuppliers.js';

export const DATA_QUALITY_STATUS = {
  VERIFIED: 'verified',
  COMMUNITY_REPORTED: 'community_reported',
  ESTIMATED: 'estimated',
  OUTDATED: 'outdated',
  UNKNOWN: 'unknown'
};

export const INTELLIGENCE_CATEGORIES = {
  AGRICULTURE: 'agriculture',
  RAW_MATERIALS: 'rawMaterials',
  LOCAL_SKILLS: 'localSkills',
  EXISTING_BUSINESSES: 'existingBusinesses',
  CUSTOMER_DEMAND: 'customerDemand',
  INFRASTRUCTURE: 'infrastructure'
};

class VillageOpportunityService {
  constructor() {
    this.memoryCache = new Map();
    this.isInitialized = false;
  }

  /**
   * Initializes Dexie village intelligence store from authoritative master dataset if empty
   */
  async initVillageDatabase() {
    // 1. Seed in-memory cache first for instant retrieval in all environments
    for (const item of INITIAL_VILLAGE_INTELLIGENCE) {
      const completeness = this.computeCompletenessScore(item).overallScore;
      this.memoryCache.set(Number(item.villageCode), {
        ...item,
        dataCompleteness: completeness,
        syncStatus: 'synced',
        lastUpdated: item.lastUpdated || new Date().toISOString()
      });
    }

    try {
      if (typeof indexedDB === 'undefined' && typeof window === 'undefined') {
        this.isInitialized = true;
        return;
      }
      if (!db.villageIntelligence) return;
      const count = await db.villageIntelligence.count();
      if (count === 0) {
        for (const item of INITIAL_VILLAGE_INTELLIGENCE) {
          const completeness = this.computeCompletenessScore(item).overallScore;
          await db.villageIntelligence.put({
            ...item,
            dataCompleteness: completeness,
            syncStatus: 'synced',
            lastUpdated: item.lastUpdated || new Date().toISOString()
          });
        }
      }
      this.isInitialized = true;
    } catch (err) {
      // IndexedDB unavailable or closed in headless environment; memoryCache handles it
      this.isInitialized = true;
    }
  }

  /**
   * Computes granular completeness score (0-100) and category status
   */
  computeCompletenessScore(profile) {
    if (!profile) return { overallScore: 0, categoryBreakdown: {} };

    // Weight allocation across 6 dimensions
    // Agriculture: 25%, Raw Materials: 20%, Local Skills: 15%, Business Ecosystem: 15%, Demand: 10%, Infrastructure: 15%
    const weights = {
      agriculture: 25,
      rawMaterials: 20,
      localSkills: 15,
      existingBusinesses: 15,
      customerDemand: 10,
      infrastructure: 15
    };

    const getCategoryStatusScore = (categoryObj, weight) => {
      if (!categoryObj) return { score: 0, status: DATA_QUALITY_STATUS.UNKNOWN };
      const status = categoryObj.status || DATA_QUALITY_STATUS.UNKNOWN;

      let multiplier = 0;
      switch (status) {
        case DATA_QUALITY_STATUS.VERIFIED:
          multiplier = 1.0;
          break;
        case DATA_QUALITY_STATUS.COMMUNITY_REPORTED:
          multiplier = 0.75;
          break;
        case DATA_QUALITY_STATUS.ESTIMATED:
          multiplier = 0.50;
          break;
        case DATA_QUALITY_STATUS.OUTDATED:
          multiplier = 0.40;
          break;
        case DATA_QUALITY_STATUS.UNKNOWN:
        default:
          multiplier = 0;
          break;
      }

      // Bonus check if actual items exist in arrays
      if (Array.isArray(categoryObj.majorCrops) && categoryObj.majorCrops.length === 0 && status !== 'unknown') {
        multiplier *= 0.5;
      }
      if (Array.isArray(categoryObj.availableMaterials) && categoryObj.availableMaterials.length === 0 && status !== 'unknown') {
        multiplier *= 0.5;
      }

      const score = Math.round(weight * multiplier);
      return { score, status };
    };

    const breakdown = {
      agriculture: getCategoryStatusScore(profile.agriculture, weights.agriculture),
      rawMaterials: getCategoryStatusScore(profile.rawMaterials, weights.rawMaterials),
      localSkills: getCategoryStatusScore(profile.localSkills, weights.localSkills),
      existingBusinesses: getCategoryStatusScore(profile.existingBusinesses, weights.existingBusinesses),
      customerDemand: getCategoryStatusScore(profile.customerDemand, weights.customerDemand),
      infrastructure: getCategoryStatusScore(profile.infrastructure, weights.infrastructure)
    };

    const overallScore = Object.values(breakdown).reduce((sum, item) => sum + item.score, 0);

    return {
      overallScore: Math.min(100, Math.max(0, overallScore)),
      categoryBreakdown: breakdown
    };
  }

  /**
   * Retrieves a comprehensive Village Intelligence Profile
   * 1. Checks memory cache
   * 2. Checks Dexie IndexedDB
   * 3. Falls back to static initial master records
   * 4. Dynamically enriches with real-time Demand Signals & Verified Suppliers
   */
  async getVillageProfile(districtCode, talukaCode, villageCode) {
    let vCode = villageCode != null ? Number(villageCode) : Number(districtCode);
    let dCode = villageCode != null ? Number(districtCode) : null;
    let tCode = villageCode != null ? Number(talukaCode) : null;

    if (!vCode) return null;

    await this.initVillageDatabase();

    let profile = null;

    // 1. Try Dexie IndexedDB
    try {
      if (db.villageIntelligence) {
        profile = await db.villageIntelligence.get(vCode);
      }
    } catch (e) {
      console.warn('[VillageOpportunityService] Dexie read error:', e);
    }

    // 2. Fallback to Initial Dataset
    if (!profile) {
      profile = INITIAL_VILLAGE_INTELLIGENCE.find((v) => Number(v.villageCode) === vCode) || null;
    }

    // 3. Fallback: If no intelligence profile exists yet for this village,
    // construct a clean UNKNOWN profile using official location names.
    // Strict Data Ethics Rule: DO NOT fabricate district averages!
    if (!profile) {
      const locDistrict = locationService.getDistrictByCode(dCode);
      const locTaluka = locationService.getTalukaByCode(tCode);

      // Attempt to find village name from location service cache
      let villageNameEn = `Village (LGD: ${vCode})`;
      let villageNameMr = `गाव (LGD: ${vCode})`;

      profile = {
        villageCode: vCode,
        villageName: villageNameEn,
        villageName_mr: villageNameMr,
        talukaCode: tCode,
        talukaName: locTaluka?.name || 'Taluka',
        talukaName_mr: locTaluka?.marathiName || 'तालुका',
        districtCode: dCode,
        districtName: locDistrict?.name || 'District',
        districtName_mr: locDistrict?.marathiName || 'जिल्हा',
        pincode: 'Unknown',
        populationEstimate: null,
        lastUpdated: new Date().toISOString(),
        syncStatus: 'synced',

        agriculture: {
          status: DATA_QUALITY_STATUS.UNKNOWN,
          source: { name: 'No official survey record available', ref: 'Awaiting verified survey', retrievalDate: null },
          majorCrops: [],
          horticulture: [],
          dairyLivestock: { status: DATA_QUALITY_STATUS.UNKNOWN, cowsCount: null, buffaloCount: null, goatCount: null, dailyMilkCollectionLpd: null, chillingCenterAvailable: false },
          byProducts: [],
          processingPossibilities: []
        },
        rawMaterials: {
          status: DATA_QUALITY_STATUS.UNKNOWN,
          source: { name: 'No verified raw material mapping', ref: 'Awaiting survey', retrievalDate: null },
          availableMaterials: []
        },
        localSkills: {
          status: DATA_QUALITY_STATUS.UNKNOWN,
          source: { name: 'No registered artisan entries', ref: 'Awaiting survey', retrievalDate: null },
          skills: []
        },
        existingBusinesses: {
          status: DATA_QUALITY_STATUS.UNKNOWN,
          isCompleteList: false,
          source: { name: 'No MSME registered entities located in village', ref: 'Unlisted', retrievalDate: null },
          knownEnterprises: []
        },
        customerDemand: {
          status: DATA_QUALITY_STATUS.UNKNOWN,
          source: { name: 'Demand Signal Collector', ref: 'No customer signals yet', retrievalDate: null },
          expressedNeedsSummary: 'No citizen demand signals reported yet for this village.'
        },
        infrastructure: {
          status: DATA_QUALITY_STATUS.UNKNOWN,
          source: { name: 'No verified infrastructure audit record', ref: 'Awaiting audit', retrievalDate: null },
          roadConnectivity: { roadType: 'Unknown', allWeatherPassable: false, distanceToHighwayKm: null },
          powerSupply: { threePhaseAgriHours: null, singlePhaseDomesticHours: null, gridReliability: 'Unknown' },
          waterResources: { primarySources: [], tankerDependencySummer: false },
          internetConnectivity: { mobile4G5G: [], broadbandAvailable: false, cscCenterAvailable: false },
          storageFacilities: { coldStorageAvailable: false, godownsAvailable: false, distanceToNearestColdChainKm: null },
          nearestHaatsAndMandis: []
        }
      };
    }

    // 4. Enrich Customer Demand from Demand Signal Collector (Real-Time Integration)
    try {
      const demandData = await demandSignalService.getAggregatedDemand(dCode, tCode, vCode);
      if (demandData && demandData.totalReports > 0) {
        profile.customerDemand = {
          status: DATA_QUALITY_STATUS.COMMUNITY_REPORTED,
          source: {
            name: 'MahaUdyam Demand Signal Collector (Real-Time Citizen Reports)',
            ref: `${demandData.totalReports} independent citizen submissions for Village LGD ${vCode}`,
            retrievalDate: new Date().toISOString().split('T')[0]
          },
          totalReports: demandData.totalReports,
          expressedNeedsSummary: `${demandData.totalReports} expressed demand signals across ${demandData.categoryBreakdown?.length || 0} categories.`,
          unmetItems: (demandData.unmetNeeds || []).slice(0, 5).map((item) => ({
            productOrService: item.productOrService,
            category: item.category,
            reportCount: item.reportCount,
            availability: item.availability
          })),
          categoryBreakdown: demandData.categoryBreakdown || []
        };
      }
    } catch (err) {
      console.warn('[VillageOpportunityService] Failed to enrich customer demand:', err);
    }

    // 5. Enrich Existing Businesses from Verified Suppliers Dataset
    try {
      const matchingSuppliers = VERIFIED_LOCAL_SUPPLIERS.filter(
        (s) => Number(s.villageCode) === vCode || (Number(s.districtCode) === dCode && Number(s.talukaCode) === tCode)
      );
      if (matchingSuppliers.length > 0) {
        const enrichedList = matchingSuppliers.map((s) => ({
          name: s.businessName,
          category: s.category,
          category_mr: s.category_mr || s.category,
          productsServices: (s.productsSupplied || []).join(', '),
          verificationStatus: s.verificationStatus,
          source: s.verificationAuthority,
          lastUpdated: s.lastVerifiedDate
        }));

        // Merge without duplicate business names
        const existingNames = new Set((profile.existingBusinesses?.knownEnterprises || []).map((e) => e.name));
        const merged = [...(profile.existingBusinesses?.knownEnterprises || [])];
        for (const sup of enrichedList) {
          if (!existingNames.has(sup.name)) {
            merged.push(sup);
            existingNames.add(sup.name);
          }
        }

        profile.existingBusinesses = {
          ...profile.existingBusinesses,
          knownEnterprises: merged,
          status: merged.length > 0 ? (profile.existingBusinesses?.status || DATA_QUALITY_STATUS.VERIFIED) : DATA_QUALITY_STATUS.UNKNOWN,
          isCompleteList: false
        };
      }
    } catch (err) {
      console.warn('[VillageOpportunityService] Failed to enrich suppliers:', err);
    }

    // 6. Recalculate completeness score
    const completeness = this.computeCompletenessScore(profile);
    profile.dataCompleteness = completeness.overallScore;
    profile.completenessBreakdown = completeness.categoryBreakdown;

    // Cache in memory
    this.memoryCache.set(vCode, profile);

    // Cache in Dexie for offline performance
    try {
      if (db.villageIntelligence) {
        await db.villageIntelligence.put(profile);
      }
    } catch (e) {
      // Ignore cache write failures in headless/offline environments
    }

    return profile;
  }

  /**
   * Search available village profiles by name or code
   */
  async searchVillages(searchTerm = '', districtCode = null, talukaCode = null) {
    await this.initVillageDatabase();

    let all = Array.from(this.memoryCache.values());
    try {
      if (db.villageIntelligence) {
        const fromDb = await db.villageIntelligence.toArray();
        if (fromDb && fromDb.length > 0) all = fromDb;
      }
    } catch (e) {
      // Headless / memory fallback
    }

    if (!all || all.length === 0) {
      all = [...INITIAL_VILLAGE_INTELLIGENCE];
    }

    const term = (searchTerm || '').toLowerCase().trim();

    return all.filter((v) => {
      if (districtCode && Number(v.districtCode) !== Number(districtCode)) return false;
      if (talukaCode && Number(v.talukaCode) !== Number(talukaCode)) return false;

      if (!term) return true;

      const nameMatch = v.villageName?.toLowerCase().includes(term);
      const nameMrMatch = v.villageName_mr?.toLowerCase().includes(term);
      const codeMatch = String(v.villageCode).includes(term);

      return nameMatch || nameMrMatch || codeMatch;
    });
  }

  /**
   * Retrieves list of all seeded/cached villages with intelligence profiles
   */
  async getAllProfileVillages() {
    await this.initVillageDatabase();
    try {
      if (db.villageIntelligence) {
        const list = await db.villageIntelligence.toArray();
        if (list && list.length > 0) return list;
      }
    } catch (e) {
      // Fallback
    }
    return INITIAL_VILLAGE_INTELLIGENCE;
  }

  /**
   * Admin-Only: Update or contribute verified village records with audit logging
   */
  async submitAdminVillageContribution(adminUser, villageCode, category, contributionData, sourceInfo) {
    const vCode = Number(villageCode);
    if (!vCode) throw new Error('Invalid village code');

    // 1. RBAC Guard: Only authorized admins can contribute/verify records directly
    const isAdmin = adminAuthService.isAdminAuthenticated() || (adminUser && (adminUser.role === 'admin' || adminUser.role === 'super_admin' || adminUser.role === 'moderator'));
    if (!isAdmin) {
      throw new Error('Unauthorized: Only verified administrators can publish official village intelligence records.');
    }

    const currentProfile = await this.getVillageProfile(
      contributionData.districtCode || 490,
      contributionData.talukaCode || 4154,
      vCode
    );

    if (!currentProfile) throw new Error(`Village ${vCode} not found`);

    // 2. Merge contribution into targeted dimension
    const updatedCategoryData = {
      ...(currentProfile[category] || {}),
      ...contributionData,
      status: DATA_QUALITY_STATUS.VERIFIED,
      source: {
        name: sourceInfo?.name || `Admin Verification (${adminUser?.username || 'admin'})`,
        ref: sourceInfo?.ref || 'Official Administrative Field Audit',
        retrievalDate: new Date().toISOString().split('T')[0]
      }
    };

    const updatedProfile = {
      ...currentProfile,
      [category]: updatedCategoryData,
      lastUpdated: new Date().toISOString(),
      syncStatus: 'synced'
    };

    const completeness = this.computeCompletenessScore(updatedProfile);
    updatedProfile.dataCompleteness = completeness.overallScore;
    updatedProfile.completenessBreakdown = completeness.categoryBreakdown;

    // 3. Save into memory cache
    this.memoryCache.set(vCode, updatedProfile);

    // 4. Save into Dexie (with graceful headless/offline fallback)
    try {
      if (db.villageIntelligence) {
        await db.villageIntelligence.put(updatedProfile);
      }
    } catch (e) {
      // Offline/memory fallback
    }

    // 5. Record Admin Contribution record
    const contributionId = `contr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    try {
      if (db.adminVillageContributions) {
        await db.adminVillageContributions.put({
          id: contributionId,
          adminId: adminUser?.userId || 'admin',
          adminName: adminUser?.username || 'Administrator',
          villageCode: vCode,
          category,
          status: 'approved',
          details: contributionData,
          sourceInfo,
          createdAt: new Date().toISOString()
        });
      }
    } catch (e) {
      // Fallback
    }

    // 6. Append to Audit Logs
    try {
      if (db.auditLogs) {
        await db.auditLogs.put({
          id: `audit_vill_${Date.now()}`,
          adminId: adminUser?.userId || 'admin',
          adminName: adminUser?.username || 'Administrator',
          action: 'UPDATE_VILLAGE_INTELLIGENCE',
          recordType: 'villageIntelligence',
          recordId: `${vCode}_${category}`,
          timestamp: new Date().toISOString(),
          details: { category, source: sourceInfo?.name }
        });
      }
    } catch (e) {
      // Fallback
    }

    return updatedProfile;
  }

  /**
   * Community/Entrepreneur Contribution: Queues for moderation or sync
   */
  async submitCommunityContribution(user, villageCode, category, reportData) {
    const vCode = Number(villageCode);
    const item = {
      id: `comm_vill_${Date.now()}`,
      userId: user?.userId || 'anonymous_community',
      villageCode: vCode,
      category,
      reportData,
      status: 'pending_moderation',
      createdAt: new Date().toISOString()
    };

    // If offline, push to syncQueue
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        if (db.syncQueue) {
          await db.syncQueue.put({
            actionType: 'VILLAGE_COMMUNITY_CONTRIBUTION',
            payload: item,
            status: 'pending',
            createdAt: new Date().toISOString(),
            retryCount: 0
          });
        }
      } catch (e) {}
      return { success: true, queuedOffline: true, item };
    }

    try {
      if (db.syncQueue) {
        await db.syncQueue.put({
          actionType: 'VILLAGE_COMMUNITY_CONTRIBUTION',
          payload: item,
          status: 'synced',
          createdAt: new Date().toISOString(),
          retryCount: 0
        });
      }
    } catch (e) {}

    return { success: true, queuedOffline: false, item };
  }
}

export const villageOpportunityService = new VillageOpportunityService();
export default villageOpportunityService;
