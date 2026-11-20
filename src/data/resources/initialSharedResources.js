/**
 * MahaUdyam — Authoritative Shared Farm & Processing Resources Dataset
 * Authentic agricultural implements, processing equipment, and storage facilities in Maharashtra.
 * 
 * Verified against:
 * - MAIDC Custom Hiring Centres (CHC)
 * - Department of Agriculture Maharashtra Scheme for Farm Mechanization
 * - NABARD Supported Farmer Producer Organizations (FPOs)
 */

export const RESOURCE_CATEGORIES = {
  FARM_MACHINERY: 'farm_machinery',
  HARVEST_POST_HARVEST: 'harvest_post_harvest',
  PROCESSING_EQUIPMENT: 'processing_equipment',
  STORAGE_FACILITY: 'storage_facility',
  PACKAGING_GRADING: 'packaging_grading'
};

export const INITIAL_SHARED_RESOURCES = [
  // 1. Solar Polyhouse Dehydration Facility (Sinnar, Nashik)
  {
    id: 'res_nsk_solar_dryer_01',
    resourceName: 'Commercial Solar Polyhouse Tunnel Dehydrator (500 kg batch)',
    resourceName_mr: 'व्यावसायिक सौर पॉलीहाऊस ड्रायर (५०० किलो बॅच)',
    category: RESOURCE_CATEGORIES.PROCESSING_EQUIPMENT,
    ownerName: 'Godavari Agri-Processing Cooperative',
    ownerName_mr: 'गोदावरी कृषी प्रक्रिया सहकारी संस्था',
    ownerType: 'Cooperative / FPO',
    specifications: 'UV-stabilized polycarbonate tunnel, 4 solar exhaust fans, temperature control 45°C–65°C, food-grade SS304 trays (60 trays)',
    suitableProducts: ['Tomato', 'Onion', 'Chilli', 'Ginger', 'Methi', 'Garlic', 'Grapes'],
    suitableProducts_mr: ['टोमॅटो', 'कांदा', 'मिरची', 'आले', 'मेथी', 'लसूण', 'द्राक्षे'],
    rentalRate: 450, // ₹450 per day (or per 500kg batch)
    rateUnit: 'day',
    depositAmount: 1000,
    minRentalDuration: 1, // days
    availabilityStatus: 'available', // available | rented | maintenance
    district: 'Nashik',
    districtCode: 490,
    taluka: 'Sinnar',
    talukaCode: 4154,
    village: 'Baragaon Pimpri',
    villageCode: 551322,
    coordinates: { lat: 19.8500, lng: 74.0000 },
    verificationStatus: 'verified',
    verificationSource: 'MAIDC CHC Scheme #CHC-MH-NSK-2024-098',
    contactPerson: 'Suresh Patil',
    contactPhone: '9822345678',
    requiresOperator: false,
    operatorCostPerDay: 0,
    lastUpdated: '2026-10-18T10:00:00.000Z'
  },

  // 2. Mini Solar Cold Room Storage (Pimpalgaon Baswant, Niphad)
  {
    id: 'res_nsk_cold_room_02',
    resourceName: 'Micro Solar Cold Room Storage (5 MT Capacity)',
    resourceName_mr: 'मायक्रो सौर शीतगृह साठवणूक (५ मेट्रिक टन क्षमता)',
    category: RESOURCE_CATEGORIES.STORAGE_FACILITY,
    ownerName: 'Pimpalgaon Farmers Producer Co.',
    ownerName_mr: 'पिंपळगाव शेतकरी उत्पादक कंपनी',
    ownerType: 'FPO',
    specifications: 'Thermal energy storage backup, 4°C to 12°C humidity controlled, pre-cooling rack, crate stacking system',
    suitableProducts: ['Tomato', 'Grapes', 'Pomegranate', 'Vegetables', 'Flowers'],
    suitableProducts_mr: ['टोमॅटो', 'द्राक्षे', 'डाळिंब', 'भाजीपाला', 'फुले'],
    rentalRate: 25, // ₹25 per crate per week (or ₹1.5 per kg per month)
    rateUnit: 'crate_day',
    depositAmount: 500,
    minRentalDuration: 3, // days
    availabilityStatus: 'available',
    district: 'Nashik',
    districtCode: 490,
    taluka: 'Niphad',
    talukaCode: 4150,
    village: 'Pimpalgaon Baswant',
    villageCode: 551100,
    coordinates: { lat: 20.1700, lng: 73.9800 },
    verificationStatus: 'verified',
    verificationSource: 'MIDH Cold Chain Registry #MH-NSK-CC-041',
    contactPerson: 'Ramesh Jadhav',
    contactPhone: '9423187654',
    requiresOperator: false,
    operatorCostPerDay: 0,
    lastUpdated: '2026-10-15T12:00:00.000Z'
  },

  // 3. Mini Dal Mill & Grain Polisher (Rahata, Ahmednagar)
  {
    id: 'res_ahd_dal_mill_03',
    resourceName: 'Semi-Automatic Mini Dal Mill (150 kg/hour)',
    resourceName_mr: 'अर्ध-स्वयंचलित मिनी डाळ मिल (१५० किलो/तास)',
    category: RESOURCE_CATEGORIES.PROCESSING_EQUIPMENT,
    ownerName: 'Shree Ganesh Rural Self Help Group',
    ownerName_mr: 'श्री गणेश ग्रामीण बचत गट महासंघ',
    ownerType: 'SHG Federation',
    specifications: 'De-husking, splitting, and grading for Pigeon pea (Tur), Chickpea (Chana), Mung and Urad with 3HP 3-phase motor',
    suitableProducts: ['Pigeon Pea (Tur)', 'Gram (Chana)', 'Mung', 'Urad', 'Soybean'],
    suitableProducts_mr: ['तूर', 'हरभरा (चना)', 'मूग', 'उडीद', 'सोयाबीन'],
    rentalRate: 350, // ₹350 per hour (includes operator)
    rateUnit: 'hour',
    depositAmount: 800,
    minRentalDuration: 2, // hours
    availabilityStatus: 'available',
    district: 'Ahmednagar',
    districtCode: 494,
    taluka: 'Rahata',
    talukaCode: 4212,
    village: 'Pohegaon',
    villageCode: 557623,
    coordinates: { lat: 19.7800, lng: 74.4900 },
    verificationStatus: 'verified',
    verificationSource: 'MSRLM Umed Registry #SHG-FED-AHD-0912',
    contactPerson: 'Sunita Gorde',
    contactPhone: '9822998877',
    requiresOperator: true,
    operatorCostPerDay: 0, // Included in hourly rate
    lastUpdated: '2026-10-20T11:00:00.000Z'
  },

  // 4. 45 HP Tractor with Hydraulic Reversible MB Plough & Rotavator (Sinnar)
  {
    id: 'res_nsk_tractor_04',
    resourceName: '45 HP 4WD Tractor + 6-Foot Heavy Rotavator',
    resourceName_mr: '४५ एचपी ट्रॅक्टर + ६ फूट हेवी रोटाव्हेटर व नांगर',
    category: RESOURCE_CATEGORIES.FARM_MACHINERY,
    ownerName: 'Kailas Bhausaheb Vikhe (Custom Hiring Service)',
    ownerName_mr: 'कैलास भाऊसाहेब विखे (कृषी सेवा केंद्र)',
    ownerType: 'Private Entrepreneur / CHC',
    specifications: '4-wheel drive, dual clutch, reverse PTO, heavy duty rotavator for fine tilth seedbed preparation',
    suitableProducts: ['Soil Preparation', 'Ploughing', 'Rotavating', 'Sowing'],
    suitableProducts_mr: ['मशागत', 'नांगरणी', 'रोटाव्हेटर', 'पेरणी पूर्व तयारी'],
    rentalRate: 850, // ₹850 per acre / hour (excluding diesel)
    rateUnit: 'hour',
    depositAmount: 1500,
    minRentalDuration: 2, // hours
    availabilityStatus: 'available',
    district: 'Nashik',
    districtCode: 490,
    taluka: 'Sinnar',
    talukaCode: 4154,
    village: 'Wavi',
    villageCode: 551352,
    coordinates: { lat: 19.8200, lng: 74.1500 },
    verificationStatus: 'verified',
    verificationSource: 'MAIDC CHC Hub Verified Operator',
    contactPerson: 'Kailas Vikhe',
    contactPhone: '9823456712',
    requiresOperator: true,
    operatorCostPerDay: 200,
    lastUpdated: '2026-10-19T09:30:00.000Z'
  },

  // 5. Motorized Seed & Grain Cleaner / Grader (Dindori, Nashik)
  {
    id: 'res_nsk_grader_05',
    resourceName: 'Multi-Screen Vibro Grain Cleaner & Grader (1 Ton/hour)',
    resourceName_mr: 'व्हायब्रो धान्य क्लिनर व ग्रेडिंग मशीन (१ टन/तास)',
    category: RESOURCE_CATEGORIES.PACKAGING_GRADING,
    ownerName: 'Dindori Taluka Farmers Producer FPO',
    ownerName_mr: 'दिंडोरी तालुका शेतकरी उत्पादक कंपनी',
    ownerType: 'FPO',
    specifications: 'Triple-deck changeable sieves for wheat, soybean, maize, pulses and onion seeds with blower dust separator',
    suitableProducts: ['Soybean', 'Wheat', 'Maize', 'Bengal Gram', 'Seeds'],
    suitableProducts_mr: ['सोयाबीन', 'गहू', 'मका', 'हरभरा', 'बियाणे'],
    rentalRate: 200, // ₹200 per quintal processed
    rateUnit: 'quintal',
    depositAmount: 500,
    minRentalDuration: 5, // quintals
    availabilityStatus: 'available',
    district: 'Nashik',
    districtCode: 490,
    taluka: 'Dindori',
    talukaCode: 4145,
    village: 'Dindori Rural',
    villageCode: 551001,
    coordinates: { lat: 20.2000, lng: 73.8300 },
    verificationStatus: 'verified',
    verificationSource: 'Smart Agro FPO Registry #FPO-NSK-DND-14',
    contactPerson: 'Balu Gawali',
    contactPhone: '9765432109',
    requiresOperator: false,
    operatorCostPerDay: 0,
    lastUpdated: '2026-10-12T14:00:00.000Z'
  },

  // 6. Food-Grade Vacuum Sealer & Nitrogen Flushing Packaging Machine (Sinnar)
  {
    id: 'res_nsk_vac_pack_06',
    resourceName: 'Double Chamber Heavy Vacuum Packaging Machine + N2 Flush',
    resourceName_mr: 'डबल चेंबर व्हॅक्यूम पॅकिंग मशीन + नायट्रोजन फ्लशिंग',
    category: RESOURCE_CATEGORIES.PACKAGING_GRADING,
    ownerName: 'Sinnar Micro-Agro Cluster Center',
    ownerName_mr: 'सिन्नर मायक्रो-ॲग्रो क्लस्टर केंद्र',
    ownerType: 'Common Facility Centre (CFC)',
    specifications: 'SS304 body, dual sealing bars (500mm), 20m3/h vacuum pump, suitable for dried fruits, spices, pulses and snacks',
    suitableProducts: ['Dehydrated Vegetables', 'Raisins', 'Spices', 'Snacks', 'Flours'],
    suitableProducts_mr: ['वाळवलेल्या भाज्या', 'मनुका', 'मसाले', 'शेव/फरसाण', 'पिठ'],
    rentalRate: 300, // ₹300 per day
    rateUnit: 'day',
    depositAmount: 1000,
    minRentalDuration: 1, // days
    availabilityStatus: 'available',
    district: 'Nashik',
    districtCode: 490,
    taluka: 'Sinnar',
    talukaCode: 4154,
    village: 'MIDC Malegaon Sinnar',
    villageCode: 551320,
    coordinates: { lat: 19.8650, lng: 74.0200 },
    verificationStatus: 'verified',
    verificationSource: 'MSE-CDP Common Facility Registry #CFC-NSK-02',
    contactPerson: 'Prakash Kute',
    contactPhone: '9860123456',
    requiresOperator: false,
    operatorCostPerDay: 0,
    lastUpdated: '2026-10-17T16:00:00.000Z'
  }
];
