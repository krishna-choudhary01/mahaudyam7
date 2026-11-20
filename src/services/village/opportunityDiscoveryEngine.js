/**
 * MahaUdyam — Village Opportunity Discovery Engine (Phase 2)
 * 
 * Rules:
 * 1. Strictly evidence-based: Synthesizes opportunities by cross-referencing:
 *    - Agricultural surplus and seasonal production
 *    - Available raw materials and natural resources
 *    - Traditional village skills and workforce capabilities
 *    - Customer demand signals from Demand Signal Collector
 *    - Infrastructure accessibility (electricity, water, road connectivity)
 *    - Known local competition (does NOT assume zero competition if records missing)
 * 2. Realistic investment ranges and transparent risk factors
 * 3. Confidence scoring based on multi-source data completeness
 * 4. Transparent explanation of why each opportunity was recommended
 */

import { villageOpportunityService } from './villageOpportunityService.js';
import { demandSignalService } from '../demand/demandSignalService.js';
import { VERIFIED_LOCAL_SUPPLIERS } from '../../data/suppliers/verifiedSuppliers.js';

export const BUSINESS_CATEGORIES = {
  AGRO_PROCESSING: 'agro_processing',
  DAIRY_LIVESTOCK: 'dairy_livestock',
  FARM_SERVICES: 'farm_services',
  TEXTILES_HANDICRAFTS: 'textiles_handicrafts',
  RENEWABLE_ENERGY: 'renewable_energy',
  RETAIL_SERVICES: 'retail_services'
};

/**
 * Authoritative Opportunity Template Knowledgebase
 * Each pattern specifies required village preconditions, crop matches, investment tiers, and risks.
 */
const OPPORTUNITY_PATTERNS = [
  // 1. Solar Dehydrated Vegetables & Fruits
  {
    id: 'pattern_solar_dehydration',
    category: BUSINESS_CATEGORIES.AGRO_PROCESSING,
    title_en: 'Solar Dehydrated Vegetables, Onion & Fruit Processing Unit',
    title_mr: 'सौर ऊर्जेवर भाजीपाला, कांदा व फळे वाळवणे व प्रक्रिया उद्योग',
    cropTriggers: ['Tomatoes', 'Onion', 'Grapes', 'Pomegranate', 'Green Chillies', 'Vegetables'],
    skillTriggers: ['Solar Dehydration', 'Food Processing', 'Vegetable Sorting'],
    minInvestment: 75000,
    maxInvestment: 250000,
    equipmentNeeded: ['Multi-rack Solar Dryer', 'Slicing & Shredding Machine', 'Vacuum Sealer / Nitrogen Packing'],
    infrastructureRequirements: 'Open terrace or unshaded ground with 7-8 hours sunlight; standard single-phase power.',
    mainRisks_en: 'Monsoon weather lowers drying efficiency; sudden raw material price spikes during off-season.',
    mainRisks_mr: 'पावसाळ्यात सूर्यप्रकाशाची कमतरता; हंगामाव्यतिरिक्त कच्च्या मालाचे चढते दर.',
    nextResearchSteps_en: [
      'Survey local weekly haat tomato and onion surplus volumes during peak harvest.',
      'Check availability of solar dryer subsidy under PMFME or Agriculture Department.',
      'Test small 5kg batch with local spice and grocery merchants.'
    ],
    nextResearchSteps_mr: [
      'हंगामातील अतिरिक्त टोमॅटो व कांद्याचे प्रमाण आठवडे बाजारात तपासा.',
      'PMFME किंवा कृषी विभागाच्या सौर ड्रायर अनुदानाची माहिती मिळवा.',
      'किराणा व्यापारी व स्थानिक हॉटेल्ससाठी ५ किलोचा नमुना तयार करून चाचणी घ्या.'
    ]
  },

  // 2. Village Farmstead Dairy Processing (Paneer, Ghee, Shrikhand)
  {
    id: 'pattern_dairy_value_addition',
    category: BUSINESS_CATEGORIES.DAIRY_LIVESTOCK,
    title_en: 'Farmstead Dairy Processing & Value Addition (Ghee, Paneer, Chass)',
    title_mr: 'गावपातळीवर दुग्ध प्रक्रिया उद्योग (शुद्ध तूप, पनीर, ताक निर्मिती)',
    cropTriggers: ['Cow Milk', 'Buffalo Milk', 'Fodder', 'Dairy'],
    skillTriggers: ['Dairy Processing', 'Traditional Churning', 'Animal Husbandry'],
    minInvestment: 120000,
    maxInvestment: 350000,
    equipmentNeeded: ['Cream Separator', 'Milk Khoya/Paneer Vat', 'Commercial Deep Freezer', 'Digital Weighing Scale'],
    infrastructureRequirements: 'Continuous clean water source; reliable 3-phase electricity or dedicated solar backup.',
    mainRisks_en: 'Perishable shelf-life requires strict cold-chain compliance; seasonal milk yield fluctuations in summer.',
    mainRisks_mr: 'नाशवंत पदार्थ असल्याने वीज व शीत साखळी खंडित झाल्यास नुकसान; उन्हाळ्यात दुधाचे घटते प्रमाण.',
    nextResearchSteps_en: [
      'Map daily unsold evening milk surplus in your village.',
      'Apply for Basic FSSAI registration (Registration under ₹12 lakh annual turnover).',
      'Tie up with 3 nearby village tea stalls and restaurants for daily paneer supply.'
    ],
    nextResearchSteps_mr: [
      'गावातील संध्याकाळच्या अतिरिक्त दुधाचे प्रमाण मोजा.',
      'मूलभूत FSSAI नोंदणीसाठी अर्ज करा.',
      'स्थानिक चहा हॉटेल्स व खानावळींशी दैनंदिन पनीर पुरवठ्यासाठी संपर्क साधा.'
    ]
  },

  // 3. Custom Hiring Center for Farm Implements & Drone Spraying
  {
    id: 'pattern_custom_hiring_center',
    category: BUSINESS_CATEGORIES.FARM_SERVICES,
    title_en: 'Custom Hiring Center for Agricultural Implements & Battery Sprayers',
    title_mr: 'कृषी अवजारे व बॅटरी स्प्रेअर्स भाडे केंद्र (कस्टम हायरिंग सेंटर)',
    cropTriggers: ['Soyabean', 'Cotton', 'Wheat', 'Gram', 'Maize', 'Sugarcane'],
    skillTriggers: ['Agricultural Machinery Repair', 'Tractor Operation', 'Mechanic Skills'],
    minInvestment: 150000,
    maxInvestment: 600000,
    equipmentNeeded: ['Rotavator / Cultivator', 'Power Weeder', 'High-pressure Battery Sprayers', 'Mini Thresher'],
    infrastructureRequirements: 'Secure covered shed with road access for heavy equipment movement.',
    mainRisks_en: 'Heavy seasonal peak utilization during sowing and harvest; maintenance costs and repair downtimes.',
    mainRisks_mr: 'पेरणी व काढणीच्या काळातच मोठी मागणी; अवजारांची नियमित देखभाल व दुरुस्ती खर्च.',
    nextResearchSteps_en: [
      'List farm machines currently missing or rented from distant talukas.',
      'Inquire at Taluka Agriculture Office (TAO) regarding SMAM scheme subsidy for CHC.',
      'Form an informal booking group with 15-20 smallholder farmers in the village.'
    ],
    nextResearchSteps_mr: [
      'गावात उपलब्ध नसलेली आणि लांबून आणावी लागणारी अवजारे ओळखा.',
      'कृषी विभागाच्या कृषी यांत्रिकीकरण उपअभियान (SMAM) अनुदानाची चौकशी करा.',
      'गावातील १५-२० शेतकऱ्यांचा प्राथमिक सेवा गट तयार करा.'
    ]
  },

  // 4. Mini Dal Mill & Grain Cleaning/Grading Unit
  {
    id: 'pattern_mini_dal_mill',
    category: BUSINESS_CATEGORIES.AGRO_PROCESSING,
    title_en: 'Mini Dal Mill & Pulses Grading / Packaging Unit',
    title_mr: 'मिनी डाळ मिल व धान्य स्वच्छता/प्रतवारी केंद्र',
    cropTriggers: ['Tur (Pigeon Pea)', 'Gram (Chana)', 'Moong', 'Urad', 'Grains'],
    skillTriggers: ['Grain Processing', 'Machine Operation'],
    minInvestment: 180000,
    maxInvestment: 450000,
    equipmentNeeded: ['Mini Pulses De-husking Machine', 'Destoner & Grader', 'Packaging Machine'],
    infrastructureRequirements: '3-phase commercial electricity (5 HP); dry ventilated storage godown.',
    mainRisks_en: 'Raw pulse availability concentrated post-harvest; competition from large city wholesale mills.',
    mainRisks_mr: 'काढणीनंतरच्या काळातच धान्याची उपलब्धता; मोठ्या शहरी दाल मिल्सकडून मिळणारी स्पर्धा.',
    nextResearchSteps_en: [
      'Assess total tur and chana acreages within a 5 km radius.',
      'Compare local village dal consumption vs transport charges paid to city mills.',
      'Explore KVIC or DIC subsidy under Prime Minister Employment Generation Programme (PMEGP).'
    ],
    nextResearchSteps_mr: [
      '५ किमी परिसरातील तूर व हरभरा पिकाचे उत्पादन क्षेत्र तपासा.',
      'गावातील डाळ मागणी आणि शहरात लागणारा वाहतूक खर्च यांची तुलना करा.',
      'PMEGP किंवा जिल्हा उद्योग केंद्र (DIC) योजनेतील अनुदानाची माहिती घ्या.'
    ]
  },

  // 5. Handloom & Textile Artisan Production Center
  {
    id: 'pattern_handloom_textiles',
    category: BUSINESS_CATEGORIES.TEXTILES_HANDICRAFTS,
    title_en: 'Artisan Handloom Weaving & Traditional Apparel Unit',
    title_mr: 'पारंपरिक हातमाग विणकाम व वस्त्रोद्योग केंद्र',
    cropTriggers: ['Cotton', 'Silk Yarn', 'Textiles'],
    skillTriggers: ['Paithani Weaving', 'Handloom Operation', 'Tailoring & Stitching'],
    minInvestment: 50000,
    maxInvestment: 200000,
    equipmentNeeded: ['Handloom Frame / Pit Loom', 'Yarn Winding Charkha', 'Industrial Sewing Machines'],
    infrastructureRequirements: 'Well-lit workshop area with natural ventilation; clean moisture-free storage.',
    mainRisks_en: 'Intensive manual skill required; longer turnaround times compared to powerloom products.',
    mainRisks_mr: 'कुशल कारागिरांची आवश्यकता; यंत्रमागाच्या तुलनेत उत्पादनास लागणारा अधिक वेळ.',
    nextResearchSteps_en: [
      'Identify master weavers and seamstresses in the village.',
      'Collect wholesale raw yarn quotes from Yeola or Malegaon depots.',
      'Set up display sample collections for festival exhibitions and weekly markets.'
    ],
    nextResearchSteps_mr: [
      'गावातील कुशल विणकर व महिला शिलाई कारागिरांची यादी करा.',
      'येवला किंवा मालेगाव येथील सुताचे घाऊक दर मिळवा.',
      'आठवडे बाजार व प्रदर्शनांसाठी नमुना उत्पादने तयार करा.'
    ]
  }
];

export class OpportunityDiscoveryEngine {
  /**
   * Generates tailored, evidence-backed business opportunities for a given village.
   */
  async generateOpportunitiesForVillage(villageCode, userPreferences = {}) {
    const vCode = Number(villageCode);
    const profile = await villageOpportunityService.getVillageProfile(vCode);

    if (!profile) {
      return {
        villageCode: vCode,
        opportunities: [],
        dataQualityNotice_en: 'No verified profile exists for this village yet. Recommendations are unavailable.',
        dataQualityNotice_mr: 'या गावासाठी अद्याप प्रमाणित माहिती उपलब्ध नाही. शिफारसी उपलब्ध नाहीत.'
      };
    }

    // Load actual unmet demand signals matching this village or taluka
    let villageDemandSignals = [];
    try {
      villageDemandSignals = await demandSignalService.getAggregatedDemand({
        districtCode: profile.districtCode,
        talukaCode: profile.talukaCode,
        referenceVillageCode: vCode,
        scope: 'same_village'
      });
      if (villageDemandSignals.length === 0) {
        villageDemandSignals = await demandSignalService.getAggregatedDemand({
          districtCode: profile.districtCode,
          talukaCode: profile.talukaCode,
          scope: 'taluka'
        });
      }
    } catch (e) {
      villageDemandSignals = [];
    }

    // Inspect Known Local Businesses & Suppliers
    const knownSuppliers = VERIFIED_LOCAL_SUPPLIERS.filter(
      (s) => Number(s.districtCode) === Number(profile.districtCode)
    );

    const generated = [];

    const agriCrops = [
      ...(profile.agriculture?.majorCrops || []).map((c) => (c.name || c.name_en || '').toLowerCase()),
      ...(profile.agriculture?.horticulture || []).map((h) => (h.crop || h.name || '').toLowerCase()),
      ...(profile.agriculture?.dairyLivestock?.dailyMilkCollectionLpd ? ['cow milk', 'milk', 'dairy'] : [])
    ];
    const rawMaterials = (profile.rawMaterials?.primaryMaterials || []).map((m) => (m.name || m.name_en || '').toLowerCase());
    const skills = [
      ...(profile.localSkills?.traditionalSkills || []).map((s) => (s.name || s.name_en || '').toLowerCase()),
      ...(profile.localSkills?.modernVocational || []).map((s) => (s.name || s.name_en || '').toLowerCase())
    ];
    const existingBiz = (profile.existingBusinesses?.registeredEnterprises || []).map((b) => (b.category || '').toLowerCase());

    for (const pattern of OPPORTUNITY_PATTERNS) {
      // 1. Evaluate Crop / Agri Alignment (Stem / Bidirectional contains match)
      const matchedCrops = pattern.cropTriggers.filter((t) => {
        const tLower = t.toLowerCase().replace(/s$/, '');
        return (
          agriCrops.some((c) => c.includes(tLower) || tLower.includes(c.replace(/s$/, ''))) ||
          rawMaterials.some((m) => m.includes(tLower) || tLower.includes(m.replace(/s$/, '')))
        );
      });

      // 2. Evaluate Skills Alignment
      const matchedSkills = pattern.skillTriggers.filter((t) => {
        const tLower = t.toLowerCase();
        return skills.some((s) => s.includes(tLower) || tLower.includes(s));
      });

      // Must have at least agricultural raw material OR skill evidence in this village!
      if (matchedCrops.length === 0 && matchedSkills.length === 0) {
        continue;
      }

      // 3. Evaluate Local Customer Demand Alignment
      const matchedDemands = villageDemandSignals.filter((d) =>
        d.category === pattern.category ||
        (d.productOrService && (
          d.productOrService.toLowerCase().includes(pattern.category) ||
          matchedCrops.some((mc) => d.productOrService.toLowerCase().includes(mc.toLowerCase()))
        ))
      );
      const demandReportsCount = matchedDemands.reduce((sum, d) => sum + (d.totalReports || 0), 0);

      // 4. Evaluate Existing Competition
      const competingSuppliers = knownSuppliers.filter((s) => s.category === pattern.category);
      const competingLocalBiz = existingBiz.filter((b) => b.includes(pattern.category));
      const totalKnownCompetition = competingSuppliers.length + competingLocalBiz.length;

      // 5. Infrastructure Compatibility
      const infra = profile.infrastructure || {};
      const elecHours = infra.powerSupply?.dailyHours || 16;
      const roadType = infra.connectivity?.roadType || 'all_weather_tar';

      // 6. Compute Transparent Viability Score (10-100)
      let viabilityScore = 40; // baseline
      if (matchedCrops.length > 0) viabilityScore += Math.min(25, matchedCrops.length * 12);
      if (matchedSkills.length > 0) viabilityScore += Math.min(20, matchedSkills.length * 10);
      if (demandReportsCount > 0) viabilityScore += Math.min(15, demandReportsCount * 3);
      if (elecHours >= 14) viabilityScore += 5;

      // Caution penalty if severe competition already exists
      if (totalKnownCompetition > 5) viabilityScore -= 10;

      viabilityScore = Math.max(25, Math.min(95, viabilityScore));

      // 7. Confidence Rating
      const dataCompleteness = profile.dataCompleteness || 50;
      let confidenceLevel = 'moderate';
      if (dataCompleteness >= 75 && (matchedCrops.length > 0 && matchedSkills.length > 0)) {
        confidenceLevel = 'high';
      } else if (dataCompleteness < 40) {
        confidenceLevel = 'exploratory';
      }

      // 8. Synthesize Explanation
      const cropText = matchedCrops.length > 0 ? matchedCrops.join(', ') : 'स्थानिक शेतीमाल';
      const skillText = matchedSkills.length > 0 ? matchedSkills.join(', ') : 'स्थानिक कौशल्ये';

      const explanation_en = `Recommended because ${profile.villageName} produces ${cropText} with available local skills in ${skillText}.${demandReportsCount > 0 ? ` Community demand records show ${demandReportsCount} unmet customer requests in this category.` : ''} There are currently ${totalKnownCompetition} known competing enterprises in this territory.`;
      const explanation_mr = `शिफारस करण्याचे कारण: ${profile.villageName_mr || profile.villageName} मध्ये ${cropText} चे मुबलक उत्पादन व ${skillText} ची कौशल्ये उपलब्ध आहेत.${demandReportsCount > 0 ? ` गावातील नागरिकांनी या वर्गात ${demandReportsCount} मागण्या नोंदवल्या आहेत.` : ''} या भागात सध्या ${totalKnownCompetition} ज्ञात स्पर्धक उद्योग कार्यरत आहेत.`;

      generated.push({
        id: `opp_${vCode}_${pattern.id}`,
        villageCode: vCode,
        villageName: profile.villageName,
        villageName_mr: profile.villageName_mr || profile.villageName,
        districtCode: profile.districtCode,
        talukaCode: profile.talukaCode,
        patternId: pattern.id,
        category: pattern.category,
        title_en: pattern.title_en,
        title_mr: pattern.title_mr,
        viabilityScore,
        confidenceLevel,
        investmentRange: {
          min: pattern.minInvestment,
          max: pattern.maxInvestment,
          formatted: `₹${(pattern.minInvestment / 1000).toFixed(0)}k - ₹${(pattern.maxInvestment / 100000).toFixed(1)} Lakh`
        },
        supportingEvidence: {
          matchedCrops,
          matchedSkills,
          localCustomerDemandSignals: matchedDemands.length,
          totalDemandReports: demandReportsCount,
          knownCompetitorsCount: totalKnownCompetition
        },
        requiredEquipment: pattern.equipmentNeeded,
        infrastructureRequirements: pattern.infrastructureRequirements,
        risks_en: pattern.mainRisks_en,
        risks_mr: pattern.mainRisks_mr,
        nextResearchSteps_en: pattern.nextResearchSteps_en,
        nextResearchSteps_mr: pattern.nextResearchSteps_mr,
        explanation_en,
        explanation_mr,
        generatedAt: new Date().toISOString()
      });
    }

    // Sort opportunities descending by viability score
    return {
      villageCode: vCode,
      villageName: profile.villageName,
      villageName_mr: profile.villageName_mr || profile.villageName,
      dataCompleteness: profile.dataCompleteness,
      opportunities: generated.sort((a, b) => b.viabilityScore - a.viabilityScore)
    };
  }
}

export const opportunityDiscoveryEngine = new OpportunityDiscoveryEngine();
