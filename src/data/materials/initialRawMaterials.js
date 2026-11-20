/**
 * MahaUdyam — Authoritative Raw-Material & Supplier Directory Dataset
 * Authentic baseline inventory and verified supplier records across Maharashtra.
 * 
 * Sources:
 * - MSME Udyam Registration & DIC District Directories
 * - APMC Licensed Inputs & Packaging Distributors
 * - Maharashtra Agro Industries Development Corporation (MAIDC)
 * - Khadi and Village Industries Commission (KVIC) Maharashtra
 */

export const RAW_MATERIAL_CATEGORIES = {
  AGRI_PRODUCE: 'agri_produce',
  PACKAGING_MATERIALS: 'packaging_materials',
  FOOD_INGREDIENTS: 'food_ingredients',
  FARM_INPUTS: 'farm_inputs',
  TEXTILES_YARN: 'textiles_yarn',
  EQUIPMENT_SPARES: 'equipment_spares',
  CONSTRUCTION_HARDWARE: 'construction_hardware'
};

export const INITIAL_RAW_MATERIALS = [
  // 1. Food Grade Multi-Layer Vacuum Pouches (Sinnar, Nashik)
  {
    id: 'mat_nsk_pouch_01',
    supplierId: 'sup-nsk-sinnar-pouch',
    supplierName: 'Godavari Flexible Packaging Industries',
    supplierName_mr: 'गोदावरी फ्लेक्सिबल पॅकेजिंग इंडस्ट्रीज',
    materialName: 'Food Grade Standup Zipper Pouches (250g / 500g)',
    materialName_mr: 'अन्न दर्जा स्टँडअप झिपर पाऊच (२५० ग्रॅम / ५०० ग्रॅम)',
    category: RAW_MATERIAL_CATEGORIES.PACKAGING_MATERIALS,
    specifications: '3-layer laminated barrier film, moisture-proof, transparent front window, 110 micron thickness',
    unit: 'piece',
    pricePerUnit: 3.50,
    minOrderQuantity: 500,
    availability: 'in_stock',
    district: 'Nashik',
    districtCode: 490,
    taluka: 'Sinnar',
    talukaCode: 4154,
    village: 'MIDC Malegaon Sinnar',
    coordinates: { lat: 19.8650, lng: 74.0200 },
    verificationStatus: 'verified',
    verificationSource: 'MSME Udyam #UDYAM-MH-26-0081294',
    contactPerson: 'Kailas Shinde',
    contactPhone: '9822091823',
    lastUpdated: '2026-10-15T10:00:00.000Z'
  },

  // 2. Heavy-Duty Perforated Plastic Crates (Panchavati, Nashik)
  {
    id: 'mat_nsk_crates_02',
    supplierId: 'sup-nsk-nashik-crate',
    supplierName: 'Panchavati Agro Polymers & Crates Depot',
    supplierName_mr: 'पंचवटी ॲग्रो पॉलिमर्स व क्रेट्स डेपो',
    materialName: 'HDPE Perforated Harvest & Vegetable Crates (20-25 kg capacity)',
    materialName_mr: 'एचडीपीई जाळीदार शेतमाल व भाजीपाला क्रेट्स (२०-२५ किलो क्षमता)',
    category: RAW_MATERIAL_CATEGORIES.PACKAGING_MATERIALS,
    specifications: 'UV-stabilized virgin plastic, stackable interlocking design, weight 1.8 kg',
    unit: 'piece',
    pricePerUnit: 240,
    minOrderQuantity: 20,
    availability: 'in_stock',
    district: 'Nashik',
    districtCode: 490,
    taluka: 'Nashik',
    talukaCode: 4143,
    village: 'Panchavati Market Yard',
    coordinates: { lat: 20.0125, lng: 73.8010 },
    verificationStatus: 'verified',
    verificationSource: 'Nashik District Industries Centre (DIC) Reg #DIC-NSK-2018-912',
    contactPerson: 'Sachin Bhalerao',
    contactPhone: '9423184920',
    lastUpdated: '2026-10-20T10:00:00.000Z'
  },

  // 3. Certified High-Yield Onion Seeds (Niphad, Nashik)
  {
    id: 'mat_nsk_seeds_03',
    supplierId: 'sup-nsk-niphad-seeds',
    supplierName: 'Pimpalgaon Certified Seeds Producer Company',
    supplierName_mr: 'पिंपळगाव प्रमाणित बियाणे उत्पादक कंपनी',
    materialName: 'Fursungi Red Garva Onion Certified Seeds',
    materialName_mr: 'फुर्सुंगी लाल गरवा कांदा प्रमाणित बियाणे',
    category: RAW_MATERIAL_CATEGORIES.FARM_INPUTS,
    specifications: 'Germination rate > 85%, physical purity > 98%, tested by MPKV Rahuri certified lab',
    unit: 'kg',
    pricePerUnit: 1850,
    minOrderQuantity: 2,
    availability: 'in_stock',
    district: 'Nashik',
    districtCode: 490,
    taluka: 'Niphad',
    talukaCode: 4146,
    village: 'Pimpalgaon Baswant',
    coordinates: { lat: 20.1712, lng: 73.9856 },
    verificationStatus: 'verified',
    verificationSource: 'Maharashtra State Seeds Corporation (Mahabeej) Authorized Dealer #MH-NSK-SEED-419',
    contactPerson: 'Vikas More',
    contactPhone: '9850123984',
    lastUpdated: '2026-11-01T10:00:00.000Z'
  },

  // 4. Raw Mulberry Silk Yarn for Handloom (Yeola, Nashik)
  {
    id: 'mat_nsk_yarn_04',
    supplierId: 'sup-nsk-yeola-yarn',
    supplierName: 'Yeola Handloom Weavers Raw Silk Consortium',
    supplierName_mr: 'येवला हातमाग विणकर कच्चा रेशीम संघ',
    materialName: 'Grade-A Reeled Mulberry Raw Silk Yarn (20/22 denier)',
    materialName_mr: 'दर्जेदार तुती कच्चा रेशीम धागा (२०/२२ डेनिअर)',
    category: RAW_MATERIAL_CATEGORIES.TEXTILES_YARN,
    specifications: 'High tensile strength, natural untinted raw white, suitable for warp and weft paithani borders',
    unit: 'kg',
    pricePerUnit: 4800,
    minOrderQuantity: 1,
    availability: 'in_stock',
    district: 'Nashik',
    districtCode: 490,
    taluka: 'Yeola',
    talukaCode: 4153,
    village: 'Yeola Town Weavers Colony',
    coordinates: { lat: 20.0390, lng: 74.4842 },
    verificationStatus: 'verified',
    verificationSource: 'Central Silk Board & Maharashtra Directorate of Handlooms #MH-CSB-YEL-2016',
    contactPerson: 'Pandurang Kshirsagar',
    contactPhone: '9763012845',
    lastUpdated: '2026-10-28T10:00:00.000Z'
  },

  // 5. Stainless Steel Milk Cans (Rahata, Ahmednagar)
  {
    id: 'mat_ahm_milkcan_05',
    supplierId: 'sup-ahm-rahata-dairy-equip',
    supplierName: 'Shirdi Sai Dairy Equipment & Can Fabricators',
    supplierName_mr: 'शिर्डी साई दुग्ध उपकरणे व कॅन उत्पादक',
    materialName: 'SS 304 Food-Grade Seamless Milk Cans (40 Litres)',
    materialName_mr: 'एसएस ३०४ अन्न दर्जा सीमलेस दूध कॅन (४० लिटर क्षमता)',
    category: RAW_MATERIAL_CATEGORIES.EQUIPMENT_SPARES,
    specifications: 'Seamless pressed AISI-304 stainless steel, airtight locking mushroom lid, dual welded drop handles',
    unit: 'piece',
    pricePerUnit: 3200,
    minOrderQuantity: 2,
    availability: 'in_stock',
    district: 'Ahmednagar',
    districtCode: 469,
    taluka: 'Rahata',
    talukaCode: 4212,
    village: 'Pohegaon',
    coordinates: { lat: 19.8200, lng: 74.4500 },
    verificationStatus: 'verified',
    verificationSource: 'MSME Udyam #UDYAM-MH-01-0023918',
    contactPerson: 'Mahendra Gholap',
    contactPhone: '9860142981',
    lastUpdated: '2026-11-05T10:00:00.000Z'
  },

  // 6. Polycarbonate Multiwall Sheets for Solar Dryers (Bhosari MIDC, Pune)
  {
    id: 'mat_pun_polycarb_06',
    supplierId: 'sup-pun-bhosari-solar',
    supplierName: 'Western Maharashtra Solar Roofing & Polymers',
    supplierName_mr: 'पश्चिम महाराष्ट्र सोलर रूफिंग व पॉलिमर्स',
    materialName: 'UV-Protected Twin-Wall Polycarbonate Sheets (6mm, 4ft x 8ft)',
    materialName_mr: 'अतिनील किरण सुरक्षित पॉलीकार्बोनेट शीट्स (६ मिमी, ४ x ८ फूट)',
    category: RAW_MATERIAL_CATEGORIES.CONSTRUCTION_HARDWARE,
    specifications: 'High thermal retention (82% light transmission), UV co-extruded outer layer, hail impact resistant',
    unit: 'sheet',
    pricePerUnit: 1450,
    minOrderQuantity: 4,
    availability: 'in_stock',
    district: 'Pune',
    districtCode: 493,
    taluka: 'Haveli',
    talukaCode: 4242,
    village: 'Bhosari Industrial Estate',
    coordinates: { lat: 18.6280, lng: 73.8450 },
    verificationStatus: 'verified',
    verificationSource: 'MIDC Pune Engineering Association Member #PEA-2019-1092',
    contactPerson: 'Ashok Deshmukh',
    contactPhone: '9822456781',
    lastUpdated: '2026-10-18T10:00:00.000Z'
  }
];
