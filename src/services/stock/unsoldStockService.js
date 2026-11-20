/**
 * MahaUdyam — Unsold Stock Rescue Service
 * Phase 1: Unsold Stock Management and Recovery Foundation
 * 
 * Provides:
 * - Private Stock Registration & Multi-Tenant Isolation
 * - Strict Perishability & Food Safety Verification
 * - Transparent Recovery Cost Calculator with Attributable Inventory Cost
 * - Status Lifecycle Tracking with Complete Audit History
 * - Offline-First Dexie Persistence & Mutation Synchronization
 */

import { db } from '../db/index.js';
import { syncEngine } from '../offline/syncEngine.js';
import {
  STOCK_CATEGORIES,
  STOCK_STATUSES,
  PERISHABILITY_LEVELS,
  PRODUCT_CONDITIONS,
  RECOVERY_CHANNELS,
  ENQUIRY_STATUSES,
  DELIVERY_TERMS,
  TRANSACTION_COMPLETION_STATUSES,
  PAYMENT_STATUSES
} from '../../data/stock/stockConstants.js';
import { INITIAL_UNSOLD_STOCKS } from '../../data/stock/initialUnsoldStock.js';
import { StockMatchingEngine } from './stockMatchingEngine.js';
import { VERIFIED_LOCAL_SUPPLIERS } from '../../data/suppliers/verifiedSuppliers.js';
import { INITIAL_BAZAAR_MARKETS } from '../../data/bazaar/initialMarkets.js';

class UnsoldStockService {
  constructor() {
    this.memoryStore = new Map();
    this.recommendationsMemoryStore = new Map();
    this.actionsMemoryStore = new Map();
    this.enquiriesMemoryStore = new Map();
    this.transactionsMemoryStore = new Map();
    this.isInitialized = false;
  }

  /**
   * Initializes Dexie unsoldStock store from baseline fixtures if empty
   */
  async initStockDatabase() {
    if (this.isInitialized) return;

    // 1. Seed in-memory store first for instant access in all environments
    for (const item of INITIAL_UNSOLD_STOCKS) {
      this.memoryStore.set(item.id, { ...item });
    }

    try {
      if (typeof indexedDB === 'undefined' && typeof window === 'undefined') {
        this.isInitialized = true;
        return;
      }

      if (!db.unsoldStock) return;
      const count = await db.unsoldStock.count();
      if (count === 0) {
        for (const item of INITIAL_UNSOLD_STOCKS) {
          await db.unsoldStock.put({ ...item });
        }
      }
      this.isInitialized = true;
    } catch (err) {
      this.isInitialized = true;
    }
  }

  /**
   * Evaluates Food Safety & Perishability Rules
   * IMPORTANT: Never recommend selling or consuming expired or damaged food!
   */
  evaluateFoodSafety(stockData) {
    const isPerishable = stockData.perishability === PERISHABILITY_LEVELS.PERISHABLE;
    const isSemiPerishable = stockData.perishability === PERISHABILITY_LEVELS.SEMI_PERISHABLE;
    const isDamaged = stockData.condition === PRODUCT_CONDITIONS.DAMAGED;
    const remainingHours = stockData.remainingShelfLifeHours;

    const isFoodCategory = [
      STOCK_CATEGORIES.VEGETABLES_FRUITS,
      STOCK_CATEGORIES.DAIRY,
      STOCK_CATEGORIES.PROCESSED_FOOD,
      STOCK_CATEGORIES.AGRICULTURAL_PRODUCE,
      STOCK_CATEGORIES.GRAINS_PULSES
    ].includes(stockData.category);

    // Rule 1: Damaged or zero shelf-life food is strictly unsafe for human consumption
    if (isFoodCategory && (isDamaged || (remainingHours != null && remainingHours <= 0))) {
      return {
        isSafe: false,
        isPerishable: true,
        urgency: 'critical_danger',
        safetyWarning: 'WARNING: This product is expired or damaged. Do NOT sell, process, donate or redistribute food that may be unsafe for consumption.',
        safetyWarning_mr: 'सावधान: हा शेतमाल/अन्नपदार्थ खराब किंवा कालबाह्य झाला आहे. मानवी खाण्यासाठी असुरक्षित असलेला माल विकू नका, प्रक्रिया करू नका किंवा वाटप करू नका.',
        storageGuidance: 'Isolate from good stock to prevent cross-contamination. Direct to non-food composting or safe disposal.',
        recommendedStatus: STOCK_STATUSES.EXPIRED_DAMAGED
      };
    }

    // Rule 2: Perishable with under 24 hours shelf life
    if (isPerishable && remainingHours != null && remainingHours <= 24) {
      return {
        isSafe: true,
        isPerishable: true,
        urgency: 'urgent_action',
        safetyWarning: 'URGENT: Perishable stock with under 24 hours shelf life remaining. Immediate cold storage or rapid processing required.',
        safetyWarning_mr: 'तातडीची सूचना: नाशवंत मालाची मुदत २४ तासांपेक्षा कमी उरली आहे. तात्काळ शीतगृह किंवा प्रक्रिया केंद्राशी संपर्क साधा.',
        storageGuidance: 'Keep in cold storage or cool shaded ventilated crates. Avoid direct sunlight.',
        recommendedStatus: STOCK_STATUSES.AVAILABLE_FOR_RECOVERY
      };
    }

    // Rule 3: Semi-perishable or good condition perishable
    if (isPerishable || isSemiPerishable) {
      return {
        isSafe: true,
        isPerishable: true,
        urgency: 'normal_priority',
        safetyWarning: null,
        storageGuidance: 'Store in dry, shaded, and well-ventilated storage. Monitor daily for spoilage.',
        recommendedStatus: stockData.status || STOCK_STATUSES.AVAILABLE_FOR_RECOVERY
      };
    }

    // Rule 4: Non-perishable goods (textiles, handicrafts, etc.)
    return {
      isSafe: true,
      isPerishable: false,
      urgency: 'stable',
      safetyWarning: null,
      storageGuidance: 'Store in dry godown protected from moisture and pests.',
      recommendedStatus: stockData.status || STOCK_STATUSES.AVAILABLE_FOR_RECOVERY
    };
  }

  /**
   * Transparent Recovery Cost & Revenue Calculator
   * Strictly adheres to Section 6 formula specifications
   */
  calculateRecoveryCosts(stockData, recoveryInput = {}) {
    if (!stockData) return null;

    const availableQty = Number(stockData.availableQuantity) || 0;
    const origQty = stockData.originalQuantity != null ? Number(stockData.originalQuantity) : null;
    const origTotalCost = stockData.originalTotalCost != null ? Number(stockData.originalTotalCost) : null;

    // 1. Original Inventory Cost Per Unit (Original Total Cost / Original Quantity)
    let originalCostPerUnit = null;
    if (origTotalCost != null && origQty && origQty > 0) {
      originalCostPerUnit = origTotalCost / origQty;
    }

    // 2. Quantity expected to be sold/recovered (default to all available or user specified)
    const expectedQuantitySold = Math.min(
      availableQty,
      Math.max(0, Number(recoveryInput.expectedQuantitySold ?? availableQty))
    );

    // 3. Expected Recovery Selling Price
    const expectedRecoveryPricePerUnit = Number(
      recoveryInput.expectedRecoveryPricePerUnit ??
      stockData.expectedRecoveryPricePerUnit ??
      0
    );

    // 4. Potential Recovery Revenue (Price × Quantity Sold)
    const potentialRecoveryRevenue = expectedRecoveryPricePerUnit * expectedQuantitySold;

    // 5. Additional Recovery Expenses Itemization
    const expenses = recoveryInput.expenses || {};
    const transportation = Math.max(0, Number(expenses.transportation || 0));
    const packaging = Math.max(0, Number(expenses.packaging || 0));
    const processing = Math.max(0, Number(expenses.processing || 0));
    const storage = Math.max(0, Number(expenses.storage || 0));
    const handling = Math.max(0, Number(expenses.handling || 0));
    const other = Math.max(0, Number(expenses.other || 0));

    const totalAdditionalExpenses = transportation + packaging + processing + storage + handling + other;

    // 6. Net Recovery Value (Revenue − Additional Recovery Expenses)
    const netRecoveryValue = potentialRecoveryRevenue - totalAdditionalExpenses;

    // 7. Attributable Original Inventory Cost for Partial/Full Quantity
    let attributableInventoryCost = null;
    let netRecoveryVsAttributableCost = null;

    if (originalCostPerUnit != null) {
      attributableInventoryCost = originalCostPerUnit * expectedQuantitySold;
      // Formula: Recovery revenue − Additional recovery expenses − Attributable inventory cost
      netRecoveryVsAttributableCost = netRecoveryValue - attributableInventoryCost;
    }

    // 8. Potential Unrecovered Inventory Value (Remaining Qty × Unit Cost)
    const remainingQuantity = Math.max(0, availableQty - expectedQuantitySold);
    let unrecoveredInventoryValue = null;
    if (originalCostPerUnit != null) {
      unrecoveredInventoryValue = originalCostPerUnit * remainingQuantity;
    }

    return {
      availableQuantity: availableQty,
      expectedQuantitySold,
      remainingQuantity,
      unit: stockData.unit,

      // Financials
      originalCostPerUnit,
      isOriginalCostKnown: originalCostPerUnit != null,
      originalTotalCost: origTotalCost,

      expectedRecoveryPricePerUnit,
      potentialRecoveryRevenue,

      // Expenses breakdown
      expenses: {
        transportation,
        packaging,
        processing,
        storage,
        handling,
        other,
        totalAdditionalExpenses
      },

      netRecoveryValue,
      attributableInventoryCost,
      netRecoveryVsAttributableCost,
      unrecoveredInventoryValue,

      // Percentage of value recovered compared to original purchase cost
      recoveryEfficiencyPercentage: attributableInventoryCost && attributableInventoryCost > 0
        ? Math.round((netRecoveryValue / attributableInventoryCost) * 100)
        : null
    };
  }

  /**
   * Register a new unsold stock item
   * Strictly associates with the authenticated entrepreneur (userId)
   */
  async registerStock(userId, inputData) {
    if (!userId) {
      throw new Error('User authentication required to register unsold stock.');
    }

    if (!inputData.productName || !inputData.productName.trim()) {
      throw new Error('Product name is required.');
    }

    if (!inputData.availableQuantity || Number(inputData.availableQuantity) <= 0) {
      throw new Error('Valid available quantity greater than 0 is required.');
    }

    await this.initStockDatabase();

    const stockId = `stock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const availableQty = Number(inputData.availableQuantity);
    const origQty = inputData.originalQuantity ? Number(inputData.originalQuantity) : availableQty;
    const origTotalCost = inputData.originalTotalCost ? Number(inputData.originalTotalCost) : null;

    const initialStatus = inputData.status || STOCK_STATUSES.NEWLY_REGISTERED;

    const newRecord = {
      id: stockId,
      userId, // Guard: Permanent tenant ownership
      productName: inputData.productName.trim(),
      productName_mr: inputData.productName_mr ? inputData.productName_mr.trim() : inputData.productName.trim(),
      category: inputData.category || STOCK_CATEGORIES.VEGETABLES_FRUITS,
      availableQuantity: availableQty,
      unit: inputData.unit || 'kg',
      condition: inputData.condition || PRODUCT_CONDITIONS.GOOD,
      perishability: inputData.perishability || PERISHABILITY_LEVELS.PERISHABLE,
      remainingShelfLifeHours: inputData.remainingShelfLifeHours != null ? Number(inputData.remainingShelfLifeHours) : null,
      expiryDate: inputData.expiryDate || null,

      // Financials (can be genuinely unknown)
      originalQuantity: origQty,
      originalTotalCost: origTotalCost,
      originalSellingPricePerUnit: inputData.originalSellingPricePerUnit ? Number(inputData.originalSellingPricePerUnit) : null,
      expectedRecoveryPricePerUnit: inputData.expectedRecoveryPricePerUnit ? Number(inputData.expectedRecoveryPricePerUnit) : null,
      financialsEstimated: inputData.financialsEstimated || origTotalCost == null,

      // Location
      districtCode: inputData.districtCode ? Number(inputData.districtCode) : 490,
      districtName: inputData.districtName || 'Nashik',
      districtName_mr: inputData.districtName_mr || 'नाशिक',
      talukaCode: inputData.talukaCode ? Number(inputData.talukaCode) : 4154,
      talukaName: inputData.talukaName || 'Sinnar',
      talukaName_mr: inputData.talukaName_mr || 'सिन्नर',
      villageCode: inputData.villageCode ? Number(inputData.villageCode) : 551322,
      villageName: inputData.villageName || 'Baragaon Pimpri',
      villageName_mr: inputData.villageName_mr || 'बारागाव पिंप्री',
      coordinates: inputData.coordinates || null,

      // Additional Details
      storageCondition: inputData.storageCondition || 'shaded_ventilated',
      packagingCondition: inputData.packagingCondition || 'plastic_crate',
      photoUrl: inputData.photoUrl || null,
      notes: inputData.notes || '',
      selectedRecoveryChannels: inputData.selectedRecoveryChannels || [],

      status: initialStatus,
      statusHistory: [
        {
          status: initialStatus,
          timestamp: nowIso,
          notes: inputData.initialNotes || 'Stock registered in MahaUdyam.'
        }
      ],

      registeredDate: nowIso,
      updatedAt: nowIso,
      syncStatus: (typeof navigator !== 'undefined' && !navigator.onLine) ? 'pending_sync' : 'synced'
    };

    // Save in memory
    this.memoryStore.set(stockId, newRecord);

    // Save in Dexie
    try {
      if (db.unsoldStock) {
        await db.unsoldStock.put(newRecord);
      }
    } catch (e) {
      // Memory fallback
    }

    // Enqueue centralized synchronization mutation
    await syncEngine.enqueueMutation({
      storeName: 'unsoldStock',
      recordId: stockId,
      operation: 'PUT',
      payload: newRecord,
      userId,
      isShared: true
    });

    return newRecord;
  }

  /**
   * Retrieves all stock records for a specific entrepreneur with strict isolation
   */
  async getStocksForUser(userId, filters = {}) {
    if (!userId) return [];

    await this.initStockDatabase();

    let allUserStocks = [];

    try {
      if (db.unsoldStock) {
        allUserStocks = await db.unsoldStock.where('userId').equals(userId).toArray();
      }
    } catch (e) {
      allUserStocks = [];
    }

    // Fallback to memory store if Dexie returns empty or in headless test environment
    if (!allUserStocks || allUserStocks.length === 0) {
      allUserStocks = Array.from(this.memoryStore.values()).filter((item) => item.userId === userId);
    }

    // Apply Filters
    return allUserStocks.filter((stock) => {
      // Category filter
      if (filters.category && filters.category !== 'all' && stock.category !== filters.category) {
        return false;
      }

      // Status filter
      if (filters.status && filters.status !== 'all' && stock.status !== filters.status) {
        return false;
      }

      // Perishability filter
      if (filters.perishability && filters.perishability !== 'all' && stock.perishability !== filters.perishability) {
        return false;
      }

      // Search keyword filter
      if (filters.search && filters.search.trim()) {
        const query = filters.search.toLowerCase().trim();
        const nameMatch = stock.productName?.toLowerCase().includes(query);
        const nameMrMatch = stock.productName_mr?.toLowerCase().includes(query);
        const villageMatch = stock.villageName?.toLowerCase().includes(query);
        return nameMatch || nameMrMatch || villageMatch;
      }

      return true;
    }).sort((a, b) => new Date(b.registeredDate) - new Date(a.registeredDate));
  }

  /**
   * Get single stock record by ID with strict privacy ownership guard
   */
  async getStockById(userId, stockId) {
    if (!userId || !stockId) return null;

    await this.initStockDatabase();

    let record = null;
    try {
      if (db.unsoldStock) {
        record = await db.unsoldStock.get(stockId);
      }
    } catch (e) {}

    if (!record) {
      record = this.memoryStore.get(stockId);
    }

    // Strict Privacy Guard: User A cannot read User B's record
    if (record && record.userId !== userId && userId !== 'admin') {
      throw new Error('Access denied: You do not have permission to view this inventory record.');
    }

    return record || null;
  }

  /**
   * Update stock status and append to history timeline
   */
  async updateStockStatus(userId, stockId, newStatus, statusNotes = '') {
    const existing = await this.getStockById(userId, stockId);
    if (!existing) throw new Error('Stock record not found or access denied.');

    // Validate Status
    if (!Object.values(STOCK_STATUSES).includes(newStatus)) {
      throw new Error(`Invalid stock status: ${newStatus}`);
    }

    // Food Safety Guard: If damaged, cannot be set back to available for recovery for food
    const safety = this.evaluateFoodSafety(existing);
    if (!safety.isSafe && newStatus === STOCK_STATUSES.AVAILABLE_FOR_RECOVERY) {
      throw new Error('Food Safety Guard: Expired or spoiled food cannot be made available for sale or redistribution.');
    }

    const nowIso = new Date().toISOString();
    const updatedHistory = [
      ...(existing.statusHistory || []),
      {
        status: newStatus,
        timestamp: nowIso,
        notes: statusNotes || `Status updated to ${newStatus}`
      }
    ];

    const updatedRecord = {
      ...existing,
      status: newStatus,
      statusHistory: updatedHistory,
      updatedAt: nowIso,
      syncStatus: (typeof navigator !== 'undefined' && !navigator.onLine) ? 'pending_sync' : 'synced'
    };

    this.memoryStore.set(stockId, updatedRecord);

    try {
      if (db.unsoldStock) {
        await db.unsoldStock.put(updatedRecord);
      }
    } catch (e) {}

    // Record recovery log entry
    try {
      if (db.recoveryLogs) {
        await db.recoveryLogs.put({
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          stockId,
          userId,
          actionType: 'STATUS_CHANGE',
          details: { oldStatus: existing.status, newStatus, notes: statusNotes },
          timestamp: nowIso,
          syncStatus: 'synced'
        });
      }
    } catch (e) {}

    return updatedRecord;
  }

  /**
   * Update full stock record details
   */
  async updateStock(userId, stockId, updates = {}) {
    const existing = await this.getStockById(userId, stockId);
    if (!existing) throw new Error('Stock record not found or access denied.');

    const nowIso = new Date().toISOString();

    const updatedRecord = {
      ...existing,
      ...updates,
      id: stockId,
      userId, // Security: Never mutate ownership
      updatedAt: nowIso
    };

    this.memoryStore.set(stockId, updatedRecord);

    try {
      if (db.unsoldStock) {
        await db.unsoldStock.put(updatedRecord);
      }
    } catch (e) {}

    return updatedRecord;
  }

  /**
   * Delete an unsold stock record
   */
  async deleteStock(userId, stockId) {
    const existing = await this.getStockById(userId, stockId);
    if (!existing) throw new Error('Stock record not found or access denied.');

    this.memoryStore.delete(stockId);

    try {
      if (db.unsoldStock) {
        await db.unsoldStock.delete(stockId);
      }
    } catch (e) {}

    return { success: true, deletedId: stockId };
  }

  /**
   * Aggregates personal entrepreneur dashboard metrics
   * Returns clean 0s for new users — NO fabricated figures!
   */
  async getDashboardSummary(userId) {
    const userStocks = await this.getStocksForUser(userId);

    if (!userStocks || userStocks.length === 0) {
      return {
        totalStocksCount: 0,
        awaitingRecoveryCount: 0,
        underRecoveryCount: 0,
        partiallyRecoveredCount: 0,
        fullyRecoveredCount: 0,
        expiredDamagedCount: 0,
        potentialRecoveryValueSum: 0,
        urgentPerishableCount: 0
      };
    }

    let awaitingRecoveryCount = 0;
    let underRecoveryCount = 0;
    let partiallyRecoveredCount = 0;
    let fullyRecoveredCount = 0;
    let expiredDamagedCount = 0;
    let potentialRecoveryValueSum = 0;
    let urgentPerishableCount = 0;

    for (const stock of userStocks) {
      // Status breakdown
      if (stock.status === STOCK_STATUSES.NEWLY_REGISTERED || stock.status === STOCK_STATUSES.AVAILABLE_FOR_RECOVERY) {
        awaitingRecoveryCount++;
      } else if (stock.status === STOCK_STATUSES.RECOVERY_IN_PROGRESS) {
        underRecoveryCount++;
      } else if (stock.status === STOCK_STATUSES.PARTIALLY_RECOVERED) {
        partiallyRecoveredCount++;
      } else if (stock.status === STOCK_STATUSES.FULLY_RECOVERED) {
        fullyRecoveredCount++;
      } else if (stock.status === STOCK_STATUSES.EXPIRED_DAMAGED || stock.status === STOCK_STATUSES.DISPOSED) {
        expiredDamagedCount++;
      }

      // Potential Recovery Value
      if (stock.expectedRecoveryPricePerUnit && stock.availableQuantity && stock.status !== STOCK_STATUSES.EXPIRED_DAMAGED && stock.status !== STOCK_STATUSES.DISPOSED) {
        potentialRecoveryValueSum += (Number(stock.expectedRecoveryPricePerUnit) * Number(stock.availableQuantity));
      }

      // Urgency
      const safety = this.evaluateFoodSafety(stock);
      if (safety.urgency === 'urgent_action' || safety.urgency === 'critical_danger') {
        urgentPerishableCount++;
      }
    }

    return {
      totalStocksCount: userStocks.length,
      awaitingRecoveryCount,
      underRecoveryCount,
      partiallyRecoveredCount,
      fullyRecoveredCount,
      expiredDamagedCount,
      potentialRecoveryValueSum: Math.round(potentialRecoveryValueSum),
      urgentPerishableCount
    };
  }

  /**
   * Phase 2: Gets smart recovery recommendations for an unsold stock record
   * Private to the logged-in entrepreneur (userId guard)
   */
  async getRecommendationsForStock(userId, stockId, forceRefresh = false) {
    if (!userId || !stockId) return null;

    const stock = await this.getStockById(userId, stockId);
    if (!stock) throw new Error('Stock record not found or access denied.');

    const cacheKey = `${stockId}_rec`;

    // 1. Check cache unless forceRefresh is true
    if (!forceRefresh) {
      if (this.recommendationsMemoryStore.has(cacheKey)) {
        return this.recommendationsMemoryStore.get(cacheKey);
      }

      try {
        if (db.stockRecommendations) {
          const cached = await db.stockRecommendations.get(cacheKey);
          if (cached && (cached.userId === userId || userId === 'admin')) {
            this.recommendationsMemoryStore.set(cacheKey, cached);
            return cached;
          }
        }
      } catch (e) {}
    }

    // 2. Evaluate through StockMatchingEngine
    const evaluation = StockMatchingEngine.evaluateAllChannels(stock);

    const recRecord = {
      id: cacheKey,
      stockId,
      userId,
      generatedAt: new Date().toISOString(),
      foodSafetySummary: evaluation.foodSafetySummary,
      channels: evaluation.channels,
      syncStatus: (typeof navigator !== 'undefined' && !navigator.onLine) ? 'pending_sync' : 'synced'
    };

    // 3. Cache in memory and Dexie
    this.recommendationsMemoryStore.set(cacheKey, recRecord);

    try {
      if (db.stockRecommendations) {
        await db.stockRecommendations.put(recRecord);
      }
    } catch (e) {}

    return recRecord;
  }

  /**
   * Phase 2: Records an entrepreneur private recovery action on a channel
   * Action types: 'explored' | 'contacted' | 'deal_agreed' | 'completed' | 'dismissed'
   */
  async recordChannelAction(userId, stockId, channelId, actionType, notes = '') {
    if (!userId || !stockId || !channelId || !actionType) {
      throw new Error('Missing required action parameters (userId, stockId, channelId, actionType).');
    }

    const validActions = ['explored', 'contacted', 'deal_agreed', 'completed', 'dismissed'];
    if (!validActions.includes(actionType)) {
      throw new Error(`Invalid channel action type: ${actionType}. Must be one of: ${validActions.join(', ')}`);
    }

    const stock = await this.getStockById(userId, stockId);
    if (!stock) throw new Error('Stock record not found or access denied.');

    const nowIso = new Date().toISOString();
    const actionId = `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const actionRecord = {
      id: actionId,
      stockId,
      userId,
      channelId,
      actionType,
      notes: notes || '',
      timestamp: nowIso,
      syncStatus: (typeof navigator !== 'undefined' && !navigator.onLine) ? 'pending_sync' : 'synced'
    };

    // Save in memory store
    const userActions = this.actionsMemoryStore.get(userId) || [];
    userActions.push(actionRecord);
    this.actionsMemoryStore.set(userId, userActions);

    // Save in Dexie
    try {
      if (db.stockChannelActions) {
        await db.stockChannelActions.put(actionRecord);
      }
    } catch (e) {}

    await syncEngine.enqueueMutation({
      storeName: 'stockChannelActions',
      recordId: actionRecord.id,
      operation: 'PUT',
      payload: actionRecord,
      userId
    });

    // Audit log
    try {
      if (db.recoveryLogs) {
        await db.recoveryLogs.put({
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          stockId,
          userId,
          actionType: 'CHANNEL_ACTION',
          details: { channelId, actionType, notes },
          timestamp: nowIso,
          syncStatus: 'synced'
        });
      }
    } catch (e) {}

    // Optional status update based on action
    if (actionType === 'deal_agreed' && stock.status === STOCK_STATUSES.AVAILABLE_FOR_RECOVERY) {
      await this.updateStockStatus(userId, stockId, STOCK_STATUSES.RECOVERY_IN_PROGRESS, `Deal agreed via ${channelId}: ${notes}`);
    } else if (actionType === 'completed' && stock.status !== STOCK_STATUSES.FULLY_RECOVERED) {
      await this.updateStockStatus(userId, stockId, STOCK_STATUSES.FULLY_RECOVERED, `Recovery completed via ${channelId}: ${notes}`);
    }

    return actionRecord;
  }

  /**
   * Phase 2: Gets all private channel actions recorded for a stock
   */
  async getChannelActionsForStock(userId, stockId) {
    if (!userId || !stockId) return [];

    const stock = await this.getStockById(userId, stockId);
    if (!stock) return [];

    let actions = [];

    try {
      if (db.stockChannelActions) {
        actions = await db.stockChannelActions
          .where('stockId')
          .equals(stockId)
          .filter((act) => act.userId === userId || userId === 'admin')
          .toArray();
      }
    } catch (e) {
      actions = [];
    }

    if (!actions || actions.length === 0) {
      const userActions = this.actionsMemoryStore.get(userId) || [];
      actions = userActions.filter((a) => a.stockId === stockId);
    }

    return actions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Phase 2: Compares multiple recovery channels side-by-side
   */
  async compareChannels(stock, channelIds = [], customInputs = {}) {
    if (!stock) return null;

    const evaluation = StockMatchingEngine.evaluateAllChannels(stock);
    const channelsToCompare = channelIds.length > 0
      ? evaluation.channels.filter((c) => channelIds.includes(c.id))
      : evaluation.channels;

    return {
      stockId: stock.id,
      productName: stock.productName,
      productName_mr: stock.productName_mr,
      availableQuantity: stock.availableQuantity,
      unit: stock.unit,
      foodSafetySummary: evaluation.foodSafetySummary,
      comparisons: channelsToCompare.map((ch) => {
        const econ = ch.estimatedEconomics || {};
        return {
          channelId: ch.id,
          title_en: ch.title_en,
          title_mr: ch.title_mr,
          icon: ch.icon,
          suitabilityScore: ch.suitabilityScore,
          confidence: ch.confidence,
          isDisqualified: ch.isDisqualified,
          disqualificationReason_en: ch.disqualificationReason_en,
          disqualificationReason_mr: ch.disqualificationReason_mr,
          expectedPrice: econ.expectedSellingPricePerUnit,
          grossRevenue: econ.potentialGrossRevenue,
          expenses: econ.estimatedExpenses || {},
          netRecovery: econ.netRecoveryValue,
          attributableCost: econ.attributableInventoryCost,
          netVsAttributable: econ.netRecoveryVsAttributableCost,
          recoveryRatePercent: econ.recoveryRatePercent,
          timeframe_en: econ.timeframe_en,
          timeframe_mr: econ.timeframe_mr,
          effortLevel: econ.effortLevel,
          matchedBuyersCount: (ch.matchedBuyers || []).length,
          buyerNotice_en: ch.buyerNotice_en,
          buyerNotice_mr: ch.buyerNotice_mr,
          topWhy_en: (ch.whyRecommended_en || [])[0] || '',
          topWhy_mr: (ch.whyRecommended_mr || [])[0] || '',
          topLimitation_en: (ch.limitations_en || [])[0] || '',
          topLimitation_mr: (ch.limitations_mr || [])[0] || ''
        };
      })
    };
  }

  // ==========================================================================
  // Phase 3: Buyer Enquiries, Recovery Transactions & Outcome Intelligence
  // ==========================================================================

  /**
   * Phase 3: Creates a buyer enquiry for an unsold stock record
   * Validates user ownership, available quantity, food safety, and verified directory link.
   */
  async createEnquiry(userId, enquiryInput) {
    if (!userId || !enquiryInput || !enquiryInput.stockId) {
      throw new Error('Missing required enquiry parameters (userId, stockId).');
    }

    const stock = await this.getStockById(userId, enquiryInput.stockId);
    if (!stock) throw new Error('Stock record not found or access denied.');

    // Food Safety Guard: Expired or spoiled food cannot be sent for enquiry or sale
    const safety = this.evaluateFoodSafety(stock);
    if (!safety.isSafe) {
      throw new Error('Food Safety Guard: Expired or spoiled food cannot be sent for buyer enquiry or human consumption.');
    }

    const availQty = Number(stock.availableQuantity) || 0;
    const enquiryQty = Number(enquiryInput.enquiryQuantity ?? availQty);

    if (enquiryQty <= 0) {
      throw new Error('Enquiry quantity must be greater than zero.');
    }

    if (enquiryQty > availQty) {
      throw new Error(`Enquiry quantity (${enquiryQty} ${stock.unit}) cannot exceed currently available stock quantity (${availQty} ${stock.unit}).`);
    }

    const proposedPrice = Number(enquiryInput.proposedPricePerUnit ?? stock.expectedRecoveryPricePerUnit ?? 0);
    if (proposedPrice < 0) {
      throw new Error('Proposed price per unit cannot be negative.');
    }

    // Verify Buyer Directory Status (Never fake verified status!)
    let isVerifiedBuyer = false;
    let buyerName = enquiryInput.buyerName || '';
    let buyerType = 'unverified_external';

    if (enquiryInput.buyerId) {
      const verifiedSup = VERIFIED_LOCAL_SUPPLIERS.find((s) => s.id === enquiryInput.buyerId);
      const verifiedMkt = INITIAL_BAZAAR_MARKETS.find((m) => m.id === enquiryInput.buyerId);
      if (verifiedSup || verifiedMkt) {
        isVerifiedBuyer = true;
        buyerName = verifiedSup ? (verifiedSup.businessName || verifiedSup.name) : verifiedMkt.name;
        buyerType = 'verified_directory';
      }
    }

    if (!isVerifiedBuyer && !buyerName) {
      buyerName = 'External Manual Contact';
    }

    // Offline status handling: Never display an offline enquiry as sent!
    const isOffline = enquiryInput.isOffline ?? (typeof navigator !== 'undefined' && !navigator.onLine);
    let status = ENQUIRY_STATUSES.SENT;
    let syncStatus = 'synced';

    if (isOffline) {
      status = ENQUIRY_STATUSES.PENDING_SYNC;
      syncStatus = 'pending_sync';
    }

    const nowIso = new Date().toISOString();
    const enquiryId = enquiryInput.id || `enq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newEnquiry = {
      id: enquiryId,
      stockId: stock.id,
      userId,
      buyerId: enquiryInput.buyerId || null,
      buyerName,
      buyerName_mr: enquiryInput.buyerName_mr || buyerName,
      isVerifiedBuyer,
      buyerType,
      recoveryChannel: enquiryInput.recoveryChannel || 'weekly_markets',
      availableQuantity: availQty,
      enquiryQuantity: enquiryQty,
      unit: stock.unit,
      proposedPricePerUnit: proposedPrice,
      deliveryTerms: enquiryInput.deliveryTerms || DELIVERY_TERMS.PICKUP,
      deliveryNotes: enquiryInput.deliveryNotes || '',
      status,
      enquiryDate: enquiryInput.enquiryDate || nowIso,
      negotiationHistory: enquiryInput.negotiationHistory || [],
      isManualRecording: Boolean(enquiryInput.isManualRecording ?? true),
      syncStatus,
      version: 1,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // Save in memory store
    const userEnquiries = this.enquiriesMemoryStore.get(userId) || [];
    userEnquiries.push(newEnquiry);
    this.enquiriesMemoryStore.set(userId, userEnquiries);

    // Save in Dexie
    try {
      if (db.stockEnquiries) {
        await db.stockEnquiries.put(newEnquiry);
      }
    } catch (e) {}

    await syncEngine.enqueueMutation({
      storeName: 'stockEnquiries',
      recordId: newEnquiry.id,
      operation: 'PUT',
      payload: newEnquiry,
      userId
    });

    // Update stock status to recovery_in_progress if it was available_for_recovery
    if (stock.status === STOCK_STATUSES.AVAILABLE_FOR_RECOVERY) {
      await this.updateStockStatus(
        userId,
        stock.id,
        STOCK_STATUSES.RECOVERY_IN_PROGRESS,
        `Enquiry initiated with ${buyerName} (${enquiryQty} ${stock.unit})`
      );
    }

    return newEnquiry;
  }

  /**
   * Phase 3: Get enquiry by ID with ownership guard
   */
  async getEnquiryById(userId, enquiryId) {
    if (!userId || !enquiryId) return null;

    let enquiry = null;
    try {
      if (db.stockEnquiries) {
        enquiry = await db.stockEnquiries.get(enquiryId);
      }
    } catch (e) {}

    if (!enquiry) {
      for (const [uid, userList] of this.enquiriesMemoryStore.entries()) {
        const found = userList.find((e) => e.id === enquiryId);
        if (found) {
          enquiry = found;
          break;
        }
      }
    }

    if (enquiry && enquiry.userId !== userId && userId !== 'admin') {
      throw new Error('Access denied: You do not have permission to view this buyer enquiry.');
    }

    return enquiry || null;
  }

  /**
   * Phase 3: Get all enquiries for a specific stock record
   */
  async getEnquiriesForStock(userId, stockId) {
    if (!userId || !stockId) return [];

    const stock = await this.getStockById(userId, stockId);
    if (!stock) return [];

    let list = [];
    try {
      if (db.stockEnquiries) {
        list = await db.stockEnquiries
          .where('stockId')
          .equals(stockId)
          .filter((e) => e.userId === userId || userId === 'admin')
          .toArray();
      }
    } catch (e) {
      list = [];
    }

    if (!list || list.length === 0) {
      const userList = this.enquiriesMemoryStore.get(userId) || [];
      list = userList.filter((e) => e.stockId === stockId);
    }

    return list.sort((a, b) => new Date(b.enquiryDate) - new Date(a.enquiryDate));
  }

  /**
   * Phase 3: Get all enquiries for an entrepreneur
   */
  async getEnquiriesForUser(userId, filters = {}) {
    if (!userId) return [];

    let list = [];
    try {
      if (db.stockEnquiries) {
        list = await db.stockEnquiries
          .where('userId')
          .equals(userId)
          .toArray();
      }
    } catch (e) {
      list = [];
    }

    if (!list || list.length === 0) {
      list = this.enquiriesMemoryStore.get(userId) || [];
    }

    return list.filter((e) => {
      if (filters.status && filters.status !== 'all' && e.status !== filters.status) return false;
      if (filters.stockId && e.stockId !== filters.stockId) return false;
      return true;
    }).sort((a, b) => new Date(b.enquiryDate) - new Date(a.enquiryDate));
  }

  /**
   * Phase 3: Records buyer response / counteroffer / negotiation history
   * Clearly distinguishes manually recorded responses from integrated comms.
   */
  async recordBuyerResponse(userId, enquiryId, responseInput) {
    const enquiry = await this.getEnquiryById(userId, enquiryId);
    if (!enquiry) throw new Error('Enquiry not found or access denied.');

    const responseType = responseInput.responseType || 'counteroffer'; // 'counteroffer' | 'acceptance' | 'rejection' | 'interested'
    const offeredPrice = responseInput.offeredPrice != null ? Number(responseInput.offeredPrice) : null;
    const offeredQuantity = responseInput.offeredQuantity != null ? Number(responseInput.offeredQuantity) : null;
    const terms = responseInput.pickupDeliveryTerms || enquiry.deliveryTerms;
    const conditions = responseInput.conditions || '';
    const notes = responseInput.notes || '';
    const recordedBy = responseInput.recordedBy || 'manual_entrepreneur';

    let newStatus = enquiry.status;
    if (responseType === 'counteroffer') {
      newStatus = ENQUIRY_STATUSES.COUNTEROFFER_RECEIVED;
    } else if (responseType === 'acceptance') {
      newStatus = ENQUIRY_STATUSES.ACCEPTED;
    } else if (responseType === 'rejection') {
      newStatus = ENQUIRY_STATUSES.REJECTED;
    } else if (responseType === 'interested') {
      newStatus = ENQUIRY_STATUSES.INTERESTED;
    }

    const nowIso = new Date().toISOString();
    const historyEntry = {
      id: `neg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      timestamp: nowIso,
      responseType,
      offeredPrice,
      offeredQuantity,
      pickupDeliveryTerms: terms,
      conditions,
      notes,
      recordedBy
    };

    const updatedNegotiation = [...(enquiry.negotiationHistory || []), historyEntry];
    const updatedEnquiry = {
      ...enquiry,
      status: newStatus,
      negotiationHistory: updatedNegotiation,
      version: (enquiry.version || 1) + 1,
      updatedAt: nowIso
    };

    // Update in memory
    const userList = this.enquiriesMemoryStore.get(userId) || [];
    const idx = userList.findIndex((e) => e.id === enquiryId);
    if (idx !== -1) userList[idx] = updatedEnquiry;
    this.enquiriesMemoryStore.set(userId, userList);

    // Update in Dexie
    try {
      if (db.stockEnquiries) {
        await db.stockEnquiries.put(updatedEnquiry);
      }
    } catch (e) {}

    await syncEngine.enqueueMutation({
      storeName: 'stockEnquiries',
      recordId: updatedEnquiry.id,
      operation: 'PUT',
      payload: updatedEnquiry,
      userId
    });

    return updatedEnquiry;
  }

  /**
   * Phase 3: Creates a recovery transaction against an unsold stock record
   * Supports partial recovery and multiple transactions.
   * Decrements available quantity only upon entrepreneur confirmation.
   * CRITICAL: Strictly blocks recovered quantity from exceeding available quantity!
   */
  async createRecoveryTransaction(userId, txInput) {
    if (!userId || !txInput || !txInput.stockId) {
      throw new Error('Missing required transaction parameters (userId, stockId).');
    }

    const stock = await this.getStockById(userId, txInput.stockId);
    if (!stock) throw new Error('Stock record not found or access denied.');

    // Food Safety Guard: Expired or spoiled food cannot be sold or transacted for human consumption
    const safety = this.evaluateFoodSafety(stock);
    if (!safety.isSafe) {
      throw new Error('Food Safety Guard: Expired or spoiled food cannot be transacted or sold for human consumption.');
    }

    const availQty = Number(stock.availableQuantity) || 0;
    const agreedQty = Number(txInput.agreedQuantity);

    if (!agreedQty || agreedQty <= 0) {
      throw new Error('Agreed recovery quantity must be greater than zero.');
    }

    // STRICT OVERAGE GUARD: Prevent recovered quantity from exceeding available quantity!
    if (agreedQty > availQty) {
      throw new Error(`Cannot recover more than available stock quantity (${availQty} ${stock.unit}). Attempted: ${agreedQty} ${stock.unit}.`);
    }

    const agreedPrice = Number(txInput.agreedPricePerUnit);
    if (agreedPrice < 0) {
      throw new Error('Agreed price per unit cannot be negative.');
    }

    // Itemized Recovery Expenses
    const expenses = txInput.expenses || {};
    const transportation = Math.max(0, Number(expenses.transportation || 0));
    const packaging = Math.max(0, Number(expenses.packaging || 0));
    const processing = Math.max(0, Number(expenses.processing || 0));
    const storage = Math.max(0, Number(expenses.storage || 0));
    const handling = Math.max(0, Number(expenses.handling || 0));
    const other = Math.max(0, Number(expenses.other || 0));
    const totalExpenses = transportation + packaging + processing + storage + handling + other;

    const grossRevenue = Math.round(agreedQty * agreedPrice);
    const netRecoveryValue = grossRevenue - totalExpenses;

    // Attributable inventory cost (where known; where unknown, do NOT assume zero)
    let originalCostPerUnit = null;
    let attributableCost = null;
    let netVsAttributable = null;
    const isCostKnown = stock.originalTotalCost != null && stock.originalQuantity && Number(stock.originalQuantity) > 0;

    if (isCostKnown) {
      originalCostPerUnit = Number(stock.originalTotalCost) / Number(stock.originalQuantity);
      attributableCost = Math.round(originalCostPerUnit * agreedQty);
      netVsAttributable = netRecoveryValue - attributableCost;
    }

    const nowIso = new Date().toISOString();
    const txId = txInput.id || `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const isDemo = Boolean(txInput.isDemoTransaction ?? false);

    const transaction = {
      id: txId,
      stockId: stock.id,
      enquiryId: txInput.enquiryId || null,
      userId,
      buyerId: txInput.buyerId || null,
      buyerName: txInput.buyerName || 'Local Buyer',
      isVerifiedBuyer: Boolean(txInput.isVerifiedBuyer ?? false),
      recoveryChannel: txInput.recoveryChannel || 'weekly_markets',
      agreedQuantity: agreedQty,
      unit: stock.unit,
      agreedPricePerUnit: agreedPrice,
      grossRecoveryRevenue: grossRevenue,
      expenses: {
        transportation,
        packaging,
        processing,
        storage,
        handling,
        other,
        totalExpenses
      },
      netRecoveryValue,
      originalCostPerUnit,
      attributableInventoryCost: attributableCost,
      netVsAttributable,
      isCostKnown,
      transactionDate: txInput.transactionDate || nowIso,
      paymentStatus: txInput.paymentStatus || PAYMENT_STATUSES.PAID,
      recoveryCompletionStatus: txInput.recoveryCompletionStatus || TRANSACTION_COMPLETION_STATUSES.COMPLETED,
      isDemoTransaction: isDemo,
      syncStatus: (typeof navigator !== 'undefined' && !navigator.onLine) ? 'pending_sync' : 'synced',
      version: 1,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // Save in memory store
    const userTxList = this.transactionsMemoryStore.get(userId) || [];
    userTxList.push(transaction);
    this.transactionsMemoryStore.set(userId, userTxList);

    // Save in Dexie
    try {
      if (db.stockTransactions) {
        await db.stockTransactions.put(transaction);
      }
    } catch (e) {}

    await syncEngine.enqueueMutation({
      storeName: 'stockTransactions',
      recordId: transaction.id,
      operation: 'PUT',
      payload: transaction,
      userId
    });

    // Stock Quantity & Lifecycle Update
    const newAvailableQty = availQty - agreedQty;
    const newStatus = newAvailableQty === 0 ? STOCK_STATUSES.FULLY_RECOVERED : STOCK_STATUSES.PARTIALLY_RECOVERED;

    const updatedHistory = [
      ...(stock.statusHistory || []),
      {
        status: newStatus,
        timestamp: nowIso,
        notes: `Recovery transaction completed: ${agreedQty} ${stock.unit} @ ₹${agreedPrice}/${stock.unit} via ${txInput.recoveryChannel || 'channel'}. Remaining: ${newAvailableQty} ${stock.unit}.`
      }
    ];

    const updatedStock = {
      ...stock,
      availableQuantity: newAvailableQty,
      status: newStatus,
      statusHistory: updatedHistory,
      updatedAt: nowIso
    };

    this.memoryStore.set(stock.id, updatedStock);
    try {
      if (db.unsoldStock) {
        await db.unsoldStock.put(updatedStock);
      }
    } catch (e) {}

    await syncEngine.enqueueMutation({
      storeName: 'unsoldStock',
      recordId: updatedStock.id,
      operation: 'PUT',
      payload: updatedStock,
      userId,
      isShared: true
    });

    // Link enquiry status if provided
    if (txInput.enquiryId) {
      try {
        const enq = await this.getEnquiryById(userId, txInput.enquiryId);
        if (enq && enq.status !== ENQUIRY_STATUSES.ACCEPTED) {
          enq.status = ENQUIRY_STATUSES.ACCEPTED;
          enq.updatedAt = nowIso;
          if (db.stockEnquiries) await db.stockEnquiries.put(enq);
          await syncEngine.enqueueMutation({
            storeName: 'stockEnquiries',
            recordId: enq.id,
            operation: 'PUT',
            payload: enq,
            userId
          });
        }
      } catch (e) {}
    }

    // Recovery Audit Log
    try {
      if (db.recoveryLogs) {
        await db.recoveryLogs.put({
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          stockId: stock.id,
          userId,
          actionType: 'RECOVERY_TRANSACTION',
          details: {
            transactionId: txId,
            agreedQuantity: agreedQty,
            agreedPricePerUnit: agreedPrice,
            netRecoveryValue,
            remainingStockQuantity: newAvailableQty,
            newStatus
          },
          timestamp: nowIso,
          syncStatus: 'synced'
        });
      }
    } catch (e) {}

    return { transaction, updatedStock };
  }

  /**
   * Phase 3: Get transaction by ID with ownership guard
   */
  async getTransactionById(userId, txId) {
    if (!userId || !txId) return null;

    let tx = null;
    try {
      if (db.stockTransactions) {
        tx = await db.stockTransactions.get(txId);
      }
    } catch (e) {}

    if (!tx) {
      for (const [uid, userList] of this.transactionsMemoryStore.entries()) {
        const found = userList.find((t) => t.id === txId);
        if (found) {
          tx = found;
          break;
        }
      }
    }

    if (tx && tx.userId !== userId && userId !== 'admin') {
      throw new Error('Access denied: You do not have permission to view this recovery transaction.');
    }

    return tx || null;
  }

  /**
   * Phase 3: Get all transactions for a specific stock record
   */
  async getTransactionsForStock(userId, stockId) {
    if (!userId || !stockId) return [];

    const stock = await this.getStockById(userId, stockId);
    if (!stock) return [];

    let list = [];
    try {
      if (db.stockTransactions) {
        list = await db.stockTransactions
          .where('stockId')
          .equals(stockId)
          .filter((t) => t.userId === userId || userId === 'admin')
          .toArray();
      }
    } catch (e) {
      list = [];
    }

    if (!list || list.length === 0) {
      const userList = this.transactionsMemoryStore.get(userId) || [];
      list = userList.filter((t) => t.stockId === stockId);
    }

    return list.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
  }

  /**
   * Phase 3: Get all transactions for an entrepreneur
   */
  async getTransactionsForUser(userId, filters = {}) {
    if (!userId) return [];

    let list = [];
    try {
      if (db.stockTransactions) {
        list = await db.stockTransactions
          .where('userId')
          .equals(userId)
          .toArray();
      }
    } catch (e) {
      list = [];
    }

    if (!list || list.length === 0) {
      list = this.transactionsMemoryStore.get(userId) || [];
    }

    return list.filter((t) => {
      if (filters.channel && filters.channel !== 'all' && t.recoveryChannel !== filters.channel) return false;
      if (filters.stockId && t.stockId !== filters.stockId) return false;
      if (filters.excludeDemo && t.isDemoTransaction) return false;
      return true;
    }).sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
  }

  /**
   * Phase 3: Expected vs Actual Recovery Analysis
   * Compares Phase 2 recommendations vs Negotiated offers vs Actual completed transactions.
   */
  async getExpectedVsActualAnalysis(userId, stockId) {
    const stock = await this.getStockById(userId, stockId);
    if (!stock) throw new Error('Stock record not found or access denied.');

    const recs = await this.getRecommendationsForStock(userId, stockId);
    const transactions = await this.getTransactionsForStock(userId, stockId);
    const enquiries = await this.getEnquiriesForStock(userId, stockId);

    // 1. Estimated baseline (from top non-disqualified channel or stock expected values)
    const topChannel = recs?.channels?.find((c) => !c.isDisqualified) || recs?.channels?.[0];
    const topEcon = topChannel?.estimatedEconomics || {};

    const estimatedGrossRevenue = topEcon.potentialGrossRevenue || 0;
    const estimatedTotalExpenses = topEcon.estimatedExpenses?.totalExpenses || 0;
    const estimatedNetRecovery = topEcon.netRecoveryValue || 0;

    // 2. Negotiated offer values (if accepted enquiry exists)
    const acceptedEnq = enquiries.find((e) => e.status === ENQUIRY_STATUSES.ACCEPTED);
    let negotiatedPrice = null;
    let negotiatedGross = null;
    if (acceptedEnq) {
      negotiatedPrice = acceptedEnq.proposedPricePerUnit;
      // Check if last negotiation entry was a counteroffer
      const lastNeg = (acceptedEnq.negotiationHistory || []).slice(-1)[0];
      if (lastNeg && lastNeg.offeredPrice != null) {
        negotiatedPrice = lastNeg.offeredPrice;
      }
      negotiatedGross = negotiatedPrice * acceptedEnq.enquiryQuantity;
    }

    // 3. Actual completed recovery transactions
    let actualQuantityRecovered = 0;
    let actualGrossRevenue = 0;
    let actualTransportation = 0;
    let actualPackaging = 0;
    let actualProcessing = 0;
    let actualStorage = 0;
    let actualHandling = 0;
    let actualOtherExpenses = 0;
    let actualTotalExpenses = 0;
    let actualNetRecoveryValue = 0;
    let actualAttributableCost = null;

    let hasKnownCost = stock.originalTotalCost != null && stock.originalQuantity;

    for (const tx of transactions) {
      actualQuantityRecovered += Number(tx.agreedQuantity || 0);
      actualGrossRevenue += Number(tx.grossRecoveryRevenue || 0);

      const exp = tx.expenses || {};
      actualTransportation += Number(exp.transportation || 0);
      actualPackaging += Number(exp.packaging || 0);
      actualProcessing += Number(exp.processing || 0);
      actualStorage += Number(exp.storage || 0);
      actualHandling += Number(exp.handling || 0);
      actualOtherExpenses += Number(exp.other || 0);
      actualTotalExpenses += Number(exp.totalExpenses || 0);

      actualNetRecoveryValue += Number(tx.netRecoveryValue || 0);

      if (tx.attributableInventoryCost != null) {
        actualAttributableCost = (actualAttributableCost || 0) + Number(tx.attributableInventoryCost);
      }
    }

    // 4. Variances (Actual - Estimated)
    const revenueVariance = actualGrossRevenue - estimatedGrossRevenue;
    const expensesVariance = actualTotalExpenses - estimatedTotalExpenses;
    const netRecoveryVariance = actualNetRecoveryValue - estimatedNetRecovery;

    // 5. Remaining Unrecovered Inventory
    const remainingQuantity = Number(stock.availableQuantity) || 0;
    let remainingUnrecoveredCost = null;
    if (hasKnownCost) {
      const unitCost = Number(stock.originalTotalCost) / Number(stock.originalQuantity);
      remainingUnrecoveredCost = Math.round(unitCost * remainingQuantity);
    }

    return {
      stockId: stock.id,
      productName: stock.productName,
      productName_mr: stock.productName_mr,
      originalQuantity: stock.originalQuantity,
      availableQuantity: stock.availableQuantity,
      unit: stock.unit,
      hasKnownPurchaseCost: hasKnownCost,
      costLabel: hasKnownCost ? 'Recorded' : 'Unrecorded / Self-Produced',

      // Estimates (Phase 2)
      estimated: {
        channelId: topChannel?.id,
        channelTitle_en: topChannel?.title_en,
        channelTitle_mr: topChannel?.title_mr,
        grossRevenue: estimatedGrossRevenue,
        totalExpenses: estimatedTotalExpenses,
        netRecoveryValue: estimatedNetRecovery
      },

      // Negotiated (Phase 3)
      negotiated: {
        hasNegotiatedOffer: acceptedEnq != null,
        agreedPricePerUnit: negotiatedPrice,
        potentialGross: negotiatedGross
      },

      // Actuals (Phase 3 Completed)
      actual: {
        transactionsCount: transactions.length,
        quantityRecovered: actualQuantityRecovered,
        grossRevenue: actualGrossRevenue,
        itemizedExpenses: {
          transportation: actualTransportation,
          packaging: actualPackaging,
          processing: actualProcessing,
          storage: actualStorage,
          handling: actualHandling,
          other: actualOtherExpenses,
          totalExpenses: actualTotalExpenses
        },
        netRecoveryValue: actualNetRecoveryValue,
        attributableInventoryCost: actualAttributableCost,
        netVsAttributable: actualAttributableCost != null ? actualNetRecoveryValue - actualAttributableCost : null
      },

      // Variances
      variance: {
        revenueVariance,
        expensesVariance,
        netRecoveryVariance
      },

      // Remaining
      remaining: {
        quantity: remainingQuantity,
        unrecoveredCost: remainingUnrecoveredCost
      }
    };
  }

  /**
   * Phase 3: Recovery Outcome Intelligence
   * Computes genuine performance metrics ONLY from authentic user transactions (strictly excluding demo records!).
   * Highlights sample size and confidence disclaimer when transactions are few.
   */
  async getOutcomeIntelligence(userId, options = {}) {
    if (!userId) return null;

    // Fetch transactions strictly excluding demo records!
    const allUserTx = await this.getTransactionsForUser(userId, { excludeDemo: true });
    const allEnquiries = await this.getEnquiriesForUser(userId);
    const userStocks = await this.getStocksForUser(userId);

    const sampleSize = allUserTx.length;
    const isSampleSufficient = sampleSize >= 3;

    if (sampleSize === 0) {
      return {
        sampleSize: 0,
        isSampleSufficient: false,
        sampleSizeNotice_en: 'No verified recovery transactions recorded yet. Real outcome metrics will generate once transactions occur.',
        sampleSizeNotice_mr: 'अद्याप कोणत्याही प्रत्यक्ष पुनर्प्राप्ती व्यवहारांची नोंद नाही. व्यवहार पूर्ण झाल्यावर प्रत्यक्ष आकडेवारी दिसेल.',
        totalTransactionsCount: 0,
        totalVolumeRecovered: 0,
        totalGrossRevenue: 0,
        totalExpenses: 0,
        totalNetRecovery: 0,
        averageRecoveredQuantity: 0,
        averageTurnaroundDays: 0,
        channelSuccessRates: [],
        partialVsCompleteRatio: { partiallyRecoveredCount: 0, fullyRecoveredCount: 0 },
        enquiryRejectionRate: 0,
        reportingPeriod: null
      };
    }

    let totalVolumeRecovered = 0;
    let totalGrossRevenue = 0;
    let totalExpenses = 0;
    let totalNetRecovery = 0;
    let totalTurnaroundDays = 0;

    const channelMap = new Map();

    // Determine reporting period from actual transaction dates
    const dates = allUserTx.map((t) => new Date(t.transactionDate || t.createdAt).getTime()).filter((t) => !isNaN(t));
    const minDate = dates.length > 0 ? new Date(Math.min(...dates)).toLocaleDateString() : '—';
    const maxDate = dates.length > 0 ? new Date(Math.max(...dates)).toLocaleDateString() : '—';

    for (const tx of allUserTx) {
      const qty = Number(tx.agreedQuantity || 0);
      const gross = Number(tx.grossRecoveryRevenue || 0);
      const exp = Number(tx.expenses?.totalExpenses || 0);
      const net = Number(tx.netRecoveryValue || 0);

      totalVolumeRecovered += qty;
      totalGrossRevenue += gross;
      totalExpenses += exp;
      totalNetRecovery += net;

      // Turnaround time: difference between tx date and stock registration date
      const stock = this.memoryStore.get(tx.stockId);
      if (stock && stock.registeredDate) {
        const diffMs = new Date(tx.transactionDate || tx.createdAt) - new Date(stock.registeredDate);
        const days = Math.max(0.5, Math.round(diffMs / (1000 * 60 * 60 * 24) * 10) / 10);
        totalTurnaroundDays += days;
      } else {
        totalTurnaroundDays += 1;
      }

      // Channel breakdown
      const chId = tx.recoveryChannel || 'weekly_markets';
      const chStat = channelMap.get(chId) || {
        channelId: chId,
        transactionsCount: 0,
        volumeRecovered: 0,
        grossRevenue: 0,
        expenses: 0,
        netRecovery: 0
      };

      chStat.transactionsCount += 1;
      chStat.volumeRecovered += qty;
      chStat.grossRevenue += gross;
      chStat.expenses += exp;
      chStat.netRecovery += net;

      channelMap.set(chId, chStat);
    }

    const channelSuccessRates = Array.from(channelMap.values()).map((ch) => {
      const channelDef = RECOVERY_CHANNELS.find((c) => c.id === ch.channelId);
      return {
        ...ch,
        title_en: channelDef ? channelDef.title_en : ch.channelId,
        title_mr: channelDef ? channelDef.title_mr : ch.channelId,
        avgNetPerUnit: ch.volumeRecovered > 0 ? Math.round((ch.netRecovery / ch.volumeRecovered) * 10) / 10 : 0,
        avgExpensesPerTx: ch.transactionsCount > 0 ? Math.round(ch.expenses / ch.transactionsCount) : 0
      };
    }).sort((a, b) => b.netRecovery - a.netRecovery);

    // Partial vs Complete stocks
    let partiallyRecoveredCount = 0;
    let fullyRecoveredCount = 0;
    for (const stk of userStocks) {
      if (stk.status === STOCK_STATUSES.PARTIALLY_RECOVERED) partiallyRecoveredCount++;
      else if (stk.status === STOCK_STATUSES.FULLY_RECOVERED) fullyRecoveredCount++;
    }

    // Enquiry Rejection Rate
    const totalEnquiries = allEnquiries.length;
    const rejectedEnquiries = allEnquiries.filter((e) => e.status === ENQUIRY_STATUSES.REJECTED).length;
    const enquiryRejectionRate = totalEnquiries > 0 ? Math.round((rejectedEnquiries / totalEnquiries) * 100) : 0;

    const avgRecoveredQuantity = Math.round(totalVolumeRecovered / sampleSize);
    const avgTurnaroundDays = Math.round((totalTurnaroundDays / sampleSize) * 10) / 10;

    return {
      sampleSize,
      isSampleSufficient,
      sampleSizeNotice_en: !isSampleSufficient
        ? `Preliminary analytics based on ${sampleSize} verified transaction(s). A larger sample size is recommended before drawing strategic business conclusions.`
        : null,
      sampleSizeNotice_mr: !isSampleSufficient
        ? `केवळ ${sampleSize} व्यवहारांवर आधारित प्राथमिक विश्लेषण. निश्चित निष्कर्ष काढण्यासाठी किमान ३-५ व्यवहार आवश्यक आहेत.`
        : null,
      reportingPeriod: `${minDate} - ${maxDate}`,
      totalTransactionsCount: sampleSize,
      totalVolumeRecovered,
      totalGrossRevenue,
      totalExpenses,
      totalNetRecovery,
      averageRecoveredQuantity: avgRecoveredQuantity,
      averageTurnaroundDays: avgTurnaroundDays,
      channelSuccessRates,
      partialVsCompleteRatio: {
        partiallyRecoveredCount,
        fullyRecoveredCount
      },
      enquiryRejectionRate
    };
  }

  /**
   * Phase 3: Offline Synchronization & Idempotent Conflict Resolution
   */
  async syncPendingEnquiriesAndTransactions(userId) {
    if (!userId) return { synchronizedCount: 0 };

    let syncedCount = 0;
    const userEnquiries = this.enquiriesMemoryStore.get(userId) || [];
    for (const enq of userEnquiries) {
      if (enq.syncStatus === 'pending_sync') {
        enq.syncStatus = 'synced';
        if (enq.status === ENQUIRY_STATUSES.PENDING_SYNC) {
          enq.status = ENQUIRY_STATUSES.SENT;
        }
        syncedCount++;
        try {
          if (db.stockEnquiries) await db.stockEnquiries.put(enq);
        } catch (e) {}
      }
    }

    const userTx = this.transactionsMemoryStore.get(userId) || [];
    for (const tx of userTx) {
      if (tx.syncStatus === 'pending_sync') {
        tx.syncStatus = 'synced';
        syncedCount++;
        try {
          if (db.stockTransactions) await db.stockTransactions.put(tx);
        } catch (e) {}
      }
    }

    return { synchronizedCount: syncedCount };
  }

  /**
   * Phase 3: Field-level conflict resolution for concurrent edits
   * Newer server timestamp / version wins, local notes merged.
   */
  resolveTransactionConflict(userId, localTx, remoteTx) {
    if (!localTx || !remoteTx) return localTx || remoteTx;

    const localTime = new Date(localTx.updatedAt || localTx.createdAt).getTime();
    const remoteTime = new Date(remoteTx.updatedAt || remoteTx.createdAt).getTime();

    // Server newer
    if (remoteTime >= localTime || (remoteTx.version || 1) > (localTx.version || 1)) {
      return {
        ...remoteTx,
        id: localTx.id,
        syncStatus: 'synced',
        conflictResolved: true,
        resolvedVersion: (remoteTx.version || 1) + 1
      };
    }

    // Local newer
    return {
      ...localTx,
      syncStatus: 'synced',
      conflictResolved: true,
      resolvedVersion: (localTx.version || 1) + 1
    };
  }

  /**
   * Buyer Marketplace: Retrieves all publicly available unsold inventory lots across Maharashtra.
   * Strictly filters out expired or damaged stock (never displays unsafe food!).
   * Sanitizes private purchase costs while presenting expected recovery prices.
   */
  async getAvailableMarketplaceStocks(filters = {}) {
    await this.initStockDatabase();

    let allStocks = [];
    try {
      if (db.unsoldStock) {
        allStocks = await db.unsoldStock.toArray();
      }
    } catch (e) {
      allStocks = [];
    }

    if (!allStocks || allStocks.length === 0) {
      allStocks = Array.from(this.memoryStore.values());
    }

    return allStocks
      .filter((stock) => {
        // 1. Must have available quantity > 0
        if (!stock.availableQuantity || Number(stock.availableQuantity) <= 0) return false;

        // 2. Status must be available for recovery or in progress
        const allowedStatuses = [
          STOCK_STATUSES.NEWLY_REGISTERED,
          STOCK_STATUSES.AVAILABLE_FOR_RECOVERY,
          STOCK_STATUSES.RECOVERY_IN_PROGRESS,
          STOCK_STATUSES.PARTIALLY_RECOVERED
        ];
        if (!allowedStatuses.includes(stock.status)) return false;

        // 3. FOOD SAFETY GUARD: Strictly exclude expired, damaged, or unsafe food!
        const safety = this.evaluateFoodSafety(stock);
        if (!safety.isSafe) return false;

        // 4. Category Filter
        if (filters.category && filters.category !== 'all' && stock.category !== filters.category) {
          return false;
        }

        // 5. Location Filters (District, Taluka)
        if (filters.districtCode && filters.districtCode !== 'all' && Number(stock.districtCode) !== Number(filters.districtCode)) {
          return false;
        }
        if (filters.district && filters.district !== 'all' && stock.districtName?.toLowerCase() !== filters.district.toLowerCase() && Number(stock.districtCode) !== Number(filters.district)) {
          return false;
        }
        if (filters.talukaCode && filters.talukaCode !== 'all' && Number(stock.talukaCode) !== Number(filters.talukaCode)) {
          return false;
        }
        if (filters.taluka && filters.taluka !== 'all' && stock.talukaName?.toLowerCase() !== filters.taluka.toLowerCase() && Number(stock.talukaCode) !== Number(filters.taluka)) {
          return false;
        }

        // 6. Perishability Filter
        if (filters.perishability && filters.perishability !== 'all' && stock.perishability !== filters.perishability) {
          return false;
        }

        // 7. Max Price Filter
        if (filters.maxPrice && Number(filters.maxPrice) > 0) {
          const price = Number(stock.expectedRecoveryPricePerUnit || 0);
          if (price > Number(filters.maxPrice)) return false;
        }

        // 8. Keyword Search
        if (filters.search && filters.search.trim()) {
          const q = filters.search.toLowerCase().trim();
          const pName = stock.productName?.toLowerCase() || '';
          const pMr = stock.productName_mr?.toLowerCase() || '';
          const vName = stock.villageName?.toLowerCase() || '';
          const tName = stock.talukaName?.toLowerCase() || '';
          const dName = stock.districtName?.toLowerCase() || '';
          if (!pName.includes(q) && !pMr.includes(q) && !vName.includes(q) && !tName.includes(q) && !dName.includes(q)) {
            return false;
          }
        }

        return true;
      })
      .map((stock) => {
        // Sanitize private financial data: do NOT leak original purchase cost
        const askingPrice = Number(stock.expectedRecoveryPricePerUnit || 0);
        const originalSelling = Number(stock.originalSellingPricePerUnit || 0);
        let discountPercent = null;
        if (originalSelling > 0 && askingPrice > 0 && originalSelling > askingPrice) {
          discountPercent = Math.round(((originalSelling - askingPrice) / originalSelling) * 100);
        }

        const isUrgent =
          stock.perishability === PERISHABILITY_LEVELS.PERISHABLE &&
          stock.remainingShelfLifeHours != null &&
          stock.remainingShelfLifeHours <= 24;

        return {
          id: stock.id,
          sellerId: stock.userId,
          productName: stock.productName,
          productName_mr: stock.productName_mr,
          category: stock.category,
          availableQuantity: stock.availableQuantity,
          unit: stock.unit,
          condition: stock.condition,
          perishability: stock.perishability,
          remainingShelfLifeHours: stock.remainingShelfLifeHours,
          isUrgent,
          storageCondition: stock.storageCondition,
          packagingCondition: stock.packagingCondition,
          askingPricePerUnit: askingPrice,
          originalSellingPricePerUnit: originalSelling > 0 ? originalSelling : null,
          discountPercent,
          districtCode: stock.districtCode,
          districtName: stock.districtName,
          districtName_mr: stock.districtName_mr,
          talukaCode: stock.talukaCode,
          talukaName: stock.talukaName,
          talukaName_mr: stock.talukaName_mr,
          villageName: stock.villageName,
          villageName_mr: stock.villageName_mr,
          coordinates: stock.coordinates,
          notes: stock.notes,
          status: stock.status,
          registeredDate: stock.registeredDate
        };
      })
      .sort((a, b) => {
        // Urgent items (< 24h) first, then by date
        if (a.isUrgent && !b.isUrgent) return -1;
        if (!a.isUrgent && b.isUrgent) return 1;
        return new Date(b.registeredDate) - new Date(a.registeredDate);
      });
  }

  /**
   * Buyer Marketplace: Submits a direct purchase offer from a buyer to the stock owner
   * Creates an enquiry in the seller's inbox and updates negotiation timeline.
   */
  async submitBuyerOffer(buyerOfferInput) {
    if (!buyerOfferInput || !buyerOfferInput.stockId) {
      throw new Error('Missing stockId for buyer offer.');
    }

    await this.initStockDatabase();

    let stock = null;
    try {
      if (db.unsoldStock) {
        stock = await db.unsoldStock.get(buyerOfferInput.stockId);
      }
    } catch (e) {}

    if (!stock) {
      stock = this.memoryStore.get(buyerOfferInput.stockId);
    }

    if (!stock) throw new Error('Stock record not found.');

    const safety = this.evaluateFoodSafety(stock);
    if (!safety.isSafe) {
      throw new Error('Food Safety Guard: Expired or damaged stock cannot be purchased.');
    }

    const availQty = Number(stock.availableQuantity) || 0;
    const offerQty = Number(buyerOfferInput.offeredQuantity);

    if (!offerQty || offerQty <= 0) {
      throw new Error('Offer quantity must be greater than zero.');
    }

    if (offerQty > availQty) {
      throw new Error(`Offer quantity (${offerQty} ${stock.unit}) exceeds available quantity (${availQty} ${stock.unit}).`);
    }

    const offerPrice = Number(buyerOfferInput.offeredPricePerUnit);
    if (offerPrice < 0) {
      throw new Error('Offered price cannot be negative.');
    }

    const buyerName = (buyerOfferInput.buyerName || '').trim() || 'Marketplace Buyer';
    const buyerPhone = (buyerOfferInput.buyerPhone || '').trim();
    const buyerType = buyerOfferInput.buyerType || 'Mandi Trader';
    const deliveryTerms = buyerOfferInput.deliveryTerms || DELIVERY_TERMS.PICKUP;
    const buyerMessage = (buyerOfferInput.message || '').trim();

    const nowIso = new Date().toISOString();
    const enquiryId = `enq_mkt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Create negotiation entry for the buyer's direct offer
    const initialNegotiation = [
      {
        id: `neg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
        timestamp: nowIso,
        responseType: 'counteroffer',
        offeredPrice: offerPrice,
        offeredQuantity: offerQty,
        pickupDeliveryTerms: deliveryTerms,
        conditions: buyerMessage,
        notes: `Direct Marketplace Offer from ${buyerName} (${buyerType}${buyerPhone ? ' • Tel: ' + buyerPhone : ''})`,
        recordedBy: 'buyer_marketplace'
      }
    ];

    const enquiry = {
      id: enquiryId,
      stockId: stock.id,
      userId: stock.userId, // Stored under seller's userId so it appears in their inbox!
      buyerId: null,
      buyerName: `${buyerName} (${buyerType})`,
      buyerName_mr: `${buyerName} (${buyerType})`,
      buyerPhone,
      isVerifiedBuyer: false,
      buyerType: 'marketplace_buyer',
      recoveryChannel: buyerOfferInput.recoveryChannel || 'bulk_buyers',
      availableQuantity: availQty,
      enquiryQuantity: offerQty,
      unit: stock.unit,
      proposedPricePerUnit: offerPrice,
      deliveryTerms,
      deliveryNotes: buyerMessage ? `Buyer message: "${buyerMessage}"` : '',
      status: ENQUIRY_STATUSES.COUNTEROFFER_RECEIVED,
      enquiryDate: nowIso,
      negotiationHistory: initialNegotiation,
      isManualRecording: false,
      syncStatus: 'synced',
      version: 1,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    // Save in seller's enquiry store
    const sellerEnquiries = this.enquiriesMemoryStore.get(stock.userId) || [];
    sellerEnquiries.push(enquiry);
    this.enquiriesMemoryStore.set(stock.userId, sellerEnquiries);

    try {
      if (db.stockEnquiries) {
        await db.stockEnquiries.put(enquiry);
      }
    } catch (e) {}

    await syncEngine.enqueueMutation({
      storeName: 'stockEnquiries',
      recordId: enquiry.id,
      operation: 'PUT',
      payload: enquiry,
      userId: stock.userId,
      isShared: true
    });

    // Update stock status to recovery in progress if it was available for recovery
    if (stock.status === STOCK_STATUSES.AVAILABLE_FOR_RECOVERY) {
      await this.updateStockStatus(
        stock.userId,
        stock.id,
        STOCK_STATUSES.RECOVERY_IN_PROGRESS,
        `Direct Marketplace Offer received from ${buyerName}: ${offerQty} ${stock.unit} @ ₹${offerPrice}/${stock.unit}`
      );
    }

    return {
      success: true,
      enquiryId: enquiry.id,
      stockId: stock.id,
      message_en: 'Offer successfully transmitted to seller! The seller will review this in their negotiation workspace.',
      message_mr: 'ऑफर यशस्वीरित्या विक्रेत्याकडे पाठवली आहे! विक्रेता त्यांच्या वर्कस्पेसमध्ये ही ऑफर तपासेल.'
    };
  }
}

export const unsoldStockService = new UnsoldStockService();
export default unsoldStockService;
