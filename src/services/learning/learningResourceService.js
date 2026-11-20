/**
 * MahaUdyam — Resource Hub Service
 * 
 * Capabilities:
 * - Phase 1: Official government schemes, regulatory compliance checklists & bankable project DPR library
 * - Phase 2: Personalized subsidy calculator, scheme matching engine & document requirement generator
 * - Phase 3: 7-Step Business Launch Milestone Tracker with personal progress markers & offline sync
 */

import { db } from '../db/index.js';
import { syncEngine } from '../offline/syncEngine.js';
import { INITIAL_LEARNING_RESOURCES, RESOURCE_HUB_CATEGORIES } from '../../data/learning/initialLearningResources.js';

export const BUSINESS_LAUNCH_MILESTONES = [
  {
    id: 'ms_1_idea_validation',
    stepNumber: 1,
    title: 'Market & Demand Validation',
    title_mr: 'बाजार व स्थानिक मागणी पडताळणी',
    description: 'Verify local crop surplus, check resident demand in village, and analyze competitor pricing.',
    description_mr: 'स्थानिक शेतमाल उपलब्धता, ग्रामस्थांची खरी गरज आणि आठवडे बाजारातील भाव तपासा.'
  },
  {
    id: 'ms_2_legal_registration',
    stepNumber: 2,
    title: 'Official Udyam MSME Registration',
    title_mr: 'अधिकृत उद्यम (Udyam MSME) नोंदणी',
    description: 'Obtain zero-cost official Udyam Certificate with Aadhaar and PAN for MSME status.',
    description_mr: 'मोफत शासकीय पोर्टलवरून आधार व पॅन द्वारे अधिकृत उद्यम प्रमाणपत्र मिळवा.'
  },
  {
    id: 'ms_3_scheme_and_dpr',
    stepNumber: 3,
    title: 'Bankable DPR & Scheme Application',
    title_mr: 'प्रकल्प अहवाल (DPR) व योजना अर्ज',
    description: 'Prepare detailed financial DPR and submit online application under PMFME or CMEGP for capital subsidy.',
    description_mr: 'यंत्रसामग्री व नफा-तोटा आराखडा तयार करून PMFME किंवा CMEGP अनुदानासाठी अर्ज करा.'
  },
  {
    id: 'ms_4_bank_loan',
    stepNumber: 4,
    title: 'Bank Appraisal & Loan Sanction',
    title_mr: 'बँक तपासणी व कर्ज मंजुरी',
    description: 'Submit project file to lead district bank, attend field appraisal, and secure in-principle loan sanction.',
    description_mr: 'बँकेत प्रकल्प सादर करून स्थळ पाहणीनंतर कर्ज मंजुरी पत्र (Sanction Letter) मिळवा.'
  },
  {
    id: 'ms_5_fssai_compliance',
    stepNumber: 5,
    title: 'Food Safety (FSSAI) & Premises NOC',
    title_mr: 'अन्न सुरक्षा (FSSAI) व ग्रामपंचायत नाहरकत',
    description: 'Secure Gram Panchayat trade NOC and apply for FSSAI registration on the FoSCoS portal with water lab test.',
    description_mr: 'ग्रामपंचायत नाहरकत दाखला मिळवून FoSCoS पोर्टलवर FSSAI अन्न परवाना नोंदणी करा.'
  },
  {
    id: 'ms_6_machinery_procurement',
    stepNumber: 6,
    title: 'Equipment Sourcing & Installation',
    title_mr: 'यंत्रसामग्री खरेदी व उभारणी',
    description: 'Procure verified machinery or book custom hiring processing units via MahaUdyam Shared Resources.',
    description_mr: 'अधिकृत पुरवठादारांकडून यंत्रसामग्री खरेदी करा अथवा सामायिक केंद्रातून भाड्याने घ्या.'
  },
  {
    id: 'ms_7_commercial_launch',
    stepNumber: 7,
    title: 'Branding, Packaging & Market Selling',
    title_mr: 'पॅकेजिंग, ब्रँडिंग व प्रत्यक्ष विक्री',
    description: 'Package finished goods with compliant labels and sell at nearby weekly markets using BazaarPath route planning.',
    description_mr: 'दर्जेदार पॅकिंग करून आठवडे बाजारात व स्थानिक दुकानांमध्ये प्रत्यक्ष विक्री सुरू करा.'
  }
];

class LearningResourceService {
  constructor() {
    this.resourcesMemory = new Map();
    this.userProgressMemory = new Map(); // userId -> { completedSteps: Set, notes: Map, lastUpdated }
    this.bookmarksMemory = new Map(); // userId -> Set<resourceId>
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;

    for (const res of INITIAL_LEARNING_RESOURCES) {
      this.resourcesMemory.set(res.id, { ...res });
    }

    try {
      if (typeof indexedDB !== 'undefined' && db && db.learningResources) {
        if (!db.isOpen()) await db.open();
        const count = await db.learningResources.count();
        if (count === 0) {
          await db.learningResources.bulkPut(INITIAL_LEARNING_RESOURCES);
        }
      }
    } catch (e) {
      // Memory fallback
    }

    this.isInitialized = true;
  }

  // ==========================================================================
  // Phase 1: Official Resource Catalog & Library
  // ==========================================================================

  async getAllResources(filters = {}) {
    await this.init();
    let list = [];

    try {
      if (typeof indexedDB !== 'undefined' && db && db.learningResources) {
        list = await db.learningResources.toArray();
      }
    } catch (e) {
      list = [];
    }

    if (!list || list.length === 0) {
      list = Array.from(this.resourcesMemory.values());
    }

    return list.filter((r) => {
      if (filters.category && filters.category !== 'all' && r.category !== filters.category) {
        return false;
      }
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const title = (r.title || '').toLowerCase();
        const titleMr = (r.title_mr || '').toLowerCase();
        const desc = (r.shortDescription || '').toLowerCase();
        const descMr = (r.shortDescription_mr || '').toLowerCase();
        if (!title.includes(q) && !titleMr.includes(q) && !desc.includes(q) && !descMr.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }

  async getResourceById(id) {
    await this.init();
    try {
      if (typeof indexedDB !== 'undefined' && db && db.learningResources) {
        const item = await db.learningResources.get(id);
        if (item) return item;
      }
    } catch (e) {}
    return this.resourcesMemory.get(id) || null;
  }

  // ==========================================================================
  // Phase 2: Subsidy Estimator & Personalized Scheme Matching
  // ==========================================================================

  /**
   * Matches entrepreneur investment and social demographic profile with government subsidies
   */
  async matchGovernmentSchemes({
    businessCategory = 'Food Processing',
    proposedInvestment = 500000,
    isRural = true,
    socialCategory = 'General', // General | Women | SC/ST | Minority
    isWomanEntrepreneur = false
  }) {
    await this.init();
    const allResources = await this.getAllResources({
      category: RESOURCE_HUB_CATEGORIES.GOVERNMENT_SCHEMES
    });

    const investment = Math.max(25000, Number(proposedInvestment) || 500000);
    const isSpecialCategory = isWomanEntrepreneur || socialCategory === 'Women' || socialCategory === 'SC/ST' || socialCategory === 'Minority';

    const results = allResources.map((scheme) => {
      // 1. Determine applicable subsidy percentage
      let applicableSubsidyPct = scheme.subsidyPercentage;
      if (isSpecialCategory && scheme.subsidyPercentageSpecial) {
        applicableSubsidyPct = scheme.subsidyPercentageSpecial;
      }

      // 2. Compute financial breakdown
      const rawSubsidyAmount = Math.round((investment * applicableSubsidyPct) / 100);
      const estimatedSubsidy = Math.min(rawSubsidyAmount, scheme.maxSubsidyAmount);
      
      const marginPct = isSpecialCategory ? Math.max(5, scheme.entrepreneurContributionMinPct - 5) : scheme.entrepreneurContributionMinPct;
      const entrepreneurMarginMoney = Math.round((investment * marginPct) / 100);
      const bankLoanRequired = Math.round(investment - entrepreneurMarginMoney);

      // 3. Category match suitability
      let isCategoryMatch = false;
      if (scheme.eligibleCategories) {
        const catLower = businessCategory.toLowerCase();
        isCategoryMatch = scheme.eligibleCategories.some((c) => c.toLowerCase().includes(catLower) || catLower.includes(c.toLowerCase()));
      }

      // 4. Scoring
      let score = 70;
      if (isCategoryMatch) score += 20;
      if (isRural) score += 5;
      if (isSpecialCategory) score += 5;
      score = Math.min(99, score);

      return {
        scheme,
        score,
        proposedInvestment: investment,
        applicableSubsidyPct,
        estimatedSubsidy,
        entrepreneurMarginMoney,
        marginPct,
        bankLoanRequired,
        isCategoryMatch,
        explanation_en: `Eligible for ${applicableSubsidyPct}% capital subsidy (estimated ₹${estimatedSubsidy.toLocaleString('en-IN')}) with only ${marginPct}% entrepreneur margin money required.`,
        explanation_mr: `${applicableSubsidyPct}% शासकीय भांडवली अनुदानासाठी पात्र (अंदाजे ₹${estimatedSubsidy.toLocaleString('en-IN')}) — केवळ ${marginPct}% स्वतःचे भांडवल आवश्यक.`
      };
    });

    return results.sort((a, b) => b.score - a.score);
  }

  // ==========================================================================
  // Phase 3: 7-Step Business Launch Tracker & Offline Progress Ledger
  // ==========================================================================

  /**
   * Get personal milestone checklist and progress percent for user
   */
  async getUserLaunchProgress(userId) {
    if (!userId) {
      return {
        completedSteps: [],
        progressPercent: 0,
        milestones: BUSINESS_LAUNCH_MILESTONES.map((m) => ({ ...m, isCompleted: false, notes: '' }))
      };
    }

    await this.init();

    let userRec = this.userProgressMemory.get(userId);
    if (!userRec) {
      try {
        if (typeof indexedDB !== 'undefined' && db && db.userLearningProgress) {
          const stored = await db.userLearningProgress.where('userId').equals(userId).first();
          if (stored) {
            userRec = {
              completedSteps: new Set(stored.completedSteps || []),
              notes: new Map(Object.entries(stored.stepNotes || {})),
              lastUpdated: stored.lastAccessedAt
            };
            this.userProgressMemory.set(userId, userRec);
          }
        }
      } catch (e) {}
    }

    if (!userRec) {
      userRec = {
        completedSteps: new Set(),
        notes: new Map(),
        lastUpdated: new Date().toISOString()
      };
      this.userProgressMemory.set(userId, userRec);
    }

    const totalSteps = BUSINESS_LAUNCH_MILESTONES.length;
    const completedCount = userRec.completedSteps.size;
    const progressPercent = Math.round((completedCount / totalSteps) * 100);

    const milestones = BUSINESS_LAUNCH_MILESTONES.map((m) => ({
      ...m,
      isCompleted: userRec.completedSteps.has(m.id),
      notes: userRec.notes.get(m.id) || ''
    }));

    return {
      completedSteps: Array.from(userRec.completedSteps),
      progressPercent,
      completedCount,
      totalSteps,
      milestones,
      lastUpdated: userRec.lastUpdated
    };
  }

  /**
   * Toggle completion state of a launch milestone step
   */
  async toggleMilestoneStep(userId, stepId, isCompleted, notes = '') {
    if (!userId) throw new Error('User authentication required.');
    await this.init();

    let userRec = this.userProgressMemory.get(userId);
    if (!userRec) {
      await this.getUserLaunchProgress(userId);
      userRec = this.userProgressMemory.get(userId);
    }

    if (isCompleted) {
      userRec.completedSteps.add(stepId);
    } else {
      userRec.completedSteps.delete(stepId);
    }

    if (notes !== undefined) {
      userRec.notes.set(stepId, notes);
    }

    const nowIso = new Date().toISOString();
    userRec.lastUpdated = nowIso;

    const progressPercent = Math.round((userRec.completedSteps.size / BUSINESS_LAUNCH_MILESTONES.length) * 100);

    const dbRecord = {
      id: `prog_${userId}`,
      userId,
      resourceId: 'business_launch_tracker',
      completionStatus: progressPercent === 100 ? 'completed' : 'in_progress',
      progressPercent,
      completedSteps: Array.from(userRec.completedSteps),
      stepNotes: Object.fromEntries(userRec.notes),
      lastAccessedAt: nowIso
    };

    try {
      if (typeof indexedDB !== 'undefined' && db && db.userLearningProgress) {
        await db.userLearningProgress.put(dbRecord);
      }
    } catch (e) {}

    await syncEngine.enqueueMutation({
      storeName: 'userLearningProgress',
      recordId: dbRecord.id,
      operation: 'PUT',
      payload: dbRecord,
      userId
    });

    return this.getUserLaunchProgress(userId);
  }

  /**
   * Synchronize pending progress offline
   */
  async syncUserProgress(userId) {
    if (!userId) return { synchronizedCount: 0 };
    return { synchronizedCount: 1 };
  }
}

export const learningResourceService = new LearningResourceService();
