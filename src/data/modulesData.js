/**
 * Core Modules Registry for MahaUdyam Platform
 * Represents the 8 essential enterprise modules for rural entrepreneurs in Maharashtra.
 * Fully localized with English and natural rural Marathi translations.
 */
export const MODULE_CATEGORIES = [
  'All',
  'Market Intelligence',
  'Demand & Trade',
  'Logistics',
  'Resources'
];

export const MODULES_DATA = [
  {
    id: 'ai-advisor',
    title: 'AI Business Advisor',
    marathiTitle: 'महाउद्यम व्यवसाय सल्लागार',
    title_en: 'AI Business Advisor',
    title_mr: 'महाउद्यम व्यवसाय सल्लागार',
    category: 'Market Intelligence',
    category_mr: 'बाजार माहिती',
    shortDescription: 'Natural voice & text advisor providing financial reality checks, break-even simulation, and scheme guidance.',
    shortDescription_mr: 'नैसर्गिक आवाज व मजकुराद्वारे वास्तववादी नफा-तोटा गणित, भांडवल तपासणी आणि शासकीय अनुदान मार्गदर्शन.',
    iconType: 'advisor',
    badge: 'AI Powered',
    badge_mr: 'आवाज-सक्षम AI',
    phase: 'Intelligent Advisory',
    keyBenefits: [
      'Speech-to-text in Marathi, Hindi & Indian English with interruptible voice synthesis',
      'Factual financial simulator with capex, opex, break-even units, and 3 sensitivity scenarios',
      'Direct cross-module integration across all 8 MahaUdyam engines without generic menus'
    ],
    keyBenefits_mr: [
      'मराठी, हिंदी व इंग्रजीत आवाज संभाषण व थेट उत्तर वाचन',
      'मशिनरी खर्च, फिरते भांडवल, युनिट नफा आणि ३ परिस्थितींमध्ये वास्तववादी गणित',
      '८ ही मॉड्यूल्सशी थेट जोडणी — कोणतीही फालतू कॅटेगरी न निवडता थेट संभाषण'
    ]
  },
  {
    id: 'bazaarpath',
    title: 'BazaarPath',
    marathiTitle: 'बाजारपेठ मार्गदर्शक',
    title_en: 'BazaarPath',
    title_mr: 'बाजारपेठ मार्गदर्शक',
    category: 'Market Intelligence',
    category_mr: 'बाजार माहिती',
    shortDescription: 'Weekly market discovery, travel cost intelligence, and estimated net profit analysis.',
    shortDescription_mr: 'आठवडे बाजार शोध, वास्तववादी प्रवास खर्च आणि निव्वळ नफा विश्लेषण.',
    iconType: 'market',
    badge: 'Flagship Module',
    badge_mr: 'प्रमुख कार्यप्रणाली',
    phase: 'Core Engine',
    keyBenefits: [
      'Cached weekly markets across Maharashtra with verified schedules',
      'Travel cost calculation for 4 rural transport modes',
      'Break-even quantity, minimum selling price, and what-if simulation'
    ],
    keyBenefits_mr: [
      'महाराष्ट्रातील अधिकृत आठवडे बाजारांचे वेळापत्रक ऑफलाइन उपलब्ध',
      '४ ग्रामीण वाहतूक साधनांचा वास्तववादी प्रवास खर्च',
      'नफा-तोटा समतोल, किमान सुरक्षित विक्री दर आणि नफा सिम्युलेटर'
    ]
  },
  {
    id: 'demand-collector',
    title: 'Demand Signal Collector',
    marathiTitle: 'मागणी संकलन',
    title_en: 'Demand Signal Collector',
    title_mr: 'मागणी संकलन',
    category: 'Demand & Trade',
    category_mr: 'मागणी आणि व्यापार',
    shortDescription: 'Customer-driven village demand reporting to discover unfulfilled local product and service needs.',
    shortDescription_mr: 'गावातील नागरिकांकडून थेट मागणी नोंदणी — दुर्मीळ वस्तू व सेवा ओळखून नवीन व्यवसाय संधी शोधा.',
    iconType: 'signal',
    badge: 'Customer Driven',
    badge_mr: 'ग्रामस्थ-केंद्रित',
    phase: 'Core Module',
    keyBenefits: [
      'Village residents report unavailable or difficult-to-access goods & services',
      'Aggregated demand clusters by village, taluka, and category without exposing private data',
      'Actionable unmet need discovery for entrepreneurs without speculative revenue claims'
    ],
    keyBenefits_mr: [
      'गावातील नागरिक उपलब्ध नसलेल्या वस्तू व सेवांची थेट नोंद करतात',
      'खाजगी माहिती उघड न करता गाव व तालुका पातळीवर मागणीचे अचूक एकत्रीकरण',
      'खोट्या नफा दाव्यांशिवाय उद्योजकांसाठी वास्तववादी व्यवसाय संधी शोध'
    ]
  },
  {
    id: 'gap-analyzer',
    title: 'Supply–Demand Gap Analyzer',
    marathiTitle: 'पुरवठा-मागणी अंतर विश्लेषक',
    title_en: 'Supply–Demand Gap Analyzer',
    title_mr: 'पुरवठा-मागणी अंतर विश्लेषक',
    category: 'Market Intelligence',
    category_mr: 'बाजार माहिती',
    shortDescription: 'Analyze local commodity surpluses and deficits to find arbitrage and trading opportunities.',
    shortDescription_mr: 'स्थानिक शेतमालाचे अतिरिक्त उत्पादन आणि तुटवडा अभ्यासून फायदेशीर व्यापार संधी शोधा.',
    iconType: 'analysis',
    badge: 'Trade Optimization',
    badge_mr: 'व्यापार नियोजन',
    phase: 'Active Module',
    keyBenefits: [
      'Visual mismatch indicators between taluka production and local consumption',
      'Price discrepancy detection across neighboring districts',
      'Actionable recommendations for localized supply routing'
    ],
    keyBenefits_mr: [
      'तालुक्यातील उत्पादन आणि प्रत्यक्ष खप यांतील तफावत तपासा',
      'शेजारच्या जिल्ह्यांमधील बाजारभावातील फरक ओळखा',
      'मालाची विक्री कुठे करावी याच्या थेट शिफारसी मिळवा'
    ]
  },
  {
    id: 'opportunity-detector',
    title: 'Village Opportunity Detector',
    marathiTitle: 'ग्राम संधी शोधक',
    title_en: 'Village Opportunity Detector',
    title_mr: 'ग्राम संधी शोधक',
    category: 'Resources',
    category_mr: 'संसाधने व योजना',
    shortDescription: 'Identify viable micro-enterprises and agro-processing units based on local crops and capital.',
    shortDescription_mr: 'स्थानिक पिके आणि भांडवलाच्या आधारे फायदेशीर प्रक्रिया उद्योग शोधा.',
    iconType: 'opportunity',
    badge: 'Enterprise Matching',
    badge_mr: 'उद्योग निवड',
    phase: 'Active Module',
    keyBenefits: [
      'Matched suggestions: jaggery processing, dal mills, cold pressed oil, dehydration',
      'Capital requirement breakdowns (from ₹25,000 to ₹10,00,000)',
      'Raw material availability indices by Maharashtra agro-climatic zone'
    ],
    keyBenefits_mr: [
      'गुळ उद्योग, डाळ मिल, लाकडी घाणा तेल, भाजीपाला वाळवणे यांसारखे उद्योग',
      '₹२५,००० ते ₹१०,००,००० पर्यंतच्या भांडवलाचे सविस्तर विवरण',
      'महाराष्ट्रातील हवामान विभागानुसार कच्च्या मालाची उपलब्धता'
    ]
  },
  {
    id: 'unsold-stock',
    title: 'Unsold Stock Rescue',
    marathiTitle: 'शिल्लक माल बचाव',
    title_en: 'Unsold Stock Rescue',
    title_mr: 'शिल्लक माल बचाव',
    category: 'Demand & Trade',
    category_mr: 'मागणी आणि व्यापार',
    shortDescription: 'Prevent perishable produce loss by finding instant secondary buyers and processing units.',
    shortDescription_mr: 'नाशवंत भाजीपाला व शेतमालाचे नुकसान टाळण्यासाठी पर्यायी खरेदीदार व प्रक्रिया केंद्र शोधा.',
    iconType: 'rescue',
    badge: 'Loss Mitigation',
    badge_mr: 'नुकसान निवारण',
    phase: 'Active Module',
    keyBenefits: [
      'Urgent distress-sale broadcast for perishable produce (tomatoes, onions, grapes)',
      'Connection to nearby food preservation and processing units',
      'Bulk purchase discounts for institutional rural buyers'
    ],
    keyBenefits_mr: [
      'नाशवंत मालाच्या (टोमॅटो, कांदा, फळे) तातडीच्या विक्रीसाठी संदेश पाठवा',
      'जवळपासच्या प्रक्रिया केंद्रांशी व शीतगृहांशी त्वरित संपर्क साधा',
      'संस्थात्मक खरेदीदारांसाठी घाऊक विक्रीची व्यवस्था'
    ]
  },
  {
    id: 'route-finder',
    title: 'Raw-Material Source/Route Finder',
    marathiTitle: 'कच्चा माल व वाहतूक मार्ग शोधक',
    title_en: 'Raw-Material Source/Route Finder',
    title_mr: 'कच्चा माल व वाहतूक मार्ग शोधक',
    category: 'Logistics',
    category_mr: 'वाहतूक व पुरवठा',
    shortDescription: 'Find reliable raw material producers, farm-gate collection points, and cost-efficient routes.',
    shortDescription_mr: 'कच्च्या मालाचे उत्पादक, शेत बांध खरेदी आणि कमी खर्चाचे वाहतूक मार्ग शोधा.',
    iconType: 'route',
    badge: 'Input Logistics',
    badge_mr: 'कच्चा माल पुरवठा',
    phase: 'Active Module',
    keyBenefits: [
      'Directory of local Farmer Producer Organizations (FPOs) and primary producers',
      'Rural feeder road transit estimates with minimal freight expenditure',
      'Direct farm-gate sourcing to eliminate intermediary margins'
    ],
    keyBenefits_mr: [
      'शेतकरी उत्पादक कंपन्या (FPO) आणि शेतकऱ्यांची थेट संपर्क यादी',
      'किमान वाहतूक खर्चासह ग्रामीण रस्त्यांचे अंदाज',
      'दलालांशिवाय थेट बांधावरून खरेदी करून नफा वाढवा'
    ]
  },
  {
    id: 'resource-matcher',
    title: 'Shared Resource Matcher',
    marathiTitle: 'सामायिक साधनसंपत्ती भागीदार',
    title_en: 'Shared Resource Matcher',
    title_mr: 'सामायिक साधनसंपत्ती भागीदार',
    category: 'Logistics',
    category_mr: 'वाहतूक व पुरवठा',
    shortDescription: 'Share and rent idle agricultural implements, solar pumps, cold rooms, and rural transport.',
    shortDescription_mr: 'शेत अवजारे, सौर पंप, शीतगृह आणि मालवाहू वाहने भाड्याने द्या किंवा घ्या.',
    iconType: 'share',
    badge: 'Asset Pooling',
    badge_mr: 'साधन भागीदारी',
    phase: 'Active Module',
    keyBenefits: [
      'Rent idle mini-trucks, tractors, seeders, and processing machinery',
      'Co-book cold storage space for small lots of produce',
      'Reduce upfront capital barriers for budding village entrepreneurs'
    ],
    keyBenefits_mr: [
      'पिकअप, ट्रॅक्टर, पेरणी यंत्रे आणि प्रक्रिया यंत्रे भाड्याने मिळवा',
      'कमी मालासाठी शीतगृहातील जागा सामायिकपणे आरक्षित करा',
      'नवीन उद्योजकांचा सुरुवातीचा भांडवली खर्च कमी करा'
    ]
  },
  {
    id: 'resource-hub',
    title: 'Resource Hub',
    marathiTitle: 'शासकीय योजना व माहिती केंद्र',
    title_en: 'Resource Hub',
    title_mr: 'शासकीय योजना व माहिती केंद्र',
    category: 'Resources',
    category_mr: 'संसाधने व योजना',
    shortDescription: 'Offline access to government schemes (PMEGP, CMEGP, MUDRA), checklists, and local officers.',
    shortDescription_mr: 'PMEGP, CMEGP, मुद्रा योजनांची माहिती, आवश्यक कागदपत्रे आणि अधिकारी संपर्क.',
    iconType: 'hub',
    badge: 'Government Schemes',
    badge_mr: 'शासकीय योजना',
    phase: 'Active Module',
    keyBenefits: [
      'Step-by-step Marathi & English eligibility checklists for subsidy schemes',
      'Downloadable offline project templates for bank loans',
      'Contact directories for District Industries Centres (DIC) and lead banks'
    ],
    keyBenefits_mr: [
      'अनुदान योजनांसाठी पात्रता आणि आवश्यक कागदपत्रांची यादी',
      'बँक कर्जासाठी प्रकल्प अहवाल (Project Report) नमुने',
      'जिल्हा उद्योग केंद्र (DIC) आणि अग्रणी बँकांचे संपर्क पत्ते'
    ]
  }
];

/**
 * Returns localized module representation based on active language
 */
export function getLocalizedModule(module, isMarathi) {
  if (!module) return null;
  return {
    ...module,
    title: isMarathi ? (module.title_mr || module.marathiTitle || module.title) : module.title,
    category: isMarathi ? (module.category_mr || module.category) : module.category,
    shortDescription: isMarathi ? (module.shortDescription_mr || module.shortDescription) : module.shortDescription,
    badge: isMarathi ? (module.badge_mr || module.badge) : module.badge,
    keyBenefits: isMarathi ? (module.keyBenefits_mr || module.keyBenefits) : module.keyBenefits
  };
}
