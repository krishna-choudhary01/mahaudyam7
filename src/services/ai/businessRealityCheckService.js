/**
 * MahaUdyam — Business Reality Check Simulator Service
 * 
 * Performs verified financial arithmetic for rural micro-enterprises in Maharashtra.
 * Replaces speculation with real numbers:
 * - Total capital expenditure (Capex) & working capital (Opex buffer)
 * - Variable cost per unit vs Selling price per unit
 * - Unit contribution margin & Contribution margin ratio
 * - Monthly fixed overheads (rent, power, wages, loan EMI)
 * - Break-even quantity (units/month) & Break-even revenue
 * - Three-scenario sensitivity analysis: Conservative (60%), Expected (100%), Optimistic (130%)
 * - Clear distinction between verified local benchmarks vs assumed parameters
 */

/**
 * Standard Maharashtra Rural Enterprise Benchmarks & Templates
 */
export const RURAL_BENCHMARKS = {
  'turmeric-processing': {
    title: 'Turmeric Powder & Polishing Unit (हळद प्रक्रिया उद्योग)',
    category: 'Agro-Processing',
    typicalCapex: 250000, // Pulverizer, polisher, packing machine
    workingCapitalMonths: 2,
    standardUnit: 'kg',
    defaultSellingPrice: 180, // ₹/kg packed
    defaultRawMaterialCost: 110, // ₹/kg raw rhizomes
    defaultPackagingCost: 12, // pouch + label
    defaultPowerWaterPerUnit: 6,
    defaultMonthlyFixedCost: 22000, // Shed rent ₹6000 + 1 helper ₹12000 + maintenance ₹4000
    typicalMonthlyCapacity: 800, // kg
    odopDistricts: ['Sangli', 'Hingoli', 'Nanded', 'Kolhapur'],
    schemeFit: ['PMFME (35% subsidy)', 'CMEGP', 'PMEGP'],
    verifiedNotes: 'Raw turmeric price benchmarked from Sangli & Hingoli APMC auction averages.'
  },
  'soybean-oil-ghani': {
    title: 'Cold-Pressed Soybean/Groundnut Oil Ghani (लाकडी तेल घाणी)',
    category: 'Agro-Processing',
    typicalCapex: 320000, // Cold press wooden ghani machine + filter press
    workingCapitalMonths: 2,
    standardUnit: 'litre',
    defaultSellingPrice: 220, // ₹/litre unrefined cold-pressed oil
    defaultRawMaterialCost: 130, // seed input needed per litre
    defaultPackagingCost: 15, // food-grade bottle/pouch
    defaultPowerWaterPerUnit: 8,
    defaultMonthlyFixedCost: 25000, // Shed rent ₹7000 + 1 operator ₹14000 + power base ₹4000
    typicalMonthlyCapacity: 700, // litres
    odopDistricts: ['Latur', 'Amravati', 'Nanded', 'Washim', 'Jalna'],
    schemeFit: ['PMFME', 'CMEGP'],
    verifiedNotes: 'Soybean seed input conversion: ~18-20% oil yield + cake (pend) recovery bonus.'
  },
  'goat-farming': {
    title: 'Semi-Stall Fed Goat Rearing (शेळीपालन - उस्मानाबादी/संगमनेरी)',
    category: 'Animal Husbandry',
    typicalCapex: 280000, // 20 Does + 1 Buck + shed construction
    workingCapitalMonths: 3,
    standardUnit: 'kid/live weight kg',
    defaultSellingPrice: 380, // ₹/kg live weight
    defaultRawMaterialCost: 140, // fodder + concentrate feed cost per kg gain
    defaultPackagingCost: 5, // deworming, vaccines, ear tags
    defaultPowerWaterPerUnit: 10,
    defaultMonthlyFixedCost: 12000, // green fodder cultivation + insurance
    typicalMonthlyCapacity: 150, // kg live weight sold per month normalized
    odopDistricts: ['Ahmednagar', 'Osmanabad', 'Solapur', 'Pune', 'Beed'],
    schemeFit: ['National Livestock Mission (NLM)', 'Ahilyabai Holkar Scheme', 'CMEGP'],
    verifiedNotes: 'Osmanabad breed has high twinning rate (60-70%) and drought resistance.'
  },
  'millet-flour-snacks': {
    title: 'Millet Processing & Ready-to-Cook Products (मिलेट्स/भरडधान्य मूल्यवर्धन)',
    category: 'Food Processing',
    typicalCapex: 180000, // Flour mill, roasting machine, continuous sealer
    workingCapitalMonths: 2,
    standardUnit: 'kg',
    defaultSellingPrice: 140, // ₹/kg packaged sorghum/jowar/bajra/ragi flour or flakes
    defaultRawMaterialCost: 55, // raw grain per kg
    defaultPackagingCost: 14,
    defaultPowerWaterPerUnit: 7,
    defaultMonthlyFixedCost: 18000,
    typicalMonthlyCapacity: 600, // kg
    odopDistricts: ['Solapur', 'Ahmednagar', 'Dhule', 'Nashik', 'Satara'],
    schemeFit: ['PMFME', 'State Millet Mission (श्री अन्न योजना)', 'PMEGP'],
    verifiedNotes: 'International Year of Millets legacy created sustained urban demand for bajra & jowar.'
  },
  'custom-hiring-machinery': {
    title: 'Custom Hiring Farm Equipment Center (कृषी अवजारे भाडे केंद्र)',
    category: 'Agricultural Services',
    typicalCapex: 450000, // Rotavator, seed drill, boom sprayer, thresher
    workingCapitalMonths: 1,
    standardUnit: 'acre/hour',
    defaultSellingPrice: 900, // ₹/hour rental service with operator
    defaultRawMaterialCost: 320, // diesel consumption per hour
    defaultPackagingCost: 0,
    defaultPowerWaterPerUnit: 80, // wear & tear grease
    defaultMonthlyFixedCost: 16000, // garage rent + loan interest
    typicalMonthlyCapacity: 60, // hours
    odopDistricts: ['Nashik', 'Kolhapur', 'Jalgaon', 'Yavatmal', 'Bhandara'],
    schemeFit: ['SMAM (Sub-Mission on Agricultural Mechanization - up to 40% subsidy)', 'CMEGP'],
    verifiedNotes: 'Peak demand coincides with Kharif sowing (June-July) and Rabi harvest (Feb-March).'
  },
  'perishable-unsold-processing': {
    title: 'Tomato Puree / Dehydrated Onion Processing (भाजीपाला मूल्यवर्धन)',
    category: 'Agro-Processing & Rescue',
    typicalCapex: 160000, // Pulper, boiling kettle, solar tunnel dryer
    workingCapitalMonths: 1,
    standardUnit: 'kg',
    defaultSellingPrice: 95, // ₹/kg paste or dried flakes
    defaultRawMaterialCost: 20, // distressed raw tomato / onion purchased at low farmgate
    defaultPackagingCost: 16,
    defaultPowerWaterPerUnit: 9,
    defaultMonthlyFixedCost: 14000,
    typicalMonthlyCapacity: 500, // kg
    odopDistricts: ['Nashik', 'Pune', 'Nagar', 'Satara'],
    schemeFit: ['PMFME', 'MahaAgri Project'],
    verifiedNotes: 'Turns distressed farmgate glut (₹3-5/kg tomato) into shelf-stable 12-month inventory.'
  }
};

/**
 * Calculates complete business reality check arithmetic
 * @param {Object} input
 * @returns {Object} Comprehensive calculation results with scenarios
 */
export function calculateBusinessReality(input = {}) {
  // 1. Sanitize & Normalize Inputs
  const title = input.title || 'Rural Micro-Enterprise';
  const unit = input.standardUnit || input.unit || 'units';

  // Capital Expenditure
  const capex = Math.max(0, Number(input.capex || input.setupCost || input.typicalCapex || 150000));
  
  // Production / Service Volume per Month
  const targetMonthlyUnits = Math.max(1, Number(input.targetMonthlyUnits || input.capacity || input.typicalMonthlyCapacity || 500));

  // Unit Economics
  const sellingPricePerUnit = Math.max(0.1, Number(input.sellingPricePerUnit || input.sellingPrice || input.defaultSellingPrice || 100));
  const rawMaterialCostPerUnit = Math.max(0, Number(input.rawMaterialCostPerUnit || input.rawMaterialCost || input.defaultRawMaterialCost || 50));
  const packagingCostPerUnit = Math.max(0, Number(input.packagingCostPerUnit ?? input.defaultPackagingCost ?? 8));
  const powerFuelPerUnit = Math.max(0, Number(input.powerFuelPerUnit ?? input.defaultPowerWaterPerUnit ?? 5));
  const transportPerUnit = Math.max(0, Number(input.transportPerUnit || 3));

  // Total Variable Cost Per Unit
  const variableCostPerUnit = rawMaterialCostPerUnit + packagingCostPerUnit + powerFuelPerUnit + transportPerUnit;

  // Monthly Fixed Overheads
  const presetFixed = Number(input.defaultMonthlyFixedCost || 0);
  const rentMonthly = Math.max(0, Number(input.rentMonthly || (presetFixed > 0 ? Math.round(presetFixed * 0.3) : 5000)));
  const wagesMonthly = Math.max(0, Number(input.wagesMonthly || (presetFixed > 0 ? Math.round(presetFixed * 0.5) : 10000)));
  const electricityBaseMonthly = Math.max(0, Number(input.electricityBaseMonthly || (presetFixed > 0 ? Math.round(presetFixed * 0.1) : 2000)));
  const loanEmiMonthly = Math.max(0, Number(input.loanEmiMonthly || 0));
  const marketingMiscMonthly = Math.max(0, Number(input.marketingMiscMonthly || (presetFixed > 0 ? Math.round(presetFixed * 0.1) : 2000)));

  const totalMonthlyFixedCost = rentMonthly + wagesMonthly + electricityBaseMonthly + loanEmiMonthly + marketingMiscMonthly;

  // Working Capital needed (2 months of fixed costs + 1 month of variable production cost)
  const workingCapital = (totalMonthlyFixedCost * 2) + (variableCostPerUnit * targetMonthlyUnits * 0.75);
  const totalCapitalRequired = Math.round(capex + workingCapital);

  // 2. Core Economic Metrics
  const unitContributionMargin = sellingPricePerUnit - variableCostPerUnit;
  const contributionMarginRatio = unitContributionMargin / sellingPricePerUnit;

  // Break-Even Analysis
  let breakEvenUnits = 0;
  let breakEvenRevenue = 0;
  let isEconomicallyViable = true;
  let fatalFlaw = null;

  if (unitContributionMargin <= 0) {
    isEconomicallyViable = false;
    fatalFlaw = 'VARIABLE_COST_EXCEEDS_PRICE';
    breakEvenUnits = Infinity;
    breakEvenRevenue = Infinity;
  } else {
    breakEvenUnits = Math.ceil(totalMonthlyFixedCost / unitContributionMargin);
    breakEvenRevenue = Math.round(breakEvenUnits * sellingPricePerUnit);
  }

  // Monthly Revenue & Profit at Target Volume
  const targetMonthlyRevenue = Math.round(targetMonthlyUnits * sellingPricePerUnit);
  const targetMonthlyTotalCost = Math.round(totalMonthlyFixedCost + (variableCostPerUnit * targetMonthlyUnits));
  const targetMonthlyNetProfit = targetMonthlyRevenue - targetMonthlyTotalCost;
  const netMarginPercent = targetMonthlyRevenue > 0 ? ((targetMonthlyNetProfit / targetMonthlyRevenue) * 100).toFixed(1) : 0;

  // Payback period (months)
  let paybackPeriodMonths = null;
  if (targetMonthlyNetProfit > 0) {
    paybackPeriodMonths = Number((totalCapitalRequired / targetMonthlyNetProfit).toFixed(1));
  }

  // Capacity utilization at break-even
  const breakEvenCapacityPercent = targetMonthlyUnits > 0 
    ? Number(((breakEvenUnits / targetMonthlyUnits) * 100).toFixed(1))
    : 100;

  // 3. Scenario Sensitivity Analysis (Conservative, Expected, Optimistic)
  const calculateScenario = (volumeMultiplier, priceMultiplier, costMultiplier, label, label_mr) => {
    const scUnits = Math.round(targetMonthlyUnits * volumeMultiplier);
    const scPrice = sellingPricePerUnit * priceMultiplier;
    const scVarCost = variableCostPerUnit * costMultiplier;
    const scMargin = scPrice - scVarCost;
    const scRevenue = Math.round(scUnits * scPrice);
    const scTotalCost = Math.round(totalMonthlyFixedCost + (scVarCost * scUnits));
    const scNetProfit = scRevenue - scTotalCost;
    const scBreakEvenUnits = scMargin > 0 ? Math.ceil(totalMonthlyFixedCost / scMargin) : Infinity;

    return {
      label,
      label_mr,
      monthlyUnits: scUnits,
      sellingPrice: Math.round(scPrice),
      monthlyRevenue: scRevenue,
      monthlyTotalCost: scTotalCost,
      monthlyNetProfit: scNetProfit,
      breakEvenUnits: scBreakEvenUnits,
      breakEvenMet: scUnits >= scBreakEvenUnits,
      profitStatus: scNetProfit > 0 ? 'PROFIT' : (scNetProfit === 0 ? 'BREAK_EVEN' : 'LOSS')
    };
  };

  const scenarios = {
    conservative: calculateScenario(0.60, 0.95, 1.08, 'Conservative (Dry Season / Stiff Competition)', 'कमी मागणी / स्पर्धा काळ'),
    expected: calculateScenario(1.00, 1.00, 1.00, 'Expected (Standard Market Demand)', 'सर्वसाधारण बाजार स्थिती'),
    optimistic: calculateScenario(1.30, 1.05, 0.95, 'Optimistic (Festival Season / Bulk Orders)', 'सणासुदीचा काळ / घाऊक मागणी')
  };

  // 4. Reality Risk Flags & Warnings
  const warnings = [];
  const strengths = [];

  if (!isEconomicallyViable) {
    warnings.push({
      code: 'FATAL_MARGIN',
      severity: 'CRITICAL',
      text_en: `Warning: Every ${unit} produced loses ₹${Math.abs(unitContributionMargin).toFixed(1)} before covering fixed rent or salary! Increase price or reduce raw material costs.`,
      text_mr: `धोक्याचा इशारा: प्रत्येक ${unit} मागे ₹${Math.abs(unitContributionMargin).toFixed(1)} चा थेट तोटा होत आहे. कच्च्या मालाचा दर कमी करा किंवा विक्री दर वाढवा.`
    });
  } else if (breakEvenCapacityPercent > 80) {
    warnings.push({
      code: 'HIGH_BREAK_EVEN',
      severity: 'HIGH',
      text_en: `High Risk: You must sell ${breakEvenUnits} ${unit} (${breakEvenCapacityPercent}% of capacity) just to pay bills. A single bad week could lead to losses.`,
      text_mr: `जोखीम इशारा: खर्च भागवण्यासाठी किमान ${breakEvenUnits} ${unit} (${breakEvenCapacityPercent}% क्षमता) विक्री करावी लागेल.`
    });
  } else {
    strengths.push({
      code: 'HEALTHY_BREAK_EVEN',
      text_en: `Low Risk: Break-even is achieved at only ${breakEvenCapacityPercent}% capacity (${breakEvenUnits} ${unit}). Remaining sales generate strong profit.`,
      text_mr: `सुरक्षित समतोल: अवघ्या ${breakEvenCapacityPercent}% उत्पादनात (${breakEvenUnits} ${unit}) सर्व खर्च वसूल होतो.`
    });
  }

  if (paybackPeriodMonths && paybackPeriodMonths > 36) {
    warnings.push({
      code: 'LONG_PAYBACK',
      severity: 'MEDIUM',
      text_en: `Capital recovery takes ${paybackPeriodMonths} months (over 3 years). Consider starting with leased machinery or a shared center.`,
      text_mr: `भांडवल परतफेडीला ${paybackPeriodMonths} महिने (३ वर्षांपेक्षा जास्त) लागतील. सुरुवातीला भाड्याने यंत्रसामग्री वापरणे योग्य ठरेल.`
    });
  } else if (paybackPeriodMonths && paybackPeriodMonths <= 18) {
    strengths.push({
      code: 'FAST_PAYBACK',
      text_en: `Rapid Capital Recovery: Expected investment recovery within ${paybackPeriodMonths} months.`,
      text_mr: `जलद भांडवल परतावा: अवघ्या ${paybackPeriodMonths} महिन्यांत मूळ भांडवल वसूल होण्याची शक्यता आहे.`
    });
  }

  // 5. Categorize Data Transparency: Assumptions vs Verified Benchmarks
  const dataTransparency = [
    { item: 'Machine / Setup Cost (Capex)', value: `₹${capex.toLocaleString('en-IN')}`, status: input.isCapexVerified ? 'VERIFIED' : 'ESTIMATED_USER_INPUT', note: 'Based on prevailing Maharashtra fabrication & supplier rates' },
    { item: 'Raw Material Cost', value: `₹${rawMaterialCostPerUnit}/${unit}`, status: input.isRawMaterialVerified ? 'VERIFIED' : 'LOCAL_MARKET_BENCHMARK', note: 'Subject to seasonal APMC arrivals & village supply' },
    { item: 'Packaging & Utilities', value: `₹${(packagingCostPerUnit + powerFuelPerUnit)}/${unit}`, status: 'ESTIMATED_STANDARD', note: 'Food grade packaging & agricultural commercial power tariff' },
    { item: 'Monthly Fixed Rent & Wages', value: `₹${totalMonthlyFixedCost.toLocaleString('en-IN')}`, status: 'ESTIMATED_USER_INPUT', note: 'Assumes semi-skilled rural worker at prevailing local wage' },
    { item: 'Selling Price', value: `₹${sellingPricePerUnit}/${unit}`, status: input.isSellingPriceVerified ? 'VERIFIED' : 'ESTIMATED_MARKET_PRICE', note: 'Must verify with target weekly haat or local retail buyers' }
  ];

  return {
    businessTitle: title,
    unit,
    isEconomicallyViable,
    fatalFlaw,
    capitalSummary: {
      capex,
      workingCapital: Math.round(workingCapital),
      totalCapitalRequired
    },
    unitEconomics: {
      sellingPricePerUnit,
      rawMaterialCostPerUnit,
      packagingCostPerUnit,
      powerFuelPerUnit,
      transportPerUnit,
      totalVariableCostPerUnit: Number(variableCostPerUnit.toFixed(1)),
      unitContributionMargin: Number(unitContributionMargin.toFixed(1)),
      contributionMarginRatio: Number((contributionMarginRatio * 100).toFixed(1))
    },
    fixedCostSummary: {
      rentMonthly,
      wagesMonthly,
      electricityBaseMonthly,
      loanEmiMonthly,
      marketingMiscMonthly,
      totalMonthlyFixedCost
    },
    breakEvenAnalysis: {
      breakEvenUnits,
      breakEvenRevenue,
      breakEvenCapacityPercent,
      targetMonthlyUnits,
      targetMonthlyRevenue,
      targetMonthlyNetProfit,
      netMarginPercent: Number(netMarginPercent),
      paybackPeriodMonths
    },
    scenarios,
    warnings,
    strengths,
    dataTransparency,
    calculatedAt: new Date().toISOString()
  };
}

/**
 * Quick-start preset helper for known rural enterprises
 */
export function getBenchmarkPreset(presetKey) {
  return RURAL_BENCHMARKS[presetKey] || null;
}
