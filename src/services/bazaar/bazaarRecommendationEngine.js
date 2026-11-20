/**
 * BazaarPath Recommendation & Opportunity Scoring Engine
 * 
 * Implements the Net Opportunity Scoring Algorithm:
 * - Estimated Net Profit (35%)
 * - Product-Market Suitability (25%)
 * - Travel Cost & Accessibility (15%)
 * - Market Timing & Day Proximity (10%)
 * - Demand Evidence & Liquidity (10%)
 * - Data Reliability & Source Verification (5%)
 * - Deterministic Anti-Crowding Diversification (±2)
 */

import { travelCostService } from './travelCostService.js';
import { profitIntelligenceService } from './profitIntelligenceService.js';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Great-circle distance calculation via Haversine formula
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
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

/**
 * Days until target operating day
 */
export function getDaysUntil(operatingDay, fromDate = new Date()) {
  const currentDayIndex = fromDate.getDay();
  const targetDayIndex = DAYS.indexOf(operatingDay);
  if (targetDayIndex === -1) return 7;

  let diff = targetDayIndex - currentDayIndex;
  if (diff < 0) {
    diff += 7;
  }
  return diff;
}

/**
 * Deterministic tie-breaker for anti-crowding (Rule 5)
 */
function getDeterministicModifier(userId, category, marketId) {
  if (!userId) return 0;
  const str = `${userId}_${category || 'all'}_${marketId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 5) - 2;
}

/**
 * Evaluates a single market with Net Opportunity Score and Financial Intelligence
 */
export function evaluateMarketSuitability({
  market,
  userLocation = {}, // { districtCode, talukaCode, villageCode, coordinates: { lat, lng } }
  productDetails = {}, // { category, productName, quantityCarried, costPerUnit, expectedPricePerUnit, transportModeId }
  productCategory, // Optional top-level shorthand
  currentDate = new Date(),
  userId = null,
  userVisitHistory = []
}) {
  const reasons = [];
  const cautionFactors = [];
  let isPartialData = false;

  const category = productCategory || productDetails?.category || 'all';
  const {
    productName = '',
    quantityCarried = 10,
    costPerUnit = 1200,
    expectedPricePerUnit = 1800,
    transportModeId = 'motorcycle'
  } = productDetails;

  // --- 1. Distance & Travel Cost Calculation ---
  let straightLineKm = null;
  let estimatedRoadKm = null;
  let distanceText = 'Distance calculating';
  let distanceScore = null;

  if (userLocation?.coordinates && market.coordinates) {
    straightLineKm = calculateDistanceKm(
      userLocation.coordinates.lat,
      userLocation.coordinates.lng,
      market.coordinates.lat,
      market.coordinates.lng
    );
  }

  if (straightLineKm != null) {
    estimatedRoadKm = travelCostService.estimateRoadDistanceKm(straightLineKm);
    distanceText = `${estimatedRoadKm} km (रस्ता अंतर)`;
    if (straightLineKm <= 15) {
      distanceScore = 25;
      reasons.push(`${straightLineKm} km away`);
    } else if (straightLineKm > 100) {
      distanceScore = 6;
      cautionFactors.push(`Long transport distance (${estimatedRoadKm} km)`);
    } else {
      distanceScore = Math.max(6, Math.min(25, Math.round(25 - (straightLineKm / 8))));
    }
  } else {
    // Taluka/District administrative proximity fallback
    const isSameTaluka = userLocation?.talukaCode && Number(userLocation.talukaCode) === Number(market.talukaCode);
    const isSameDistrict = userLocation?.districtCode && Number(userLocation.districtCode) === Number(market.districtCode);

    if (isSameTaluka) {
      estimatedRoadKm = 12; // Typical intra-taluka distance
      distanceText = `स्थानिक तालुका (${market.taluka}) • ~१२ किमी`;
      reasons.push(`तुमच्या स्वतःच्या तालुक्यात स्थित (${market.taluka})`);
      distanceScore = 25;
    } else if (isSameDistrict) {
      estimatedRoadKm = 35;
      distanceText = `शेजारील तालुका (${market.taluka}) • ~३५ किमी`;
      reasons.push(`तुमच्याच जिल्ह्यात स्थित (${market.district})`);
      distanceScore = 15;
    } else {
      estimatedRoadKm = 75;
      distanceText = `इतर जिल्हा (${market.district}) • ~७५ किमी`;
      cautionFactors.push(`स्थानिक जिल्ह्याबाहेर स्थित (${market.district})`);
      distanceScore = 6;
    }
  }

  const travelCalc = travelCostService.calculateTravelCost({
    distanceKm: estimatedRoadKm,
    isRoadDistance: true,
    transportModeId
  });

  // --- 2. Profit Calculation & Scenarios ---
  const stallFee = market.stallFee || 50;
  const profitMetrics = profitIntelligenceService.calculateProfit({
    quantityCarried,
    costPerUnit,
    expectedPricePerUnit,
    travelCost: travelCalc.travelCost,
    stallFee,
    packagingCost: Math.round(Number(quantityCarried) * 15) // ~₹15/unit packaging
  });

  const scenarios = profitIntelligenceService.generateScenarios({
    quantityCarried,
    costPerUnit,
    expectedPricePerUnit,
    travelCost: travelCalc.travelCost,
    stallFee,
    packagingCost: Math.round(Number(quantityCarried) * 15)
  });

  // --- 3. Net Opportunity Score Components ---

  // A. Net Profit Score (35 pts max)
  let profitScore = 0;
  if (profitMetrics.netProfit > 5000) {
    profitScore = 35;
    reasons.push(`उच्च संभाव्य निव्वळ नफा: अंदाजे +₹${profitMetrics.netProfit.toLocaleString('en-IN')}`);
  } else if (profitMetrics.netProfit > 2000) {
    profitScore = 28;
    reasons.push(`चांगला नफा: +₹${profitMetrics.netProfit.toLocaleString('en-IN')} (मार्जिन ${profitMetrics.profitMargin}%)`);
  } else if (profitMetrics.netProfit > 0) {
    profitScore = 18;
    reasons.push(`कमी नफा: +₹${profitMetrics.netProfit.toLocaleString('en-IN')}`);
  } else {
    profitScore = 5;
    cautionFactors.push(`प्रवास व माल खर्चामुळे तोट्याची शक्यता (तोटा: ₹${Math.abs(profitMetrics.netProfit)})`);
  }

  // B. Product-Market Suitability Score (35 pts max when category passed)
  let suitabilityScore = 0;
  const isAllCat = !category || category === 'all';
  let hasCategory = false;

  if (!isAllCat && Array.isArray(market.productCategories)) {
    hasCategory = market.productCategories.some((cat) => {
      if (cat === category) return true;
      if (typeof cat === 'string' && typeof category === 'string') {
        const parts = category.split('&').map((p) => p.trim().toLowerCase());
        return parts.some((p) => cat.toLowerCase().includes(p));
      }
      return false;
    });
  }

  if (hasCategory) {
    suitabilityScore = 35;
    reasons.push(`तुमच्या उत्पादनासाठी थेट खरेदीदार उपलब्ध (${category})`);
  } else if (isAllCat) {
    suitabilityScore = 20;
    reasons.push('सर्वसाधारण आठवडे बाजार (विविध शेतमाल विक्री)');
  } else {
    suitabilityScore = 10;
    cautionFactors.push(`या बाजारात मुख्यत्वे "${category}" ची स्वतंत्र नोंद नाही (Handicrafts/Specialized items)`);
  }

  // C. Travel Cost & Distance Score (15 pts max)
  let travelScore = 0;
  if (travelCalc.travelCost <= 150) {
    travelScore = 15;
    reasons.push(`कमी प्रवास खर्च: २ बाजू खर्च फक्त ₹${travelCalc.travelCost}`);
  } else if (travelCalc.travelCost <= 350) {
    travelScore = 11;
  } else if (travelCalc.travelCost <= 600) {
    travelScore = 7;
    cautionFactors.push(`जादा वाहतूक खर्च (₹${travelCalc.travelCost})`);
  } else {
    travelScore = 3;
    cautionFactors.push(`प्रवास खर्च जास्त आहे (₹${travelCalc.travelCost}), परवडण्याची तपासणी करा`);
  }

  // D. Market Timing & Day Proximity (10 pts max)
  let timingScore = 0;
  const daysUntil = getDaysUntil(market.operatingDay, currentDate);
  if (daysUntil === 0) {
    timingScore = 10;
    reasons.push(`आज चालू (${market.operatingDay}) — तात्काळ विक्रीस उपलब्ध`);
  } else if (daysUntil === 1) {
    timingScore = 9;
    reasons.push(`उद्या चालू (${market.operatingDay}) — आज तोडणी करून उद्या विक्रीसाठी उत्तम`);
  } else if (daysUntil === 2) {
    timingScore = 7;
  } else {
    timingScore = 4;
    cautionFactors.push(`बाजार भरण्यास अजून ${daysUntil} दिवस बाकी आहेत (${market.operatingDay})`);
  }

  // E. Demand Evidence & Liquidity (10 pts max)
  let demandScore = 0;
  if (market.priceIndicators && market.priceIndicators.length > 0) {
    const hasRising = market.priceIndicators.some((p) => p.trend === 'rising');
    demandScore = hasRising ? 10 : 8;
    reasons.push('अधिकृत कृषी उत्पन्न बाजार दर व व्यवहार नोंदी उपलब्ध');
  } else {
    demandScore = 4;
    isPartialData = true;
    cautionFactors.push('Public price indicators not available (सार्वजनिक बाजारभाव उपलब्ध नाहीत)');
  }

  // F. Data Reliability & Source Verification (5 pts max)
  let reliabilityScore = 0;
  if (market.verificationStatus === 'verified') {
    reliabilityScore = 5;
  } else {
    reliabilityScore = 2;
    isPartialData = true;
    cautionFactors.push('चाचणी नमुना नोंद (अधिकृत क्षेत्रीय पडताळणी प्रलंबित)');
  }

  const confidenceLevel = market.verificationStatus === 'sample_development'
    ? 'Development Sample (चाचणी नमुना)'
    : (market.confidence || 'High (Verified by MSAMB)');

  // G. Anti-Crowding Modifier (±2 pts)
  const modifier = getDeterministicModifier(userId, category, market.id);

  // H. Personal Visit History Modifier (Phase 3 Learning Feedback Loop)
  let historyModifier = 0;
  if (userVisitHistory && userVisitHistory.length > 0) {
    const marketVisits = userVisitHistory.filter((v) => v.marketId === market.id);
    if (marketVisits.length > 0) {
      const avgSellThrough = marketVisits.reduce((acc, v) => acc + (v.sellThroughRate || 0), 0) / marketVisits.length;
      const avgProfit = marketVisits.reduce((acc, v) => acc + (v.actualNetProfit || 0), 0) / marketVisits.length;
      if (avgSellThrough >= 80 && avgProfit > 0) {
        historyModifier = 5;
        reasons.push(`मागील प्रत्यक्ष अनुभव: सरासरी ₹${Math.round(avgProfit)} नफा व ${Math.round(avgSellThrough)}% विक्री`);
      } else if (avgProfit < 0 || avgSellThrough < 50) {
        historyModifier = -4;
        cautionFactors.push(`मागील भेटीत कमी नफा किंवा विक्री (${Math.round(avgSellThrough)}%) नोंदवली गेली होती`);
      }
    }
  }

  // Compute Net Opportunity Score (0-100)
  let netOpportunityScore =
    profitScore + suitabilityScore + travelScore + timingScore + demandScore + reliabilityScore + modifier + historyModifier;
  netOpportunityScore = Math.max(10, Math.min(100, Math.round(netOpportunityScore)));

  // Opportunity Label
  let opportunityLabel = 'Moderate Opportunity';
  let opportunityLabelMr = 'मध्यम संधी';
  if (netOpportunityScore >= 80) {
    opportunityLabel = 'High Profit Opportunity';
    opportunityLabelMr = 'उत्तम नफा संधी (High Opportunity)';
  } else if (netOpportunityScore >= 60) {
    opportunityLabel = 'Viable Market';
    opportunityLabelMr = 'परवडणारा बाजार (Viable)';
  } else {
    opportunityLabel = 'Low Viability';
    opportunityLabelMr = 'कमी नफा / जोखीम (Low Return)';
  }

  return {
    market,
    score: netOpportunityScore,
    opportunityLabel,
    opportunityLabelMr,
    reasons,
    cautionFactors,
    isPartialData,
    confidenceLevel,
    daysUntil,
    distanceText,
    straightLineKm,
    estimatedRoadKm,
    travelCalc,
    profitMetrics,
    scenarios,
    breakdown: {
      netProfit: profitScore,
      suitability: suitabilityScore,
      category: suitabilityScore,
      travel: travelScore,
      distance: distanceScore != null ? distanceScore : travelScore,
      timing: timingScore,
      demand: demandScore,
      reliability: reliabilityScore,
      modifier
    }
  };
}

/**
 * Filter and Rank markets using Net Opportunity Score and Search Radius
 */
export function rankMarketsForUser({
  markets = [],
  userLocation = {},
  productDetails = {},
  searchRadiusKm = 50,
  currentDate = new Date(),
  userId = null,
  userVisitHistory = []
}) {
  const evaluations = markets.map((m) =>
    evaluateMarketSuitability({
      market: m,
      userLocation,
      productDetails,
      currentDate,
      userId,
      userVisitHistory
    })
  );

  // Filter by search radius if user coordinates exist
  let filtered = evaluations;
  if (userLocation?.coordinates && searchRadiusKm) {
    filtered = evaluations.filter((ev) => {
      if (ev.straightLineKm == null) return true;
      return ev.straightLineKm <= Number(searchRadiusKm);
    });
    // If radius is too narrow and zero markets found, fallback to showing all ranked
    if (filtered.length === 0) {
      filtered = evaluations;
    }
  }

  // Sort descending by Net Opportunity Score
  return filtered.sort((a, b) => b.score - a.score);
}
