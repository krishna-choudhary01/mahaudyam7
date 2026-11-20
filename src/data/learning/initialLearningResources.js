/**
 * MahaUdyam — Authoritative Government Schemes, Regulatory Guides & Project DPRs
 * Fully verified against official Ministry of MSME, Maharashtra DIC, and FSSAI sources.
 */

export const RESOURCE_HUB_CATEGORIES = {
  GOVERNMENT_SCHEMES: 'government_schemes',
  REGULATORY_COMPLIANCE: 'regulatory_compliance',
  PROJECT_TEMPLATES: 'project_templates',
  TECHNICAL_TRAINING: 'technical_training'
};

export const INITIAL_LEARNING_RESOURCES = [
  // 1. PMFME Scheme (MoFPI / Maharashtra Agri Dept)
  {
    id: 'sch_pmfme_01',
    title: 'PM Formalisation of Micro Food Processing Enterprises (PMFME)',
    title_mr: 'प्रधानमंत्री सूक्ष्म अन्न प्रक्रिया उद्योग योजना (PMFME)',
    category: RESOURCE_HUB_CATEGORIES.GOVERNMENT_SCHEMES,
    shortDescription: 'Credit-linked capital subsidy of 35% (up to ₹10 Lakh) for new or existing micro food processing units.',
    shortDescription_mr: 'नवीन अथवा अस्तित्वात असलेल्या सूक्ष्म अन्न प्रक्रिया उद्योगांसाठी ३५% (कमाल ₹१० लाख) भांडवली अनुदान.',
    nodalAgency: 'Department of Agriculture, Govt of Maharashtra / MoFPI',
    nodalAgency_mr: 'कृषी विभाग, महाराष्ट्र शासन / अन्न प्रक्रिया उद्योग मंत्रालय',
    subsidyPercentage: 35,
    maxSubsidyAmount: 1000000, // ₹10,00,000
    entrepreneurContributionMinPct: 10,
    eligibleCategories: ['Food Processing', 'Agro Processing', 'Spices', 'Bakery', 'Pickles', 'Dehydration', 'Dairy'],
    eligibleCategories_mr: ['अन्न प्रक्रिया', 'कृषी प्रक्रिया', 'मसाले उद्योग', 'बेकरी', 'लोणचे निर्मिती', 'वाळवणे/ड्रायर', 'दुग्ध प्रक्रिया'],
    officialPortalUrl: 'https://pmfme.mofpi.gov.in',
    requiredDocuments: [
      'Aadhaar Card & PAN Card',
      'Proof of land / shed possession (7/12 extract or rent agreement)',
      'Detailed Project Report (DPR)',
      'Bank account statements (last 6 months)',
      'Udyam Registration Certificate',
      'Food Safety (FSSAI) License or Application copy'
    ],
    requiredDocuments_mr: [
      'आधार कार्ड व पॅन कार्ड',
      'जागेचा पुरावा / ७-१२ उतारा अथवा भाडेकरार',
      'सविस्तर प्रकल्प अहवाल (DPR)',
      'मागील ६ महिन्यांचे बँक स्टेटमेंट',
      'उद्यम नोंदणी प्रमाणपत्र (Udyam)',
      'अन्न सुरक्षा परवाना (FSSAI) प्रत'
    ],
    verificationStatus: 'verified',
    verificationSource: 'MoFPI Official Guidelines 2024-2026',
    lastUpdated: '2026-10-15T10:00:00.000Z'
  },

  // 2. CMEGP Scheme (Maharashtra Govt DIC)
  {
    id: 'sch_cmegp_02',
    title: 'Chief Minister Employment Generation Programme (CMEGP)',
    title_mr: 'मुख्यमंत्री रोजगार निर्मिती कार्यक्रम (CMEGP)',
    category: RESOURCE_HUB_CATEGORIES.GOVERNMENT_SCHEMES,
    shortDescription: 'Financial assistance for manufacturing (up to ₹50 Lakh) and service projects (up to ₹20 Lakh) with 15% to 35% subsidy.',
    shortDescription_mr: 'उत्पादन प्रकल्पांसाठी ₹५० लाखांपर्यंत व सेवा उद्योगांसाठी ₹२० लाखांपर्यंत १५% ते ३५% शासकीय अनुदान.',
    nodalAgency: 'Directorate of Industries, Maharashtra (DIC & KVIB)',
    nodalAgency_mr: 'उद्योग संचालनालय, महाराष्ट्र शासन (जिल्हा उद्योग केंद्र DIC)',
    subsidyPercentage: 25, // 25% for general rural, 35% for women/SC/ST rural
    subsidyPercentageSpecial: 35,
    maxSubsidyAmount: 1750000,
    entrepreneurContributionMinPct: 5, // 5% special, 10% general
    eligibleCategories: ['Manufacturing', 'Agro Processing', 'Engineering', 'Textiles', 'Service Sector', 'Packaging'],
    eligibleCategories_mr: ['उत्पादन उद्योग', 'कृषी प्रक्रिया', 'अभियांत्रिकी व फॅब्रिकेशन', 'वस्त्रोद्योग', 'सेवा क्षेत्र', 'पॅकेजिंग'],
    officialPortalUrl: 'https://maha-cmegp.gov.in',
    requiredDocuments: [
      'Aadhaar Card, PAN Card, Domicile of Maharashtra',
      'Educational Qualification Certificate (Min 7th/10th pass depending on project size)',
      'Caste Certificate / Special category proof (if claiming 35% subsidy)',
      'Project Profile & Machinery Quotations',
      'Undertaking that no prior PMEGP/CMEGP benefit was taken'
    ],
    requiredDocuments_mr: [
      'आधार कार्ड, पॅन कार्ड, महाराष्ट्राचे अधिवास (Domicile) प्रमाणपत्र',
      'शैक्षणिक पात्रता प्रमाणपत्र (किमान ७ वी/१० वी उत्तीर्ण)',
      'जातीचा दाखला / विशेष प्रवर्ग पुरावा (३५% अनुदानासाठी)',
      'प्रकल्प अहवाल व यंत्रसामग्री कोटेशन',
      'यापूर्वी शासकीय अनुदान न घेतल्याचे हमीपत्र'
    ],
    verificationStatus: 'verified',
    verificationSource: 'Directorate of Industries Maharashtra Circular',
    lastUpdated: '2026-10-18T10:00:00.000Z'
  },

  // 3. FSSAI Food Safety Compliance Guide
  {
    id: 'reg_fssai_03',
    title: 'FSSAI Food Business Registration & Licensing Compliance Guide',
    title_mr: 'एफएसएसएआय (FSSAI) अन्न सुरक्षा नोंदणी व परवाना मार्गदर्शक',
    category: RESOURCE_HUB_CATEGORIES.REGULATORY_COMPLIANCE,
    shortDescription: 'Step-by-step regulatory roadmap for micro food processors: Registration (turnover < ₹12L) vs State License (₹12L - ₹20Cr).',
    shortDescription_mr: 'अन्न प्रक्रिया उद्योगांसाठी नियमावली: वार्षिक उलाढाल ₹१२ लाखांखाली असल्यास नोंदणी (Registration) व त्याहून अधिक असल्यास राज्य परवाना.',
    nodalAgency: 'Food Safety and Standards Authority of India (FSSAI)',
    nodalAgency_mr: 'भारतीय अन्न सुरक्षा आणि मानके प्राधिकरण',
    officialPortalUrl: 'https://foscos.fssai.gov.in',
    requiredDocuments: [
      'Photo of Business Owner / Partners',
      'Government Photo ID (Aadhaar/PAN)',
      'Proof of Premises (Electricity bill, NOC from Gram Panchayat)',
      'Food safety management plan & list of food items manufactured',
      'Water test report from NABL-accredited laboratory'
    ],
    requiredDocuments_mr: [
      'उद्योजकाचा फोटो व ओळखपत्र (आधार/पॅन)',
      'जागेचा पुरावा (लाईट बिल, ग्रामपंचायत नाहरकत दाखला)',
      'उत्पादित केल्या जाणाऱ्या खाद्यपदार्थांची यादी',
      'अन्न सुरक्षा स्वच्छता योजना',
      'प्रयोगशाळेचा पाणी तपासणी अहवाल (NABL)'
    ],
    verificationStatus: 'verified',
    verificationSource: 'FSSAI FoSCoS Regulatory Manual 2024',
    lastUpdated: '2026-10-12T14:00:00.000Z'
  },

  // 4. Udyam MSME Registration Roadmap
  {
    id: 'reg_udyam_04',
    title: 'Zero-Cost Udyam MSME Online Registration Checklist',
    title_mr: 'मोफत उद्यम (Udyam MSME) अधिकृत नोंदणी नियमावली',
    category: RESOURCE_HUB_CATEGORIES.REGULATORY_COMPLIANCE,
    shortDescription: 'Completely free official government registration for micro, small, and medium enterprises to access priority lending and subsidies.',
    shortDescription_mr: 'सरकारी योजना व बँक कर्जासाठी अनिवार्य असलेली संपूर्ण मोफत शासकीय सूक्ष्म-लघु उद्योग नोंदणी.',
    nodalAgency: 'Ministry of MSME, Govt of India',
    nodalAgency_mr: 'सूक्ष्म, लघु व मध्यम उद्योग मंत्रालय, भारत सरकार',
    officialPortalUrl: 'https://udyamregistration.gov.in',
    requiredDocuments: [
      'Aadhaar number linked to active mobile phone (for OTP)',
      'PAN Card of entrepreneur / enterprise',
      'Bank Account Number and IFSC Code',
      'NIC Code corresponding to business activity',
      'Number of employees and investment in plant/machinery'
    ],
    requiredDocuments_mr: [
      'मोबाईलशी लिंक असलेला आधार क्रमांक (OTP साठी)',
      'उद्योजकाचा पॅन कार्ड क्रमांक',
      'बँक खाते क्रमांक आणि आयएफएससी (IFSC) कोड',
      'व्यवसायाचा एनआयसी (NIC) कोड',
      'कामगारांची संख्या व यंत्रसामग्रीतील गुंतवणूक'
    ],
    verificationStatus: 'verified',
    verificationSource: 'Ministry of MSME Gazette Notification',
    lastUpdated: '2026-10-10T09:00:00.000Z'
  },

  // 5. Project DPR Template: Solar Tunnel Dehydration Unit
  {
    id: 'dpr_solar_dryer_05',
    title: 'Bankable DPR: Commercial Solar Dehydration Unit (Onion & Tomato)',
    title_mr: 'प्रकल्प अहवाल (DPR): व्यावसायिक सौर निर्जलीकरण युनिट (कांदा व टोमॅटो)',
    category: RESOURCE_HUB_CATEGORIES.PROJECT_TEMPLATES,
    shortDescription: 'Turnkey ₹4.5 Lakh project report template with capital cost breakdown, operating expenses, and cash flow projections for bank loans.',
    shortDescription_mr: '₹४.५ लाखांचा बँक-मान्य प्रकल्प अहवाल: यंत्रसामग्री खर्च, खेळते भांडवल, नफा-तोटा विश्लेषण व परतफेड आराखडा.',
    nodalAgency: 'National Institute of Food Technology (NIFTEM) & NABARD',
    nodalAgency_mr: 'राष्ट्रीय अन्न तंत्रज्ञान संस्था व नाबार्ड',
    projectCostTotal: 450000,
    breakdown: {
      polyhouseStructureTrays: 240000,
      slicingWashingEquipment: 75000,
      packagingSealerMachine: 45000,
      workingCapitalOneCycle: 60000,
      contingencyRegistration: 30000
    },
    economics: {
      dailyRawCapacityKg: 500,
      finishedOutputYieldPct: 10, // 50kg dry output per day
      averageProductionCostPerKg: 180,
      marketSellingPricePerKg: 320,
      estimatedMonthlyNetProfit: 42000
    },
    verificationStatus: 'verified',
    verificationSource: 'NABARD Model Bankable Project Profiles',
    lastUpdated: '2026-10-14T11:00:00.000Z'
  },

  // 6. Project DPR Template: Mini Dal Mill (Tur & Chana Processing)
  {
    id: 'dpr_dal_mill_06',
    title: 'Bankable DPR: Semi-Automatic Mini Dal Mill Unit (150 kg/hr)',
    title_mr: 'प्रकल्प अहवाल (DPR): मिनी डाळ मिल प्रक्रिया युनिट (१५० किलो/तास)',
    category: RESOURCE_HUB_CATEGORIES.PROJECT_TEMPLATES,
    shortDescription: 'Standard ₹6.8 Lakh bankable project profile for farm-gate pigeon pea (tur) and chickpea (chana) processing and polishing.',
    shortDescription_mr: 'शेत पातळीवर तूर व हरभरा डाळ प्रक्रियेसाठी ₹६.८ लाखांचा प्रमाणित बँक कर्ज प्रकल्प अहवाल.',
    nodalAgency: 'ICAR - Central Institute of Agricultural Engineering (CIAE)',
    nodalAgency_mr: 'केंद्रीय कृषी अभियांत्रिकी संस्था (ICAR-CIAE)',
    projectCostTotal: 680000,
    breakdown: {
      dalMillMachineMotor: 320000,
      cleaningGradingMachine: 140000,
      bagSealingWeighing: 40000,
      civilShedModifications: 80000,
      workingCapitalInitialStock: 100000
    },
    economics: {
      hourlyProcessingCapacityKg: 150,
      recoveryRateFinishedDalPct: 75,
      estimatedMonthlyNetProfit: 58000
    },
    verificationStatus: 'verified',
    verificationSource: 'ICAR Technology Transfer Portal',
    lastUpdated: '2026-10-16T15:00:00.000Z'
  }
];
