/**
 * Authoritative Master Dataset for Customer-Driven Demand Signals
 * 
 * Complies with Core Principles:
 * - Customer/Resident point of view (unmet local needs, shortages, inaccessible services)
 * - Purely aggregated and anonymized (NO personal identification, phone numbers, or private details)
 * - Includes disclaimers: Not guaranteed revenue, not confirmed buyers
 * - Fully localized for English and Marathi
 */

export const DEMAND_CATEGORIES = [
  {
    id: 'food_groceries',
    name: 'Food and groceries',
    name_mr: 'अन्न आणि किराणा',
    icon: '🛒',
    popularNeeds: [
      'Cold Storage for Vegetables (भाजीपाला शीतगृह)',
      'Fresh Paneer & Dairy Products (ताजे पनीर व दुग्धजन्य पदार्थ)',
      'Organic Jaggery & Flour Mill (सेंद्रिय गूळ व गिरणी)',
      'Bakery Products & Snacks (बेकरी उत्पादने व अल्पोपहार)'
    ]
  },
  {
    id: 'healthcare_pharmacy',
    name: 'Healthcare and pharmacy',
    name_mr: 'आरोग्य आणि औषधे',
    icon: '💊',
    popularNeeds: [
      '24/7 Generic Medicine Pharmacy (औषध दुकान)',
      'Veterinary Clinic & Cattle Medicine (पशुवैद्यकीय औषधे व डॉक्टर)',
      'Diagnostic Blood Testing Lab (रक्त तपासणी प्रयोगशाळा)',
      'Elderly Home Nursing Service (ज्येष्ठ नागरिक शुश्रूषा)'
    ]
  },
  {
    id: 'education',
    name: 'Education',
    name_mr: 'शिक्षण आणि पुस्तके',
    icon: '📚',
    popularNeeds: [
      'Competitive Exam Library / Study Hall (अभ्यासिका व ग्रंथालय)',
      'Computer Training & Coding Classes (संगणक प्रशिक्षण केंद्र)',
      'School Stationery & Textbook Store (शालेय साहित्य व पुस्तके)',
      'English Speaking & Spoken Marathi Tutoring (इंग्रजी संभाषण वर्ग)'
    ]
  },
  {
    id: 'repair_maintenance',
    name: 'Repair and maintenance',
    name_mr: 'दुरुस्ती आणि देखभाल',
    icon: '🔧',
    popularNeeds: [
      'Mobile Phone & Screen Repair (मोबाईल व डिस्प्ले दुरुस्ती)',
      'Agricultural Water Pump Rewinding (विहिरीचे पंप व मोटर रिवाइंडिंग)',
      'Tractor & Rotavator Servicing (ट्रॅक्टर व रोटाव्हेटर मेकॅनिक)',
      'Solar Inverter & Wiring Service (सोलर इन्व्हर्टर दुरुस्ती)'
    ]
  },
  {
    id: 'agriculture_services',
    name: 'Agriculture-related services',
    name_mr: 'कृषी सेवा आणि अवजारे',
    icon: '🌱',
    popularNeeds: [
      'Drone Spraying Service (ड्रोनद्वारे औषध फवारणी)',
      'Soil & Water Testing Lab (माती व पाणी परीक्षण प्रयोगशाळा)',
      'Drip Irrigation Spare Parts & Filters (ठिबक सिंचन सुटे भाग)',
      'Bio-fertilizer & Neem Oil Supply (सेंद्रिय खते व निंबोळी अर्क)'
    ]
  },
  {
    id: 'transportation',
    name: 'Transportation',
    name_mr: 'वाहतूक आणि मालवाहतूक',
    icon: '🚚',
    popularNeeds: [
      'Mini-Truck Farm-to-Market Haat Logistics (शेतमाल वाहतूक वाहन)',
      'Shared Passenger Rickshaw / Van to Taluka (तालुका प्रवासी वाहतूक)',
      'Emergency Ambulance / Patient Vehicle (रुग्णवाहिका सेवा)',
      'Milk Can & Agricultural Cargo Transport (दूध व मालवाहतूक)'
    ]
  },
  {
    id: 'clothing_tailoring',
    name: 'Clothing and tailoring',
    name_mr: 'वस्त्र आणि शिवणकाम',
    icon: '🧵',
    popularNeeds: [
      'School Uniform & Blouse Tailoring (शालेय गणवेश व शिवणकाम)',
      'Readymade Children Wear & Daily Garments (तयार कपडे दुकान)',
      'Handloom Saree & Traditional Attire Shop (पैठणी व साडी केंद्र)',
      'Embroidery & Fall-Pico Work (एम्ब्रॉयडरी व फॉल-पिको)'
    ]
  },
  {
    id: 'household_services',
    name: 'Household services',
    name_mr: 'घरगुती सेवा',
    icon: '🏠',
    popularNeeds: [
      'Plumbing & Water Pipeline Repair (प्लंबिंग व नळ दुरुस्ती)',
      'House Painting & Waterproofing (रंगकाम व वॉटरप्रूफिंग)',
      'Cooking Gas Cylinder Delivery / Stoves (गॅस शेगडी दुरुस्ती)',
      'Septic Tank Cleaning Service (सेप्टिक टँक स्वच्छता वाहन)'
    ]
  },
  {
    id: 'digital_technology',
    name: 'Digital and technology services',
    name_mr: 'डिजिटल आणि तंत्रज्ञान सेवा',
    icon: '💻',
    popularNeeds: [
      'Maha E-Seva Kendra / Aadhaar-Govt Schemes (महा ई-सेवा केंद्र)',
      'Xerox, Color Printing & Lamination (झेरॉक्स व कलर प्रिंटिंग)',
      'Fast Broadband / Wi-Fi Cable Internet (हाय-स्पीड इंटरनेट केबल)',
      'Online Banking CSP / Micro-ATM Cash Point (मायक्रो-एटीएम / बँक मित्र)'
    ]
  },
  {
    id: 'other',
    name: 'Other',
    name_mr: 'इतर',
    icon: '📦',
    popularNeeds: [
      'Event Sound System & Tent House Rental (मंडप व ध्वनिक्षेपक भाड्याने)',
      'Catering & Bulk Snack Supply for Events (भोजन व्यवस्था)',
      'Waste Segregation & Compost Processing (कचरा व्यवस्थापन)',
      'Organic Pest Control & Fumigation (कीटक नियंत्रण सेवा)'
    ]
  }
];

export const AVAILABILITY_OPTIONS = [
  {
    value: 'not_available',
    label: 'Not available in my village',
    label_mr: 'आमच्या गावात अजिबात उपलब्ध नाही',
    badgeClass: 'badge-danger',
    color: '#c62828'
  },
  {
    value: 'difficult_access',
    label: 'Available but difficult to access',
    label_mr: 'उपलब्ध आहे पण मिळणे खूप कठीण',
    badgeClass: 'badge-warning',
    color: '#e65100'
  },
  {
    value: 'insufficient',
    label: 'Available but insufficient',
    label_mr: 'उपलब्ध आहे पण अपुरे पडते',
    badgeClass: 'badge-info',
    color: '#0277bd'
  },
  {
    value: 'occasional_only',
    label: 'Available only occasionally',
    label_mr: 'कधीकधीच उपलब्ध असते',
    badgeClass: 'badge-secondary',
    color: '#616161'
  }
];

export const FREQUENCY_OPTIONS = [
  {
    value: 'daily',
    label: 'Daily',
    label_mr: 'दररोज',
    urgencyWeight: 4
  },
  {
    value: 'weekly',
    label: 'Weekly',
    label_mr: 'आठवड्यातून एकदा',
    urgencyWeight: 3
  },
  {
    value: 'monthly',
    label: 'Monthly',
    label_mr: 'महिन्यातून एकदा',
    urgencyWeight: 2
  },
  {
    value: 'occasionally',
    label: 'Occasionally / As needed',
    label_mr: 'गरज पडेल तेव्हा / अधूनमधून',
    urgencyWeight: 1
  }
];

export const MODERATION_STATUSES = {
  PENDING: 'pending',
  REVIEWED: 'reviewed',
  VERIFIED_PATTERN: 'verified_pattern',
  REJECTED_SPAM: 'rejected_spam',
  ARCHIVED: 'archived'
};

/**
 * Initial Realistic Aggregated Community Demand Signals across Maharashtra
 * Generated from simulated authentic village resident submissions.
 */
export const INITIAL_DEMAND_SIGNALS = [
  {
    id: 'dmd-nsk-sinnar-01',
    productOrService: 'Mobile Phone & Screen Repair',
    productOrService_mr: 'मोबाईल फोन व डिस्प्ले दुरुस्ती केंद्र',
    category: 'repair_maintenance',
    district: 'Nashik',
    districtCode: 490,
    taluka: 'Sinnar',
    talukaCode: 4154,
    village: 'Baragaon Pimpri',
    villageCode: 524444,
    coordinates: { lat: 19.8124, lng: 74.0541 },
    totalReports: 32,
    breakdown: {
      not_available: 24,
      difficult_access: 6,
      insufficient: 2,
      occasional_only: 0
    },
    frequencyCounts: {
      daily: 8,
      weekly: 18,
      monthly: 4,
      occasionally: 2
    },
    dominantAvailability: 'not_available',
    dominantFrequency: 'weekly',
    status: 'verified_pattern',
    syncStatus: 'synced',
    firstReportedAt: '2026-09-15T09:30:00.000Z',
    lastReportedAt: '2026-11-12T14:15:00.000Z',
    notes: 'Residents currently travel 18 km to Sinnar town for even minor screen replacements and charging port repairs.',
    explanationText_en: 'Several residents have reported difficulty accessing mobile repair services in this village. This may indicate an opportunity worth investigating.',
    explanationText_mr: 'या गावातील अनेक ग्रामस्थांनी मोबाईल दुरुस्ती सेवा उपलब्ध नसून मोठी गैरसोय होत असल्याचे नोंदवले आहे. ही एक अभ्यास करण्यासारखी व्यवसाय संधी असू शकते.',
    tags: ['electronics', 'repair', 'daily-need']
  },
  {
    id: 'dmd-nsk-sinnar-03',
    productOrService: 'Drip Irrigation Spare Parts & Filters',
    productOrService_mr: 'ठिबक सिंचन सुटे भाग व इनलाइन फिल्टर्स',
    category: 'agriculture_services',
    district: 'Nashik',
    districtCode: 490,
    taluka: 'Sinnar',
    talukaCode: 4154,
    village: 'Baragaon Pimpri',
    villageCode: 524444,
    coordinates: { lat: 19.8124, lng: 74.0541 },
    totalReports: 18,
    breakdown: {
      not_available: 11,
      difficult_access: 5,
      insufficient: 2,
      occasional_only: 0
    },
    frequencyCounts: {
      daily: 2,
      weekly: 11,
      monthly: 4,
      occasionally: 1
    },
    dominantAvailability: 'not_available',
    dominantFrequency: 'weekly',
    status: 'verified_pattern',
    syncStatus: 'synced',
    firstReportedAt: '2026-10-02T11:00:00.000Z',
    lastReportedAt: '2026-11-13T10:00:00.000Z',
    notes: 'Onion and pomegranate growers in Baragaon Pimpri need immediate lateral jointers and screen washers.',
    explanationText_en: 'Direct village demand for micro-irrigation hardware without travelling to Sinnar town during watering hours.',
    explanationText_mr: 'बारेगाव पिंप्री परिसरातील कांदा व डाळिंब बागायतदारांना तातडीने ठिबकचे साहित्य गावातच उपलब्ध हवे आहे.',
    tags: ['irrigation', 'agriculture', 'spares']
  },
  {
    id: 'dmd-nsk-sinnar-04',
    productOrService: 'Fresh Milk Chilling & Paneer Processing',
    productOrService_mr: 'ताजे दूध चिलिंग व पनीर प्रक्रिया केंद्र',
    category: 'food_groceries',
    district: 'Nashik',
    districtCode: 490,
    taluka: 'Sinnar',
    talukaCode: 4154,
    village: 'Baragaon Pimpri',
    villageCode: 524444,
    coordinates: { lat: 19.8124, lng: 74.0541 },
    totalReports: 14,
    breakdown: {
      not_available: 7,
      difficult_access: 5,
      insufficient: 2,
      occasional_only: 0
    },
    frequencyCounts: {
      daily: 8,
      weekly: 4,
      monthly: 2,
      occasionally: 0
    },
    dominantAvailability: 'not_available',
    dominantFrequency: 'daily',
    status: 'reviewed',
    syncStatus: 'synced',
    firstReportedAt: '2026-10-18T08:30:00.000Z',
    lastReportedAt: '2026-11-14T07:15:00.000Z',
    notes: 'Dairy farmers seek local value addition for evening surplus milk into paneer and curd.',
    explanationText_en: 'Local dairy producers report regular evening milk surpluses that could support a localized small agro-processing unit.',
    explanationText_mr: 'सायंकाळच्या दुधाला स्थानिक पातळीवर प्रक्रिया करून पनीर व खवा तयार करण्याची क्षमता गावात उपलब्ध आहे.',
    tags: ['dairy', 'paneer', 'food']
  },
  {
    id: 'dmd-nsk-sinnar-02',
    productOrService: 'Veterinary Doctor & Cattle Medicines',
    productOrService_mr: 'पशुवैद्यकीय डॉक्टर व जनावरांची औषधे',
    category: 'healthcare_pharmacy',
    district: 'Nashik',
    districtCode: 490,
    taluka: 'Sinnar',
    talukaCode: 4154,
    village: 'Wavi',
    villageCode: 524450,
    coordinates: { lat: 19.8650, lng: 74.1520 },
    totalReports: 28,
    breakdown: {
      not_available: 19,
      difficult_access: 7,
      insufficient: 2,
      occasional_only: 0
    },
    frequencyCounts: {
      daily: 6,
      weekly: 15,
      monthly: 5,
      occasionally: 2
    },
    dominantAvailability: 'not_available',
    dominantFrequency: 'weekly',
    status: 'verified_pattern',
    syncStatus: 'synced',
    firstReportedAt: '2026-10-01T11:00:00.000Z',
    lastReportedAt: '2026-11-13T10:45:00.000Z',
    notes: 'Dairy farmers urgently need emergency antibiotic shots and mastitis medications on-site without delayed visits.',
    explanationText_en: 'Frequent requests for emergency veterinary services and dairy medicines highlight a vital local agricultural service gap.',
    explanationText_mr: 'दुग्ध उत्पादक शेतकऱ्यांकडून तातडीच्या पशुवैद्यकीय औषधांची सातत्याने मागणी असून हा मोठा सेवा तुटवडा दर्शवतो.',
    tags: ['dairy', 'veterinary', 'cattle']
  },
  {
    id: 'dmd-nsk-sinnar-05',
    productOrService: 'Agro-Machinery & Rotavator Servicing',
    productOrService_mr: 'शेती अवजारे व रोटाव्हेटर मेकॅनिक दुरुस्ती',
    category: 'repair_maintenance',
    district: 'Nashik',
    districtCode: 490,
    taluka: 'Sinnar',
    talukaCode: 4154,
    village: 'Sinnar Town',
    villageCode: 524440,
    coordinates: { lat: 19.8465, lng: 73.9965 },
    totalReports: 24,
    breakdown: {
      not_available: 9,
      difficult_access: 10,
      insufficient: 5,
      occasional_only: 0
    },
    frequencyCounts: {
      daily: 3,
      weekly: 14,
      monthly: 5,
      occasionally: 2
    },
    dominantAvailability: 'difficult_access',
    dominantFrequency: 'weekly',
    status: 'verified_pattern',
    syncStatus: 'synced',
    firstReportedAt: '2026-09-20T14:00:00.000Z',
    lastReportedAt: '2026-11-12T16:30:00.000Z',
    notes: 'Farmers from Sinnar taluka face delays getting rotavator blades and tiller hydraulics serviced in peak season.',
    explanationText_en: 'Seasonal mechanical bottlenecks create demand for dedicated mobile farm equipment servicing.',
    explanationText_mr: 'हंगामाच्या वेळी रोटाव्हेटर व नांगर दुरुस्तीसाठी मोठी प्रतीक्षा करावी लागते; स्थानिक मेकॅनिक सेवेची आवश्यकता आहे.',
    tags: ['machinery', 'tractor', 'repair']
  },
  {
    id: 'dmd-nsk-dindori-01',
    productOrService: 'Solar Inverter & Water Pump Rewinding',
    productOrService_mr: 'सोलर इन्व्हर्टर व कृषी पंप रिवाइंडिंग',
    category: 'repair_maintenance',
    district: 'Nashik',
    districtCode: 490,
    taluka: 'Dindori',
    talukaCode: 4342,
    village: 'Vani',
    villageCode: 524510,
    coordinates: { lat: 20.3120, lng: 73.8820 },
    totalReports: 21,
    breakdown: {
      not_available: 12,
      difficult_access: 7,
      insufficient: 2,
      occasional_only: 0
    },
    frequencyCounts: {
      daily: 2,
      weekly: 12,
      monthly: 5,
      occasionally: 2
    },
    dominantAvailability: 'not_available',
    dominantFrequency: 'weekly',
    status: 'verified_pattern',
    syncStatus: 'synced',
    firstReportedAt: '2026-10-10T08:20:00.000Z',
    lastReportedAt: '2026-11-10T16:00:00.000Z',
    notes: 'Grape farmers require quick turnaround rewinding during peak irrigation season.',
    explanationText_en: 'Farmers have to haul heavy pump sets to Dindori town or Nashik during critical watering periods.',
    explanationText_mr: 'द्राक्ष उत्पादक शेतकऱ्यांना सिंचनाच्या काळात मोटार जळाल्यास दूर शहरात जावे लागते; स्थानिक रिवाइंडिंगला चांगली मागणी आहे.',
    tags: ['solar', 'irrigation', 'rewinding']
  },
  {
    id: 'dmd-pun-junnar-01',
    productOrService: 'Cold Storage & Agro Packhouse for Vegetables',
    productOrService_mr: 'भाजीपाला पॅकहाऊस व मिनी शीतगृह',
    category: 'agriculture_services',
    district: 'Pune',
    districtCode: 493,
    taluka: 'Junnar',
    talukaCode: 4384,
    village: 'Narayangaon',
    villageCode: 525120,
    coordinates: { lat: 19.1215, lng: 73.9780 },
    totalReports: 36,
    breakdown: {
      not_available: 14,
      difficult_access: 16,
      insufficient: 6,
      occasional_only: 0
    },
    frequencyCounts: {
      daily: 12,
      weekly: 20,
      monthly: 4,
      occasionally: 0
    },
    dominantAvailability: 'difficult_access',
    dominantFrequency: 'weekly',
    status: 'verified_pattern',
    syncStatus: 'synced',
    firstReportedAt: '2026-08-20T10:00:00.000Z',
    lastReportedAt: '2026-11-14T09:15:00.000Z',
    notes: 'Tomato and leafy vegetable growers suffer price crashes because of lack of short-term 3-5 day holding chillers.',
    explanationText_en: 'Tomato growers consistently report severe price swings that could be mitigated with local cold aggregation.',
    explanationText_mr: 'टोमॅटो उत्पादकांनी दर घसरणीच्या काळात माल टिकवून ठेवण्यासाठी स्थानिक शीतगृहाची तीव्र गरज व्यक्त केली आहे.',
    tags: ['cold-storage', 'tomato', 'packhouse']
  },
  {
    id: 'dmd-pun-haveli-01',
    productOrService: 'Organic Vermicompost & Bio-Pesticides',
    productOrService_mr: 'गांडूळ खत व सेंद्रिय कीटकनाशक पुरवठा',
    category: 'agriculture_services',
    district: 'Pune',
    districtCode: 493,
    taluka: 'Haveli',
    talukaCode: 4382,
    village: 'Wagholi Rural',
    villageCode: 525040,
    coordinates: { lat: 18.5793, lng: 73.9808 },
    totalReports: 18,
    breakdown: {
      not_available: 8,
      difficult_access: 7,
      insufficient: 3,
      occasional_only: 0
    },
    frequencyCounts: {
      daily: 1,
      weekly: 10,
      monthly: 5,
      occasionally: 2
    },
    dominantAvailability: 'not_available',
    dominantFrequency: 'weekly',
    status: 'reviewed',
    syncStatus: 'synced',
    firstReportedAt: '2026-10-15T14:30:00.000Z',
    lastReportedAt: '2026-11-11T12:00:00.000Z',
    notes: 'Peri-urban vegetable and fruit cultivators seeking verified certified bio-fertilizers without adulteration.',
    explanationText_en: 'Urban-fringe farmers are seeking direct trustworthy sources for organic inputs and bio-stimulants.',
    explanationText_mr: 'भाजीपाला उत्पादक शेतकऱ्यांना खात्रीशीर सेंद्रिय खतांची थेट गावातच उपलब्धता हवी आहे.',
    tags: ['organic', 'vermicompost', 'bio']
  },
  {
    id: 'dmd-ahm-sangamner-01',
    productOrService: 'Drip Irrigation Spare Parts & Inline Filters',
    productOrService_mr: 'ठिबक सिंचन सुटे भाग व इनलाइन फिल्टर्स',
    category: 'agriculture_services',
    district: 'Ahmednagar',
    districtCode: 469,
    taluka: 'Sangamner',
    talukaCode: 4147,
    village: 'Ashwi',
    villageCode: 523820,
    coordinates: { lat: 19.6200, lng: 74.3100 },
    totalReports: 25,
    breakdown: {
      not_available: 11,
      difficult_access: 9,
      insufficient: 5,
      occasional_only: 0
    },
    frequencyCounts: {
      daily: 2,
      weekly: 16,
      monthly: 6,
      occasionally: 1
    },
    dominantAvailability: 'not_available',
    dominantFrequency: 'weekly',
    status: 'verified_pattern',
    syncStatus: 'synced',
    firstReportedAt: '2026-09-28T12:15:00.000Z',
    lastReportedAt: '2026-11-13T16:20:00.000Z',
    notes: 'Pomegranate and fodder farmers need repair jointers, lateral pipes, and screen filters during irrigation hours.',
    explanationText_en: 'Farmers report frequent downtime in micro-irrigation lines due to lack of immediate nearby spare parts.',
    explanationText_mr: 'ठिबकच्या नळ्या व जॉइंटर्स फुटल्यास तातडीने दुरुस्ती साहित्य न मिळाल्याने पिकांचे नुकसान होते.',
    tags: ['irrigation', 'drip', 'agriculture']
  },
  {
    id: 'dmd-ahm-kopargaon-01',
    productOrService: 'Maha E-Seva & Online Digital Scheme Desk',
    productOrService_mr: 'महा ई-सेवा केंद्र व शासकीय योजना अर्ज सुविधा',
    category: 'digital_technology',
    district: 'Ahmednagar',
    districtCode: 469,
    taluka: 'Kopargaon',
    talukaCode: 4139,
    village: 'Pohegaon',
    villageCode: 523710,
    coordinates: { lat: 19.8200, lng: 74.4500 },
    totalReports: 22,
    breakdown: {
      not_available: 15,
      difficult_access: 5,
      insufficient: 2,
      occasional_only: 0
    },
    frequencyCounts: {
      daily: 5,
      weekly: 11,
      monthly: 5,
      occasionally: 1
    },
    dominantAvailability: 'not_available',
    dominantFrequency: 'weekly',
    status: 'reviewed',
    syncStatus: 'synced',
    firstReportedAt: '2026-10-05T09:00:00.000Z',
    lastReportedAt: '2026-11-12T11:30:00.000Z',
    notes: 'Elderly pensioners and women SHG members currently pay ₹60 bus fare to Kopargaon town to submit e-KYC.',
    explanationText_en: 'Residents incur substantial travel costs and lost work hours just to complete routine digital government e-KYC submissions.',
    explanationText_mr: 'केवळ ई-केवायसी व दाखले काढण्यासाठी नागरिकांना शहरात जावे लागते, ज्यामुळे वेळ व पैशांचा अपव्यय होतो.',
    tags: ['digital', 'eseva', 'banking']
  },
  {
    id: 'dmd-aur-paithan-01',
    productOrService: 'Farm-to-Market Shared Mini-Cargo Transport',
    productOrService_mr: 'आठवडे बाजार शेतमाल सामायिक वाहतूक सेवा',
    category: 'transportation',
    district: 'Chhatrapati Sambhajinagar',
    districtCode: 472,
    taluka: 'Paithan',
    talukaCode: 4181,
    village: 'Pachod',
    villageCode: 524150,
    coordinates: { lat: 19.5100, lng: 75.4800 },
    totalReports: 29,
    breakdown: {
      not_available: 18,
      difficult_access: 8,
      insufficient: 3,
      occasional_only: 0
    },
    frequencyCounts: {
      daily: 3,
      weekly: 21,
      monthly: 4,
      occasionally: 1
    },
    dominantAvailability: 'not_available',
    dominantFrequency: 'weekly',
    status: 'verified_pattern',
    syncStatus: 'synced',
    firstReportedAt: '2026-09-10T10:10:00.000Z',
    lastReportedAt: '2026-11-14T08:45:00.000Z',
    notes: 'Smallholder cotton and fruit farmers lack shared tempo transport to reach weekly haats in Paithan and Shevgaon.',
    explanationText_en: 'Small producers are penalized by high individual vehicle hire charges and need consolidated shared routing.',
    explanationText_mr: 'लहान शेतकऱ्यांना शेतमाल बाजारात नेण्यासाठी स्वतंत्र गाडी करणे परवडत नाही; सामायिक वाहतुकीची मोठी गरज आहे.',
    tags: ['logistics', 'shared-transport', 'cotton']
  },
  {
    id: 'dmd-sol-solapur-01',
    productOrService: 'Pomegranate Pest Scouting & Bio-Spraying',
    productOrService_mr: 'डाळिंब तेल्या व कीड नियंत्रण सल्ला व बायो-फवारणी',
    category: 'agriculture_services',
    district: 'Solapur',
    districtCode: 499,
    taluka: 'Solapur North',
    talukaCode: 4467,
    village: 'Boramani',
    villageCode: 525880,
    coordinates: { lat: 17.6100, lng: 75.9800 },
    totalReports: 24,
    breakdown: {
      not_available: 13,
      difficult_access: 7,
      insufficient: 4,
      occasional_only: 0
    },
    frequencyCounts: {
      daily: 2,
      weekly: 14,
      monthly: 6,
      occasionally: 2
    },
    dominantAvailability: 'not_available',
    dominantFrequency: 'weekly',
    status: 'verified_pattern',
    syncStatus: 'synced',
    firstReportedAt: '2026-10-12T15:00:00.000Z',
    lastReportedAt: '2026-11-13T13:10:00.000Z',
    notes: 'Pomegranate orchards face rapid spread of bacterial blight; early diagnostic guidance needed.',
    explanationText_en: 'Orchard owners report urgent demand for early warning inspection and custom bio-formulation spraying services.',
    explanationText_mr: 'डाळिंब बागायतदारांना तेल्या व बुरशी नियंत्रणासाठी तज्ज्ञ मार्गदर्शन व वेळेवर फवारणी सेवेची आवश्यकता आहे.',
    tags: ['pomegranate', 'pest-control', 'solapur']
  }
];
