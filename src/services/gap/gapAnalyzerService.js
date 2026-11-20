import { db } from '../db/index.js';
import { demandSignalService, calculateDistanceKm } from '../demand/demandSignalService.js';
import { VERIFIED_LOCAL_SUPPLIERS, SUPPLIER_VERIFICATION_STATUSES } from '../../data/suppliers/verifiedSuppliers.js';
import { MODERATION_STATUSES } from '../../data/demand/initialDemandSignals.js';

/**
 * 5 Standard Phase 2 Gap Classifications
 */
export const GAP_CLASSIFICATIONS = {
  STRONG_GAP: 'strong_gap',                 // A. Strong Potential Gap (तीव्र संभाव्य तुटवडा)
  MODERATE_GAP: 'moderate_gap',             // B. Moderate Potential Gap (मध्यम संभाव्य तुटवडा)
  EMERGING_DEMAND: 'emerging_demand',       // C. Emerging Demand (वाढती नवी मागणी)
  NO_CLEAR_GAP: 'no_clear_gap',             // D. No Clear Gap (स्पष्ट तुटवडा नाही)
  INSUFFICIENT_EVIDENCE: 'insufficient_evidence' // E. Insufficient Evidence (अपुरा पुरावा / डेटा)
};

// Aliases for Phase 1 backward compatibility
export const GAP_SEVERITY = {
  CRITICAL_GAP: 'strong_gap',
  STRONG_GAP: 'strong_gap',
  MODERATE_GAP: 'moderate_gap',
  BALANCED: 'no_clear_gap',
  NO_CLEAR_GAP: 'no_clear_gap',
  EMERGING_DEMAND: 'emerging_demand',
  INSUFFICIENT_DATA: 'insufficient_evidence',
  INSUFFICIENT_EVIDENCE: 'insufficient_evidence'
};

/**
 * Demand Trend Classifications
 */
export const DEMAND_TRENDS = {
  INCREASING: 'increasing',                 // Increasing demand over time (वाढती मागणी)
  STABLE: 'stable',                         // Stable demand (स्थिर मागणी)
  DECREASING: 'decreasing',                 // Decreasing demand (घटती मागणी)
  EMERGING: 'emerging',                     // New / emerging demand (नवी वाढती मागणी)
  NOT_AVAILABLE: 'trend_not_available'      // Trend not available due to insufficient history (कल उपलब्ध नाही)
};

/**
 * Data Coverage Levels
 */
export const DATA_COVERAGE_LEVELS = {
  ADEQUATE: 'adequate',                     // Good geographic reporting & supplier registry
  PARTIAL: 'partial',                       // Moderate coverage; some unlisted sources possible
  INADEQUATE: 'inadequate'                  // Sparse reporting or missing supplier survey
};

/**
 * Confidence Levels (kept separate from Gap Score)
 */
export const CONFIDENCE_LEVEL = {
  HIGH: 'high',         // >= 75%
  MODERATE: 'moderate', // 50% - 74%
  LOW: 'low'            // < 50%
};

/**
 * Initial Configurable Scoring Weights (Transparent Product Assumptions)
 * Total = 1.0 (100%)
 */
export const DEFAULT_SCORING_WEIGHTS = {
  demandStrength: 0.35,        // 35% - Recency-weighted report volume & citizen intensity
  supplyAvailability: 0.30,   // 30% - Verified vs unverified supplier presence (inverted)
  demandRecency: 0.15,        // 15% - Freshness of customer demand reports
  consistency: 0.10,          // 10% - Citizen agreement on "not available" & frequency
  dataCoverage: 0.10          // 10% - Administrative completeness & survey reliability
};

/**
 * Supply–Demand Gap Analyzer Service (Phase 2 Engine)
 * 
 * Objectives:
 * - Intelligent, transparent, rule-based engine comparing citizen demand with known supply.
 * - Rigorous data preprocessing: excludes spam/duplicates, recency weighting, entity deduplication.
 * - 5 standardized classifications: Strong Gap, Moderate Gap, Emerging Demand, No Clear Gap, Insufficient Evidence.
 * - Configurable Potential Gap Score (0-100) separate from confidence level.
 * - Comparable-period Demand Trend analysis.
 * - Offline-first caching with sync status and personal saved opportunities.
 */
class GapAnalyzerService {
  constructor() {
    this.isInitialized = false;
    this.inMemorySuppliers = new Map();
    this.inMemorySavedGaps = new Map(); // userId -> Set of gapIds
    this.inMemoryAnalysisCache = new Map(); // cacheKey -> { timestamp, data }
    this.scoringWeights = { ...DEFAULT_SCORING_WEIGHTS };
  }

  /**
   * Initialize suppliers from master registry into Dexie & in-memory cache
   */
  async init() {
    if (this.isInitialized) return;

    VERIFIED_LOCAL_SUPPLIERS.forEach((sup) => {
      this.inMemorySuppliers.set(sup.id, { ...sup });
    });

    try {
      if (typeof indexedDB !== 'undefined' && db) {
        if (!db.isOpen()) {
          await db.open();
        }
        if (db.verifiedSuppliers) {
          const count = await db.verifiedSuppliers.count();
          if (count === 0) {
            await db.verifiedSuppliers.bulkPut(VERIFIED_LOCAL_SUPPLIERS);
          }
        }
      }
    } catch (err) {
      console.warn('GapAnalyzerService: IndexedDB seed deferred or running in fallback mode', err);
    }

    this.isInitialized = true;
  }

  /**
   * Set custom scoring weights (allows runtime calibration)
   */
  setScoringWeights(newWeights) {
    this.scoringWeights = {
      ...this.scoringWeights,
      ...newWeights
    };
  }

  getScoringWeights() {
    return { ...this.scoringWeights };
  }

  // =========================================================================
  // 1. DATA PREPROCESSING & CLEANING (Section 2)
  // =========================================================================

  /**
   * Preprocess customer demand reports:
   * - Exclude rejected and spam reports.
   * - Exclude duplicate reports within identical temporal windows.
   * - Give greater relevance to recent reports (recency decay).
   * - Group by village and product/service category.
   * - Handle missing fields safely without discarding silently.
   */
  preprocessDemandReports(rawReports = [], referenceDate = new Date()) {
    const validReports = [];
    const exclusionLog = [];
    const seenFingerprints = new Set();
    const nowMs = referenceDate.getTime();

    for (const report of rawReports) {
      // 1. Exclude spam, rejected, or archived submissions
      if (
        report.status === MODERATION_STATUSES.REJECTED_SPAM ||
        report.status === MODERATION_STATUSES.ARCHIVED
      ) {
        exclusionLog.push({
          reportId: report.id,
          reason: 'FLAGGED_SPAM_OR_ARCHIVED',
          details: `Report status '${report.status}' indicates spam or archived invalid submission.`
        });
        continue;
      }

      // 2. Safe field validation (Do not discard silently)
      const hasProduct = Boolean(report.productOrService && report.productOrService.trim());
      const hasCategory = Boolean(report.category && report.category.trim());
      const hasLocation = Boolean(report.districtCode && report.talukaCode && report.villageCode);

      if (!hasProduct || !hasCategory || !hasLocation) {
        exclusionLog.push({
          reportId: report.id,
          reason: 'MISSING_MANDATORY_FIELD',
          details: `Missing critical field(s): ${[!hasProduct && 'product', !hasCategory && 'category', !hasLocation && 'location'].filter(Boolean).join(', ')}.`
        });
        continue;
      }

      // 3. Duplicate detection within 24-hour window
      const dateStr = report.createdAt ? new Date(report.createdAt).toISOString().split('T')[0] : 'unknown_date';
      const reporterId = report.clientToken || report.userId || report.reporterToken || 'anon';
      const prodKey = report.productOrService.trim().toLowerCase();
      const dupFingerprint = `${prodKey}_${report.villageCode}_${reporterId}_${dateStr}`;

      if (seenFingerprints.has(dupFingerprint)) {
        exclusionLog.push({
          reportId: report.id,
          reason: 'IDENTIFIABLE_DUPLICATE',
          details: `Identical product request submitted by same reporter in village ${report.villageCode} on ${dateStr}.`
        });
        continue;
      }
      seenFingerprints.add(dupFingerprint);

      // 4. Recency Weighting Calculation
      let reportDateMs = nowMs;
      if (report.createdAt) {
        const parsed = Date.parse(report.createdAt);
        if (!isNaN(parsed)) reportDateMs = parsed;
      }

      const ageInDays = Math.max(0, Math.round((nowMs - reportDateMs) / (1000 * 60 * 60 * 24)));
      let recencyWeight = 0.25; // Default for older (>90 days)
      if (ageInDays <= 30) {
        recencyWeight = 1.0;  // Fresh / highly relevant
      } else if (ageInDays <= 60) {
        recencyWeight = 0.8;  // Reasonably recent
      } else if (ageInDays <= 90) {
        recencyWeight = 0.5;  // Moderately dated
      }

      validReports.push({
        ...report,
        ageInDays,
        recencyWeight
      });
    }

    const recencyWeightedCount = validReports.reduce((sum, r) => sum + (r.recencyWeight || 1), 0);

    return {
      validReports,
      exclusionLog,
      totalExcluded: exclusionLog.length,
      recencyWeightedCount: Math.round(recencyWeightedCount * 10) / 10
    };
  }

  /**
   * Preprocess suppliers dataset:
   * - Match by village, nearby location, category, and products.
   * - Avoid counting multiple listings of the same business entity as separate suppliers.
   * - Distinguish verified suppliers from unverified listings.
   * - Handle missing fields safely.
   */
  preprocessSuppliers(suppliers = []) {
    const verifiedSuppliers = [];
    const unverifiedSuppliers = [];
    const seenBusinessEntities = new Set();
    let deduplicatedCount = 0;

    for (const sup of suppliers) {
      if (!sup || sup.operationalStatus !== 'active') continue;

      // Deduplicate multiple listings belonging to the same business entity
      const normalizedName = (sup.normalizedEntityName || sup.businessName || '')
        .trim()
        .toLowerCase()
        .replace(/kendra|center|depot|branch|shop|workshop|store/g, '')
        .replace(/\s+/g, ' ');

      const regNumber = sup.verificationSource || '';
      const entityKey = `${normalizedName}_${sup.talukaCode}_${regNumber.slice(0, 15)}`;

      if (seenBusinessEntities.has(entityKey)) {
        deduplicatedCount++;
        continue;
      }
      seenBusinessEntities.add(entityKey);

      // Distinguish verified vs unverified
      const isVerified = sup.verificationStatus === SUPPLIER_VERIFICATION_STATUSES.VERIFIED ||
                         sup.verificationStatus === 'verified';

      if (isVerified) {
        verifiedSuppliers.push({ ...sup, isVerified: true });
      } else {
        unverifiedSuppliers.push({ ...sup, isVerified: false });
      }
    }

    return {
      verifiedSuppliers,
      unverifiedSuppliers,
      totalEntityCount: verifiedSuppliers.length + unverifiedSuppliers.length,
      deduplicatedCount,
      rawCount: suppliers.length
    };
  }

  /**
   * Retrieve all known suppliers matching location/category
   */
  async getSuppliers(filters = {}) {
    await this.init();
    let suppliers = [];

    try {
      if (typeof indexedDB !== 'undefined' && db && db.verifiedSuppliers) {
        suppliers = await db.verifiedSuppliers.toArray();
      }
    } catch (e) {
      console.warn('Could not read verifiedSuppliers from Dexie; fallback to memory', e);
    }

    if (suppliers.length === 0) {
      suppliers = Array.from(this.inMemorySuppliers.values());
    }

    if (filters.districtCode) {
      suppliers = suppliers.filter((s) => Number(s.districtCode) === Number(filters.districtCode));
    }
    if (filters.talukaCode) {
      suppliers = suppliers.filter((s) => Number(s.talukaCode) === Number(filters.talukaCode));
    }
    if (filters.villageCode) {
      suppliers = suppliers.filter((s) => Number(s.villageCode) === Number(filters.villageCode));
    }
    if (filters.category && filters.category !== 'all') {
      suppliers = suppliers.filter((s) => s.category === filters.category);
    }

    return suppliers;
  }

  /**
   * Match known suppliers to a specific demand item
   */
  matchSuppliersForDemand(demandItem, allSuppliers, radiusKm = 15) {
    const demandCategory = demandItem.category;
    const demandVillageCode = Number(demandItem.villageCode);
    const demandCoords = demandItem.coordinates;

    const matchingRaw = allSuppliers.filter((sup) => {
      if (sup.operationalStatus !== 'active') return false;
      if (sup.category !== demandCategory) return false;

      // Same village
      if (demandVillageCode && Number(sup.villageCode) === demandVillageCode) {
        return true;
      }

      // Proximity radius match
      if (demandCoords && sup.coordinates) {
        const dist = calculateDistanceKm(demandCoords.lat, demandCoords.lng, sup.coordinates.lat, sup.coordinates.lng);
        return dist !== null && dist <= radiusKm;
      }

      // Fallback: same taluka
      return Number(sup.talukaCode) === Number(demandItem.talukaCode);
    });

    // Annotate with distance
    const annotated = matchingRaw.map((sup) => {
      let dist = null;
      if (demandVillageCode && Number(sup.villageCode) === demandVillageCode) {
        dist = 0;
      } else if (demandCoords && sup.coordinates) {
        dist = calculateDistanceKm(demandCoords.lat, demandCoords.lng, sup.coordinates.lat, sup.coordinates.lng);
      }
      return {
        ...sup,
        distanceKm: dist,
        isSameVillage: Boolean(demandVillageCode && Number(sup.villageCode) === demandVillageCode)
      };
    }).sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));

    // Preprocess: deduplicate business entities & separate verified from unverified
    return this.preprocessSuppliers(annotated);
  }

  // =========================================================================
  // 2. DEMAND TREND ANALYSIS (Section 5)
  // =========================================================================

  /**
   * Demand Trend Analysis:
   * Compares dated reports across comparable time periods:
   * - Window 1 (Recent): 0 - 30 days ago
   * - Window 2 (Previous): 31 - 60 days ago
   * 
   * Classifications:
   * - INCREASING: Growth >= +30% and recentCount >= 4
   * - STABLE: Activity in both windows without major swing (-30% to +30%)
   * - DECREASING: Drop <= -30%
   * - EMERGING: Zero/sparse history previously, but new surge (>=4) in recent window
   * - NOT_AVAILABLE: Insufficient historical reports to draw valid comparison
   */
  analyzeDemandTrend(demandItem, referenceDate = new Date()) {
    const rawReports = demandItem.rawReports || [];
    const nowMs = referenceDate.getTime();

    // If no raw dated reports, use simulated monthly cohorts if available
    if (rawReports.length === 0) {
      if (demandItem.monthlyTrends && demandItem.monthlyTrends.length >= 2) {
        const len = demandItem.monthlyTrends.length;
        const cur = demandItem.monthlyTrends[len - 1].count;
        const prev = demandItem.monthlyTrends[len - 2].count;
        if (prev === 0 && cur >= 4) {
          return {
            trend: DEMAND_TRENDS.EMERGING,
            recentCount: cur,
            previousCount: prev,
            growthPercentage: null,
            label_en: 'New or Emerging Demand',
            label_mr: 'नवी वाढती मागणी',
            explanation_en: `Emerging demand: ${cur} new citizen requests recorded in the latest period with no prior baseline.`,
            explanation_mr: `नवी वाढती मागणी: आधी नोंद नसताना ताज्या कालावधीत ${cur} नवीन नागरिक मागण्या नोंदवल्या गेल्या.`
          };
        }
        const diff = cur - prev;
        const pct = prev > 0 ? Math.round((diff / prev) * 100) : null;
        if (pct != null && pct >= 30 && cur >= 4) {
          return {
            trend: DEMAND_TRENDS.INCREASING,
            recentCount: cur,
            previousCount: prev,
            growthPercentage: pct,
            label_en: 'Increasing Demand',
            label_mr: 'वाढती मागणी',
            explanation_en: `Demand grew by +${pct}% (${cur} recent vs ${prev} previous period).`,
            explanation_mr: `मागणीमध्ये +${pct}% वाढ झाली आहे (आधी ${prev}, आता ${cur} नोंदी).`
          };
        }
        if (pct != null && pct <= -30) {
          return {
            trend: DEMAND_TRENDS.DECREASING,
            recentCount: cur,
            previousCount: prev,
            growthPercentage: pct,
            label_en: 'Decreasing Demand',
            label_mr: 'घटती मागणी',
            explanation_en: `Demand fell by ${pct}% (${cur} recent vs ${prev} previous period).`,
            explanation_mr: `मागणीमध्ये ${pct}% घट झाली आहे (आधी ${prev}, आता ${cur} नोंदी).`
          };
        }
        if (cur + prev >= 4) {
          return {
            trend: DEMAND_TRENDS.STABLE,
            recentCount: cur,
            previousCount: prev,
            growthPercentage: pct || 0,
            label_en: 'Stable Demand',
            label_mr: 'स्थिर मागणी',
            explanation_en: `Demand is steady with comparable activity (${cur} recent, ${prev} previous period).`,
            explanation_mr: `मागणी स्थिर आहे (मागील काळात ${prev}, तर ताज्या काळात ${cur} नोंदी).`
          };
        }
      }

      // Check if total reports is too small
      if ((demandItem.totalReports || 0) < 4) {
        return {
          trend: DEMAND_TRENDS.NOT_AVAILABLE,
          recentCount: demandItem.totalReports || 0,
          previousCount: 0,
          growthPercentage: null,
          label_en: 'Trend not available',
          label_mr: 'कल उपलब्ध नाही',
          explanation_en: 'Insufficient historical data to calculate a reliable demand trend.',
          explanation_mr: 'विश्वासार्ह कल निश्चित करण्यासाठी पुरेसा ऐतिहासिक डेटा उपलब्ध नाही.'
        };
      }

      // Fallback if total reports is decent but dated breakdown is absent
      return {
        trend: DEMAND_TRENDS.STABLE,
        recentCount: demandItem.totalReports || 0,
        previousCount: 0,
        growthPercentage: 0,
        label_en: 'Stable Demand',
        label_mr: 'स्थिर मागणी',
        explanation_en: `Steady community demand observed across ${demandItem.totalReports} total reports.`,
        explanation_mr: `${demandItem.totalReports} नोंदींच्या आधारे गावात सातत्यपूर्ण मागणी दिसून येते.`
      };
    }

    // Process from real dated reports
    const d30Ms = 30 * 24 * 60 * 60 * 1000;
    const d60Ms = 60 * 24 * 60 * 60 * 1000;

    let countRecent = 0;
    let countPrevious = 0;

    for (const r of rawReports) {
      const dt = Date.parse(r.createdAt);
      if (isNaN(dt)) continue;
      const age = nowMs - dt;
      if (age >= 0 && age <= d30Ms) {
        countRecent++;
      } else if (age > d30Ms && age <= d60Ms) {
        countPrevious++;
      }
    }

    const totalInWindows = countRecent + countPrevious;

    if (totalInWindows < 3) {
      // Check if all reports happened very recently (last 14 days) from zero baseline
      if (countRecent >= 3 && countPrevious === 0) {
        return {
          trend: DEMAND_TRENDS.EMERGING,
          recentCount: countRecent,
          previousCount: 0,
          growthPercentage: null,
          label_en: 'New or Emerging Demand',
          label_mr: 'नवी वाढती मागणी',
          explanation_en: `Emerging demand: ${countRecent} citizen reports recorded recently with zero previous history.`,
          explanation_mr: `नवी वाढती मागणी: गावात प्रथमच ${countRecent} नागरिक नोंदी वेगाने आल्या आहेत.`
        };
      }
      return {
        trend: DEMAND_TRENDS.NOT_AVAILABLE,
        recentCount: countRecent,
        previousCount: countPrevious,
        growthPercentage: null,
        label_en: 'Trend not available',
        label_mr: 'कल उपलब्ध नाही',
        explanation_en: 'Insufficient historical submissions across comparable 30-day windows.',
        explanation_mr: 'तुलनात्मक ३० दिवसांच्या कालावधीत पुरेसा ऐतिहासिक डेटा उपलब्ध नाही.'
      };
    }

    if (countPrevious === 0 && countRecent >= 4) {
      return {
        trend: DEMAND_TRENDS.EMERGING,
        recentCount: countRecent,
        previousCount: 0,
        growthPercentage: null,
        label_en: 'New or Emerging Demand',
        label_mr: 'नवी वाढती मागणी',
        explanation_en: `Rapidly emerging demand: ${countRecent} requests recorded in the last 30 days with no prior baseline.`,
        explanation_mr: `वेगाने वाढती मागणी: मागील ३० दिवसांत थेट ${countRecent} नवीन मागण्या आल्या आहेत.`
      };
    }

    const diff = countRecent - countPrevious;
    const growthRate = countPrevious > 0 ? diff / countPrevious : 0;
    const growthPct = Math.round(growthRate * 100);

    if (growthRate >= 0.30 && countRecent >= 4) {
      return {
        trend: DEMAND_TRENDS.INCREASING,
        recentCount: countRecent,
        previousCount: countPrevious,
        growthPercentage: growthPct,
        label_en: 'Increasing Demand',
        label_mr: 'वाढती मागणी',
        explanation_en: `Demand increased by +${growthPct}% (${countRecent} in last 30 days vs ${countPrevious} in prior 30 days).`,
        explanation_mr: `मागणीमध्ये +${growthPct}% वाढ झाली आहे (गेल्या ३० दिवसांत ${countRecent}, तर आधीच्या ३० दिवसांत ${countPrevious} नोंदी).`
      };
    }

    if (growthRate <= -0.30) {
      return {
        trend: DEMAND_TRENDS.DECREASING,
        recentCount: countRecent,
        previousCount: countPrevious,
        growthPercentage: growthPct,
        label_en: 'Decreasing Demand',
        label_mr: 'घटती मागणी',
        explanation_en: `Demand decreased by ${growthPct}% (${countRecent} in last 30 days vs ${countPrevious} in prior 30 days).`,
        explanation_mr: `मागणीमध्ये ${growthPct}% घट झाली आहे (गेल्या ३० दिवसांत ${countRecent}, तर आधीच्या ३० दिवसांत ${countPrevious} नोंदी).`
      };
    }

    return {
      trend: DEMAND_TRENDS.STABLE,
      recentCount: countRecent,
      previousCount: countPrevious,
      growthPercentage: growthPct,
      label_en: 'Stable Demand',
      label_mr: 'स्थिर मागणी',
      explanation_en: `Demand is stable (${countRecent} in last 30 days vs ${countPrevious} in prior 30 days).`,
      explanation_mr: `मागणी स्थिर आहे (गेल्या ३० दिवसांत ${countRecent}, तर आधीच्या ३० दिवसांत ${countPrevious} नोंदी).`
    };
  }

  // =========================================================================
  // 3. TRANSPARENT SCORING & CLASSIFICATION (Sections 3, 4)
  // =========================================================================

  /**
   * Evaluate Data Coverage Level
   */
  evaluateDataCoverage(demandItem, totalValidReports) {
    if (totalValidReports < 3 || !demandItem.villageCode) {
      return DATA_COVERAGE_LEVELS.INADEQUATE;
    }
    if (totalValidReports >= 10 && demandItem.status === MODERATION_STATUSES.VERIFIED_PATTERN) {
      return DATA_COVERAGE_LEVELS.ADEQUATE;
    }
    return DATA_COVERAGE_LEVELS.PARTIAL;
  }

  /**
   * Transparent Scoring Formula (0 - 100):
   * Potential Gap Score =
   *   (w.demandStrength * normDemandStrength) +
   *   (w.supplyAvailability * normSupplyScarcity) +
   *   (w.demandRecency * normDemandRecency) +
   *   (w.consistency * normConsistency) +
   *   (w.dataCoverage * normDataCoverage)
   */
  computePotentialGapScore(metrics, weights = this.scoringWeights) {
    const {
      totalValidReports,
      recencyWeightedDemand,
      verifiedSuppliersInVillage,
      verifiedSuppliersInTaluka,
      unverifiedSuppliersCount,
      notAvailablePercentage,
      latestReportAgeDays,
      dataCoverage
    } = metrics;

    // Rule: Display score only when sufficient data exists.
    // Otherwise display "Insufficient data" (null).
    if (totalValidReports < 3 || dataCoverage === DATA_COVERAGE_LEVELS.INADEQUATE) {
      return {
        score: null,
        scoreLabel: 'Insufficient data',
        scoreLabel_mr: 'अपुरा डेटा',
        isScoreValid: false,
        breakdown: null
      };
    }

    // 1. Demand Strength (Normalized 0 - 100)
    // Weighted by citizen shortage intensity (% reporting not available / difficult access)
    const intensityRatio = Math.max(0.2, (notAvailablePercentage || 50) / 100);
    const effectiveDemand = recencyWeightedDemand * intensityRatio;
    const normDemandStrength = Math.min(100, Math.round((effectiveDemand / 20) * 100));

    // 2. Supply Availability / Scarcity (Normalized 0 - 100)
    // Fewer verified suppliers = higher scarcity score.
    // When multiple verified businesses already operate in village, scarcity drops sharply.
    // Unverified suppliers dampen the score moderately.
    // Missing data is NOT treated as zero supply.
    let normSupplyScarcity = 100;
    if (verifiedSuppliersInVillage >= 2) {
      normSupplyScarcity = Math.max(0, 20 - (verifiedSuppliersInVillage - 2) * 10);
    } else if (verifiedSuppliersInVillage === 1) {
      normSupplyScarcity = 40;
    } else if (verifiedSuppliersInTaluka > 0) {
      normSupplyScarcity = Math.max(20, 75 - (verifiedSuppliersInTaluka - 1) * 15);
    }

    // Dampen if unverified informal suppliers are known to operate
    if (unverifiedSuppliersCount > 0) {
      normSupplyScarcity = Math.max(10, normSupplyScarcity - Math.min(25, unverifiedSuppliersCount * 10));
    }

    // 3. Demand Recency (Normalized 0 - 100)
    let normDemandRecency = 20;
    if (latestReportAgeDays <= 14) normDemandRecency = 100;
    else if (latestReportAgeDays <= 30) normDemandRecency = 85;
    else if (latestReportAgeDays <= 60) normDemandRecency = 65;
    else if (latestReportAgeDays <= 90) normDemandRecency = 40;

    // 4. Report Consistency (Normalized 0 - 100)
    const normConsistency = Math.min(100, Math.round(notAvailablePercentage));

    // 5. Data Coverage & Reliability (Normalized 0 - 100)
    const normDataCoverage = dataCoverage === DATA_COVERAGE_LEVELS.ADEQUATE
      ? 100
      : dataCoverage === DATA_COVERAGE_LEVELS.PARTIAL
      ? 60
      : 20;

    // Weighted Combined Score
    const rawScore =
      weights.demandStrength * normDemandStrength +
      weights.supplyAvailability * normSupplyScarcity +
      weights.demandRecency * normDemandRecency +
      weights.consistency * normConsistency +
      weights.dataCoverage * normDataCoverage;

    const finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

    return {
      score: finalScore,
      scoreLabel: `${finalScore} / 100`,
      scoreLabel_mr: `${finalScore} / १००`,
      isScoreValid: true,
      breakdown: {
        normDemandStrength,
        normSupplyScarcity,
        normDemandRecency,
        normConsistency,
        normDataCoverage,
        weightsApplied: { ...weights }
      }
    };
  }

  /**
   * Separate Confidence Calculation (0 - 100%)
   * STRICT: Do not calculate a high-confidence score when data coverage is poor.
   */
  computeConfidence(metrics) {
    const { totalValidReports, dataCoverage, demandStatus, verifiedSuppliersCount } = metrics;

    let score = 30; // Baseline

    // Valid report volume boost
    if (totalValidReports >= 25) score += 30;
    else if (totalValidReports >= 15) score += 20;
    else if (totalValidReports >= 5) score += 10;

    // Administrative verification status
    if (demandStatus === MODERATION_STATUSES.VERIFIED_PATTERN) score += 20;
    else if (demandStatus === MODERATION_STATUSES.REVIEWED) score += 10;

    // Supplier registry certainty
    if (verifiedSuppliersCount > 0) score += 10;

    // Data coverage ceiling rules
    if (dataCoverage === DATA_COVERAGE_LEVELS.INADEQUATE) {
      // Must NOT be high confidence
      score = Math.min(45, score);
    } else if (dataCoverage === DATA_COVERAGE_LEVELS.PARTIAL) {
      score = Math.min(74, score);
    }

    const finalScore = Math.min(95, Math.max(10, score));
    let level = CONFIDENCE_LEVEL.LOW;
    if (finalScore >= 75 && dataCoverage === DATA_COVERAGE_LEVELS.ADEQUATE) {
      level = CONFIDENCE_LEVEL.HIGH;
    } else if (finalScore >= 50) {
      level = CONFIDENCE_LEVEL.MODERATE;
    }

    return {
      score: finalScore,
      level
    };
  }

  /**
   * Core Classification Engine (5 Classifications)
   */
  classifyGap(metrics, trendInfo) {
    const {
      totalValidReports,
      verifiedSuppliersInVillage,
      verifiedSuppliersInTaluka,
      dataCoverage,
      latestReportAgeDays,
      notAvailablePercentage
    } = metrics;

    // E. Insufficient Evidence
    // Too few valid reports, missing supplier data, outdated reports, or poor geographic coverage
    if (
      totalValidReports < 3 ||
      dataCoverage === DATA_COVERAGE_LEVELS.INADEQUATE ||
      latestReportAgeDays > 90
    ) {
      return {
        classification: GAP_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE,
        label_en: 'Insufficient Evidence',
        label_mr: 'अपुरा पुरावा / डेटा',
        explanation_en: `Only ${totalValidReports} valid citizen report(s) available with ${dataCoverage} data coverage. Inadequate information to make a meaningful gap assessment.`,
        explanation_mr: `केवळ ${totalValidReports} नागरिक नोंदी आणि ${dataCoverage === 'inadequate' ? 'अपुरी' : 'मर्यादित'} माहिती उपलब्ध आहे. खात्रीशीर निष्कर्ष काढण्यासाठी अधिक माहिती आवश्यक आहे.`
      };
    }

    // C. Emerging Demand
    // Demand reports are increasing over time; existing supply information may not yet indicate shortage
    if (
      trendInfo.trend === DEMAND_TRENDS.INCREASING ||
      trendInfo.trend === DEMAND_TRENDS.EMERGING
    ) {
      // If there are verified suppliers present but demand is surging
      if (verifiedSuppliersInVillage >= 1 || verifiedSuppliersInTaluka >= 2) {
        return {
          classification: GAP_CLASSIFICATIONS.EMERGING_DEMAND,
          label_en: 'Emerging Demand',
          label_mr: 'वाढती नवी मागणी',
          explanation_en: `Citizen requests are increasing (+${trendInfo.growthPercentage ?? 'surge'}% over recent periods). Existing suppliers operate locally, but rapid demand growth may create future supply constraints.`,
          explanation_mr: `गावात मागणी वेगाने वाढत आहे (गेल्या कालावधीत वाढ). सध्या स्थानिक पुरवठादार उपलब्ध असले तरी वाढत्या मागणीमुळे भविष्यात तुटवडा निर्माण होऊ शकतो.`
        };
      }
    }

    // A. Strong Potential Gap
    // Multiple valid, reasonably recent demand reports, very few known verified suppliers, adequate data coverage
    if (
      (totalValidReports >= 15 || notAvailablePercentage >= 60) &&
      verifiedSuppliersInVillage === 0 &&
      verifiedSuppliersInTaluka <= 1 &&
      latestReportAgeDays <= 60 &&
      dataCoverage !== DATA_COVERAGE_LEVELS.INADEQUATE
    ) {
      return {
        classification: GAP_CLASSIFICATIONS.STRONG_GAP,
        label_en: 'Strong Potential Gap',
        label_mr: 'तीव्र संभाव्य तुटवडा',
        explanation_en: `High community demand (${totalValidReports} valid reports, ${notAvailablePercentage}% unavailable) recorded with 0 verified local suppliers in this village. Strong evidence of unmet need.`,
        explanation_mr: `गावात मोठी नागरिक मागणी (${totalValidReports} वैध नोंदी, ${notAvailablePercentage}% अनुपलब्ध) असून गावात एकही अधिकृत पुरवठादार नाही. संभाव्य तुटवड्याचा भक्कम पुरावा.`
      };
    }

    // D. No Clear Gap
    // Known supply appears reasonably aligned with reported demand.
    // Notice: Do NOT assume all local demand is satisfied merely because suppliers are listed.
    if (
      verifiedSuppliersInVillage >= 2 ||
      (verifiedSuppliersInVillage >= 1 && totalValidReports <= 5) ||
      (verifiedSuppliersInTaluka >= 3 && notAvailablePercentage < 40)
    ) {
      return {
        classification: GAP_CLASSIFICATIONS.NO_CLEAR_GAP,
        label_en: 'No Clear Gap',
        label_mr: 'स्पष्ट तुटवडा नाही',
        explanation_en: `Documented local supply appears reasonably aligned with reported demand (${verifiedSuppliersInVillage} verified village supplier(s), ${verifiedSuppliersInTaluka} in taluka). Note: Do not assume all local demand is fully satisfied merely because businesses are listed.`,
        explanation_mr: `उपलब्ध अधिकृत माहितीनुसार पुरवठा आणि मागणीत समतोल दिसतो (गावात ${verifiedSuppliersInVillage}, तालुक्यात ${verifiedSuppliersInTaluka} पुरवठादार). सूचना: पुरवठादार नोंदणीकृत असले तरी संपूर्ण स्थानिक गरज भागत आहे असे गृहीत धरू नये.`
      };
    }

    // B. Moderate Potential Gap
    // Moderate demand, limited known supply, some supporting evidence
    return {
      classification: GAP_CLASSIFICATIONS.MODERATE_GAP,
      label_en: 'Moderate Potential Gap',
      label_mr: 'मध्यम संभाव्य तुटवडा',
      explanation_en: `Moderate community demand (${totalValidReports} reports) with limited verified supply (${verifiedSuppliersInVillage} in village, ${verifiedSuppliersInTaluka} in nearby area). Some supporting evidence indicates possible shortage.`,
      explanation_mr: `मध्यम नागरिक मागणी (${totalValidReports} नोंदी) असून परिसरात मर्यादित अधिकृत पुरवठादार आहेत. संभाव्य तुटवड्याचे काही पुरावे आढळतात.`
    };
  }

  // =========================================================================
  // 4. HUMAN-READABLE OPPORTUNITY EXPLANATION & CHECKLIST (Sections 6, 8)
  // =========================================================================

  /**
   * Generates Human-Readable Opportunity Explanation (Section 6)
   */
  generateOpportunityExplanation(params) {
    const {
      productOrService,
      productOrService_mr,
      village,
      totalValidReports,
      latestReportAgeDays,
      verifiedSuppliersCount,
      unverifiedSuppliersCount,
      classification
    } = params;

    const daysText = latestReportAgeDays <= 1 ? 'today' : `the last ${latestReportAgeDays} days`;
    const daysText_mr = latestReportAgeDays <= 1 ? 'आज' : `गेल्या ${latestReportAgeDays} दिवसांत`;

    const unverifiedNote = unverifiedSuppliersCount > 0
      ? ` Additionally, ${unverifiedSuppliersCount} unverified informal listing(s) were observed.`
      : '';
    const unverifiedNote_mr = unverifiedSuppliersCount > 0
      ? ` याशिवाय ${unverifiedSuppliersCount} अनधिकृत/स्थानिक नोंदी आढळल्या आहेत.`
      : '';

    let explanation_en = `Potential gap detected for ${productOrService} in ${village}. There are ${totalValidReports} valid demand reports from ${daysText} and ${verifiedSuppliersCount} known verified supplier(s) in the available dataset.${unverifiedNote} Supplier coverage may be incomplete, so this result requires local verification.`;
    let explanation_mr = `${village} येथे ${productOrService_mr || productOrService} साठी संभाव्य तुटवडा आढळला आहे. ${daysText_mr} ${totalValidReports} वैध नागरिक मागण्या नोंदवल्या असून अधिकृत यादीत ${verifiedSuppliersCount} नोंदणीकृत पुरवठादार आहेत.${unverifiedNote_mr} पुरवठादारांची माहिती अपूर्ण असू शकते, त्यामुळे स्थानिक पातळीवर प्रत्यक्ष खात्री करणे आवश्यक आहे.`;

    if (classification === GAP_CLASSIFICATIONS.NO_CLEAR_GAP) {
      explanation_en = `Supply for ${productOrService} in ${village} appears reasonably aligned with citizen demand based on ${verifiedSuppliersCount} known verified supplier(s). Local entrepreneurs should verify customer satisfaction and quality before launching duplicate services.`;
      explanation_mr = `${village} येथे ${productOrService_mr || productOrService} साठी नोंदणीकृत ${verifiedSuppliersCount} पुरवठादारांमुळे प्राथमिक समतोल दिसतो. उद्योजकांनी नवीन सेवा सुरू करण्यापूर्वी स्थानिक ग्राहकांच्या समाधानाची खात्री करावी.`;
    } else if (classification === GAP_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE) {
      explanation_en = `Limited information for ${productOrService} in ${village}. With only ${totalValidReports} valid report(s), there is insufficient evidence to confirm an unmet business opportunity.`;
      explanation_mr = `${village} येथे ${productOrService_mr || productOrService} साठी माहिती अपुरी आहे. केवळ ${totalValidReports} नोंदींमुळे तुटवडा निश्चित करता येत नाही.`;
    }

    return { explanation_en, explanation_mr };
  }

  /**
   * Questions the entrepreneur should investigate locally (Section 8)
   */
  generateLocalInvestigationQuestions(demandItem, matchedSuppliers) {
    const questions_en = [
      'Are there unlisted home-based artisans or informal micro-vendors providing this in the village?',
      'Do itinerant weekly bazaar (आठवडे बाजार) traders fulfill this product/service on specific haat days?',
      'What is the actual willingness to pay (purchasing power) of local residents compared to traveling to the taluka town?',
      'What are the power, water, transportation, or cold chain logistics constraints in this village?',
      'Can local raw materials or self-help groups (SHGs/बचत गट) be leveraged to reduce startup costs?'
    ];

    const questions_mr = [
      'गावात या वस्तू किंवा सेवेचे अनोंदणीकृत घरगुती कारागीर किंवा अनधिकृत विक्रेते आधीच कार्यरत आहेत का?',
      'स्थानिक आठवडे बाजाराच्या दिवशी (हाट) बाहेरून येणारे व्यापारी ही गरज भागवतात का?',
      'तालुक्याच्या ठिकाणी जाण्याच्या खर्चाच्या तुलनेत स्थानिक ग्रामस्थांची प्रत्यक्ष खरेदी क्षमता (क्रयशक्ती) किती आहे?',
      'या गावात वीज, पाणी, वाहतूक किंवा साठवणुकीच्या कोणत्या अडचणी आहेत?',
      'भांडवली खर्च कमी करण्यासाठी स्थानिक कच्चा माल किंवा महिला बचत गटांची मदत घेता येईल का?'
    ];

    return { questions_en, questions_mr };
  }

  // =========================================================================
  // 5. PRIMARY GAP ANALYSIS PIPELINE (Phase 2 Master Pipeline)
  // =========================================================================

  /**
   * PRIMARY GAP ANALYSIS PIPELINE
   * 
   * @param {Object} filters - { districtCode, talukaCode, villageCode, category, minConfidence, severity, classification, trend, searchQuery, radiusKm }
   * @param {Date} referenceDate - For deterministic testing and comparable time windows
   */
  async analyzeGaps(filters = {}, referenceDate = new Date()) {
    await this.init();

    // 1. Fetch raw and aggregated demand signals
    const demandSignals = await demandSignalService.getAggregatedDemand({
      districtCode: filters.districtCode,
      talukaCode: filters.talukaCode,
      villageCode: filters.villageCode,
      category: filters.category,
      searchQuery: filters.searchQuery
    });

    // 2. Fetch all suppliers
    const allSuppliers = await this.getSuppliers({
      districtCode: filters.districtCode,
      talukaCode: filters.talukaCode,
      category: filters.category
    });

    const gapResults = [];

    for (const demandItem of demandSignals) {
      // Step A: Preprocess Demand Reports (Deduplication, Recency, Exclusion)
      const rawReports = demandItem.rawReports || [];
      const prepDemand = this.preprocessDemandReports(
        rawReports.length > 0 ? rawReports : [
          // Fallback to simulated item report
          {
            id: `rep-${demandItem.id}-primary`,
            productOrService: demandItem.productOrService,
            category: demandItem.category,
            districtCode: demandItem.districtCode,
            talukaCode: demandItem.talukaCode,
            villageCode: demandItem.villageCode,
            village: demandItem.village,
            status: demandItem.status,
            createdAt: demandItem.lastReportedAt || referenceDate.toISOString(),
            availability: demandItem.dominantAvailability || 'not_available'
          }
        ],
        referenceDate
      );

      // Total valid reports count
      const totalValidReports = demandItem.totalReports || prepDemand.validReports.length;
      const recencyWeightedDemand = prepDemand.recencyWeightedCount > 0
        ? prepDemand.recencyWeightedCount
        : totalValidReports;

      // Latest report age calculation
      let latestReportAgeDays = 15;
      if (demandItem.lastReportedAt) {
        const parsed = Date.parse(demandItem.lastReportedAt);
        if (!isNaN(parsed)) {
          latestReportAgeDays = Math.max(0, Math.round((referenceDate.getTime() - parsed) / (1000 * 60 * 60 * 24)));
        }
      }

      // Step B: Supplier Matching & Deduplication
      const matchedSuppliersData = this.matchSuppliersForDemand(
        demandItem,
        allSuppliers,
        filters.radiusKm || 15
      );

      const verifiedSuppliers = matchedSuppliersData.verifiedSuppliers;
      const unverifiedSuppliers = matchedSuppliersData.unverifiedSuppliers;
      const verifiedInVillage = verifiedSuppliers.filter((s) => s.isSameVillage).length;
      const verifiedInTaluka = verifiedSuppliers.length;

      // Step C: Demand Trend Analysis
      const trendInfo = this.analyzeDemandTrend(demandItem, referenceDate);

      // Step D: Data Coverage
      const dataCoverage = this.evaluateDataCoverage(demandItem, totalValidReports);

      // Step E: Metric Calculations
      const bd = demandItem.breakdown || {};
      const notAvailablePercentage = totalValidReports > 0
        ? Math.round(((bd.not_available || 0) / totalValidReports) * 100)
        : (demandItem.dominantAvailability === 'not_available' ? 80 : 40);

      const metrics = {
        totalValidReports,
        recencyWeightedDemand,
        verifiedSuppliersInVillage: verifiedInVillage,
        verifiedSuppliersInTaluka: verifiedInTaluka,
        verifiedSuppliersCount: verifiedSuppliers.length,
        unverifiedSuppliersCount: unverifiedSuppliers.length,
        notAvailablePercentage,
        latestReportAgeDays,
        dataCoverage,
        demandStatus: demandItem.status
      };

      // Step F: Scoring (Gap Score 0-100) & Confidence
      const scoreResult = this.computePotentialGapScore(metrics, this.scoringWeights);
      const confidenceResult = this.computeConfidence(metrics);

      // Step G: Classification
      const classResult = this.classifyGap(metrics, trendInfo);

      // Step H: Explanations & Field Checklist
      const explanations = this.generateOpportunityExplanation({
        productOrService: demandItem.productOrService,
        productOrService_mr: demandItem.productOrService_mr,
        village: demandItem.village,
        totalValidReports,
        latestReportAgeDays,
        verifiedSuppliersCount: verifiedSuppliers.length,
        unverifiedSuppliersCount: unverifiedSuppliers.length,
        classification: classResult.classification
      });

      const fieldInvestigation = this.generateLocalInvestigationQuestions(
        demandItem,
        verifiedSuppliers
      );

      const gapObject = {
        id: `gap-${demandItem.id}`,
        demandId: demandItem.id,
        productOrService: demandItem.productOrService,
        productOrService_mr: demandItem.productOrService_mr || demandItem.productOrService,
        category: demandItem.category,
        district: demandItem.district,
        districtCode: demandItem.districtCode,
        taluka: demandItem.taluka,
        talukaCode: demandItem.talukaCode,
        village: demandItem.village,
        villageCode: demandItem.villageCode,
        coordinates: demandItem.coordinates,
        // Demand Metrics
        totalValidReports,
        recencyWeightedDemand,
        notAvailablePercentage,
        dominantFrequency: demandItem.dominantFrequency,
        demandStatus: demandItem.status,
        latestReportDate: demandItem.lastReportedAt || referenceDate.toISOString(),
        latestReportAgeDays,
        // Supply Metrics
        knownVerifiedSuppliersCount: verifiedSuppliers.length,
        unverifiedSuppliersCount: unverifiedSuppliers.length,
        sameVillageVerifiedCount: verifiedInVillage,
        deduplicatedSupplierEntities: matchedSuppliersData.deduplicatedCount,
        verifiedSuppliers,
        unverifiedSuppliers,
        // Phase 2 Classification & Scoring
        classification: classResult.classification,
        classificationLabel: classResult.label_en,
        classificationLabel_mr: classResult.label_mr,
        severity: classResult.classification, // Backward compatibility with Phase 1
        gapScore: scoreResult.score,
        gapScoreLabel: scoreResult.scoreLabel,
        gapScoreLabel_mr: scoreResult.scoreLabel_mr,
        isScoreValid: scoreResult.isScoreValid,
        scoreBreakdown: scoreResult.breakdown,
        // Confidence & Data Coverage
        confidence: confidenceResult.level,
        confidenceScore: confidenceResult.score,
        dataCoverage,
        // Demand Trend
        trend: trendInfo.trend,
        trendLabel: trendInfo.label_en,
        trendLabel_mr: trendInfo.label_mr,
        trendGrowthPercentage: trendInfo.growthPercentage,
        trendExplanation_en: trendInfo.explanation_en,
        trendExplanation_mr: trendInfo.explanation_mr,
        // Explanation
        explanation_en: explanations.explanation_en,
        explanation_mr: explanations.explanation_mr,
        classificationLogic_en: classResult.explanation_en,
        classificationLogic_mr: classResult.explanation_mr,
        // Field Investigation Checklist
        fieldInvestigationQuestions: fieldInvestigation.questions_en,
        fieldInvestigationQuestions_mr: fieldInvestigation.questions_mr,
        // Preprocessing Exclusions Audit
        exclusionLog: prepDemand.exclusionLog,
        // 5-Pillar Transparency Model
        transparency: {
          confirmedInformation: [
            `LGD Administrative Village: ${demandItem.village} [LGD: ${demandItem.villageCode || 'N/A'}]`,
            `Registered Licensed Suppliers: ${verifiedSuppliers.length} business entities in official state directory`
          ],
          userReportedDemand: [
            `Citizen Submissions: ${totalValidReports} independent resident reports`,
            `Reported Scarcity: ${notAvailablePercentage}% report complete unavailability in village`
          ],
          estimatesAndLogic: [
            `Classification: ${classResult.label_en.toUpperCase()}`,
            `Potential Gap Score: ${scoreResult.scoreLabel} (Configurable 5-Factor Weighted Formula)`,
            `Confidence Rating: ${confidenceResult.score}% (${confidenceResult.level.toUpperCase()})`
          ],
          unknownInformation: [
            `Informal micro-vendors: ${unverifiedSuppliers.length} unverified community listing(s) recorded`,
            'Itinerant weekly haat traders visiting on specific weekday markets'
          ],
          mandatoryLimitations: 'A lack of supplier records in this database does not prove a product or service is unavailable. Gaps reflect recorded citizen reports vs documented suppliers. They do NOT guarantee commercial profit or customer willingness to pay.'
        }
      };

      gapResults.push(gapObject);
    }

    // Step I: Apply Filters
    let filteredGaps = gapResults;

    // Filter by Classification / Severity
    const targetClass = filters.classification || filters.severity;
    if (targetClass && targetClass !== 'all') {
      filteredGaps = filteredGaps.filter((g) => g.classification === targetClass || g.severity === targetClass);
    }

    // Filter by Trend
    if (filters.trend && filters.trend !== 'all') {
      filteredGaps = filteredGaps.filter((g) => g.trend === filters.trend);
    }

    // Filter by Confidence
    if (filters.minConfidence && filters.minConfidence !== 'all') {
      filteredGaps = filteredGaps.filter((g) => g.confidence === filters.minConfidence);
    }

    // Step J: Sorting
    // Priority: Strong Potential Gap -> Emerging Demand -> Moderate Potential Gap -> No Clear Gap -> Insufficient Evidence
    const classPriority = {
      [GAP_CLASSIFICATIONS.STRONG_GAP]: 0,
      [GAP_CLASSIFICATIONS.EMERGING_DEMAND]: 1,
      [GAP_CLASSIFICATIONS.MODERATE_GAP]: 2,
      [GAP_CLASSIFICATIONS.NO_CLEAR_GAP]: 3,
      [GAP_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE]: 4
    };

    const sortedGaps = filteredGaps.sort((a, b) => {
      const pDiff = (classPriority[a.classification] ?? 9) - (classPriority[b.classification] ?? 9);
      if (pDiff !== 0) return pDiff;
      return (b.gapScore || 0) - (a.gapScore || 0);
    });

    // Step K: Offline Caching (Section 9)
    if (filters.districtCode) {
      const cacheKey = `gap_analysis_${filters.districtCode}_${filters.talukaCode || 'all'}`;
      this.cacheAnalysisRun(cacheKey, sortedGaps);
    }

    return sortedGaps;
  }

  /**
   * Summary Statistics for Dashboard
   */
  async getGapStatistics(filters = {}, referenceDate = new Date()) {
    const list = await this.analyzeGaps(filters, referenceDate);
    const strongGaps = list.filter((g) => g.classification === GAP_CLASSIFICATIONS.STRONG_GAP).length;
    const moderateGaps = list.filter((g) => g.classification === GAP_CLASSIFICATIONS.MODERATE_GAP).length;
    const emergingDemand = list.filter((g) => g.classification === GAP_CLASSIFICATIONS.EMERGING_DEMAND).length;
    const noClearGap = list.filter((g) => g.classification === GAP_CLASSIFICATIONS.NO_CLEAR_GAP).length;
    const insufficientEvidence = list.filter((g) => g.classification === GAP_CLASSIFICATIONS.INSUFFICIENT_EVIDENCE).length;
    const highConfidence = list.filter((g) => g.confidence === CONFIDENCE_LEVEL.HIGH).length;

    return {
      totalAnalyzed: list.length,
      criticalGaps: strongGaps, // backward compatibility
      strongGaps,
      moderateGaps,
      emergingDemand,
      noClearGap,
      insufficientEvidence,
      balancedSupply: noClearGap, // backward compatibility
      highConfidence
    };
  }

  // =========================================================================
  // 6. OFFLINE CACHING & DATA PERSISTENCE (Section 9)
  // =========================================================================

  /**
   * Save successful analysis run to local IndexedDB & memory
   */
  async cacheAnalysisRun(cacheKey, data) {
    const payload = {
      cacheKey,
      data,
      cachedAt: new Date().toISOString()
    };
    this.inMemoryAnalysisCache.set(cacheKey, payload);

    try {
      if (typeof indexedDB !== 'undefined' && db && db.userSettings) {
        await db.userSettings.put({
          id: `cache_${cacheKey}`,
          key: cacheKey,
          value: payload,
          updatedAt: payload.cachedAt
        });
      }
    } catch (e) {
      console.warn('Could not persist gap analysis to IndexedDB cache', e);
    }
  }

  /**
   * Retrieve cached analysis run for offline access
   */
  async getCachedAnalysisRun(cacheKey) {
    let cached = this.inMemoryAnalysisCache.get(cacheKey);

    if (!cached) {
      try {
        if (typeof indexedDB !== 'undefined' && db && db.userSettings) {
          const record = await db.userSettings.get(`cache_${cacheKey}`);
          if (record && record.value) {
            cached = record.value;
          }
        }
      } catch (e) {
        console.warn('Could not read cached analysis from IndexedDB', e);
      }
    }

    if (!cached) return null;

    // Check if outdated (> 7 days old)
    const cachedAtMs = Date.parse(cached.cachedAt);
    const ageDays = Math.round((Date.now() - cachedAtMs) / (1000 * 60 * 60 * 24));
    const isOutdated = ageDays > 7;

    return {
      ...cached,
      ageDays,
      isOutdated,
      isOfflineCached: true
    };
  }

  // =========================================================================
  // 7. USER DATA ISOLATION: SAVED GAP ANALYSES (Sections 8, 11)
  // =========================================================================

  async saveGapForUser(userId, gapId, notes = '', gapSnapshot = null) {
    if (!userId) throw new Error('User must be logged in to save gap analyses');
    const set = this.inMemorySavedGaps.get(userId) || new Set();
    set.add(gapId);
    this.inMemorySavedGaps.set(userId, set);

    try {
      if (typeof indexedDB !== 'undefined' && db && db.savedGapAnalyses) {
        const existing = await db.savedGapAnalyses.get(`${userId}_${gapId}`);
        await db.savedGapAnalyses.put({
          id: `${userId}_${gapId}`,
          userId,
          gapId,
          validationStatus: existing?.validationStatus || 'new_opportunity',
          checklist: existing?.checklist || null,
          observations: existing?.observations || null,
          personalNotes: notes || existing?.personalNotes || '',
          gapSnapshot: gapSnapshot || existing?.gapSnapshot || null,
          savedAt: existing?.savedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: 'synced',
          version: (existing?.version || 0) + 1
        });
      }
    } catch (e) {
      console.warn('Could not persist savedGapAnalyses to Dexie', e);
    }
    return true;
  }

  async removeSavedGapForUser(userId, gapId) {
    if (!userId) return false;
    const set = this.inMemorySavedGaps.get(userId);
    if (set) set.delete(gapId);

    try {
      if (typeof indexedDB !== 'undefined' && db && db.savedGapAnalyses) {
        await db.savedGapAnalyses.delete(`${userId}_${gapId}`);
      }
    } catch (e) {
      console.warn('Could not delete from savedGapAnalyses in Dexie', e);
    }
    return true;
  }

  async getSavedGapIdsForUser(userId) {
    if (!userId) return [];
    try {
      if (typeof indexedDB !== 'undefined' && db && db.savedGapAnalyses) {
        const records = await db.savedGapAnalyses.where('userId').equals(userId).toArray();
        return records.map((r) => r.gapId);
      }
    } catch (e) {
      console.warn('Could not read savedGapAnalyses from Dexie', e);
    }
    const mem = this.inMemorySavedGaps.get(userId);
    return mem ? Array.from(mem) : [];
  }
}

export const gapAnalyzerService = new GapAnalyzerService();
export default gapAnalyzerService;
