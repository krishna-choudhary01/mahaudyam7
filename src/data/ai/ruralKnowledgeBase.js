/**
 * MahaUdyam — Curated Rural Business Knowledge Base for Maharashtra
 * 
 * Provides verified factual context, regional clusters, regulatory pathways, 
 * government subsidies, and street-smart rural commercial wisdom.
 */

export const RURAL_KNOWLEDGE_BASE = {
  // District-wise One District One Product (ODOP) and agro clusters in Maharashtra
  districtClusters: {
    'Nashik': {
      crops: ['Onion', 'Grapes', 'Tomato', 'Pomegranate', 'Corn'],
      advantages: ['APMC Lasalgaon (Asia largest onion market)', 'Pimpalgaon tomato hub', 'Close to Mumbai-Thane corridors'],
      keyOpportunities: ['Tomato puree & dehydration', 'Raisin (बेदाणा) grading & packaging', 'Small cold storage aggregation'],
      schemes: ['PMFME (Tomato)', 'National Horticulture Mission (NHM)']
    },
    'Sangli': {
      crops: ['Turmeric (हळद)', 'Grapes & Raisins', 'Sugarcane', 'Soybean'],
      advantages: ['Historical turmeric trading hub', 'GI tag for Sangli Turmeric', 'High grape processing expertise'],
      keyOpportunities: ['Organic turmeric powder with curcumin testing', 'Raisin direct consumer packs', 'Jaggery powder (गूळ पावडर)'],
      schemes: ['PMFME (Turmeric)', 'CMEGP']
    },
    'Latur': {
      crops: ['Soybean', 'Pigeon Pea (तूर)', 'Urad', 'Bengal Gram (चना)'],
      advantages: ['Major Marathwada pulses and oilseed processing center', 'Central rail connectivity'],
      keyOpportunities: ['Mini dal mill unit', 'Cold-pressed soybean oil ghani', 'Roasted chana and besan packaging'],
      schemes: ['PMFME (Soybean)', 'PMEGP', 'CMEGP']
    },
    'Kolhapur': {
      crops: ['Sugarcane', 'Milk (Buffalo/Cow)', 'Jaggery (गूळ)', 'Ginger'],
      advantages: ['Gokul dairy network', 'GI tagged Kolhapur Jaggery', 'Rich irrigation from Panchganga basin'],
      keyOpportunities: ['Hygienic chemical-free jaggery cubes', 'Paneer and indigenous dairy derivatives', 'Ginger paste processing'],
      schemes: ['PMFME (Jaggery)', 'National Dairy Plan']
    },
    'Solapur': {
      crops: ['Pomegranate (डाळिंब)', 'Jowar (ज्वारी/मालदांडी)', 'Grape', 'Onion'],
      advantages: ['Maldandi Jowar GI tag', 'National Research Centre on Pomegranate (NRCP) in Kegaon'],
      keyOpportunities: ['Ready-to-eat Maldandi Jowar bhakri/papad', 'Pomegranate arils vacuum packaging', 'Millet breakfast flakes'],
      schemes: ['PMFME (Pomegranate/Millets)', 'State Millet Mission (श्री अन्न)']
    },
    'Nagpur': {
      crops: ['Nagpur Mandarin Orange (संत्रा)', 'Cotton', 'Soybean', 'Chilli'],
      advantages: ['GI tagged Nagpur Orange', 'Central logistics multi-modal hub (MIHAN)', 'Pachkhedi/Bhiwapur chillies'],
      keyOpportunities: ['Orange juice extraction & rind oil', 'Spicy red chilli powder grinding', 'Cotton waste briquettes'],
      schemes: ['PMFME (Citrus Fruits)', 'PMEGP']
    },
    'Ratnagiri': {
      crops: ['Alphonso Mango (हापूस)', 'Cashew (काजू)', 'Kokum (कोकम)', 'Fish'],
      advantages: ['GI tagged Alphonso', 'Konkan coastal highway access', 'High tourist influx'],
      keyOpportunities: ['Cashew nut processing & roasting', 'Kokum syrup & butter extraction', 'Mango pulp aseptic pouching'],
      schemes: ['PMFME (Mango/Cashew)', 'Pradhan Mantri Matsya Sampada Yojana']
    },
    'Amravati': {
      crops: ['Cotton', 'Soybean', 'Orange (Warud/Morshi belt)', 'Tur'],
      advantages: ['Warud region known as California of Vidarbha for oranges', 'Textile park in Nandgaon'],
      keyOpportunities: ['Graded orange sorting & waxing', 'Soybean chunk (badi) manufacturing', 'Gin waste fertilizer compost'],
      schemes: ['PMFME (Citrus)', 'CMEGP']
    },
    'Ahmednagar': {
      crops: ['Milk', 'Sugarcane', 'Pomegranate', 'Bajra', 'Guava'],
      advantages: ['Highest number of co-operative sugar factories and dairies', 'Proximity to Pune'],
      keyOpportunities: ['Silage fodder baling for small dairy farmers', 'Guava pulp & jelly', 'Solar-powered milk chilling'],
      schemes: ['PMFME (Milk Products)', 'Ahilyabai Holkar Sheli Vikas']
    }
  },

  // Key Government Schemes for Maharashtra Rural Enterprises
  schemes: [
    {
      id: 'pmfme',
      name: 'PM Formalisation of Micro food processing Enterprises (PMFME)',
      marathiName: 'पंतप्रधान सूक्ष्म अन्न प्रक्रिया उद्योग योजना',
      subsidyPercent: 35,
      maxSubsidyAmount: '₹10,00,000 (10 Lakh)',
      beneficiaryContribution: '10% of project cost',
      bankLoanRequired: true,
      eligibleBusinesses: ['Flour mills', 'Oil extraction', 'Turmeric polishing', 'Bakery', 'Fruit processing', 'Pickle/masala'],
      keyCriteria: 'Existing or new micro-food enterprise. Preference for One District One Product (ODOP) focus.',
      portal: 'pmfme.mofpi.gov.in',
      applicationSteps: [
        'Apply online on PMFME portal',
        'District Resource Person (DRP) assists with DPR preparation',
        'DLC (District Level Committee) approves and sends to bank'
      ]
    },
    {
      id: 'cmegp',
      name: "Chief Minister Employment Generation Programme (CMEGP) Maharashtra",
      marathiName: 'मुख्यमंत्री रोजगार निर्मिती कार्यक्रम',
      subsidyPercent: '15% to 35% depending on category and location (Rural SC/ST/Women get 35%)',
      maxSubsidyAmount: '₹17.5 Lakh (Manufacturing up to ₹50 Lakh, Service up to ₹10 Lakh)',
      beneficiaryContribution: '5% to 10%',
      bankLoanRequired: true,
      eligibleBusinesses: ['Agro processing', 'Rural transport/machinery hiring', 'Fabrication', 'Textiles', 'Repair services'],
      keyCriteria: 'Age 18-45 years, 7th/8th/10th pass depending on project size. Maharashtra domicile required.',
      portal: 'maha-cmegp.gov.in',
      applicationSteps: [
        'Register on maha-cmegp.gov.in',
        'Upload Aadhar, Domicile, Project Summary, Qualification certificate',
        'Forwarded to District Industries Centre (DIC) / KVIB'
      ]
    },
    {
      id: 'pmegp',
      name: "Prime Minister's Employment Generation Programme (PMEGP)",
      marathiName: 'पंतप्रधान रोजगार निर्मिती कार्यक्रम',
      subsidyPercent: '25% to 35% for rural projects',
      maxSubsidyAmount: '₹17.5 Lakh (Manufacturing up to ₹50 Lakh, Service up to ₹20 Lakh)',
      beneficiaryContribution: '5% for special categories, 10% for general',
      bankLoanRequired: true,
      eligibleBusinesses: ['Manufacturing & Service units (excluding negative list like tobacco, alcohol)'],
      keyCriteria: 'Age 18+, min 8th standard pass for projects above ₹10 Lakh in manufacturing.',
      portal: 'kviconline.gov.in/pmegpeportal',
      applicationSteps: [
        'Online application through KVIC portal',
        'District Task Force Committee reviews proposal',
        'Bank sanction and 10-day EDP training before subsidy release'
      ]
    },
    {
      id: 'mudra',
      name: 'Pradhan Mantri MUDRA Yojana',
      marathiName: 'मुद्रा योजना',
      categories: [
        { name: 'Shishu (शिशू)', limit: 'Up to ₹50,000', suitableFor: 'Street vendors, repair mechanics, small haat sellers' },
        { name: 'Kishore (किशोर)', limit: '₹50,000 to ₹5,00,000', suitableFor: 'Small flour mills, packing machinery, retail shops' },
        { name: 'Tarun (तरुण)', limit: '₹5,00,000 to ₹10,00,000', suitableFor: 'Small processing units, transport vehicles' }
      ],
      collateralRequired: false,
      keyCriteria: 'No collateral required. Available through nationalized, co-operative, and RRB banks (e.g. Maharashtra Gramin Bank).'
    }
  ],

  // Step-by-Step Compliance Checklist for Rural Maharashtra
  complianceSteps: [
    {
      step: 1,
      title: 'Udyam Registration (उद्यम नोंदणी)',
      cost: '₹0 (Completely Free)',
      time: 'Instant (15 minutes online)',
      portal: 'udyamregistration.gov.in',
      description_en: 'Official MSME certificate. Requires only Aadhar & PAN. Essential for bank priority lending and subsidies.',
      description_mr: 'अधिकृत एमएसएमई प्रमाणपत्र. फक्त आधार आणि पॅन लागते. बँक कर्ज व सरकारी सवलतींसाठी अनिवार्य.'
    },
    {
      step: 2,
      title: 'Gram Panchayat NOC / Village Trade Permit (ग्रामपंचायत ना-हरकत)',
      cost: '₹100 - ₹500 (Nominal Panchayat fee)',
      time: '2 - 7 days',
      description_en: 'Permission from Gram Sevak & Sarpanch to run a commercial enterprise within village limits.',
      description_mr: 'गावात व्यवसाय किंवा शेड उभारण्यासाठी ग्रामसेवक आणि सरपंचांचा ना-हरकत दाखला.'
    },
    {
      step: 3,
      title: 'FSSAI Food Registration (अन्न सुरक्षा नोंदणी)',
      cost: '₹100/year (For turnover below ₹12 Lakh)',
      time: '3 - 10 days online via FoSCoS',
      portal: 'foscos.fssai.gov.in',
      description_en: 'Mandatory for ANY food business (flour mill, oil ghani, jaggery, bakery, snacks, spices). Form A online.',
      description_mr: 'कोणत्याही खाद्यपदार्थ व्यवसायासाठी अनिवार्य. वार्षिक ₹१२ लाखांखालील उलाढालीस केवळ ₹१०० नोंदणी शुल्क.'
    },
    {
      step: 4,
      title: 'Current Bank Account (चालू खाते)',
      cost: 'Minimum balance ₹2,000 - ₹5,000',
      time: '1 - 3 days',
      description_en: 'Open in the name of the enterprise (Proprietorship) at local branch (SBI, Bank of Maharashtra, Gramin Bank).',
      description_mr: 'व्यवसायाच्या नावाने चालू खाते. अनुदान आणि व्यावसायिक व्यवहारांसाठी आवश्यक.'
    }
  ],

  // Common Rural Enterprise Pitfalls and Golden Rules
  ruralBusinessWisdom: [
    {
      pitfall_en: 'Excessive credit (उधारी) to local retail shops without written agreement.',
      solution_en: 'Keep initial credit strictly capped at 25% of working capital. Demand 50% advance for custom or bulk orders.',
      pitfall_mr: 'स्थानिक दुकानदारांना अनिर्बंध उधारी देणे आणि वसुली न होणे.',
      solution_mr: 'उधारी एकूण फिरत्या भांडवलाच्या २५% पेक्षा जास्त कधीही देऊ नका. नवीन ग्राहकांकडून किमान ५०% आगाऊ रक्कम घ्या.'
    },
    {
      pitfall_en: 'Buying big expensive machinery before securing a recurring buyer.',
      solution_en: 'First sell 100-200 kg by job-work / rented machinery. Buy machines only after repeat orders are proven.',
      pitfall_mr: 'ग्राहक किंवा बाजार पक्का होण्याआधीच मोठी व महागडी यंत्रसामग्री खरेदी करणे.',
      solution_mr: 'आधी भाड्याने किंवा जॉब-वर्कवर माल तयार करून बाजारात विका. कायमस्वरूपी मागणी सिद्ध झाल्यावरच स्वतःचे यंत्र घ्या.'
    },
    {
      pitfall_en: 'Selling raw commodity during peak harvest glut when prices collapse.',
      solution_en: 'Use solar drying, dehydration, or cold aggregation to hold or transform produce for the off-season.',
      pitfall_mr: 'हंगामातील भाव पडझडीच्या काळात सर्व कच्चा शेतमाल घाईघाईने बाजारात फेकून देणे.',
      solution_mr: 'सोलर ड्रायर, प्राथमिक प्रतवारी किंवा प्रक्रिया करून मालाची टिकवण क्षमता वाढवा व चांगल्या दरात विका.'
    },
    {
      pitfall_en: 'Ignoring travel and transport expenses when pricing for weekly haats.',
      solution_en: 'Always use BazaarPath travel calculator: fuel + auto-rickshaw + octroi/bazaar tax must be factored in.',
      pitfall_mr: 'आठवडे बाजारात माल नेताना वाहतूक आणि हमाली खर्चाचा हिशोब न ठेवणे.',
      solution_mr: 'बाजारपेठ मार्गदर्शकाचा वापर करून गाडी भाडे, इंधन आणि बाजार कर आधीच जोडून सुरक्षित विक्री दर ठरवा.'
    }
  ]
};
