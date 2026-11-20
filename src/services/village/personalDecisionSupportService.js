/**
 * MahaUdyam — Village Opportunity Detector (Phase 3)
 * Personalized Entrepreneur Decision Support Service
 * 
 * Capabilities:
 * - Skill & Investment Matching Engine
 * - Side-by-side Opportunity Comparison
 * - Saved Opportunities Management (Strict Multi-Tenant User Isolation)
 * - 7-Step Business Preparation Checklist & Progress Tracker
 * - Risk Assessment & Missing Resource Identification
 * - Statutory Non-Guarantee Notice: Never guarantees business success or profit
 */

import { db } from '../db/index.js';
import { syncEngine } from '../offline/syncEngine.js';
import { opportunityDiscoveryEngine } from './opportunityDiscoveryEngine.js';

export const CHECKLIST_TEMPLATES = [
  {
    stepId: 'step_udyam_registration',
    title_en: '1. MSME Udyam Registration',
    title_mr: '१. एमएसएमई उद्यम नोंदणी (Udyam Registration)',
    category: 'regulatory',
    description_en: 'Free government registration for rural micro-enterprises on udyamregistration.gov.in.',
    description_mr: 'ग्रामीण सूक्ष्म उद्योगांसाठी भारत सरकारची मोफत अधिकृत नोंदणी.',
    isMandatory: true,
    portalUrl: 'https://udyamregistration.gov.in'
  },
  {
    stepId: 'step_grampanchayat_noc',
    title_en: '2. Village Gram Panchayat Trade Permission / Shop Act',
    title_mr: '२. ग्रामपंचायत व्यवसाय परवाना / नाहरकत प्रमाणपत्र',
    category: 'regulatory',
    description_en: 'Obtain village trade license / NoC from your Gram Panchayat for workshop or commercial activity.',
    description_mr: 'गावात व्यवसाय किंवा कार्यशाळा चालवण्यासाठी ग्रामपंचायतीचे नाहरकत प्रमाणपत्र.',
    isMandatory: true
  },
  {
    stepId: 'step_fssai_registration',
    title_en: '3. FSSAI Food Safety Registration (For Food / Dairy units)',
    title_mr: '३. FSSAI अन्न सुरक्षा नोंदणी (अन्न व दुग्ध उद्योगांसाठी)',
    category: 'compliance',
    description_en: 'Basic registration required for all food, dehydration, dairy, or edible produce units under ₹12L turnover.',
    description_mr: '₹१२ लाखांखालील सर्व अन्न, प्रक्रिया व दुग्ध उद्योगांसाठी मूलभूत नोंदणी आवश्यक.',
    appliesToCategories: ['agro_processing', 'dairy_livestock']
  },
  {
    stepId: 'step_raw_material_sourcing',
    title_en: '4. Raw-Material Procurement Plan',
    title_mr: '४. कच्चा माल खरेदी व पुरवठा नियोजन',
    category: 'operations',
    description_en: 'Identify 3 reliable local farmers or wholesale mandi suppliers for steady input supply.',
    description_mr: 'कच्च्या मालाच्या नियमित पुरवठ्यासाठी ३ स्थानिक शेतकरी किंवा घाऊक पुरवठादार निश्चित करा.',
    linkedModule: 'route-finder'
  },
  {
    stepId: 'step_shared_equipment_booking',
    title_en: '5. Equipment Identification & Shared Facility Access',
    title_mr: '५. आवश्यक यंत्रसामग्री व सामायिक साधन सुविधा',
    category: 'capital',
    description_en: 'Check if machinery can be shared or rented via Shared Resource Matcher before buying new equipment.',
    description_mr: 'नवीन यंत्र खरेदी करण्यापूर्वी सामायिक भाडेतत्त्वावरील यंत्रसामग्री तपासा.',
    linkedModule: 'resource-matcher'
  },
  {
    stepId: 'step_quality_batch_testing',
    title_en: '6. Pilot Batch Production & Quality Testing',
    title_mr: '६. चाचणी उत्पादन (Pilot Batch) व गुणवत्ता पडताळणी',
    category: 'quality',
    description_en: 'Produce a trial batch of 10-20 units to check shelf life, moisture, and local customer acceptance.',
    description_mr: '१० ते २० एककांची पहिली चाचणी बॅच तयार करून स्थानिक ग्राहकांचा प्रतिसाद तपासा.'
  },
  {
    stepId: 'step_sales_channel_setup',
    title_en: '7. Weekly Bazaar & Retail Sales Channels',
    title_mr: '७. आठवडे बाजार व स्थानिक किरकोळ विक्री नियोजन',
    category: 'marketing',
    description_en: 'Select 2 nearby weekly haats on BazaarPath and tie up with 3 local retail kirana stores.',
    description_mr: 'बाजारपेठ शोधकावरून २ आठवडे बाजार निवडा आणि ३ स्थानिक दुकानांशी विक्री करार करा.',
    linkedModule: 'bazaarpath'
  }
];

class PersonalDecisionSupportService {
  constructor() {
    this.savedOpportunitiesMemory = new Map(); // userId -> Map of saved opportunities
    this.checklistMemory = new Map();           // `${userId}_${oppId}` -> Array of steps
  }

  /**
   * Match an entrepreneur's personal profile (skills, budget) against village opportunities
   */
  async matchPersonalOpportunities({
    villageCode,
    userSkills = [],
    maxBudget = null,
    preferredCategories = []
  }) {
    const oppResult = await opportunityDiscoveryEngine.generateOpportunitiesForVillage(villageCode);
    const opportunities = oppResult.opportunities || [];

    return opportunities.map((opp) => {
      let matchScore = 50; // baseline compatibility

      // 1. Skill Match (+25 pts)
      const userSkillLower = userSkills.map((s) => s.toLowerCase());
      const hasSkillMatch = (opp.supportingEvidence?.matchedSkills || []).some((s) =>
        userSkillLower.includes(s.toLowerCase())
      );
      if (hasSkillMatch) matchScore += 25;

      // 2. Budget Match (+20 pts)
      if (maxBudget != null && Number(maxBudget) > 0) {
        const budgetNum = Number(maxBudget);
        if (budgetNum >= opp.investmentRange.min && budgetNum <= opp.investmentRange.max * 1.5) {
          matchScore += 20;
        } else if (budgetNum < opp.investmentRange.min) {
          matchScore -= 15; // Requires higher capital
        }
      }

      // 3. Category Preference (+10 pts)
      if (preferredCategories.length > 0 && preferredCategories.includes(opp.category)) {
        matchScore += 10;
      }

      const personalMatchPercent = Math.max(20, Math.min(98, matchScore));

      return {
        ...opp,
        personalMatchPercent,
        isWithinBudget: maxBudget ? Number(maxBudget) >= opp.investmentRange.min : true
      };
    }).sort((a, b) => b.personalMatchPercent - a.personalMatchPercent);
  }

  /**
   * Save opportunity to entrepreneur's private workspace
   */
  async saveOpportunity(userId, opportunity) {
    if (!userId) throw new Error('Authentication required to save opportunity.');
    if (!opportunity || !opportunity.id) throw new Error('Invalid opportunity record.');

    const userMap = this.savedOpportunitiesMemory.get(userId) || new Map();
    const nowIso = new Date().toISOString();
    const record = {
      ...opportunity,
      userId,
      savedAt: nowIso,
      updatedAt: nowIso
    };
    userMap.set(opportunity.id, record);
    this.savedOpportunitiesMemory.set(userId, userMap);

    const recordToSave = {
      id: opportunity.id,
      userId,
      title: opportunity.title_en,
      title_mr: opportunity.title_mr,
      category: opportunity.category,
      district: opportunity.districtCode,
      villageCode: opportunity.villageCode,
      viabilityScore: opportunity.viabilityScore,
      opportunityData: record,
      isFavorite: true,
      updatedAt: nowIso
    };

    // Persist in Dexie if available
    try {
      if (db.opportunities) {
        await db.opportunities.put(recordToSave);
      }
    } catch (e) {}

    await syncEngine.enqueueMutation({
      storeName: 'opportunities',
      recordId: opportunity.id,
      operation: 'PUT',
      payload: recordToSave,
      userId
    });

    return { success: true, savedId: opportunity.id };
  }

  /**
   * Get all saved opportunities strictly isolated by userId
   */
  async getSavedOpportunities(userId) {
    if (!userId) return [];
    let list = [];

    try {
      if (db.opportunities) {
        const dexieRecords = await db.opportunities.where('userId').equals(userId).toArray();
        if (dexieRecords && dexieRecords.length > 0) {
          list = dexieRecords.map((r) => r.opportunityData || r);
        }
      }
    } catch (e) {
      list = [];
    }

    if (!list || list.length === 0) {
      const userMap = this.savedOpportunitiesMemory.get(userId) || new Map();
      list = Array.from(userMap.values());
    }

    return list.sort((a, b) => new Date(b.savedAt || b.updatedAt) - new Date(a.savedAt || a.updatedAt));
  }

  /**
   * Remove saved opportunity
   */
  async removeSavedOpportunity(userId, opportunityId) {
    if (!userId || !opportunityId) return false;
    const userMap = this.savedOpportunitiesMemory.get(userId);
    if (userMap) userMap.delete(opportunityId);

    try {
      if (db.opportunities) {
        await db.opportunities.delete(opportunityId);
      }
    } catch (e) {}

    await syncEngine.enqueueMutation({
      storeName: 'opportunities',
      recordId: opportunityId,
      operation: 'DELETE',
      payload: null,
      userId
    });

    return true;
  }

  /**
   * Get or initialize business preparation checklist for a specific opportunity
   */
  async getChecklistForOpportunity(userId, opportunityId, category = null) {
    const key = `${userId}_${opportunityId}`;
    let items = this.checklistMemory.get(key);

    if (!items) {
      // Filter templates relevant to this opportunity category
      items = CHECKLIST_TEMPLATES.filter((tpl) => {
        if (!tpl.appliesToCategories) return true;
        return category ? tpl.appliesToCategories.includes(category) : true;
      }).map((tpl) => ({
        ...tpl,
        isCompleted: false,
        completedAt: null
      }));
      this.checklistMemory.set(key, items);
    }

    const completedCount = items.filter((i) => i.isCompleted).length;
    const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

    return {
      opportunityId,
      items,
      totalSteps: items.length,
      completedCount,
      progressPercent
    };
  }

  /**
   * Toggle a checklist step
   */
  async toggleChecklistStep(userId, opportunityId, stepId) {
    const key = `${userId}_${opportunityId}`;
    const checklist = await this.getChecklistForOpportunity(userId, opportunityId);
    const step = checklist.items.find((i) => i.stepId === stepId);
    if (step) {
      step.isCompleted = !step.isCompleted;
      step.completedAt = step.isCompleted ? new Date().toISOString() : null;
    }
    this.checklistMemory.set(key, checklist.items);

    const completedCount = checklist.items.filter((i) => i.isCompleted).length;
    const progressPercent = Math.round((completedCount / checklist.items.length) * 100);

    return {
      stepId,
      isCompleted: step ? step.isCompleted : false,
      progressPercent
    };
  }

  /**
   * Compare 2 or 3 opportunities side-by-side
   */
  compareOpportunities(opportunities = []) {
    if (!opportunities || opportunities.length === 0) return null;

    return {
      comparisonCount: opportunities.length,
      opportunities: opportunities.map((opp) => ({
        id: opp.id,
        title_en: opp.title_en,
        title_mr: opp.title_mr,
        category: opp.category,
        viabilityScore: opp.viabilityScore,
        confidenceLevel: opp.confidenceLevel,
        minInvestment: opp.investmentRange?.min,
        maxInvestment: opp.investmentRange?.max,
        formattedBudget: opp.investmentRange?.formatted,
        equipmentCount: (opp.requiredEquipment || []).length,
        requiredEquipment: opp.requiredEquipment || [],
        risks_en: opp.risks_en,
        risks_mr: opp.risks_mr,
        supportingEvidence: opp.supportingEvidence || {}
      }))
    };
  }
}

export const personalDecisionSupportService = new PersonalDecisionSupportService();
