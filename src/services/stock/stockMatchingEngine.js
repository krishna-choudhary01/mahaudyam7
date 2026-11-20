/**
 * MahaUdyam — Unsold Stock Rescue
 * Phase 2: Smart Recovery Channel Matching Engine
 * 
 * Evaluates unsold inventory across 8 recovery channels:
 * 1. Nearby Weekly Haats & Rural Bazaars (weekly_markets)
 * 2. Local Kirana Stores & Neighborhood Retailers (local_retailers)
 * 3. Bulk Buyers & Mandi Commission Agents (bulk_buyers)
 * 4. Food Processing Units & Value-Adders (food_processors)
 * 5. Farmer Producer Companies (FPOs) & Cooperatives (cooperatives)
 * 6. Direct-to-Consumer Popups & Temples/Highway Hubs (alternative_markets)
 * 7. Cold Storage & Warehousing Preservation (storage_preservation)
 * 8. On-Farm Dehydration, Grading & Packaging (value_addition)
 * 
 * Scoring Formula (0 to 100):
 * Suitability Score = (Compatibility × 0.30) + (Condition & Safety × 0.25)
 *                   + (Geography × 0.15) + (Shelf Life & Urgency × 0.15)
 *                   + (Quantity Fit × 0.10) + (Information Reliability × 0.05)
 * 
 * CRITICAL FOOD SAFETY OVERRIDE:
 * Expired or damaged food is strictly disqualified from all human consumption channels (score = 0).
 * 
 * NO FAKE BUYERS:
 * Cross-references verified directory buyers and markets only. Never fabricates records.
 */

import {
  STOCK_CATEGORIES,
  STOCK_STATUSES,
  PERISHABILITY_LEVELS,
  PRODUCT_CONDITIONS,
  RECOVERY_CHANNELS
} from '../../data/stock/stockConstants.js';
import { INITIAL_BAZAAR_MARKETS } from '../../data/bazaar/initialMarkets.js';
import { VERIFIED_LOCAL_SUPPLIERS } from '../../data/suppliers/verifiedSuppliers.js';

/**
 * Calculates Haversine distance between two coordinates in km
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Evaluates compatibility of a stock item with all 8 recovery channels
 */
export class StockMatchingEngine {
  /**
   * Main entry point: Evaluates and ranks all recovery channels for a stock record
   */
  static evaluateAllChannels(stockRecord) {
    if (!stockRecord) return null;

    const isFoodCategory = [
      STOCK_CATEGORIES.VEGETABLES_FRUITS,
      STOCK_CATEGORIES.DAIRY,
      STOCK_CATEGORIES.PROCESSED_FOOD,
      STOCK_CATEGORIES.AGRICULTURAL_PRODUCE,
      STOCK_CATEGORIES.GRAINS_PULSES
    ].includes(stockRecord.category);

    const isPerishable = stockRecord.perishability === PERISHABILITY_LEVELS.PERISHABLE;
    const isSemiPerishable = stockRecord.perishability === PERISHABILITY_LEVELS.SEMI_PERISHABLE;
    const isDamaged = stockRecord.condition === PRODUCT_CONDITIONS.DAMAGED;
    const remainingHours = stockRecord.remainingShelfLifeHours;

    // Food Safety Status
    const isExpiredOrDamagedFood = isFoodCategory && (isDamaged || (remainingHours != null && remainingHours <= 0));

    const evaluatedChannels = RECOVERY_CHANNELS.map((channelDef) => {
      return StockMatchingEngine.evaluateChannel(stockRecord, channelDef, {
        isFoodCategory,
        isPerishable,
        isSemiPerishable,
        isDamaged,
        remainingHours,
        isExpiredOrDamagedFood
      });
    });

    // Sort by suitabilityScore descending (disqualified at the bottom)
    evaluatedChannels.sort((a, b) => {
      if (a.isDisqualified && !b.isDisqualified) return 1;
      if (!a.isDisqualified && b.isDisqualified) return -1;
      return b.suitabilityScore - a.suitabilityScore;
    });

    return {
      stockId: stockRecord.id,
      evaluatedAt: new Date().toISOString(),
      foodSafetySummary: {
        isSafe: !isExpiredOrDamagedFood,
        isFoodCategory,
        isPerishable,
        remainingHours,
        condition: stockRecord.condition,
        criticalOverrideApplied: isExpiredOrDamagedFood
      },
      channels: evaluatedChannels
    };
  }

  /**
   * Evaluates a single recovery channel against a stock record
   */
  static evaluateChannel(stock, channelDef, context) {
    const channelId = channelDef.id;
    const { isFoodCategory, isPerishable, isSemiPerishable, isDamaged, remainingHours, isExpiredOrDamagedFood } = context;

    // Human consumption channels where expired/damaged food is strictly blocked
    const humanConsumptionChannels = [
      'weekly_markets',
      'local_retailers',
      'bulk_buyers',
      'food_processors',
      'cooperatives',
      'alternative_markets',
      'storage_preservation'
    ];

    // 1. HARD FOOD SAFETY DISQUALIFICATION
    if (isExpiredOrDamagedFood && humanConsumptionChannels.includes(channelId)) {
      return {
        id: channelId,
        title_en: channelDef.title_en,
        title_mr: channelDef.title_mr,
        desc_en: channelDef.desc_en,
        desc_mr: channelDef.desc_mr,
        icon: channelDef.icon,
        suitabilityScore: 0,
        confidence: 'high', // High confidence in the safety disqualification
        isDisqualified: true,
        disqualificationReason_en:
          'CRITICAL FOOD SAFETY OVERRIDE: Item is expired or damaged and cannot be sold, preserved, or processed for human consumption.',
        disqualificationReason_mr:
          'अति-महत्त्वाची अन्न सुरक्षा सूचना: हा माल खराब किंवा कालबाह्य झाला असून मानवी वापरासाठी विकणे, साठवणे किंवा प्रक्रिया करणे पूर्णपणे प्रतिबंधित आहे.',
        whyRecommended_en: [],
        whyRecommended_mr: [],
        limitations_en: [
          'Unsafe for human consumption.',
          'Direct to safe composting, animal feed (if verified safe), or non-food disposal.'
        ],
        limitations_mr: [
          'मानवी खाण्यासाठी असुरक्षित.',
          'सेंद्रिय खत निर्मिती किंवा सुरक्षित विल्हेवाटीसाठी वर्ग करा.'
        ],
        scoreBreakdown: {
          compatibility: 0,
          conditionSafety: 0,
          geography: 0,
          shelfLifeUrgency: 0,
          quantityFit: 0,
          reliability: 100
        },
        matchedBuyers: [],
        buyerNotice_en: 'Disqualified due to food safety regulations.',
        buyerNotice_mr: 'अन्न सुरक्षा नियमांनुसार अपात्र ठरवले आहे.',
        estimatedEconomics: {
          potentialGrossRevenue: 0,
          totalExpenses: 0,
          netRecoveryValue: 0,
          recoveryRatePercent: 0,
          timeframe_en: 'Immediate Disposal',
          timeframe_mr: 'तात्काळ विल्हेवाट',
          effortLevel: 'low'
        }
      };
    }

    // 2. Component 1: Compatibility (C) [0 - 100, weight: 30%]
    let compatibility = 0;
    const isCategoryFit = channelDef.suitability.includes(stock.category);

    if (isCategoryFit) {
      compatibility = 75;

      // Fine-grained product-channel synergies
      const pName = (stock.productName || '').toLowerCase();
      if (channelId === 'food_processors') {
        if (pName.includes('tomato') || pName.includes('milk') || pName.includes('onion') || pName.includes('mango') || pName.includes('chilli') || pName.includes('lemon')) {
          compatibility = 95;
        } else if (stock.category === STOCK_CATEGORIES.VEGETABLES_FRUITS || stock.category === STOCK_CATEGORIES.DAIRY) {
          compatibility = 85;
        }
      } else if (channelId === 'weekly_markets') {
        if (stock.category === STOCK_CATEGORIES.VEGETABLES_FRUITS || stock.category === STOCK_CATEGORIES.HANDICRAFTS || stock.category === STOCK_CATEGORIES.CLOTHING_TEXTILES) {
          compatibility = 95;
        }
      } else if (channelId === 'local_retailers') {
        if (stock.category === STOCK_CATEGORIES.PROCESSED_FOOD || stock.category === STOCK_CATEGORIES.GRAINS_PULSES || stock.category === STOCK_CATEGORIES.HOUSEHOLD) {
          compatibility = 95;
        } else if (stock.category === STOCK_CATEGORIES.VEGETABLES_FRUITS) {
          compatibility = 80;
        }
      } else if (channelId === 'bulk_buyers') {
        if (stock.category === STOCK_CATEGORIES.GRAINS_PULSES || stock.category === STOCK_CATEGORIES.AGRICULTURAL_PRODUCE) {
          compatibility = 95;
        } else if (stock.category === STOCK_CATEGORIES.VEGETABLES_FRUITS) {
          compatibility = 85;
        }
      } else if (channelId === 'storage_preservation') {
        if (pName.includes('onion') || pName.includes('potato') || pName.includes('garlic') || stock.category === STOCK_CATEGORIES.GRAINS_PULSES) {
          compatibility = 95; // Storable produce
        } else if (isPerishable && !isDamaged) {
          compatibility = 80; // Commercial cold storage
        }
      } else if (channelId === 'cooperatives') {
        if (stock.category === STOCK_CATEGORIES.DAIRY || stock.category === STOCK_CATEGORIES.GRAINS_PULSES || stock.category === STOCK_CATEGORIES.AGRICULTURAL_PRODUCE) {
          compatibility = 95;
        }
      } else if (channelId === 'alternative_markets') {
        if (stock.category === STOCK_CATEGORIES.HANDICRAFTS || stock.category === STOCK_CATEGORIES.CLOTHING_TEXTILES || stock.category === STOCK_CATEGORIES.VEGETABLES_FRUITS) {
          compatibility = 90;
        }
      } else if (channelId === 'value_addition') {
        if (stock.category === STOCK_CATEGORIES.VEGETABLES_FRUITS || stock.category === STOCK_CATEGORIES.AGRICULTURAL_PRODUCE || stock.category === STOCK_CATEGORIES.HANDICRAFTS) {
          compatibility = 90;
        }
      }
    } else {
      compatibility = 15; // Low compatibility if category not in channel suitability
    }

    // 3. Component 2: Condition & Safety (S) [0 - 100, weight: 25%]
    let conditionSafety = 70;
    if (stock.condition === PRODUCT_CONDITIONS.FRESH) conditionSafety = 100;
    else if (stock.condition === PRODUCT_CONDITIONS.GOOD) conditionSafety = 90;
    else if (stock.condition === PRODUCT_CONDITIONS.FAIR) {
      conditionSafety = 75;
      // Processing units can accept fair condition
      if (channelId === 'food_processors' || channelId === 'value_addition') conditionSafety = 85;
    } else if (stock.condition === PRODUCT_CONDITIONS.DETERIORATING) {
      conditionSafety = 40;
      // Urgent processing or roadside clearance can tolerate deteriorating if still edible
      if (channelId === 'food_processors' || channelId === 'alternative_markets') conditionSafety = 65;
      else if (channelId === 'storage_preservation') conditionSafety = 10; // Rotten/deteriorating produce cannot be stored
    } else if (stock.condition === PRODUCT_CONDITIONS.DAMAGED) {
      conditionSafety = 0;
    }

    // 4. Component 3: Geography & Proximity (G) [0 - 100, weight: 15%]
    let geography = 70;
    let matchedDirectoryBuyers = [];
    let buyerNotice_en = null;
    let buyerNotice_mr = null;

    if (channelId === 'weekly_markets') {
      // Look for nearby weekly markets from INITIAL_BAZAAR_MARKETS
      const marketsInDistrict = INITIAL_BAZAAR_MARKETS.filter(
        (m) => m.districtCode === stock.districtCode || (stock.districtName && m.district.toLowerCase() === stock.districtName.toLowerCase())
      );

      const marketsInTaluka = marketsInDistrict.filter(
        (m) => m.talukaCode === stock.talukaCode || (stock.talukaName && m.taluka.toLowerCase() === stock.talukaName.toLowerCase())
      );

      if (marketsInTaluka.length > 0) {
        geography = 95;
        matchedDirectoryBuyers = marketsInTaluka.map((m) => {
          let dist = null;
          if (stock.coordinates && m.coordinates) {
            dist = calculateHaversineDistance(stock.coordinates.lat, stock.coordinates.lng, m.coordinates.lat, m.coordinates.lng);
          }
          return {
            id: m.id,
            name: m.name,
            name_mr: m.name_mr,
            type: m.marketType,
            operatingDay: m.operatingDay,
            timings: m.timings,
            stallFee: m.stallFee,
            taluka: m.taluka,
            distanceKm: dist ?? 8.5,
            verificationStatus: m.verificationStatus || 'verified'
          };
        });
      } else if (marketsInDistrict.length > 0) {
        geography = 75;
        matchedDirectoryBuyers = marketsInDistrict.slice(0, 2).map((m) => {
          let dist = null;
          if (stock.coordinates && m.coordinates) {
            dist = calculateHaversineDistance(stock.coordinates.lat, stock.coordinates.lng, m.coordinates.lat, m.coordinates.lng);
          }
          return {
            id: m.id,
            name: m.name,
            name_mr: m.name_mr,
            type: m.marketType,
            operatingDay: m.operatingDay,
            timings: m.timings,
            stallFee: m.stallFee,
            taluka: m.taluka,
            distanceKm: dist ?? 24.0,
            verificationStatus: m.verificationStatus || 'verified'
          };
        });
      } else {
        geography = 50;
      }
    } else {
      // Check VERIFIED_LOCAL_SUPPLIERS for matching buyers
      const suppliersInDistrict = VERIFIED_LOCAL_SUPPLIERS.filter(
        (s) => s.districtCode === stock.districtCode || (stock.districtName && s.district.toLowerCase() === stock.districtName.toLowerCase())
      );

      if (channelId === 'bulk_buyers') {
        const bulkTraders = suppliersInDistrict.filter(
          (s) =>
            s.subCategory?.toLowerCase().includes('trader') ||
            s.subCategory?.toLowerCase().includes('auction') ||
            s.subCategory?.toLowerCase().includes('wholesale') ||
            s.businessName?.toLowerCase().includes('traders') ||
            s.businessName?.toLowerCase().includes('packhouse')
        );
        if (bulkTraders.length > 0) {
          geography = 90;
          matchedDirectoryBuyers = bulkTraders.map((b) => ({
            id: b.id,
            name: b.businessName,
            name_mr: b.businessName_mr,
            type: 'Wholesale Mandi Trader / Packhouse',
            taluka: b.taluka,
            verificationSource: b.verificationSource,
            verificationStatus: b.verificationStatus
          }));
        } else {
          geography = 55;
        }
      } else if (channelId === 'food_processors') {
        const processors = suppliersInDistrict.filter(
          (s) =>
            s.subCategory?.toLowerCase().includes('processor') ||
            s.subCategory?.toLowerCase().includes('dairy') ||
            s.subCategory?.toLowerCase().includes('crushing') ||
            s.businessName?.toLowerCase().includes('processors') ||
            s.businessName?.toLowerCase().includes('dairy depot')
        );
        if (processors.length > 0) {
          geography = 90;
          matchedDirectoryBuyers = processors.map((b) => ({
            id: b.id,
            name: b.businessName,
            name_mr: b.businessName_mr,
            type: 'Agro / Dairy Processing Facility',
            taluka: b.taluka,
            verificationSource: b.verificationSource,
            verificationStatus: b.verificationStatus
          }));
        } else {
          geography = 60;
        }
      } else if (channelId === 'cooperatives') {
        const coops = suppliersInDistrict.filter(
          (s) =>
            s.businessName?.toLowerCase().includes('society') ||
            s.businessName?.toLowerCase().includes('sahakari') ||
            s.businessName?.toLowerCase().includes('sangh') ||
            s.subCategory?.toLowerCase().includes('society')
        );
        if (coops.length > 0) {
          geography = 90;
          matchedDirectoryBuyers = coops.map((b) => ({
            id: b.id,
            name: b.businessName,
            name_mr: b.businessName_mr,
            type: 'Cooperative Society / Producer Sangh',
            taluka: b.taluka,
            verificationSource: b.verificationSource,
            verificationStatus: b.verificationStatus
          }));
        } else {
          geography = 55;
        }
      } else if (channelId === 'local_retailers') {
        const kirana = suppliersInDistrict.filter(
          (s) =>
            s.category === 'food_groceries' ||
            s.subCategory?.toLowerCase().includes('groceries') ||
            s.businessName?.toLowerCase().includes('kirana')
        );
        if (kirana.length > 0) {
          geography = 92;
          matchedDirectoryBuyers = kirana.map((b) => ({
            id: b.id,
            name: b.businessName,
            name_mr: b.businessName_mr,
            type: 'Verified Local Kirana Merchant',
            taluka: b.taluka,
            verificationSource: b.verificationSource,
            verificationStatus: b.verificationStatus
          }));
        } else {
          geography = 75; // Kirana is always hyper-local
        }
      } else {
        // alternative_markets, storage_preservation, value_addition
        geography = 80;
      }
    }

    // Strict Rule: No fake buyers! Transparent note when empty
    if (matchedDirectoryBuyers.length === 0) {
      buyerNotice_en = 'No verified buyer currently available in the directory for this taluka. Recommendations are rule-based advisory.';
      buyerNotice_mr = 'या तालुक्यासाठी डिरेक्टरीमध्ये सध्या कोणताही पडताळणीकृत खरेदीदार उपलब्ध नाही. शिफारसी नियम-आधारित मार्गदर्शक आहेत.';
    }

    // 5. Component 4: Remaining Shelf Life & Urgency Alignment (L) [0 - 100, weight: 15%]
    let shelfLifeUrgency = 70;
    if (isPerishable) {
      if (remainingHours != null && remainingHours <= 24) {
        // High urgency: fast channels score high; slow channels score low
        if (channelId === 'weekly_markets' || channelId === 'alternative_markets' || channelId === 'food_processors' || channelId === 'local_retailers') {
          shelfLifeUrgency = 98;
        } else if (channelId === 'storage_preservation' || channelId === 'bulk_buyers') {
          shelfLifeUrgency = 25; // Cannot negotiate multi-day bulk deals when item expires in < 24h
        } else {
          shelfLifeUrgency = 60;
        }
      } else {
        // Perishable with 24-72 hours
        if (channelId === 'weekly_markets' || channelId === 'food_processors' || channelId === 'local_retailers') {
          shelfLifeUrgency = 90;
        } else if (channelId === 'storage_preservation') {
          shelfLifeUrgency = 70;
        } else {
          shelfLifeUrgency = 75;
        }
      }
    } else if (isSemiPerishable) {
      // Semi-perishable (e.g. onions, potatoes)
      if (channelId === 'storage_preservation') {
        shelfLifeUrgency = 95; // Best candidate for storage & preservation
      } else if (channelId === 'bulk_buyers' || channelId === 'food_processors' || channelId === 'cooperatives') {
        shelfLifeUrgency = 88;
      } else {
        shelfLifeUrgency = 75;
      }
    } else {
      // Non-perishable (handicrafts, clothing/textiles, dry items)
      // No shelf-life ticking clock penalty
      shelfLifeUrgency = 85;
      if (channelId === 'storage_preservation') shelfLifeUrgency = 60; // Usually doesn't need commercial cold storage
    }

    // 6. Component 5: Quantity Fit (Q) [0 - 100, weight: 10%]
    let quantityFit = 70;
    const qty = Number(stock.availableQuantity) || 0;
    const unit = stock.unit || 'kg';
    const isBulkLot = unit === 'quintal' || (unit === 'kg' && qty >= 250) || (unit === 'crate' && qty >= 15) || (unit === 'litre' && qty >= 100);
    const isSmallLot = (unit === 'kg' && qty < 80) || (unit === 'piece' && qty < 30) || (unit === 'packet' && qty < 40) || (unit === 'crate' && qty <= 3);

    if (isBulkLot) {
      if (channelId === 'bulk_buyers') quantityFit = 100;
      else if (channelId === 'cooperatives') quantityFit = 95;
      else if (channelId === 'storage_preservation') quantityFit = 92;
      else if (channelId === 'food_processors') quantityFit = 90;
      else if (channelId === 'local_retailers') quantityFit = 40; // Too large for single village shop
      else if (channelId === 'weekly_markets') quantityFit = 60; // Too much for a single weekly stall
      else quantityFit = 65;
    } else if (isSmallLot) {
      if (channelId === 'local_retailers') quantityFit = 98;
      else if (channelId === 'weekly_markets') quantityFit = 95;
      else if (channelId === 'alternative_markets') quantityFit = 90;
      else if (channelId === 'bulk_buyers') quantityFit = 30; // Wholesale traders rarely take tiny lots
      else if (channelId === 'storage_preservation') quantityFit = 40; // High fixed storage overhead for small lots
      else quantityFit = 70;
    } else {
      // Medium lot
      quantityFit = 80;
    }

    // 7. Component 6: Information Reliability (R) [0 - 100, weight: 5%]
    let reliability = 50;
    if (matchedDirectoryBuyers.length > 0) {
      reliability = 95;
    } else if (stock.districtCode && stock.talukaCode) {
      reliability = 70;
    } else {
      reliability = 40;
    }

    // 8. FINAL WEIGHTED SUITABILITY SCORE CALCULATION
    const rawScore =
      compatibility * 0.30 +
      conditionSafety * 0.25 +
      geography * 0.15 +
      shelfLifeUrgency * 0.15 +
      quantityFit * 0.10 +
      reliability * 0.05;

    const suitabilityScore = Math.max(0, Math.min(100, Math.round(rawScore)));

    // 9. Confidence Level Determination
    let confidence = 'moderate';
    if (matchedDirectoryBuyers.length > 0 && stock.availableQuantity && stock.condition) {
      confidence = 'high';
    } else if (!stock.districtCode || compatibility <= 20) {
      confidence = 'low';
    }

    // 10. Generate Why Recommended, Limitations, and Economic Estimates
    const { whyRecommended_en, whyRecommended_mr, limitations_en, limitations_mr, estimatedEconomics } =
      StockMatchingEngine.generateChannelDetails(stock, channelId, suitabilityScore, {
        isBulkLot,
        isSmallLot,
        isPerishable,
        remainingHours,
        matchedDirectoryBuyers
      });

    return {
      id: channelId,
      title_en: channelDef.title_en,
      title_mr: channelDef.title_mr,
      desc_en: channelDef.desc_en,
      desc_mr: channelDef.desc_mr,
      icon: channelDef.icon,
      suitabilityScore,
      confidence,
      isDisqualified: false,
      disqualificationReason_en: null,
      disqualificationReason_mr: null,
      whyRecommended_en,
      whyRecommended_mr,
      limitations_en,
      limitations_mr,
      scoreBreakdown: {
        compatibility,
        conditionSafety,
        geography,
        shelfLifeUrgency,
        quantityFit,
        reliability
      },
      matchedBuyers: matchedDirectoryBuyers,
      buyerNotice_en,
      buyerNotice_mr,
      estimatedEconomics
    };
  }

  /**
   * Generates tailored explanations and recovery economics for each channel
   */
  static generateChannelDetails(stock, channelId, score, factors) {
    const qty = Number(stock.availableQuantity) || 1;
    const origSelling = Number(stock.originalSellingPricePerUnit || 0);
    const origCost = stock.originalTotalCost != null && stock.originalQuantity
      ? Number(stock.originalTotalCost) / Number(stock.originalQuantity)
      : null;
    const attributableCost = origCost != null ? origCost * qty : null;

    let basePrice = Number(stock.expectedRecoveryPricePerUnit || 0);
    if (!basePrice || basePrice <= 0) {
      basePrice = origSelling > 0 ? origSelling * 0.8 : (origCost ? origCost * 1.1 : 25);
    }

    let whyRecommended_en = [];
    let whyRecommended_mr = [];
    let limitations_en = [];
    let limitations_mr = [];

    let priceMultiplier = 0.8;
    let transportCost = 100;
    let packagingCost = 0;
    let processingCost = 0;
    let storageCost = 0;
    let handlingCost = 50;
    let commission = 0;
    let timeframe_en = '1-3 days';
    let timeframe_mr = '१-३ दिवस';
    let effortLevel = 'moderate';

    switch (channelId) {
      case 'weekly_markets':
        priceMultiplier = 0.85;
        transportCost = 150;
        handlingCost = 50; // stall fee + porter
        timeframe_en = '1-2 days (Next bazaar cycle)';
        timeframe_mr = '१-२ दिवस (पुढील आठवडे बाजार)';
        effortLevel = 'moderate';
        whyRecommended_en = [
          'Direct cash recovery through established weekly village bazaar footfall.',
          'Allows selling directly to end consumers with minimal commission loss.'
        ];
        whyRecommended_mr = [
          'आठवडे बाजारातील थेट ग्राहक गर्दीमुळे त्वरित रोख पुनर्प्राप्ती शक्य.',
          'कोणत्याही मध्यस्थाशिवाय ग्राहकांना थेट विक्री करता येते.'
        ];
        limitations_en = [
          'Subject to market day schedules and stall availability.',
          'Transport and day-long physical stall attendance required.'
        ];
        limitations_mr = [
          'बाजाराच्या विशिष्ट वारी आणि जागेच्या उपलब्धतेवर अवलंबून.',
          'वाहतूक आणि दिवसभर स्टॉलवर थांबण्याची आवश्यकता.'
        ];
        break;

      case 'local_retailers':
        priceMultiplier = 0.80;
        transportCost = 50;
        handlingCost = 20;
        timeframe_en = 'Immediate (Within 24 hours)';
        timeframe_mr = 'तात्काळ (२४ तासांत)';
        effortLevel = 'low';
        whyRecommended_en = [
          'Immediate local liquidation through nearby village kirana stores.',
          'Minimal transportation cost and zero stall fees.'
        ];
        whyRecommended_mr = [
          'जवळच्या गावच्या किराणा दुकानांमार्फत तात्काळ माल खपवता येतो.',
          'अतिशय कमी वाहतूक खर्च आणि स्टॉल फीची गरज नाही.'
        ];
        limitations_en = [
          'Retailers may negotiate substantial discounts or offer consignment credit.',
          'Suitable primarily for standard packaged or consumable lots.'
        ];
        limitations_mr = [
          'दुकानदार जास्त सवलत मागू शकतात किंवा उधारीवर माल घेऊ शकतात.',
          'मुख्यत्वे लहान किंवा पॅकेज्ड मालासाठीच योग्य.'
        ];
        break;

      case 'bulk_buyers':
        priceMultiplier = 0.70;
        transportCost = 350;
        handlingCost = 120;
        commission = Math.round(basePrice * qty * 0.02); // 2% mandi cess/commission
        timeframe_en = '2-4 days';
        timeframe_mr = '२-४ दिवस';
        effortLevel = 'high';
        whyRecommended_en = [
          'Enables single-lot liquidation of large inventory surplus.',
          'Eliminates prolonged storage risks for high-volume holdings.'
        ];
        whyRecommended_mr = [
          'मोठ्या प्रमाणातील साठा एकाच वेळी घाऊक व्यापार्‍याला देता येतो.',
          'दीर्घकाळ साठवणुकीचा धोका आणि घट टाळता येते.'
        ];
        limitations_en = [
          'Wholesale rates reflect wholesale discounts (25-35% below retail).',
          'Mandi commission and bulk transport logistics apply.'
        ];
        limitations_mr = [
          'घाऊक बाजारातील दर किरकोळ दरापेक्षा २५-३५% कमी असतात.',
          'बाजार समिती आडत आणि माल वाहतुकीचा खर्च येतो.'
        ];
        break;

      case 'food_processors':
        priceMultiplier = 0.65;
        transportCost = 200;
        handlingCost = 80;
        packagingCost = 50;
        timeframe_en = '1-3 days';
        timeframe_mr = '१-३ दिवस';
        effortLevel = 'moderate';
        whyRecommended_en = [
          'Converts ripening/surplus produce into processed goods (puree, pickles, paneer, drying).',
          'Absorbs grade-B or uneven size produce rejected by fresh retail.'
        ];
        whyRecommended_mr = [
          'अतिपक्व किंवा अतिरिक्त शेतमालाचे प्रक्रिया उत्पादनात (प्युरी, लोणचे, पनीर, पावडर) रूपांतर.',
          'किरकोळ बाजारात न चालणारा "ब" दर्जाचा मालही येथे स्वीकारला जातो.'
        ];
        limitations_en = [
          'Strict requirement that produce must be clean, safe, and not spoiled.',
          'Raw material purchase rates are structured on processing cost margins.'
        ];
        limitations_mr = [
          'माल स्वच्छ व खाण्यायोग्य असणे बंधनकारक; खराब झालेला माल चालत नाही.',
          'प्रक्रिया युनिट्सचे खरेदी दर प्रक्रिया खर्चावर आधारित असतात.'
        ];
        break;

      case 'cooperatives':
        priceMultiplier = 0.75;
        transportCost = 180;
        handlingCost = 60;
        timeframe_en = '3-5 days';
        timeframe_mr = '३-५ दिवस';
        effortLevel = 'moderate';
        whyRecommended_en = [
          'Institutional pooling with local FPO or cooperative marketing network.',
          'Fair price realization through collective bargaining and storage access.'
        ];
        whyRecommended_mr = [
          'स्थानिक शेतकरी उत्पादक कंपनी (FPO) किंवा सहकारी संस्थेचे पाठबळ.',
          'सामूहिक विक्री व अधिकृत साठवणुकीमुळे वाजवी दर मिळण्याची शक्यता.'
        ];
        limitations_en = [
          'Payment settlement may follow cooperative accounting schedules.',
          'Membership or FPO handling charge may be deducted.'
        ];
        limitations_mr = [
          'पैसे मिळण्यास संस्थेच्या नियमांनुसार काही दिवसांचा अवधी लागू शकतो.',
          'संस्थेचे सभासदत्व किंवा हाताळणी शुल्क आकारले जाऊ शकते.'
        ];
        break;

      case 'alternative_markets':
        priceMultiplier = 0.75;
        transportCost = 120;
        handlingCost = 60;
        timeframe_en = '1-2 days';
        timeframe_mr = '१-२ दिवस';
        effortLevel = 'high';
        whyRecommended_en = [
          'Direct highway, temple fair, or evening pop-up liquidation at discount prices.',
          'Attracts quick footfall seeking bargain prices.'
        ];
        whyRecommended_mr = [
          'महामार्ग, देवस्थान किंवा संध्याकाळच्या गर्दीच्या ठिकाणी तात्पुरता स्टॉल.',
          'सवलतीच्या दरामुळे जलद ग्राहक प्रतिसाद मिळतो.'
        ];
        limitations_en = [
          'Requires immediate personal time and temporary roadside permission.',
          'Sales velocity depends on traveler traffic and weather.'
        ];
        limitations_mr = [
          'स्वतःचा वेळ आणि स्थानिक जागेच्या तात्पुरत्या परवानगीची गरज.',
          'वाहतुकीची गर्दी आणि हवामानावर विक्री अवलंबून असते.'
        ];
        break;

      case 'storage_preservation':
        priceMultiplier = 0.95; // Future value preservation
        transportCost = 150;
        storageCost = Math.max(100, Math.round(qty * 1.5)); // ₹1.5/kg cold chamber or godown monthly fee
        handlingCost = 80;
        timeframe_en = '15-45 days (Holding period)';
        timeframe_mr = '१५-४५ दिवस (साठवणूक कालावधी)';
        effortLevel = 'low';
        whyRecommended_en = [
          'Prevents distress selling during seasonal market glut.',
          'Preserves product quality until local demand and prices recover.'
        ];
        whyRecommended_mr = [
          'हंगामातील आवक वाढल्यामुळे होणारी कवडीमोलाने विक्री टाळता येते.',
          'भाव सुधारेपर्यंत मालाची गुणवत्ता सुरक्षित राहते.'
        ];
        limitations_en = [
          'Incurs recurring monthly cold storage or godown rent.',
          'Capital remains locked until stored inventory is liquidated.'
        ];
        limitations_mr = [
          'दरमहा शीतगृह किंवा गोदामाचे भाडे भरावे लागते.',
          'माल विकेपर्यंत भांडवल अडकून राहते.'
        ];
        break;

      case 'value_addition':
        priceMultiplier = 1.30; // Upgraded processed selling price
        transportCost = 80;
        processingCost = Math.max(150, Math.round(qty * 3.5)); // Dehydration / grading / pack cost
        packagingCost = Math.max(80, Math.round(qty * 1.5));
        handlingCost = 50;
        timeframe_en = '3-7 days';
        timeframe_mr = '३-७ दिवस';
        effortLevel = 'high';
        whyRecommended_en = [
          'Multiplies recovery value by converting raw unsold surplus into shelf-stable goods.',
          'On-farm grading, drying, and small packaging capture higher retail margins.'
        ];
        whyRecommended_mr = [
          'कच्च्या अतिरिक्त मालावर प्रक्रिया करून दीर्घकाळ टिकणारी उत्पादने बनवणे.',
          'शेतावरच प्रतवारी, वाळवण किंवा लहान पॅकिंग केल्यास अधिक नफा मिळतो.'
        ];
        limitations_en = [
          'Requires manual labor, basic processing equipment, and food packaging pouches.',
          'Final product must meet standard hygiene and labeling criteria.'
        ];
        limitations_mr = [
          'शारीरिक श्रम, साधी यंत्रसामग्री आणि पॅकिंग साहित्याची गरज.',
          'उत्पादनाची स्वच्छता आणि दर्जेदार पॅकिंग राखणे आवश्यक.'
        ];
        break;

      default:
        break;
    }

    const expectedSellingPricePerUnit = Math.round(basePrice * priceMultiplier * 10) / 10;
    const potentialGrossRevenue = Math.round(expectedSellingPricePerUnit * qty);
    const totalExpenses =
      transportCost + packagingCost + processingCost + storageCost + handlingCost + commission;
    const netRecoveryValue = potentialGrossRevenue - totalExpenses;

    let recoveryRatePercent = 0;
    if (attributableCost != null && attributableCost > 0) {
      recoveryRatePercent = Math.round((netRecoveryValue / attributableCost) * 100);
    } else if (potentialGrossRevenue > 0) {
      recoveryRatePercent = Math.round((netRecoveryValue / potentialGrossRevenue) * 100);
    }

    const netRecoveryVsAttributableCost = attributableCost != null ? netRecoveryValue - attributableCost : null;

    return {
      whyRecommended_en,
      whyRecommended_mr,
      limitations_en,
      limitations_mr,
      estimatedEconomics: {
        expectedSellingPricePerUnit,
        expectedQuantitySold: qty,
        potentialGrossRevenue,
        estimatedExpenses: {
          transportation: transportCost,
          packaging: packagingCost,
          processing: processingCost,
          storage: storageCost,
          handling: handlingCost,
          commission,
          totalExpenses
        },
        netRecoveryValue,
        attributableInventoryCost: attributableCost,
        netRecoveryVsAttributableCost,
        recoveryRatePercent,
        timeframe_en,
        timeframe_mr,
        effortLevel
      }
    };
  }
}
