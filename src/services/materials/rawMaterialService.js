/**
 * MahaUdyam — Raw-Material Source and Route Finder Service
 * 
 * Capabilities:
 * - Phase 1: Verified raw-material catalog & supplier directory with offline persistence
 * - Phase 2: Intelligent source matching, MOQ suitability, road route distance & transport estimation
 * - Phase 3: Procurement enquiry workflows, quotation tracking, purchase orders & expense ledger
 */

import { db } from '../db/index.js';
import { syncEngine } from '../offline/syncEngine.js';
import { INITIAL_RAW_MATERIALS, RAW_MATERIAL_CATEGORIES } from '../../data/materials/initialRawMaterials.js';
import { travelCostService, TRANSPORT_MODES } from '../bazaar/travelCostService.js';

export function calculateStraightLineDistance(lat1, lon1, lat2, lon2) {
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

class RawMaterialService {
  constructor() {
    this.materialsMemory = new Map();
    this.enquiriesMemory = new Map(); // userId -> Array<EnquiryRecord>
    this.isInitialized = false;
  }

  async init() {
    if (this.isInitialized) return;

    // Seed in-memory map
    for (const mat of INITIAL_RAW_MATERIALS) {
      this.materialsMemory.set(mat.id, { ...mat });
    }

    try {
      if (typeof indexedDB !== 'undefined' && db && db.rawMaterialSuppliers) {
        if (!db.isOpen()) await db.open();
        const count = await db.rawMaterialSuppliers.count();
        if (count === 0) {
          await db.rawMaterialSuppliers.bulkPut(INITIAL_RAW_MATERIALS);
        }
      }
    } catch (e) {
      // Memory fallback
    }

    this.isInitialized = true;
  }

  // ==========================================================================
  // Phase 1: Directory & Supplier Catalog
  // ==========================================================================

  async getAllMaterials(filters = {}) {
    await this.init();
    let list = [];

    try {
      if (typeof indexedDB !== 'undefined' && db && db.rawMaterialSuppliers) {
        list = await db.rawMaterialSuppliers.toArray();
      }
    } catch (e) {
      list = [];
    }

    if (!list || list.length === 0) {
      list = Array.from(this.materialsMemory.values());
    }

    return list.filter((m) => {
      if (filters.category && filters.category !== 'all' && m.category !== filters.category) {
        return false;
      }
      if (filters.districtCode && Number(m.districtCode) !== Number(filters.districtCode)) {
        return false;
      }
      if (filters.talukaCode && Number(m.talukaCode) !== Number(filters.talukaCode)) {
        return false;
      }
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const name = (m.materialName || '').toLowerCase();
        const nameMr = (m.materialName_mr || '').toLowerCase();
        const sup = (m.supplierName || '').toLowerCase();
        const supMr = (m.supplierName_mr || '').toLowerCase();
        if (!name.includes(q) && !nameMr.includes(q) && !sup.includes(q) && !supMr.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }

  async getMaterialById(id) {
    await this.init();
    try {
      if (typeof indexedDB !== 'undefined' && db && db.rawMaterialSuppliers) {
        const item = await db.rawMaterialSuppliers.get(id);
        if (item) return item;
      }
    } catch (e) {}
    return this.materialsMemory.get(id) || null;
  }

  // ==========================================================================
  // Phase 2: Intelligent Source Matching & Road Route Finder
  // ==========================================================================

  /**
   * Matches suppliers with entrepreneur requirements, incorporating distance & road freight
   */
  async matchRawMaterialSources({
    userLocation = {}, // { coordinates: { lat, lng }, districtCode, talukaCode }
    category = 'all',
    searchQuery = '',
    quantityNeeded = 1,
    transportModeId = 'mini_truck'
  }) {
    await this.init();
    const allMaterials = await this.getAllMaterials({
      category,
      search: searchQuery
    });

    const results = allMaterials.map((mat) => {
      // 1. Distance Calculation (Haversine + Maharashtra 1.25 Circuity Multiplier)
      let straightKm = null;
      let estimatedRoadKm = null;

      if (userLocation?.coordinates && mat.coordinates) {
        straightKm = calculateStraightLineDistance(
          userLocation.coordinates.lat,
          userLocation.coordinates.lng,
          mat.coordinates.lat,
          mat.coordinates.lng
        );
        if (straightKm !== null) {
          estimatedRoadKm = Math.round(straightKm * 1.25 * 10) / 10;
        }
      }

      // 2. Freight & Travel Expense Estimation
      let estFreightCost = 0;
      if (estimatedRoadKm !== null) {
        // Round trip freight to collect materials
        const travelEst = travelCostService.calculateTravelCost({
          distanceKm: estimatedRoadKm,
          isRoadDistance: true,
          transportModeId
        });
        estFreightCost = travelEst?.travelCost || 0;
      }

      // 3. Purchase Cost & MOQ Suitability
      const requestedQty = Math.max(1, Number(quantityNeeded) || 1);
      const isMoqMet = requestedQty >= mat.minOrderQuantity;
      const orderVolume = isMoqMet ? requestedQty : mat.minOrderQuantity;
      const grossMaterialCost = Math.round(orderVolume * mat.pricePerUnit);
      const totalLandedCost = grossMaterialCost + estFreightCost;
      const landedCostPerUnit = Math.round((totalLandedCost / orderVolume) * 10) / 10;

      // 4. Suitability Scoring (0 - 100)
      let score = 50;
      if (isMoqMet) score += 20;
      else score -= 15; // penalty if user needs less than MOQ

      if (mat.verificationStatus === 'verified') score += 15;

      if (estimatedRoadKm !== null) {
        if (estimatedRoadKm <= 20) score += 15;
        else if (estimatedRoadKm <= 50) score += 10;
        else if (estimatedRoadKm <= 100) score += 5;
        else score -= 10;
      }

      score = Math.max(20, Math.min(98, score));

      // Explanation
      const distText = estimatedRoadKm !== null ? `${estimatedRoadKm} km road distance` : 'Location verified';
      const moqNotice_en = isMoqMet
        ? `Order quantity (${requestedQty} ${mat.unit}) satisfies minimum order quantity (${mat.minOrderQuantity} ${mat.unit}).`
        : `Order quantity (${requestedQty} ${mat.unit}) is below supplier minimum order (${mat.minOrderQuantity} ${mat.unit}). You would need to purchase ${mat.minOrderQuantity} ${mat.unit}.`;
      const moqNotice_mr = isMoqMet
        ? `खरेदी प्रमाण (${requestedQty} ${mat.unit}) पुरवठादाराच्या किमान मर्यादेत (${mat.minOrderQuantity} ${mat.unit}) बसते.`
        : `खरेदी प्रमाण (${requestedQty} ${mat.unit}) पुरवठादाराच्या किमान मर्यादेपेक्षा (${mat.minOrderQuantity} ${mat.unit}) कमी आहे.`;

      return {
        material: mat,
        score,
        straightKm,
        estimatedRoadKm,
        estFreightCost,
        orderVolume,
        isMoqMet,
        grossMaterialCost,
        totalLandedCost,
        landedCostPerUnit,
        moqNotice_en,
        moqNotice_mr,
        distText
      };
    });

    return results.sort((a, b) => b.score - a.score);
  }

  // ==========================================================================
  // Phase 3: Procurement & Supplier Interaction Workflows
  // ==========================================================================

  /**
   * Submit a procurement enquiry to a verified supplier
   */
  async createProcurementEnquiry(userId, enquiryInput) {
    if (!userId) throw new Error('Authentication required to create procurement enquiry.');
    if (!enquiryInput || !enquiryInput.materialId) throw new Error('Material ID is required.');

    await this.init();
    const mat = await this.getMaterialById(enquiryInput.materialId);
    if (!mat) throw new Error('Raw material record not found.');

    const qty = Number(enquiryInput.quantityNeeded);
    if (!qty || qty <= 0) throw new Error('Quantity needed must be greater than zero.');

    const nowIso = new Date().toISOString();
    const enquiryRecord = {
      id: `enq_mat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      supplierId: mat.supplierId,
      supplierName: mat.supplierName,
      supplierName_mr: mat.supplierName_mr,
      materialId: mat.id,
      materialName: mat.materialName,
      materialName_mr: mat.materialName_mr,
      category: mat.category,
      unit: mat.unit,
      catalogPrice: mat.pricePerUnit,
      quantityNeeded: qty,
      expectedDeliveryDate: enquiryInput.expectedDeliveryDate || null,
      deliveryLocation: enquiryInput.deliveryLocation || `${mat.village}, ${mat.taluka}`,
      status: 'enquiry_sent',
      quotation: null,
      purchaseConfirmation: null,
      enquiryNotes: enquiryInput.notes || '',
      syncStatus: typeof navigator !== 'undefined' && !navigator.onLine ? 'pending_sync' : 'synced',
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const userEnquiries = this.enquiriesMemory.get(userId) || [];
    userEnquiries.push(enquiryRecord);
    this.enquiriesMemory.set(userId, userEnquiries);

    try {
      if (typeof indexedDB !== 'undefined' && db && db.procurementEnquiries) {
        await db.procurementEnquiries.put(enquiryRecord);
      }
    } catch (e) {}

    await syncEngine.enqueueMutation({
      storeName: 'procurementEnquiries',
      recordId: enquiryRecord.id,
      operation: 'PUT',
      payload: enquiryRecord,
      userId
    });

    return enquiryRecord;
  }

  /**
   * Record a quotation response from the supplier
   */
  async recordSupplierQuotation(userId, enquiryId, quotationData) {
    if (!userId || !enquiryId) throw new Error('Missing enquiry ID or user ID.');

    const enquiries = this.enquiriesMemory.get(userId) || [];
    const enquiry = enquiries.find((e) => e.id === enquiryId);
    if (!enquiry) throw new Error('Procurement enquiry not found.');

    const quotedPrice = Number(quotationData.quotedPricePerUnit);
    if (quotedPrice < 0) throw new Error('Quoted price cannot be negative.');

    const freightCharges = Number(quotationData.freightCharges || 0);
    const validUntil = quotationData.validUntil || new Date(Date.now() + 7 * 86400000).toISOString();

    const nowIso = new Date().toISOString();
    enquiry.status = 'quotation_received';
    enquiry.quotation = {
      quotedPricePerUnit: quotedPrice,
      freightCharges,
      totalQuotationAmount: Math.round(quotedPrice * enquiry.quantityNeeded + freightCharges),
      paymentTerms: quotationData.paymentTerms || 'Payment upon delivery',
      deliveryLeadDays: quotationData.deliveryLeadDays || 3,
      validUntil,
      receivedAt: nowIso
    };
    enquiry.updatedAt = nowIso;

    try {
      if (typeof indexedDB !== 'undefined' && db && db.procurementEnquiries) {
        await db.procurementEnquiries.put(enquiry);
      }
    } catch (e) {}

    await syncEngine.enqueueMutation({
      storeName: 'procurementEnquiries',
      recordId: enquiry.id,
      operation: 'PUT',
      payload: enquiry,
      userId
    });

    return enquiry;
  }

  /**
   * Convert an accepted quotation into an authentic Purchase Order
   */
  async confirmPurchaseOrder(userId, enquiryId, confirmationInput = {}) {
    if (!userId || !enquiryId) throw new Error('Missing enquiry ID.');

    const enquiries = this.enquiriesMemory.get(userId) || [];
    const enquiry = enquiries.find((e) => e.id === enquiryId);
    if (!enquiry) throw new Error('Procurement enquiry not found.');

    if (!enquiry.quotation) {
      throw new Error('Cannot confirm purchase without a recorded supplier quotation.');
    }

    const agreedQty = Number(confirmationInput.agreedQuantity || enquiry.quantityNeeded);
    const agreedPrice = Number(confirmationInput.agreedPricePerUnit || enquiry.quotation.quotedPricePerUnit);
    const transportExpense = Number(confirmationInput.actualTransportExpense || enquiry.quotation.freightCharges);

    const grossPurchaseCost = Math.round(agreedQty * agreedPrice);
    const totalProcurementExpense = grossPurchaseCost + transportExpense;

    const nowIso = new Date().toISOString();
    enquiry.status = 'order_confirmed';
    enquiry.purchaseConfirmation = {
      poNumber: `PO-${Date.now().toString().slice(-6)}`,
      agreedQuantity: agreedQty,
      agreedPricePerUnit: agreedPrice,
      grossPurchaseCost,
      actualTransportExpense: transportExpense,
      totalProcurementExpense,
      paymentStatus: confirmationInput.paymentStatus || 'pending_payment',
      confirmedAt: nowIso
    };
    enquiry.updatedAt = nowIso;

    try {
      if (typeof indexedDB !== 'undefined' && db && db.procurementEnquiries) {
        await db.procurementEnquiries.put(enquiry);
      }
    } catch (e) {}

    await syncEngine.enqueueMutation({
      storeName: 'procurementEnquiries',
      recordId: enquiry.id,
      operation: 'PUT',
      payload: enquiry,
      userId
    });

    return enquiry;
  }

  /**
   * Get procurement enquiry history isolated strictly by userId
   */
  async getEnquiryHistory(userId) {
    if (!userId) return [];
    await this.init();

    let list = [];
    try {
      if (typeof indexedDB !== 'undefined' && db && db.procurementEnquiries) {
        list = await db.procurementEnquiries.where('userId').equals(userId).toArray();
      }
    } catch (e) {
      list = [];
    }

    if (!list || list.length === 0) {
      list = this.enquiriesMemory.get(userId) || [];
    }

    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Synchronize pending procurement enquiries
   */
  async syncPendingEnquiries(userId) {
    if (!userId) return { synchronizedCount: 0 };
    let synced = 0;
    const userEnquiries = this.enquiriesMemory.get(userId) || [];
    for (const enq of userEnquiries) {
      if (enq.syncStatus === 'pending_sync') {
        enq.syncStatus = 'synced';
        synced++;
        try {
          if (db.procurementEnquiries) await db.procurementEnquiries.put(enq);
        } catch (e) {}
      }
    }
    return { synchronizedCount: synced };
  }
}

export const rawMaterialService = new RawMaterialService();
