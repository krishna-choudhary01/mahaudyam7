import { db } from '../db/index.js';
import { gapAnalyzerService } from './gapAnalyzerService.js';
import { syncEngine } from '../offline/syncEngine.js';

/**
 * 8 Standard Opportunity Validation Stages
 */
export const VALIDATION_STAGES = {
  NEW_OPPORTUNITY: 'new_opportunity',               // 1. New Opportunity (नवी संधी)
  UNDER_INVESTIGATION: 'under_investigation',       // 2. Under Investigation (तपास सुरू आहे)
  DEMAND_VERIFIED: 'demand_verified',               // 3. Local Demand Verified (स्थानिक मागणी पडताळली)
  COMPETITION_CHECKED: 'competition_checked',       // 4. Existing Competition Checked (स्थानिक स्पर्धा तपासली)
  SUPPLIER_CHECKED: 'supplier_checked',             // 5. Supplier Availability Checked (पुरवठादार उपलब्धता तपासली)
  FEASIBILITY_REVIEWED: 'feasibility_reviewed',     // 6. Feasibility Reviewed (व्यवहार्यता तपासणी पूर्ण)
  READY_FOR_DECISION: 'ready_for_decision',         // 7. Ready for Entrepreneur Decision (उद्योजक निर्णयासाठी तयार)
  REJECTED_NOT_SUITABLE: 'rejected_not_suitable'   // 8. Rejected / Not Suitable (अयोग्य / नाकारलेली संधी)
};

export const VALIDATION_STAGE_ORDER = [
  VALIDATION_STAGES.NEW_OPPORTUNITY,
  VALIDATION_STAGES.UNDER_INVESTIGATION,
  VALIDATION_STAGES.DEMAND_VERIFIED,
  VALIDATION_STAGES.COMPETITION_CHECKED,
  VALIDATION_STAGES.SUPPLIER_CHECKED,
  VALIDATION_STAGES.FEASIBILITY_REVIEWED,
  VALIDATION_STAGES.READY_FOR_DECISION,
  VALIDATION_STAGES.REJECTED_NOT_SUITABLE
];

/**
 * Default Local Validation Checklist Template (4 Categories)
 */
export const DEFAULT_CHECKLIST_TEMPLATE = {
  demand: {
    spokenToCustomers: false,
    estimatedNeedCount: '',
    frequencyConfirmed: '',
    willingToPayConfirmed: false,
    seasonalDemand: '',
    notes: ''
  },
  competition: {
    unlistedBusinessesFound: false,
    nearbyVillagesServed: false,
    customerAlternatives: '',
    insufficiencyReason: '',
    notes: ''
  },
  supply: {
    rawMaterialsAccessible: false,
    suppliersReachable: false,
    transportPractical: false,
    equipmentAvailable: false,
    notes: ''
  },
  feasibility: {
    requiredSkillsPresent: false,
    investmentAffordable: false,
    licensesIdentified: false,
    infrastructureReady: false,
    notes: ''
  }
};

/**
 * Default Entrepreneur Field Observations Template
 */
export const DEFAULT_OBSERVATIONS_TEMPLATE = {
  customersContacted: 0,
  customersInterested: 0,
  customersWillingToPay: 0,
  discoveredLocalBusinesses: '',
  confirmedLocalSuppliers: '',
  validationDate: '',
  generalNotes: ''
};

/**
 * GapValidationService - Phase 3 Opportunity Validation and Decision Support
 * 
 * Core Rules:
 * 1. Personal & Isolated: Every validation status, checklist, and observation belongs strictly to the authenticated user.
 * 2. Independence: Entrepreneur-recorded observations NEVER modify the system's objective Phase 2 gap score.
 * 3. Offline-first: Full local persistence in Dexie IndexedDB with synchronization queuing and conflict resolution.
 * 4. Human-in-the-loop: A detected gap NEVER automatically becomes a validated business opportunity.
 */
class GapValidationService {
  constructor() {
    this.inMemoryStore = new Map(); // key `${userId}_${gapId}` -> record
  }

  /**
   * Calculate checklist completion percentage
   */
  calculateChecklistProgress(checklist = {}) {
    let totalItems = 16;
    let completed = 0;

    const d = checklist.demand || {};
    if (d.spokenToCustomers) completed++;
    if (d.estimatedNeedCount) completed++;
    if (d.frequencyConfirmed) completed++;
    if (d.willingToPayConfirmed) completed++;

    const c = checklist.competition || {};
    if (c.unlistedBusinessesFound != null && c.notes) completed += 2;
    else if (c.unlistedBusinessesFound) completed++;
    if (c.customerAlternatives) completed++;
    if (c.insufficiencyReason) completed++;

    const s = checklist.supply || {};
    if (s.rawMaterialsAccessible) completed++;
    if (s.suppliersReachable) completed++;
    if (s.transportPractical) completed++;
    if (s.equipmentAvailable) completed++;

    const f = checklist.feasibility || {};
    if (f.requiredSkillsPresent) completed++;
    if (f.investmentAffordable) completed++;
    if (f.licensesIdentified) completed++;
    if (f.infrastructureReady) completed++;

    const percentage = Math.min(100, Math.round((completed / totalItems) * 100));
    return {
      completed,
      total: totalItems,
      percentage
    };
  }

  /**
   * Retrieve a specific validation record for a user
   */
  async getValidationRecord(userId, gapId) {
    if (!userId || !gapId) return null;
    const recordId = `${userId}_${gapId}`;

    // 1. Check Dexie IndexedDB
    try {
      if (typeof indexedDB !== 'undefined' && db && db.savedGapAnalyses) {
        const record = await db.savedGapAnalyses.get(recordId);
        if (record) {
          this.inMemoryStore.set(recordId, { ...record });
          return record;
        }
      }
    } catch (e) {
      console.warn('Could not read savedGapAnalyses from Dexie', e);
    }

    // 2. Check in-memory store
    return this.inMemoryStore.get(recordId) || null;
  }

  /**
   * Save or update validation record with offline sync queueing
   */
  async saveOrUpdateValidation(userId, gapId, updates = {}, isOnline = true) {
    if (!userId) throw new Error('User must be logged in to validate opportunities');
    if (!gapId) throw new Error('Valid Gap ID required');

    const recordId = `${userId}_${gapId}`;
    const existing = (await this.getValidationRecord(userId, gapId)) || {
      id: recordId,
      userId,
      gapId,
      validationStatus: VALIDATION_STAGES.NEW_OPPORTUNITY,
      checklist: JSON.parse(JSON.stringify(DEFAULT_CHECKLIST_TEMPLATE)),
      observations: JSON.parse(JSON.stringify(DEFAULT_OBSERVATIONS_TEMPLATE)),
      personalNotes: '',
      gapSnapshot: updates.gapSnapshot || null,
      savedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      syncStatus: isOnline ? 'synced' : 'pending_sync'
    };

    const newVersion = (existing.version || 1) + 1;
    const nowIso = new Date().toISOString();

    const mergedRecord = {
      ...existing,
      ...updates,
      id: recordId,
      userId, // Guard: Never allow userId to be mutated
      gapId,
      validationStatus: updates.validationStatus || existing.validationStatus || VALIDATION_STAGES.NEW_OPPORTUNITY,
      checklist: {
        demand: { ...existing.checklist?.demand, ...updates.checklist?.demand },
        competition: { ...existing.checklist?.competition, ...updates.checklist?.competition },
        supply: { ...existing.checklist?.supply, ...updates.checklist?.supply },
        feasibility: { ...existing.checklist?.feasibility, ...updates.checklist?.feasibility }
      },
      observations: {
        ...existing.observations,
        ...updates.observations
      },
      personalNotes: updates.personalNotes !== undefined ? updates.personalNotes : existing.personalNotes,
      gapSnapshot: updates.gapSnapshot || existing.gapSnapshot,
      updatedAt: nowIso,
      version: newVersion,
      syncStatus: isOnline ? 'synced' : 'pending_sync'
    };

    // Calculate progress
    mergedRecord.progress = this.calculateChecklistProgress(mergedRecord.checklist);

    // Save to memory
    this.inMemoryStore.set(recordId, mergedRecord);

    // Save to Dexie IndexedDB
    try {
      if (typeof indexedDB !== 'undefined' && db && db.savedGapAnalyses) {
        await db.savedGapAnalyses.put(mergedRecord);
      }
    } catch (e) {
      console.warn('Could not write savedGapAnalyses to Dexie', e);
    }

    await syncEngine.enqueueMutation({
      storeName: 'savedGapAnalyses',
      recordId,
      operation: 'PUT',
      payload: mergedRecord,
      userId
    });

    return mergedRecord;
  }

  /**
   * Update validation stage
   */
  async updateValidationStatus(userId, gapId, newStatus, isOnline = true) {
    if (!Object.values(VALIDATION_STAGES).includes(newStatus)) {
      throw new Error(`Invalid validation stage: ${newStatus}`);
    }
    return this.saveOrUpdateValidation(userId, gapId, { validationStatus: newStatus }, isOnline);
  }

  /**
   * Update checklist for a specific category
   */
  async updateChecklist(userId, gapId, category, answers, isOnline = true) {
    if (!['demand', 'competition', 'supply', 'feasibility'].includes(category)) {
      throw new Error(`Invalid checklist category: ${category}`);
    }
    const current = (await this.getValidationRecord(userId, gapId)) || {};
    const existingChecklist = current.checklist || JSON.parse(JSON.stringify(DEFAULT_CHECKLIST_TEMPLATE));

    const updatedCategory = {
      ...existingChecklist[category],
      ...answers
    };

    const updatedChecklist = {
      ...existingChecklist,
      [category]: updatedCategory
    };

    return this.saveOrUpdateValidation(userId, gapId, { checklist: updatedChecklist }, isOnline);
  }

  /**
   * Update entrepreneur field observations
   */
  async updateObservations(userId, gapId, observations, isOnline = true) {
    return this.saveOrUpdateValidation(userId, gapId, { observations }, isOnline);
  }

  /**
   * Update entrepreneur personal notes
   */
  async updatePersonalNotes(userId, gapId, personalNotes, isOnline = true) {
    return this.saveOrUpdateValidation(userId, gapId, { personalNotes }, isOnline);
  }

  /**
   * Retrieve all investigated opportunities for the authenticated user
   */
  async getUserInvestigatedOpportunities(userId) {
    if (!userId) return [];
    let records = [];

    try {
      if (typeof indexedDB !== 'undefined' && db && db.savedGapAnalyses) {
        records = await db.savedGapAnalyses.where('userId').equals(userId).toArray();
      }
    } catch (e) {
      console.warn('Could not read user savedGapAnalyses from Dexie', e);
    }

    if (records.length === 0) {
      // Memory fallback for tests / headless SSR
      for (const [key, val] of this.inMemoryStore.entries()) {
        if (val.userId === userId) {
          records.push({ ...val });
        }
      }
    }

    // Attach progress calculations and sort by latest updated
    return records
      .map((r) => ({
        ...r,
        progress: this.calculateChecklistProgress(r.checklist)
      }))
      .sort((a, b) => new Date(b.updatedAt || b.savedAt) - new Date(a.updatedAt || a.savedAt));
  }

  /**
   * Delete / Unsave an opportunity
   */
  async deleteSavedOpportunity(userId, gapId) {
    if (!userId || !gapId) return false;
    const recordId = `${userId}_${gapId}`;
    this.inMemoryStore.delete(recordId);

    try {
      if (typeof indexedDB !== 'undefined' && db && db.savedGapAnalyses) {
        await db.savedGapAnalyses.delete(recordId);
      }
    } catch (e) {
      console.warn('Could not delete from savedGapAnalyses', e);
    }

    await syncEngine.enqueueMutation({
      storeName: 'savedGapAnalyses',
      recordId,
      operation: 'DELETE',
      payload: null,
      userId
    });

    return true;
  }

  // =========================================================================
  // 5. OPPORTUNITY COMPARISON (Section 5)
  // =========================================================================

  /**
   * Build side-by-side comparison matrix for selected saved opportunities
   */
  async buildComparisonMatrix(userId, gapIds = []) {
    if (!userId || !gapIds.length) return [];

    const userOpportunities = await this.getUserInvestigatedOpportunities(userId);
    const selected = userOpportunities.filter((o) => gapIds.includes(o.gapId));

    return selected.map((item) => {
      const snap = item.gapSnapshot || {};
      const obs = item.observations || {};
      const prog = item.progress || this.calculateChecklistProgress(item.checklist);

      return {
        id: item.id,
        gapId: item.gapId,
        productOrService: snap.productOrService || 'Opportunity',
        productOrService_mr: snap.productOrService_mr || snap.productOrService || 'संधी',
        village: snap.village || 'Local Village',
        taluka: snap.taluka || '',
        district: snap.district || '',
        // Demand Evidence
        totalValidReports: snap.totalValidReports || 0,
        notAvailablePercentage: snap.notAvailablePercentage || 0,
        // Supply Evidence
        knownVerifiedSuppliersCount: snap.knownVerifiedSuppliersCount ?? snap.knownSuppliersCount ?? 0,
        unverifiedSuppliersCount: snap.unverifiedSuppliersCount || 0,
        // Gap Metrics
        gapScore: snap.gapScore ?? null,
        gapScoreLabel: snap.gapScoreLabel || 'Insufficient data',
        confidence: snap.confidence || 'low',
        trend: snap.trend || 'trend_not_available',
        trendLabel: snap.trendLabel || 'Trend not available',
        // Validation Stage & Progress
        validationStatus: item.validationStatus || VALIDATION_STAGES.NEW_OPPORTUNITY,
        progressPercentage: prog.percentage,
        progressCompleted: prog.completed,
        progressTotal: prog.total,
        // Field Observations
        customersContacted: obs.customersContacted || 0,
        customersInterested: obs.customersInterested || 0,
        customersWillingToPay: obs.customersWillingToPay || 0,
        personalNotes: item.personalNotes || '',
        lastUpdated: item.updatedAt || item.savedAt
      };
    });
  }

  // =========================================================================
  // 7. OFFLINE SYNC & CONFLICT HANDLING (Section 7)
  // =========================================================================

  /**
   * Enqueue offline sync item
   */
  async queueOfflineSyncAction(userId, actionType, payload) {
    try {
      if (typeof indexedDB !== 'undefined' && db && db.syncQueue) {
        await db.syncQueue.add({
          userId,
          actionType: `GAP_VALIDATION_${actionType}`,
          payload,
          status: 'pending',
          createdAt: new Date().toISOString(),
          retryCount: 0
        });
      }
    } catch (e) {
      console.warn('Could not queue offline sync action', e);
    }
  }

  /**
   * Conflict Detection & Resolution Strategy:
   * Merges checklist and observations safely based on timestamp and version.
   * If incoming has a newer timestamp, incoming takes precedence, but preserves
   * any local notes or checklist answers that were not modified on incoming.
   */
  resolveValidationConflict(localRecord, incomingRecord) {
    if (!localRecord) return incomingRecord;
    if (!incomingRecord) return localRecord;

    const localTime = Date.parse(localRecord.updatedAt || localRecord.savedAt) || 0;
    const incomingTime = Date.parse(incomingRecord.updatedAt || incomingRecord.savedAt) || 0;

    const base = incomingTime >= localTime ? incomingRecord : localRecord;
    const secondary = incomingTime >= localTime ? localRecord : incomingRecord;

    // Field-level deep merge to prevent accidental data loss
    const resolved = {
      ...base,
      checklist: {
        demand: { ...secondary.checklist?.demand, ...base.checklist?.demand },
        competition: { ...secondary.checklist?.competition, ...base.checklist?.competition },
        supply: { ...secondary.checklist?.supply, ...base.checklist?.supply },
        feasibility: { ...secondary.checklist?.feasibility, ...base.checklist?.feasibility }
      },
      observations: {
        ...secondary.observations,
        ...base.observations
      },
      personalNotes: base.personalNotes || secondary.personalNotes || '',
      version: Math.max(localRecord.version || 1, incomingRecord.version || 1) + 1,
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced',
      conflictResolved: true
    };

    resolved.progress = this.calculateChecklistProgress(resolved.checklist);
    return resolved;
  }

  /**
   * Synchronize pending offline validation records
   */
  async syncPendingValidations(userId) {
    if (!userId) return { syncedCount: 0 };
    let syncedCount = 0;

    try {
      if (typeof indexedDB !== 'undefined' && db && db.savedGapAnalyses) {
        const pending = await db.savedGapAnalyses
          .where('userId')
          .equals(userId)
          .and((r) => r.syncStatus === 'pending_sync')
          .toArray();

        for (const item of pending) {
          item.syncStatus = 'synced';
          item.lastSyncedAt = new Date().toISOString();
          await db.savedGapAnalyses.put(item);
          syncedCount++;
        }
      }
    } catch (e) {
      console.warn('Error during syncPendingValidations', e);
    }

    return { syncedCount };
  }
}

export const gapValidationService = new GapValidationService();
export default gapValidationService;
