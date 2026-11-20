import { db } from '../db/index.js';
import { INITIAL_BAZAAR_MARKETS } from '../../data/bazaar/initialMarkets.js';
import { adminAuthService } from '../auth/adminAuthService.js';
import { bazaarDataService } from '../bazaar/bazaarDataService.js';

export const MARKET_TYPES = [
  'Weekly Bazaar (आठवडे बाजार)',
  'Village Haat (ग्रामीण आठवडे बाजार)',
  'APMC Mandi (कृषी उत्पन्न बाजार समिती)',
  'Sub-Market Yard (उपबाजार केंद्र)',
  'Farmers Direct Market (शेतकरी थेट आठवडे बाजार)',
  'Livestock Bazaar (जनावरांचा बाजार)',
  'Local Retail Haat (स्थानिक किरकोळ बाजार)',
  'Other'
];

export const OPERATING_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday'
];

export const DEFAULT_PRODUCT_CATEGORIES = [
  'Vegetables',
  'Fruits',
  'Grains',
  'Pulses',
  'Spices',
  'Dairy products',
  'Clothes',
  'Household goods',
  'Handmade products',
  'Poultry',
  'Flowers',
  'Other'
];

export const STANDARD_FACILITIES = [
  { id: 'drinkingWater', label: 'Drinking Water (पिण्याचे पाणी)' },
  { id: 'parking', label: 'Parking Area (वाहनतळ)' },
  { id: 'publicTransport', label: 'Public Transport Access (एसटी बस / सार्वजनिक वाहतूक)' },
  { id: 'storage', label: 'Temporary Storage (साठवणूक सोय)' },
  { id: 'electricity', label: 'Electricity / Lighting (विजेची सोय)' },
  { id: 'toilets', label: 'Clean Public Toilets (स्वच्छतागृह)' },
  { id: 'loadingUnloading', label: 'Loading & Unloading Zone (माल चढवणे / उतरवणे)' }
];

export const VERIFICATION_STATUSES = [
  { id: 'draft', label_en: 'Draft', label_mr: 'मसुदा', badgeClass: 'badge-draft' },
  { id: 'pending_verification', label_en: 'Pending Verification', label_mr: 'पडताळणी प्रलंबित', badgeClass: 'badge-pending' },
  { id: 'verified', label_en: 'Verified & Published', label_mr: 'पडताळणी पूर्ण व प्रकाशित', badgeClass: 'badge-verified' },
  { id: 'needs_correction', label_en: 'Needs Correction', label_mr: 'दुरुस्ती आवश्यक', badgeClass: 'badge-correction' },
  { id: 'rejected', label_en: 'Rejected', label_mr: 'नाकारले', badgeClass: 'badge-rejected' },
  { id: 'temporarily_closed', label_en: 'Temporarily Closed', label_mr: 'तात्पुरता बंद', badgeClass: 'badge-closed' },
  { id: 'inactive', label_en: 'Inactive / Deactivated', label_mr: 'निष्क्रिय', badgeClass: 'badge-inactive' }
];

// Resilient in-memory stores for environments without IndexedDB (CLI testing, private browsing)
const inMemoryMarketStore = new Map();
const inMemorySubmissionsStore = new Map();

class MarketManagementService {
  constructor() {
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;
    INITIAL_BAZAAR_MARKETS.forEach((m) => {
      inMemoryMarketStore.set(m.id, { ...m });
    });
    try {
      await bazaarDataService.init();
      if (db && db.bazaarMarkets) {
        const list = await db.bazaarMarkets.toArray();
        list.forEach((m) => inMemoryMarketStore.set(m.id, m));
      }
    } catch (e) {}
    this.isInitialized = true;
  }

  /**
   * Retrieves all markets with advanced filtering, search, sorting and pagination
   */
  async getMarkets({
    search = '',
    districtCode = '',
    talukaCode = '',
    marketType = 'all',
    status = 'all',
    operatingDay = 'all',
    page = 1,
    limit = 20,
    sortBy = 'lastUpdated',
    sortOrder = 'desc'
  } = {}) {
    await this.init();

    let allMarkets = [];
    try {
      if (db && db.bazaarMarkets) {
        allMarkets = await db.bazaarMarkets.toArray();
      }
    } catch (e) {}

    if (!allMarkets || allMarkets.length === 0) {
      allMarkets = [...INITIAL_BAZAAR_MARKETS];
    }

    // 1. Search Query
    let filtered = allMarkets;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter((m) => {
        return (
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.name_mr && m.name_mr.includes(q)) ||
          (m.taluka && m.taluka.toLowerCase().includes(q)) ||
          (m.district && m.district.toLowerCase().includes(q)) ||
          (m.village && m.village.toLowerCase().includes(q)) ||
          (m.id && m.id.toLowerCase().includes(q))
        );
      });
    }

    // 2. District filter
    if (districtCode && districtCode !== 'all') {
      filtered = filtered.filter((m) => Number(m.districtCode) === Number(districtCode));
    }

    // 3. Taluka filter
    if (talukaCode && talukaCode !== 'all') {
      filtered = filtered.filter((m) => Number(m.talukaCode) === Number(talukaCode));
    }

    // 4. Market Type filter
    if (marketType && marketType !== 'all') {
      filtered = filtered.filter((m) => m.marketType === marketType);
    }

    // 5. Verification status filter
    if (status && status !== 'all') {
      filtered = filtered.filter((m) => {
        const vStatus = m.verificationStatus || (m.status === 'verified' ? 'verified' : 'pending_verification');
        return vStatus === status;
      });
    }

    // 6. Operating day filter
    if (operatingDay && operatingDay !== 'all') {
      filtered = filtered.filter((m) => m.operatingDay === operatingDay);
    }

    // 7. Sorting
    filtered.sort((a, b) => {
      let valA = a[sortBy] || '';
      let valB = b[sortBy] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      items: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  /**
   * Generates Live Dashboard Statistics from actual available data
   */
  async getDashboardStatistics() {
    await this.init();

    let allMarkets = [];
    try {
      if (db && db.bazaarMarkets) {
        allMarkets = await db.bazaarMarkets.toArray();
      }
    } catch (e) {}

    if (!allMarkets || allMarkets.length === 0) {
      allMarkets = [...INITIAL_BAZAAR_MARKETS];
    }

    let submissions = [];
    try {
      if (db && db.marketSubmissions) {
        submissions = await db.marketSubmissions.toArray();
      }
    } catch (e) {}

    let total = allMarkets.length;
    let verified = 0;
    let pendingVerification = 0;
    let rejected = 0;
    let inactive = 0;
    let temporarilyClosed = 0;

    allMarkets.forEach((m) => {
      const status = m.verificationStatus || 'pending_verification';
      if (status === 'verified') verified++;
      else if (status === 'pending_verification') pendingVerification++;
      else if (status === 'rejected') rejected++;
      else if (status === 'inactive') inactive++;
      else if (status === 'temporarily_closed') temporarilyClosed++;
    });

    // Also factor in pending entrepreneur submissions
    const pendingSubmissions = submissions.filter((s) => s.status === 'pending' || !s.status).length;
    const rejectedSubmissions = submissions.filter((s) => s.status === 'rejected').length;

    // Recently updated markets
    const recentlyUpdated = [...allMarkets]
      .sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0))
      .slice(0, 5);

    return {
      totalMarkets: total,
      verifiedMarkets: verified,
      pendingVerification: pendingVerification + pendingSubmissions,
      rejectedRecords: rejected + rejectedSubmissions,
      inactiveMarkets: inactive,
      temporarilyClosed,
      totalSubmissions: submissions.length,
      recentlyUpdated
    };
  }

  /**
   * Check for potential duplicate market records
   */
  async detectDuplicates({ name, districtCode, talukaCode, villageCode, operatingDay, excludeMarketId = null }) {
    await this.init();
    let allMarkets = [];
    try {
      if (db && db.bazaarMarkets) {
        allMarkets = await db.bazaarMarkets.toArray();
      }
    } catch (e) {}
    if (!allMarkets || allMarkets.length === 0) {
      allMarkets = Array.from(inMemoryMarketStore.values());
    }

    const cleanName = (name || '').trim().toLowerCase();
    const dCode = Number(districtCode);
    const tCode = Number(talukaCode);

    return allMarkets.filter((m) => {
      if (excludeMarketId && m.id === excludeMarketId) return false;
      const sameDistrict = Number(m.districtCode) === dCode;
      const sameTaluka = Number(m.talukaCode) === tCode;
      const sameDay = m.operatingDay === operatingDay;

      const mName = (m.name || '').toLowerCase();
      const mNameMr = (m.name_mr || '').toLowerCase();
      const nameMatch = mName.includes(cleanName) || cleanName.includes(mName) || mNameMr.includes(cleanName);

      return sameDistrict && (sameTaluka || sameDay) && nameMatch;
    });
  }

  /**
   * Add a New Market Record
   * Enforces validation, coordinate bounds, permanent ID, and audit logging
   */
  async addMarket(marketData) {
    if (!adminAuthService.hasPermission('MANAGE_MARKETS')) {
      throw new Error('Access Denied: Only authorized administrators can add new market records.');
    }

    // 1. Validation
    const name = (marketData.name || '').trim();
    if (!name || name.length < 3) {
      return { success: false, error: 'Market name is required and must be at least 3 characters.' };
    }

    if (!marketData.districtCode || !marketData.talukaCode) {
      return { success: false, error: 'District and Taluka are mandatory location fields.' };
    }

    if (!marketData.operatingDay) {
      return { success: false, error: 'Weekly operating day is required.' };
    }

    // Validate Coordinates (Maharashtra bounds: lat 15.6 to 22.1, lng 72.6 to 80.9)
    if (marketData.coordinates) {
      const { lat, lng } = marketData.coordinates;
      if (lat !== undefined && lng !== undefined && (lat !== 0 || lng !== 0)) {
        const numLat = Number(lat);
        const numLng = Number(lng);
        if (isNaN(numLat) || isNaN(numLng) || numLat < 15.0 || numLat > 23.0 || numLng < 72.0 || numLng > 82.0) {
          return {
            success: false,
            error: 'Invalid coordinates: Coordinates must be within Maharashtra geographic bounds (Lat: 15°-23°N, Lng: 72°-82°E).'
          };
        }
      }
    }

    // Check duplicate
    const duplicates = await this.detectDuplicates({
      name,
      districtCode: marketData.districtCode,
      talukaCode: marketData.talukaCode,
      villageCode: marketData.villageCode,
      operatingDay: marketData.operatingDay
    });

    if (duplicates.length > 0 && !marketData.forceAllowDuplicate) {
      return {
        success: false,
        isDuplicateWarning: true,
        duplicates,
        error: `A similar market "${duplicates[0].name}" already exists in this taluka on ${marketData.operatingDay}. Please verify before saving.`
      };
    }

    // 2. Generate Permanent Stable Unique ID
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 15);
    const uniqueSuffix = Math.random().toString(36).substring(2, 6);
    const id = `mkt-${marketData.districtCode}-${marketData.talukaCode}-${slug}-${uniqueSuffix}`;

    const admin = adminAuthService.getCurrentAdmin();
    const now = new Date().toISOString();

    const record = {
      ...marketData,
      id,
      name,
      name_mr: marketData.name_mr || name,
      districtCode: Number(marketData.districtCode),
      talukaCode: Number(marketData.talukaCode),
      villageCode: marketData.villageCode ? Number(marketData.villageCode) : null,
      verificationStatus: marketData.verificationStatus || 'pending_verification',
      verifiedBy: marketData.verificationStatus === 'verified' ? admin?.name : null,
      verificationDate: marketData.verificationStatus === 'verified' ? now : null,
      createdByAdminId: admin?.userId || 'system',
      lastUpdated: now,
      createdAt: now
    };

    inMemoryMarketStore.set(id, record);

    try {
      if (db && db.bazaarMarkets) {
        await db.bazaarMarkets.put(record);
      }
    } catch (e) {
      console.warn('Failed to save market to Dexie', e);
    }

    await adminAuthService.logAudit({
      action: 'MARKET_CREATED',
      recordType: 'BAZAAR_MARKET',
      recordId: id,
      newValue: { name: record.name, district: record.district, verificationStatus: record.verificationStatus }
    });

    return {
      success: true,
      market: record,
      message: `Market record "${record.name}" created successfully (ID: ${id})`
    };
  }

  /**
   * Update an existing market record
   */
  async updateMarket(marketId, updates) {
    if (!adminAuthService.hasPermission('MANAGE_MARKETS')) {
      throw new Error('Access Denied: Only authorized administrators can edit market records.');
    }

    let existing = null;
    try {
      if (db && db.bazaarMarkets) {
        existing = await db.bazaarMarkets.get(marketId);
      }
    } catch (e) {}

    if (!existing) {
      existing = inMemoryMarketStore.get(marketId) || INITIAL_BAZAAR_MARKETS.find((m) => m.id === marketId);
    }

    if (!existing) {
      return { success: false, error: `Market with ID "${marketId}" not found.` };
    }

    // Validate coordinates if updated
    if (updates.coordinates) {
      const { lat, lng } = updates.coordinates;
      if (lat !== undefined && lng !== undefined && (lat !== 0 || lng !== 0)) {
        const numLat = Number(lat);
        const numLng = Number(lng);
        if (isNaN(numLat) || isNaN(numLng) || numLat < 15.0 || numLat > 23.0 || numLng < 72.0 || numLng > 82.0) {
          return {
            success: false,
            error: 'Invalid coordinates: Coordinates must be within Maharashtra geographic bounds (Lat: 15°-23°N, Lng: 72°-82°E).'
          };
        }
      }
    }

    const admin = adminAuthService.getCurrentAdmin();
    const now = new Date().toISOString();

    const updatedRecord = {
      ...existing,
      ...updates,
      id: marketId, // Ensure ID is immutable
      lastUpdated: now,
      lastUpdatedByAdminId: admin?.userId || 'system'
    };

    if (updates.verificationStatus === 'verified' && existing.verificationStatus !== 'verified') {
      updatedRecord.verifiedBy = admin?.name || 'Administrator';
      updatedRecord.verificationDate = now;
    }

    inMemoryMarketStore.set(marketId, updatedRecord);

    try {
      if (db && db.bazaarMarkets) {
        await db.bazaarMarkets.put(updatedRecord);
      }
    } catch (e) {}

    await adminAuthService.logAudit({
      action: 'MARKET_UPDATED',
      recordType: 'BAZAAR_MARKET',
      recordId: marketId,
      previousValue: { name: existing.name, status: existing.verificationStatus },
      newValue: { name: updatedRecord.name, status: updatedRecord.verificationStatus }
    });

    return {
      success: true,
      market: updatedRecord,
      message: `Market record "${updatedRecord.name}" updated successfully.`
    };
  }

  /**
   * Set verification status (e.g. Verify, Deactivate, Reject)
   */
  async setMarketStatus(marketId, newStatus, reason = '') {
    if (!adminAuthService.hasPermission('MANAGE_MARKETS')) {
      throw new Error('Access Denied: Only authorized administrators can change verification status.');
    }

    return await this.updateMarket(marketId, {
      verificationStatus: newStatus,
      statusChangeReason: reason
    });
  }

  /**
   * Entrepreneur Submissions Queue Management
   */
  async getSubmissions(status = 'all') {
    let submissions = [];
    try {
      if (db && db.marketSubmissions) {
        submissions = await db.marketSubmissions.toArray();
      }
    } catch (e) {}

    if (!submissions || submissions.length === 0) {
      submissions = Array.from(inMemorySubmissionsStore.values());
    }

    if (status !== 'all') {
      submissions = submissions.filter((s) => s.status === status);
    }

    return submissions.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }

  /**
   * Submit a new market suggestion by an Entrepreneur
   */
  async submitMarketSuggestion(submissionData) {
    const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const submissionRecord = {
      id: submissionId,
      ...submissionData,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    inMemorySubmissionsStore.set(submissionId, submissionRecord);

    try {
      if (db && db.marketSubmissions) {
        await db.marketSubmissions.put(submissionRecord);
      }
    } catch (e) {}

    return {
      success: true,
      submissionId,
      message: 'Market suggestion submitted successfully. It will be reviewed by the verification administration.'
    };
  }

  /**
   * Approve an entrepreneur submission
   */
  async approveSubmission(submissionId) {
    if (!adminAuthService.hasPermission('APPROVE_SUBMISSIONS')) {
      throw new Error('Access Denied: Only administrators can approve submissions.');
    }

    let submission = inMemorySubmissionsStore.get(submissionId) || null;
    try {
      if (db && db.marketSubmissions) {
        const fromDb = await db.marketSubmissions.get(submissionId);
        if (fromDb) submission = fromDb;
      }
    } catch (e) {}

    if (!submission) {
      return { success: false, error: 'Submission record not found.' };
    }

    // Create official market record from submission
    const marketResult = await this.addMarket({
      name: submission.name,
      name_mr: submission.name_mr || submission.name,
      district: submission.district,
      districtCode: submission.districtCode,
      taluka: submission.taluka,
      talukaCode: submission.talukaCode,
      village: submission.village,
      villageCode: submission.villageCode,
      marketType: submission.marketType || 'Weekly Bazaar (आठवडे बाजार)',
      operatingDay: submission.operatingDay,
      timings: submission.timings || '08:00 AM - 02:00 PM',
      stallFee: submission.stallFee || 0,
      productCategories: submission.productCategories || ['Vegetables', 'Fruits'],
      coordinates: submission.coordinates || null,
      dataSource: `Entrepreneur Field Submission (Verified from Ref #${submissionId})`,
      verificationStatus: 'verified',
      forceAllowDuplicate: true
    });

    if (!marketResult.success) {
      return marketResult;
    }

    // Update submission status to approved
    const admin = adminAuthService.getCurrentAdmin();
    const updatedSub = {
      ...submission,
      status: 'approved',
      approvedMarketId: marketResult.market.id,
      reviewedBy: admin?.name || 'Administrator',
      reviewedAt: new Date().toISOString()
    };

    inMemorySubmissionsStore.set(submissionId, updatedSub);

    try {
      if (db && db.marketSubmissions) {
        await db.marketSubmissions.put(updatedSub);
      }
    } catch (e) {}

    await adminAuthService.logAudit({
      action: 'SUBMISSION_APPROVED',
      recordType: 'MARKET_SUBMISSION',
      recordId: submissionId,
      newValue: { approvedMarketId: marketResult.market.id }
    });

    return {
      success: true,
      market: marketResult.market,
      message: `Submission approved and published as official market "${marketResult.market.name}"`
    };
  }

  /**
   * Reject an entrepreneur submission with reason
   */
  async rejectSubmission(submissionId, reason) {
    if (!adminAuthService.hasPermission('REJECT_SUBMISSIONS')) {
      throw new Error('Access Denied: Only administrators can reject submissions.');
    }

    if (!reason || !reason.trim()) {
      return { success: false, error: 'Rejection reason is required.' };
    }

    let submission = null;
    try {
      if (db && db.marketSubmissions) {
        submission = await db.marketSubmissions.get(submissionId);
      }
    } catch (e) {}

    if (!submission) {
      return { success: false, error: 'Submission record not found.' };
    }

    const admin = adminAuthService.getCurrentAdmin();
    const updatedSub = {
      ...submission,
      status: 'rejected',
      rejectionReason: reason.trim(),
      reviewedBy: admin?.name || 'Administrator',
      reviewedAt: new Date().toISOString()
    };

    try {
      if (db && db.marketSubmissions) {
        await db.marketSubmissions.put(updatedSub);
      }
    } catch (e) {}

    await adminAuthService.logAudit({
      action: 'SUBMISSION_REJECTED',
      recordType: 'MARKET_SUBMISSION',
      recordId: submissionId,
      newValue: { rejectionReason: reason.trim() }
    });

    return {
      success: true,
      message: 'Submission rejected and reason recorded for audit.'
    };
  }
}

export const marketManagementService = new MarketManagementService();
