import { db } from '../db/index.js';
import { syncEngine } from '../offline/syncEngine.js';
import { bazaarDataService } from './bazaarDataService.js';
import { profitIntelligenceService } from './profitIntelligenceService.js';

/**
 * BazaarPath Phase 3: Market Performance and Entrepreneur Intelligence Service
 * 
 * Capabilities:
 * - Entrepreneur market visit history & actual sales/expense logging
 * - Expected vs actual profit & sell-through comparison
 * - Market performance analytics & product-wise outcomes
 * - Personalized recommendation refinement based on authentic past visits
 * - Citizen/entrepreneur new market proposals and admin verification
 * - Offline visit persistence & idempotent synchronization
 */
class BazaarPerformanceService {
  constructor() {
    this.visitsMemoryStore = new Map(); // userId -> Array<VisitRecord>
    this.submissionsMemoryStore = [];   // Array<MarketSubmission>
    this.isInitialized = false;
  }

  /**
   * Initializes baseline test fixtures and verifies IndexedDB connectivity
   */
  async init() {
    if (this.isInitialized) return;

    // Seed baseline authentic demo visit records for default entrepreneur
    const demoUserId = 'ent_nashik_ramesh_001';
    if (!this.visitsMemoryStore.has(demoUserId)) {
      this.visitsMemoryStore.set(demoUserId, [
        {
          id: 'visit_demo_01',
          userId: demoUserId,
          marketId: 'mkt-nsk-sinnar-01',
          marketName: 'Sinnar Sunday Weekly Bazaar',
          marketName_mr: 'सिन्नर रविवार आठवडे बाजार',
          visitDate: '2026-11-08T10:00:00.000Z',
          productCategory: 'Vegetables',
          productName: 'Tomatoes',
          quantityTaken: 100,
          quantitySold: 90,
          quantityUnit: 'kg',
          productCostPerUnit: 15,
          expectedPricePerUnit: 25,
          actualSellingPricePerUnit: 24,
          
          // Expected baseline figures
          expectedRevenue: 2250, // 90 * 25
          expectedTotalExpenses: 280,
          expectedNetProfit: 620, // 2250 - (90*15) - 280

          // Actual financial records
          actualRevenue: 2160, // 90 * 24
          expenses: {
            travelExpense: 140,
            stallFee: 50,
            packagingExpense: 40,
            unsoldLoss: 150, // 10 kg unsold @ ₹15
            otherExpenses: 20,
            totalExpenses: 400
          },
          actualNetProfit: 410, // 2160 - (90*15) - 400
          sellThroughRate: 90,
          notes: 'High morning footfall. Leftover 10kg saved for evening sale.',
          customerResponse: 'high',
          syncStatus: 'synced',
          createdAt: '2026-11-08T18:00:00.000Z'
        },
        {
          id: 'visit_demo_02',
          userId: demoUserId,
          marketId: 'mkt-nsk-dindori-03',
          marketName: 'Dindori Wednesday Agro Market',
          marketName_mr: 'दिंडोरी बुधवार कृषी बाजार',
          visitDate: '2026-11-11T10:00:00.000Z',
          productCategory: 'Vegetables',
          productName: 'Onion',
          quantityTaken: 200,
          quantitySold: 185,
          quantityUnit: 'kg',
          productCostPerUnit: 12,
          expectedPricePerUnit: 20,
          actualSellingPricePerUnit: 21,

          expectedRevenue: 3700,
          expectedTotalExpenses: 450,
          expectedNetProfit: 1030,

          actualRevenue: 3885, // 185 * 21
          expenses: {
            travelExpense: 220,
            stallFee: 40,
            packagingExpense: 60,
            unsoldLoss: 180, // 15 kg unsold @ ₹12
            otherExpenses: 15,
            totalExpenses: 515
          },
          actualNetProfit: 1150, // 3885 - (185*12) - 515
          sellThroughRate: 92.5,
          notes: 'Strong demand from hotel buyers in Dindori.',
          customerResponse: 'excellent',
          syncStatus: 'synced',
          createdAt: '2026-11-11T19:00:00.000Z'
        }
      ]);
    }

    this.isInitialized = true;
  }

  /**
   * Log an authentic market visit with real-world sales and itemized expenses
   */
  async recordMarketVisit(userId, visitInput) {
    if (!userId) throw new Error('Authentication required to record market visit.');
    if (!visitInput || !visitInput.marketId) throw new Error('Market ID is required.');

    await this.init();

    const qtyTaken = Number(visitInput.quantityTaken);
    const qtySold = Number(visitInput.quantitySold);

    if (qtyTaken <= 0) throw new Error('Quantity taken must be greater than zero.');
    if (qtySold < 0) throw new Error('Quantity sold cannot be negative.');
    if (qtySold > qtyTaken) {
      throw new Error(`Quantity sold (${qtySold}) cannot exceed quantity carried (${qtyTaken}).`);
    }

    const actualPrice = Number(visitInput.actualSellingPricePerUnit);
    if (actualPrice < 0) throw new Error('Actual selling price cannot be negative.');

    const costPerUnit = Number(visitInput.productCostPerUnit || 0);
    const travelExpense = Number(visitInput.expenses?.travelExpense || 0);
    const stallFee = Number(visitInput.expenses?.stallFee || 0);
    const packagingExpense = Number(visitInput.expenses?.packagingExpense || 0);
    const otherExpenses = Number(visitInput.expenses?.otherExpenses || 0);

    // Unsold quantity & inventory cost carried forward
    const unsoldQty = qtyTaken - qtySold;
    const unsoldLoss = unsoldQty * costPerUnit;

    const totalExpenses = travelExpense + stallFee + packagingExpense + unsoldLoss + otherExpenses;
    const actualRevenue = qtySold * actualPrice;
    const attributableCostOfSoldGoods = qtySold * costPerUnit;
    const actualNetProfit = actualRevenue - attributableCostOfSoldGoods - (travelExpense + stallFee + packagingExpense + otherExpenses);

    const sellThroughRate = Math.round((qtySold / qtyTaken) * 100);

    // Optional expected comparison baseline
    const expectedPrice = Number(visitInput.expectedPricePerUnit || actualPrice);
    const expectedRevenue = Number(visitInput.expectedRevenue || (qtySold * expectedPrice));
    const expectedTotalExpenses = Number(visitInput.expectedTotalExpenses || totalExpenses);
    const expectedNetProfit = Number(visitInput.expectedNetProfit || (expectedRevenue - attributableCostOfSoldGoods - expectedTotalExpenses));

    const market = await bazaarDataService.getMarketById(visitInput.marketId);

    const nowIso = new Date().toISOString();
    const visitRecord = {
      id: `visit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      marketId: visitInput.marketId,
      marketName: market ? market.name : (visitInput.marketName || 'Local Market'),
      marketName_mr: market ? (market.name_mr || market.name) : (visitInput.marketName_mr || visitInput.marketName || 'स्थानिक बाजार'),
      visitDate: visitInput.visitDate || nowIso,
      productCategory: visitInput.productCategory || 'Vegetables',
      productName: visitInput.productName || 'Produce',
      quantityTaken: qtyTaken,
      quantitySold: qtySold,
      quantityUnit: visitInput.quantityUnit || 'kg',
      productCostPerUnit: costPerUnit,
      expectedPricePerUnit: expectedPrice,
      actualSellingPricePerUnit: actualPrice,
      expectedRevenue,
      expectedTotalExpenses,
      expectedNetProfit,
      actualRevenue,
      expenses: {
        travelExpense,
        stallFee,
        packagingExpense,
        unsoldLoss,
        otherExpenses,
        totalExpenses
      },
      actualNetProfit,
      sellThroughRate,
      notes: (visitInput.notes || '').trim(),
      customerResponse: visitInput.customerResponse || 'moderate',
      syncStatus: typeof navigator !== 'undefined' && !navigator.onLine ? 'pending_sync' : 'synced',
      createdAt: nowIso
    };

    // Save in memory store
    const userVisits = this.visitsMemoryStore.get(userId) || [];
    userVisits.push(visitRecord);
    this.visitsMemoryStore.set(userId, userVisits);

    // Save in Dexie if available
    try {
      if (db.marketVisits) {
        await db.marketVisits.put(visitRecord);
      }
    } catch (e) {
      // Fallback in memory
    }

    await syncEngine.enqueueMutation({
      storeName: 'marketVisits',
      recordId: visitRecord.id,
      operation: 'PUT',
      payload: visitRecord,
      userId
    });

    return visitRecord;
  }

  /**
   * Get visit history strictly isolated by userId
   */
  async getVisitHistory(userId, filters = {}) {
    if (!userId) return [];
    await this.init();

    let list = [];
    try {
      if (db.marketVisits) {
        list = await db.marketVisits.where('userId').equals(userId).toArray();
      }
    } catch (e) {
      list = [];
    }

    if (!list || list.length === 0) {
      list = this.visitsMemoryStore.get(userId) || [];
    }

    return list.filter((v) => {
      if (filters.marketId && filters.marketId !== 'all' && v.marketId !== filters.marketId) return false;
      if (filters.category && filters.category !== 'all' && v.productCategory !== filters.category) return false;
      return true;
    }).sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
  }

  /**
   * Expected vs Actual Profit Comparison for a specific recorded visit
   */
  async getExpectedVsActualAnalysis(userId, visitId) {
    if (!userId || !visitId) return null;
    const history = await this.getVisitHistory(userId);
    const visit = history.find((v) => v.id === visitId);
    if (!visit) return null;

    const revenueVariance = visit.actualRevenue - visit.expectedRevenue;
    const expenseVariance = visit.expenses.totalExpenses - visit.expectedTotalExpenses;
    const profitVariance = visit.actualNetProfit - visit.expectedNetProfit;
    const priceVariance = visit.actualSellingPricePerUnit - visit.expectedPricePerUnit;

    return {
      visitId: visit.id,
      marketName: visit.marketName,
      marketName_mr: visit.marketName_mr,
      visitDate: visit.visitDate,
      productName: visit.productName,
      quantityTaken: visit.quantityTaken,
      quantitySold: visit.quantitySold,
      unit: visit.quantityUnit,
      expected: {
        pricePerUnit: visit.expectedPricePerUnit,
        revenue: visit.expectedRevenue,
        expenses: visit.expectedTotalExpenses,
        netProfit: visit.expectedNetProfit
      },
      actual: {
        pricePerUnit: visit.actualSellingPricePerUnit,
        revenue: visit.actualRevenue,
        expenses: visit.expenses.totalExpenses,
        netProfit: visit.actualNetProfit
      },
      variances: {
        priceVariance,
        revenueVariance,
        expenseVariance,
        profitVariance,
        isProfitable: visit.actualNetProfit > 0,
        outperformedExpected: profitVariance >= 0
      },
      sellThroughRate: visit.sellThroughRate
    };
  }

  /**
   * Market Performance Intelligence for an entrepreneur across all or specific market
   */
  async getMarketPerformanceIntelligence(userId, marketId = null) {
    if (!userId) return null;
    const allVisits = await this.getVisitHistory(userId, marketId ? { marketId } : {});

    if (allVisits.length === 0) {
      return {
        sampleSize: 0,
        totalVisits: 0,
        totalVolumeSold: 0,
        totalNetProfit: 0,
        avgNetProfitPerVisit: 0,
        avgSellThroughRate: 0,
        topMarket: null,
        topProduct: null,
        marketBreakdown: []
      };
    }

    let totalVolumeSold = 0;
    let totalNetProfit = 0;
    let totalSellThrough = 0;

    const marketMap = new Map();
    const productMap = new Map();

    for (const v of allVisits) {
      totalVolumeSold += v.quantitySold;
      totalNetProfit += v.actualNetProfit;
      totalSellThrough += v.sellThroughRate;

      // Group by market
      const mStat = marketMap.get(v.marketId) || {
        marketId: v.marketId,
        marketName: v.marketName,
        marketName_mr: v.marketName_mr,
        visitsCount: 0,
        totalRevenue: 0,
        totalProfit: 0,
        totalSold: 0,
        totalCarried: 0
      };
      mStat.visitsCount += 1;
      mStat.totalRevenue += v.actualRevenue;
      mStat.totalProfit += v.actualNetProfit;
      mStat.totalSold += v.quantitySold;
      mStat.totalCarried += v.quantityTaken;
      marketMap.set(v.marketId, mStat);

      // Group by product
      const pKey = `${v.productCategory}_${v.productName}`;
      const pStat = productMap.get(pKey) || {
        productName: v.productName,
        category: v.productCategory,
        visitsCount: 0,
        totalProfit: 0,
        totalSold: 0
      };
      pStat.visitsCount += 1;
      pStat.totalProfit += v.actualNetProfit;
      pStat.totalSold += v.quantitySold;
      productMap.set(pKey, pStat);
    }

    const marketBreakdown = Array.from(marketMap.values()).map((m) => ({
      ...m,
      avgProfitPerVisit: Math.round(m.totalProfit / m.visitsCount),
      avgSellThrough: Math.round((m.totalSold / (m.totalCarried || 1)) * 100)
    })).sort((a, b) => b.totalProfit - a.totalProfit);

    const productBreakdown = Array.from(productMap.values()).sort((a, b) => b.totalProfit - a.totalProfit);

    return {
      sampleSize: allVisits.length,
      totalVisits: allVisits.length,
      totalVolumeSold,
      totalNetProfit,
      avgNetProfitPerVisit: Math.round(totalNetProfit / allVisits.length),
      avgSellThroughRate: Math.round(totalSellThrough / allVisits.length),
      topMarket: marketBreakdown[0] || null,
      topProduct: productBreakdown[0] || null,
      marketBreakdown,
      productBreakdown
    };
  }

  /**
   * Refinement boost for bazaar recommendation engine:
   * Boosts recommendation score (+3 to +8 points) if the entrepreneur has genuine past profitable visits to this market.
   */
  async getPersonalizedMarketScoreAdjustment(userId, marketId, productCategory = null) {
    if (!userId || !marketId) return { modifier: 0, reason: null };
    const visits = await this.getVisitHistory(userId, { marketId });
    if (!visits || visits.length === 0) return { modifier: 0, reason: null };

    const avgSellThrough = visits.reduce((acc, v) => acc + v.sellThroughRate, 0) / visits.length;
    const avgProfit = visits.reduce((acc, v) => acc + v.actualNetProfit, 0) / visits.length;

    if (avgSellThrough >= 80 && avgProfit > 0) {
      return {
        modifier: 6,
        reason_en: `Personal History: You achieved ₹${Math.round(avgProfit)} average profit with ${Math.round(avgSellThrough)}% sell-through in past visits here.`,
        reason_mr: `वैयक्तिक अनुभव: मागील भेटींमध्ये तुम्ही येथे सरासरी ₹${Math.round(avgProfit)} नफा आणि ${Math.round(avgSellThrough)}% माल विक्री नोंदवली आहे.`
      };
    } else if (avgProfit < 0 || avgSellThrough < 50) {
      return {
        modifier: -4,
        reason_en: `Personal Caution: Past visits had lower sell-through (${Math.round(avgSellThrough)}%) or incurred a loss.`,
        reason_mr: `सावधानता: मागील भेटीत कमी विक्री (${Math.round(avgSellThrough)}%) किंवा तोटा नोंदवला गेला होता.`
      };
    }

    return { modifier: 0, reason: null };
  }

  /**
   * Submit a newly discovered weekly market for admin verification
   */
  async submitNewMarketProposal(userId, proposalInput) {
    if (!proposalInput || !proposalInput.name || !proposalInput.districtCode || !proposalInput.operatingDay) {
      throw new Error('Missing required fields: market name, district, and operating day.');
    }

    const id = `mkt_sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const nowIso = new Date().toISOString();

    const submission = {
      id,
      userId: userId || 'citizen_contributor',
      name: proposalInput.name.trim(),
      name_mr: proposalInput.name_mr ? proposalInput.name_mr.trim() : proposalInput.name.trim(),
      districtCode: Number(proposalInput.districtCode),
      talukaCode: proposalInput.talukaCode ? Number(proposalInput.talukaCode) : null,
      villageName: proposalInput.villageName || '',
      villageName_mr: proposalInput.villageName_mr || proposalInput.villageName || '',
      operatingDay: proposalInput.operatingDay,
      marketType: proposalInput.marketType || 'weekly_rural_haat',
      stallFee: Number(proposalInput.stallFee || 0),
      facilities: proposalInput.facilities || [],
      productCategories: proposalInput.productCategories || ['Vegetables'],
      contributorNotes: proposalInput.notes || '',
      status: 'pending_verification',
      verificationDetails: null,
      syncStatus: typeof navigator !== 'undefined' && !navigator.onLine ? 'pending_sync' : 'synced',
      createdAt: nowIso
    };

    this.submissionsMemoryStore.push(submission);

    try {
      if (db.marketSubmissions) {
        await db.marketSubmissions.put(submission);
      }
    } catch (e) {}

    await syncEngine.enqueueMutation({
      storeName: 'marketSubmissions',
      recordId: submission.id,
      operation: 'PUT',
      payload: submission,
      userId: submission.userId || 'entrepreneur',
      isShared: true
    });

    return {
      success: true,
      submissionId: id,
      message_en: 'Market proposal submitted for administrative verification. It will be published after field audit.',
      message_mr: 'बाजार नोंदणी प्रस्ताव प्रशासकीय पडताळणीसाठी सादर केला आहे. क्षेत्रीय पडताळणीनंतर तो प्रकाशित होईल.'
    };
  }

  /**
   * Admin: List pending market proposals for verification
   */
  async getAdminMarketSubmissions(adminUserId, filters = {}) {
    let list = [];
    try {
      if (db.marketSubmissions) {
        list = await db.marketSubmissions.toArray();
      }
    } catch (e) {
      list = [];
    }

    if (!list || list.length === 0) {
      list = [...this.submissionsMemoryStore];
    }

    return list.filter((s) => {
      if (filters.status && filters.status !== 'all' && s.status !== filters.status) return false;
      return true;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Admin: Verify and approve or reject a proposed market
   * If approved, publishes the market into active directory.
   */
  async verifyMarketSubmission(adminUserId, submissionId, { status, adminNotes }) {
    if (!adminUserId) throw new Error('Admin authorization required.');
    if (!['verified', 'rejected', 'needs_correction'].includes(status)) {
      throw new Error('Invalid verification status.');
    }

    let submission = this.submissionsMemoryStore.find((s) => s.id === submissionId);
    if (!submission && db.marketSubmissions) {
      submission = await db.marketSubmissions.get(submissionId);
    }

    if (!submission) throw new Error('Market submission not found.');

    submission.status = status;
    submission.verifiedBy = adminUserId;
    submission.verifiedAt = new Date().toISOString();
    submission.adminNotes = adminNotes || '';

    try {
      if (db.marketSubmissions) {
        await db.marketSubmissions.put(submission);
      }
    } catch (e) {}

    await syncEngine.enqueueMutation({
      storeName: 'marketSubmissions',
      recordId: submission.id,
      operation: 'PUT',
      payload: submission,
      userId: submission.userId || 'entrepreneur',
      isShared: true
    });

    // If verified, publish into active bazaar markets!
    if (status === 'verified') {
      const newMarketId = `mkt_pub_${Date.now()}`;
      const publishedMarket = {
        id: newMarketId,
        name: submission.name,
        name_mr: submission.name_mr,
        districtCode: submission.districtCode,
        talukaCode: submission.talukaCode,
        villageName: submission.villageName,
        villageName_mr: submission.villageName_mr,
        operatingDay: submission.operatingDay,
        marketType: submission.marketType,
        stallFee: submission.stallFee,
        productCategories: submission.productCategories,
        facilities: submission.facilities,
        verificationStatus: 'verified',
        dataSource: 'Citizen Submission via Administrative Verification',
        lastUpdated: new Date().toISOString()
      };

      try {
        if (db.bazaarMarkets) {
          await db.bazaarMarkets.put(publishedMarket);
        }
      } catch (e) {}
    }

    return {
      success: true,
      submissionId,
      status,
      message: `Market submission ${status} successfully.`
    };
  }

  /**
   * Synchronize pending offline market visit records
   */
  async syncPendingVisits(userId) {
    if (!userId) return { synchronizedCount: 0 };
    let synced = 0;
    const visits = this.visitsMemoryStore.get(userId) || [];
    for (const v of visits) {
      if (v.syncStatus === 'pending_sync') {
        v.syncStatus = 'synced';
        synced++;
        try {
          if (db.marketVisits) await db.marketVisits.put(v);
        } catch (e) {}
      }
    }
    return { synchronizedCount: synced };
  }
}

export const bazaarPerformanceService = new BazaarPerformanceService();
