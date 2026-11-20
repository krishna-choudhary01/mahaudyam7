/**
 * MahaUdyam — Shared Resource Matcher Service
 * 
 * Capabilities:
 * - Phase 1: Verified agricultural machinery, processing equipment & cold storage asset catalog
 * - Phase 2: Requirement compatibility matching, capacity checks, road circuity distance & rental cost estimation
 * - Phase 3: Booking lifecycle (request, confirm, in-use, return), condition inspection, deposit refund & net expense ledger
 */

import { db } from '../db/index.js';
import { syncEngine } from '../offline/syncEngine.js';
import { INITIAL_SHARED_RESOURCES, RESOURCE_CATEGORIES } from '../../data/resources/initialSharedResources.js';
import { calculateStraightLineDistance } from '../materials/rawMaterialService.js';

class SharedResourceService {
  constructor() {
    this.resourcesMemory = new Map();
    this.bookingsMemory = new Map(); // userId -> Array<BookingRecord>
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;

    // Seed in-memory map
    for (const res of INITIAL_SHARED_RESOURCES) {
      this.resourcesMemory.set(res.id, { ...res });
    }

    try {
      if (typeof indexedDB !== 'undefined' && db && db.sharedResources) {
        if (!db.isOpen()) await db.open();
        const count = await db.sharedResources.count();
        if (count === 0) {
          await db.sharedResources.bulkPut(INITIAL_SHARED_RESOURCES);
        }
      }
    } catch (e) {
      // Memory fallback
    }

    this.isInitialized = true;
  }

  // ==========================================================================
  // Phase 1: Resource Catalog & Asset Directory
  // ==========================================================================

  async getAllResources(filters = {}) {
    await this.init();
    let list = [];

    try {
      if (typeof indexedDB !== 'undefined' && db && db.sharedResources) {
        list = await db.sharedResources.toArray();
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
      if (filters.districtCode && Number(r.districtCode) !== Number(filters.districtCode)) {
        return false;
      }
      if (filters.talukaCode && Number(r.talukaCode) !== Number(filters.talukaCode)) {
        return false;
      }
      if (filters.availabilityStatus && filters.availabilityStatus !== 'all' && r.availabilityStatus !== filters.availabilityStatus) {
        return false;
      }
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const name = (r.resourceName || '').toLowerCase();
        const nameMr = (r.resourceName_mr || '').toLowerCase();
        const owner = (r.ownerName || '').toLowerCase();
        const ownerMr = (r.ownerName_mr || '').toLowerCase();
        const specs = (r.specifications || '').toLowerCase();
        if (!name.includes(q) && !nameMr.includes(q) && !owner.includes(q) && !ownerMr.includes(q) && !specs.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }

  async getResourceById(id) {
    await this.init();
    try {
      if (typeof indexedDB !== 'undefined' && db && db.sharedResources) {
        const item = await db.sharedResources.get(id);
        if (item) return item;
      }
    } catch (e) {}
    return this.resourcesMemory.get(id) || null;
  }

  // ==========================================================================
  // Phase 2: Requirement Compatibility Matching & Rental Estimator
  // ==========================================================================

  /**
   * Matches entrepreneur requirements with shared equipment & storage facilities
   */
  async matchSharedResources({
    userLocation = {}, // { coordinates: { lat, lng }, districtCode, talukaCode }
    category = 'all',
    productQuery = '',
    durationUnits = 1,
    durationType = 'day'
  }) {
    await this.init();
    const allResources = await this.getAllResources({ category });

    const results = allResources.map((res) => {
      // 1. Distance Calculation (Haversine + 1.25 Circuity)
      let straightKm = null;
      let estimatedRoadKm = null;

      if (userLocation?.coordinates && res.coordinates) {
        straightKm = calculateStraightLineDistance(
          userLocation.coordinates.lat,
          userLocation.coordinates.lng,
          res.coordinates.lat,
          res.coordinates.lng
        );
        if (straightKm !== null) {
          estimatedRoadKm = Math.round(straightKm * 1.25 * 10) / 10;
        }
      }

      // 2. Product Suitability Matching
      let isProductCompatible = true;
      let matchedProduct = null;
      if (productQuery && productQuery.trim()) {
        const q = productQuery.toLowerCase().trim();
        const suitable = (res.suitableProducts || []).map((p) => p.toLowerCase());
        const suitableMr = (res.suitableProducts_mr || []).map((p) => p.toLowerCase());
        const foundIdx = suitable.findIndex((p) => p.includes(q) || q.includes(p));
        const foundIdxMr = suitableMr.findIndex((p) => p.includes(q) || q.includes(p));

        if (foundIdx === -1 && foundIdxMr === -1) {
          isProductCompatible = false;
        } else {
          matchedProduct = foundIdx !== -1 ? res.suitableProducts[foundIdx] : res.suitableProducts_mr[foundIdxMr];
        }
      }

      // 3. Rental Expense Calculation
      const duration = Math.max(res.minRentalDuration || 1, Number(durationUnits) || 1);
      const grossRentalFee = Math.round(duration * res.rentalRate);
      const operatorFee = res.requiresOperator ? Math.round(duration * (res.operatorCostPerDay || 0)) : 0;
      const totalEstimatedRentalExpense = grossRentalFee + operatorFee;
      const refundableDeposit = res.depositAmount || 0;

      // 4. Suitability Scoring (0 - 100)
      let score = 55;
      if (res.availabilityStatus === 'available') score += 15;
      else if (res.availabilityStatus === 'rented') score -= 20;

      if (isProductCompatible) score += 15;
      else score -= 25;

      if (res.verificationStatus === 'verified') score += 10;

      if (estimatedRoadKm !== null) {
        if (estimatedRoadKm <= 15) score += 10;
        else if (estimatedRoadKm <= 40) score += 5;
        else if (estimatedRoadKm > 70) score -= 15;
      }

      score = Math.max(15, Math.min(99, score));

      // Explanation
      const compReason_en = isProductCompatible
        ? (matchedProduct ? `Suitable for your product: "${matchedProduct}".` : 'General equipment compatibility confirmed.')
        : `Primary suitability is for ${res.suitableProducts.slice(0, 3).join(', ')}.`;
      const compReason_mr = isProductCompatible
        ? (matchedProduct ? `तुमच्या उत्पादनासाठी योग्य: "${matchedProduct}".` : 'यंत्रसामग्रीची सुसंगतता योग्य आहे.')
        : `हे साधन प्रामुख्याने ${(res.suitableProducts_mr || res.suitableProducts).slice(0, 3).join(', ')} साठी शिफारस केलेले आहे.`;

      return {
        resource: res,
        score,
        straightKm,
        estimatedRoadKm,
        durationApplied: duration,
        grossRentalFee,
        operatorFee,
        totalEstimatedRentalExpense,
        refundableDeposit,
        isProductCompatible,
        compReason_en,
        compReason_mr
      };
    });

    return results.sort((a, b) => b.score - a.score);
  }

  // ==========================================================================
  // Phase 3: Booking Workflow, Return Inspection & Net Asset Ledger
  // ==========================================================================

  /**
   * Submit a booking request for a shared asset
   */
  async createBookingRequest(userId, bookingInput) {
    if (!userId) throw new Error('Authentication required to book a shared resource.');
    if (!bookingInput || !bookingInput.resourceId) throw new Error('Resource ID is required.');

    await this.init();
    const res = await this.getResourceById(bookingInput.resourceId);
    if (!res) throw new Error('Shared resource record not found.');

    const duration = Math.max(res.minRentalDuration || 1, Number(bookingInput.durationUnits) || 1);
    const grossRentalFee = Math.round(duration * res.rentalRate);
    const operatorFee = res.requiresOperator ? Math.round(duration * (res.operatorCostPerDay || 0)) : 0;
    const estTotalCost = grossRentalFee + operatorFee;

    const nowIso = new Date().toISOString();
    const bookingRecord = {
      id: `bk_res_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      resourceId: res.id,
      resourceName: res.resourceName,
      resourceName_mr: res.resourceName_mr,
      category: res.category,
      ownerName: res.ownerName,
      ownerName_mr: res.ownerName_mr,
      ownerPhone: res.contactPhone,
      startDate: bookingInput.startDate || nowIso.split('T')[0],
      endDate: bookingInput.endDate || null,
      durationUnits: duration,
      rateUnit: res.rateUnit,
      ratePerUnit: res.rentalRate,
      grossRentalFee,
      operatorFee,
      depositAmount: res.depositAmount || 0,
      estimatedTotalCost: estTotalCost,
      bookingStatus: 'booking_requested', // booking_requested | confirmed | in_use | returned | cancelled
      plannedUse: bookingInput.plannedUse || '',
      notes: bookingInput.notes || '',
      returnDetails: null,
      syncStatus: typeof navigator !== 'undefined' && !navigator.onLine ? 'pending_sync' : 'synced',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const userBookings = this.bookingsMemory.get(userId) || [];
    userBookings.push(bookingRecord);
    this.bookingsMemory.set(userId, userBookings);

    try {
      if (typeof indexedDB !== 'undefined' && db && db.resourceBookings) {
        await db.resourceBookings.put(bookingRecord);
      }
    } catch (e) {}

    await syncEngine.enqueueMutation({
      storeName: 'resourceBookings',
      recordId: bookingRecord.id,
      operation: 'PUT',
      payload: bookingRecord,
      userId
    });

    return bookingRecord;
  }

  /**
   * Confirm a requested booking
   */
  async confirmBooking(userId, bookingId) {
    if (!userId || !bookingId) throw new Error('Missing user or booking ID.');
    const bookings = this.bookingsMemory.get(userId) || [];
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error('Booking record not found.');

    const nowIso = new Date().toISOString();
    booking.bookingStatus = 'confirmed';
    booking.updatedAt = nowIso;

    try {
      if (typeof indexedDB !== 'undefined' && db && db.resourceBookings) {
        await db.resourceBookings.put(booking);
      }
    } catch (e) {}

    await syncEngine.enqueueMutation({
      storeName: 'resourceBookings',
      recordId: booking.id,
      operation: 'PUT',
      payload: booking,
      userId
    });

    return booking;
  }

  /**
   * Mark resource as actively in use by entrepreneur
   */
  async startResourceUse(userId, bookingId) {
    if (!userId || !bookingId) throw new Error('Missing user or booking ID.');
    const bookings = this.bookingsMemory.get(userId) || [];
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error('Booking record not found.');

    const nowIso = new Date().toISOString();
    booking.bookingStatus = 'in_use';
    booking.updatedAt = nowIso;

    try {
      if (typeof indexedDB !== 'undefined' && db && db.resourceBookings) {
        await db.resourceBookings.put(booking);
      }
    } catch (e) {}

    await syncEngine.enqueueMutation({
      storeName: 'resourceBookings',
      recordId: booking.id,
      operation: 'PUT',
      payload: booking,
      userId
    });

    return booking;
  }

  /**
   * Record return of shared equipment with condition assessment & net expense reconciliation
   */
  async recordReturnAndSettlement(userId, bookingId, returnData = {}) {
    if (!userId || !bookingId) throw new Error('Missing user or booking ID.');
    const bookings = this.bookingsMemory.get(userId) || [];
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error('Booking record not found.');

    const actualRentalCost = Number(returnData.actualRentalCost || booking.grossRentalFee);
    const actualOperatorExpense = Number(returnData.actualOperatorExpense || booking.operatorFee);
    const actualFuelExpense = Number(returnData.actualFuelExpense || 0);
    const depositDeductions = Number(returnData.depositDeductions || 0);
    const depositRefunded = Math.max(0, (booking.depositAmount || 0) - depositDeductions);
    const totalNetExpense = actualRentalCost + actualOperatorExpense + actualFuelExpense + depositDeductions;

    const nowIso = new Date().toISOString();
    booking.bookingStatus = 'returned';
    booking.returnDetails = {
      returnDate: returnData.returnDate || nowIso.split('T')[0],
      equipmentCondition: returnData.equipmentCondition || 'good', // good | minor_wear | damaged
      actualRentalCost,
      actualOperatorExpense,
      actualFuelExpense,
      depositDeductions,
      depositRefunded,
      totalNetExpense,
      reconciliationNotes: returnData.notes || 'Asset returned in sound operational order.'
    };
    booking.updatedAt = nowIso;

    try {
      if (typeof indexedDB !== 'undefined' && db && db.resourceBookings) {
        await db.resourceBookings.put(booking);
      }
    } catch (e) {}

    await syncEngine.enqueueMutation({
      storeName: 'resourceBookings',
      recordId: booking.id,
      operation: 'PUT',
      payload: booking,
      userId
    });

    return booking;
  }

  /**
   * Retrieve bookings isolated strictly to requesting user
   */
  async getUserBookings(userId) {
    if (!userId) return [];
    await this.init();

    let list = [];
    try {
      if (typeof indexedDB !== 'undefined' && db && db.resourceBookings) {
        list = await db.resourceBookings.where('userId').equals(userId).toArray();
      }
    } catch (e) {
      list = [];
    }

    if (!list || list.length === 0) {
      list = this.bookingsMemory.get(userId) || [];
    }

    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Synchronize pending bookings
   */
  async syncPendingBookings(userId) {
    if (!userId) return { synchronizedCount: 0 };
    let synced = 0;
    const userBookings = this.bookingsMemory.get(userId) || [];
    for (const bk of userBookings) {
      if (bk.syncStatus === 'pending_sync') {
        bk.syncStatus = 'synced';
        synced++;
        try {
          if (db.resourceBookings) await db.resourceBookings.put(bk);
        } catch (e) {}
      }
    }
    return { synchronizedCount: synced };
  }
}

export const sharedResourceService = new SharedResourceService();
