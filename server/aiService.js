/**
 * MahaUdyam — Central AI Business Advisor Orchestration Engine
 * 
 * Supports:
 * 1. Cloud LLM generation (via Gemini / external API) with server-side API key protection
 * 2. Deterministic Rural Intelligence Heuristic Engine when offline or without external API keys
 * 3. Deep integration with Maharashtra agro-clusters, government subsidies, and financial reality checks
 */

import { calculateBusinessReality, getBenchmarkPreset, RURAL_BENCHMARKS } from '../src/services/ai/businessRealityCheckService.js';
import { RURAL_KNOWLEDGE_BASE } from '../src/data/ai/ruralKnowledgeBase.js';

export async function processAiChatRequest({ message, context = {}, history = [], language = 'mr' }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;
  const userText = (message || '').trim();
  const district = context.location?.district || 'Maharashtra';
  const lang = (language === 'hi' || language === 'en') ? language : 'mr';

  // 1. If external API Key is configured, attempt cloud LLM completion
  if (apiKey) {
    try {
      const llmResult = await callExternalLlm({ userText, apiKey, context, history, lang });
      if (llmResult && llmResult.text) {
        return llmResult;
      }
    } catch (err) {
      console.warn('External LLM call failed, smoothly degrading to local Rural Intelligence Engine:', err.message);
    }
  }

  // 2. Built-in Deterministic Rural Intelligence Engine
  return executeRuralIntelligenceEngine({ userText, context, history, lang });
}

/**
 * Built-in Rural Intelligence Heuristic & Financial Simulator Engine
 */
function executeRuralIntelligenceEngine({ userText, context, history, lang }) {
  const lower = userText.toLowerCase();
  const district = context.location?.district || 'Maharashtra';

  // --- INTENT A: FINANCIAL REALITY CHECK & UNIT ECONOMICS ---
  if (
    lower.includes('reality') || lower.includes('हळद') || lower.includes('turmeric') ||
    lower.includes('घाणी') || lower.includes('oil') || lower.includes('शेळी') ||
    lower.includes('goat') || lower.includes('मिलेट') || lower.includes('millet') ||
    lower.includes('नफा') || lower.includes('भांडवल') || lower.includes('profit') ||
    lower.includes('break even') || lower.includes('खर्च') || lower.includes('लागत') ||
    lower.includes('कॅल्क्युलेटर') || lower.includes('simulator')
  ) {
    let presetKey = 'turmeric-processing';
    if (lower.includes('घाणी') || lower.includes('oil') || lower.includes('तेल') || lower.includes('सोयाबीन') || lower.includes('soybean')) {
      presetKey = 'soybean-oil-ghani';
    } else if (lower.includes('शेळी') || lower.includes('goat') || lower.includes('बोकड') || lower.includes('दूध')) {
      presetKey = 'goat-farming';
    } else if (lower.includes('मिलेट') || lower.includes('millet') || lower.includes('ज्वारी') || lower.includes('बाजरी') || lower.includes('पीठ')) {
      presetKey = 'millet-flour-snacks';
    } else if (lower.includes('अवजार') || lower.includes('tractor') || lower.includes('machinery') || lower.includes('हायरिंग')) {
      presetKey = 'custom-hiring-machinery';
    } else if (lower.includes('टोमॅटो') || lower.includes('tomato') || lower.includes('कांदा') || lower.includes('paste') || lower.includes('dryer')) {
      presetKey = 'perishable-unsold-processing';
    }

    const preset = getBenchmarkPreset(presetKey);
    const reality = calculateBusinessReality({ ...preset, title: preset.title });

    let responseText = '';
    if (lang === 'mr') {
      responseText = `### 📊 ${reality.businessTitle} — वास्तववादी नफा व खर्च विश्लेषण

मी तुमच्यासाठी **${district}** परिसरातील प्रचलित बाजारभावांनुसार प्रत्यक्ष हिशोब मांडला आहे:

- **एकूण आवश्यक भांडवल:** **₹${reality.capitalSummary.totalCapitalRequired.toLocaleString('en-IN')}** *(मशिनरी ₹${reality.capitalSummary.capex.toLocaleString('en-IN')} + २ महिन्यांचे फिरते भांडवल ₹${reality.capitalSummary.workingCapital.toLocaleString('en-IN')})*
- **युनिट विक्री दर:** ₹${reality.unitEconomics.sellingPricePerUnit}/${reality.unit}
- **कच्चा माल व पॅकिंग खर्च:** ₹${reality.unitEconomics.totalVariableCostPerUnit}/${reality.unit}
- **प्रत्येक युनिटमागे प्रत्यक्ष शिल्लक (Margin):** ₹${reality.unitEconomics.unitContributionMargin}/${reality.unit} (${reality.unitEconomics.contributionMarginRatio}%)
- **मासिक स्थिर खर्च (शेड भाडे + मजूर):** ₹${reality.fixedCostSummary.totalMonthlyFixedCost.toLocaleString('en-IN')}

🎯 **खर्च वसूल होण्यासाठी (Break-Even):**
दरमहा किमान **${reality.breakEvenAnalysis.breakEvenUnits} ${reality.unit}** (₹${reality.breakEvenAnalysis.breakEvenRevenue.toLocaleString('en-IN')}) विक्री करणे अनिवार्य आहे.

📈 **तीन संभाव्य परिस्थिती (Scenarios):**
1. **कमी मागणी / स्पर्धा काळ (Conservative):** दरमहा निव्वळ नफा **₹${reality.scenarios.conservative.monthlyNetProfit.toLocaleString('en-IN')}**
2. **सर्वसाधारण बाजार स्थिती (Expected):** दरमहा निव्वळ नफा **₹${reality.scenarios.expected.monthlyNetProfit.toLocaleString('en-IN')}**
3. **सणासुदीचा काळ / घाऊक मागणी (Optimistic):** दरमहा निव्वळ नफा **₹${reality.scenarios.optimistic.monthlyNetProfit.toLocaleString('en-IN')}**

💡 **महत्त्वाची ग्रामीण दक्षता:**
सुरुवातीला स्थानिक किरकोळ दुकानदारांना २५% पेक्षा जास्त उधारी देऊ नका. शासकीय अनुदानासाठी **PMFME (३५% अनुदान)** किंवा **CMEGP** योजनेचा लाभ घ्या.`;
    } else if (lang === 'hi') {
      responseText = `### 📊 ${reality.businessTitle} — वित्तीय वास्तविकता और लाभ विश्लेषण

**${district}** क्षेत्र के स्थानीय बाजार दरों के अनुसार आपका व्यापार गणित:

- **कुल आवश्यक पूंजी:** **₹${reality.capitalSummary.totalCapitalRequired.toLocaleString('en-IN')}** (मशीनरी ₹${reality.capitalSummary.capex.toLocaleString('en-IN')} + २ माह कार्यशील पूंजी ₹${reality.capitalSummary.workingCapital.toLocaleString('en-IN')})
- **इकाई बिक्री मूल्य:** ₹${reality.unitEconomics.sellingPricePerUnit}/${reality.unit}
- **कच्चा माल व पैकेजिंग:** ₹${reality.unitEconomics.totalVariableCostPerUnit}/${reality.unit}
- **प्रति इकाई मार्जिन:** ₹${reality.unitEconomics.unitContributionMargin}/${reality.unit} (${reality.unitEconomics.contributionMarginRatio}%)
- **मासिक स्थिर खर्च:** ₹${reality.fixedCostSummary.totalMonthlyFixedCost.toLocaleString('en-IN')}

🎯 **ब्रेक-ईवन लक्ष्य:** खर्च निकालने के लिए प्रतिमाह न्यूनतम **${reality.breakEvenAnalysis.breakEvenUnits} ${reality.unit}** की बिक्री अनिवार्य है।

📈 **तीन परिदृश्य (Scenarios):**
1. **धीमी मांग (Conservative):** प्रतिमाह शुद्ध लाभ **₹${reality.scenarios.conservative.monthlyNetProfit.toLocaleString('en-IN')}**
2. **अपेक्षित औसत (Expected):** प्रतिमाह शुद्ध लाभ **₹${reality.scenarios.expected.monthlyNetProfit.toLocaleString('en-IN')}**
3. **उत्कृष्ट/त्योहारी मांग (Optimistic):** प्रतिमाह शुद्ध लाभ **₹${reality.scenarios.optimistic.monthlyNetProfit.toLocaleString('en-IN')}**

💡 **व्यावहारिक सलाह:** पहले जॉब-वर्क या किराए की मशीनरी से मांग की पुष्टि करें, फिर बड़ी पूंजी लगाएं।`;
    } else {
      responseText = `### 📊 ${reality.businessTitle} — Business Reality & Financial Check

Ground-truth financial simulation benchmarked for **${district}** agro-industrial conditions:

- **Total Capital Required:** **₹${reality.capitalSummary.totalCapitalRequired.toLocaleString('en-IN')}** (Capex ₹${reality.capitalSummary.capex.toLocaleString('en-IN')} + 2 months Working Capital buffer ₹${reality.capitalSummary.workingCapital.toLocaleString('en-IN')})
- **Selling Price:** ₹${reality.unitEconomics.sellingPricePerUnit}/${reality.unit}
- **Direct Variable Cost:** ₹${reality.unitEconomics.totalVariableCostPerUnit}/${reality.unit}
- **Unit Contribution Margin:** ₹${reality.unitEconomics.unitContributionMargin}/${reality.unit} (${reality.unitEconomics.contributionMarginRatio}%)
- **Monthly Fixed Overheads:** ₹${reality.fixedCostSummary.totalMonthlyFixedCost.toLocaleString('en-IN')}

🎯 **Break-Even Target:**
You must produce and sell at least **${reality.breakEvenAnalysis.breakEvenUnits} ${reality.unit}** (₹${reality.breakEvenAnalysis.breakEvenRevenue.toLocaleString('en-IN')}) each month to cover overheads.

📈 **Three-Tier Sensitivity Scenarios:**
1. **Conservative (Low Demand / 60% Capacity):** Net Monthly Profit **₹${reality.scenarios.conservative.monthlyNetProfit.toLocaleString('en-IN')}**
2. **Expected Baseline (100% Target Capacity):** Net Monthly Profit **₹${reality.scenarios.expected.monthlyNetProfit.toLocaleString('en-IN')}**
3. **Optimistic (Peak Season / 130% Volume):** Net Monthly Profit **₹${reality.scenarios.optimistic.monthlyNetProfit.toLocaleString('en-IN')}**

💡 **Rural Reality Check:** Never extend uncollateralized credit exceeding 25% of working capital to village grocers. Leverage **PMFME (35% credit-linked subsidy)** or **CMEGP** to minimize loan burden.`;
    }

    return {
      success: true,
      text: responseText,
      realityScenario: reality,
      suggestedActions: [
        { label: lang === 'mr' ? 'कच्चा माल पुरवठादार शोधा' : 'Find Raw Material Sources', moduleId: 'route-finder' },
        { label: lang === 'mr' ? 'भाड्याने यंत्रसामग्री शोधा' : 'Find Shared Machinery', moduleId: 'resource-matcher' },
        { label: lang === 'mr' ? 'शासकीय योजना अनुदान तपासा' : 'Check Government Subsidies', moduleId: 'resource-hub' }
      ]
    };
  }

  // --- INTENT B: GOVERNMENT SUBSIDIES & SCHEMES ---
  if (
    lower.includes('योजना') || lower.includes('अनुदान') || lower.includes('scheme') ||
    lower.includes('subsidy') || lower.includes('pmfme') || lower.includes('cmegp') ||
    lower.includes('pmegp') || lower.includes('mudra') || lower.includes('मुद्रा') ||
    lower.includes('कर्ज') || lower.includes('loan')
  ) {
    const schemes = RURAL_KNOWLEDGE_BASE.schemes;
    let responseText = '';

    if (lang === 'mr') {
      responseText = `### 🏛️ महाराष्ट्र ग्रामीण उद्योजकांसाठी प्रमुख शासकीय योजना व अनुदान

ग्रामीण महाराष्ट्रात सूक्ष्म व्यवसाय सुरू करण्यासाठी ४ सर्वात फायदेशीर योजना उपलब्ध आहेत:

1. **पंतप्रधान सूक्ष्म अन्न प्रक्रिया योजना (PMFME):**
   - **अनुदान:** प्रकल्प खर्चाच्या **३५% (कमाल ₹१० लाख)**
   - **पात्र उद्योग:** हळद पॉलिशिंग, लाकडी घाणी तेल, डाळ मिल, मसाला निर्मिती, गूळ पावडर, बेकरी.
   - **अर्ज पोर्टल:** pmfme.mofpi.gov.in (जिल्हा उद्योग केंद्र - DIC मार्फत तपासणी).

2. **मुख्यमंत्री रोजगार निर्मिती कार्यक्रम (CMEGP):**
   - **अनुदान:** ग्रामीण भागात **२५% ते ३५%** (महिला व मागास प्रवर्गासाठी ३५%)
   - **प्रकल्प मर्यादा:** उत्पादन क्षेत्रात ₹५० लाखांपर्यंत, सेवा क्षेत्रात ₹१० लाखांपर्यंत.
   - **अर्ज पोर्टल:** maha-cmegp.gov.in

3. **पंतप्रधान रोजगार निर्मिती कार्यक्रम (PMEGP):**
   - **अनुदान:** ग्रामीण भागात **२५% ते ३५%**
   - **प्रकल्प मर्यादा:** उत्पादन क्षेत्रात ₹५० लाख, सेवा क्षेत्रात ₹२० लाख.

4. **मुद्रा योजना (PMMY):**
   - **विना-तारण कर्ज:** शिशू (₹५० हजारांपर्यंत), किशोर (₹५ लाखांपर्यंत), तरुण (₹१० लाखांपर्यंत).

📋 **पहिले पाऊल:** आधी udyamregistration.gov.in वर जाऊन मोफत **उद्यम नोंदणी (Udyam Aadhar)** काढून घ्या. त्यानंतर बँक चालू खाते उघडा.`;
    } else {
      responseText = `### 🏛️ Key Government Schemes & Subsidies in Maharashtra

The top 4 credit-linked subsidy programs for rural enterprises:

1. **PMFME (PM Formalisation of Micro Food Processing Enterprises):**
   - **Subsidy:** **35% of eligible project cost (up to ₹10 Lakh)**
   - **Focus:** Food processing (Flour, cold press oil, spices, jaggery, dehydration).
   - **Portal:** pmfme.mofpi.gov.in

2. **CMEGP (Chief Minister Employment Generation Programme - Maharashtra):**
   - **Subsidy:** **25% to 35% in rural areas** (35% for women and special categories).
   - **Ceiling:** Up to ₹50 Lakh for manufacturing, ₹10 Lakh for service units.
   - **Portal:** maha-cmegp.gov.in

3. **PMEGP (Prime Minister's Employment Generation Programme):**
   - **Subsidy:** **25% - 35%** for rural projects via KVIC / DIC.

4. **MUDRA Loan:**
   - **Collateral-Free:** Shishu (up to ₹50k), Kishore (₹50k-₹5L), Tarun (₹5L-₹10L).

📋 **Immediate Action:** Generate your free **Udyam Aadhar Certificate** at udyamregistration.gov.in to unlock priority sector bank lending.`;
    }

    return {
      success: true,
      text: responseText,
      toolData: { schemes },
      suggestedActions: [
        { label: lang === 'mr' ? 'योजना मार्गदर्शक उघडा' : 'Open Resource Hub', moduleId: 'resource-hub' },
        { label: lang === 'mr' ? 'उद्योग वास्तववादी नफा तपासा' : 'Check Business Reality', moduleId: 'ai-advisor' }
      ]
    };
  }

  // --- INTENT C: PERISHABLE UNSOLD STOCK RESCUE ---
  if (
    lower.includes('शिल्लक') || lower.includes('खराब') || lower.includes('unsold') ||
    lower.includes('stock') || lower.includes('tomato') || lower.includes('टोमॅटो') ||
    lower.includes('onion') || lower.includes('कांदा') || lower.includes('दूध') ||
    lower.includes('rescue') || lower.includes('सड')
  ) {
    let responseText = '';
    if (lang === 'mr') {
      responseText = `### 🛡️ नाशवंत शिल्लक माल बचाव व त्वरित मूल्यवर्धन कृती आराखडा

शेतमाल खराब होऊन १००% नुकसान होण्यापासून वाचवण्यासाठी खालील ३ टप्प्यांची कृती करा:

1. **त्वरित प्रतवारी (Immediate Sorting):**
   - किडलेला किंवा चेपलेला माल ताबडतोब वेगळा करा जेणेकरून चांगल्या मालाला बुरशी लागणार नाही.

2. **स्थानिक घाऊक संस्थात्मक विक्री (Institutional Bulk Clearance):**
   - स्थानिक हॉटेल्स, खानावळी, मेस किंवा वसतिगृहांना २५-३०% सवलतीत थेट पुरवठा करा. किरकोळ बाजारात वाट पाहत बसण्यापेक्षा त्वरित रोख रक्कम मिळवणे फायद्याचे ठरते.

3. **दुय्यम मूल्यवर्धन व रूपांतरण (Secondary Processing):**
   - **टोमॅटो असल्यास:** गर/प्युरी बनवून पाश्चरायझेशन करा किंवा स्थानिक सॉस/केचप उत्पादकाला द्या.
   - **कांदा असल्यास:** सोलर ड्रायरमध्ये कांदा काप वाळवून पावडर/फ्लेक्स बनवा (१२ महिने टिकते).
   - **दूध असल्यास:** ताबडतोब मावा/खवा किंवा पनीर तयार करा.

MahaUdyam च्या **Unsold Stock Rescue** मॉड्यूलमध्ये नोंदणी करून तुम्ही जवळच्या पडताळणीकृत खरेदीदारांशी थेट संपर्क साधू शकता.`;
    } else {
      responseText = `### 🛡️ Perishable Unsold Stock Rescue Plan

To prevent a total write-off of distress inventory, execute this 3-step protocol:

1. **Immediate Sorting:** Segregate damaged produce immediately to avoid fungal contamination.
2. **Institutional Clearance:** Offer 25-30% discounted bulk lots to local hotels, canteens, and mess facilities. Instant cash recovery beats retail spoilage.
3. **Secondary Processing:**
   - **Tomatoes:** Crush into paste/puree or deliver to commercial sauce makers.
   - **Onions:** Dehydrate via solar dryer into flakes (extends shelf-life to 12 months).
   - **Milk:** Process into Khoya (मावा) or Paneer immediately.

Register this batch in the **Unsold Stock Rescue** module to match with verified regional processing buyers.`;
    }

    return {
      success: true,
      text: responseText,
      suggestedActions: [
        { label: lang === 'mr' ? 'शिल्लक माल नोंदणी करा' : 'Register Unsold Stock', moduleId: 'unsold-stock' },
        { label: lang === 'mr' ? 'जवळचे आठवडे बाजार शोधा' : 'Find Nearby Haats', moduleId: 'bazaarpath' }
      ]
    };
  }

  // --- INTENT D: WEEKLY HAATS & BAZAARPATH LOGISTICS ---
  if (
    lower.includes('बाजार') || lower.includes('हाट') || lower.includes('bazaar') ||
    lower.includes('haat') || lower.includes('market') || lower.includes('प्रवास') ||
    lower.includes('travel') || lower.includes('वाहतूक')
  ) {
    let responseText = '';
    if (lang === 'mr') {
      responseText = `### 🛒 आठवडे बाजार (Weekly Haats) विक्री व प्रवास खर्च नियोजन

**${district}** जिल्ह्यातील आठवडे बाजारात माल विकताना निव्वळ नफा कसा वाढवाल:

1. **वाहतूक खर्चाचे काटेकोर नियोजन:**
   - ५० किमी अंतरासाठी छोटा हत्ती (Mini Truck) भाडे साधारण ₹८००-₹१,२०० लागते.
   - जर तुम्ही ५०० किलो माल नेत असाल, तर प्रत्येक किलोमागे वाहतूक खर्च ₹२.० ते ₹२.४ पडतो. हा खर्च तुमच्या विक्री दरात समाविष्ट असायला हवा.

2. **वेळापत्रकाचा फायदा घ्या:**
   - सोमवारी आणि शुक्रवारी ग्रामीण बाजारात सर्वाधिक गर्दी आणि रोख उलाढाल असते.
   - सकाळी १० ते दुपारी २ या वेळेत किरकोळ ग्राहकांना चांगल्या दरात माल विका, आणि उर्वरित माल संध्याकाळी ५ नंतर स्थानिक व्यापाऱ्यांना घाऊक दरात देऊन रिकामा व्हा.

3. **BazaarPath मॉड्यूल वापरा:**
   - तुमचे गाव आणि बाजाराचे ठिकाण निवडून प्रवास खर्च, डिझेल आणि नफा-तोटा समतोल (Break-Even) काही सेकंदांत तपासा.`;
    } else {
      responseText = `### 🛒 Weekly Haat Discovery & Travel Economics

To maximize your net margin across weekly markets in **${district}**:

1. **Factor Real Travel Overhead:** A 50 km return trip via mini-truck typically costs ₹800–₹1,200. On a 500 kg consignment, transport alone adds ~₹2.20/kg to your base cost.
2. **Two-Stage Selling Strategy:** Sell premium graded units at retail price to consumers between 9 AM and 2 PM. Liquidate remaining stock in wholesale lots to local vendors before 6 PM to avoid dead-weight return transit.
3. **Use BazaarPath:** Calculate exact round-trip fuel, vehicle rent, and break-even sales volume before leaving your village.`;
    }

    return {
      success: true,
      text: responseText,
      suggestedActions: [
        { label: lang === 'mr' ? 'बाजारपेठ मार्गदर्शक उघडा' : 'Open BazaarPath', moduleId: 'bazaarpath' },
        { label: lang === 'mr' ? 'नफा सिम्युलेटर चालवा' : 'Simulate Profit', moduleId: 'bazaarpath' }
      ]
    };
  }

  // --- DEFAULT INTENT: GENERAL RURAL ADVISORY & VILLAGE OPPORTUNITY ---
  const districtInfo = RURAL_KNOWLEDGE_BASE.districtClusters[district] || {
    crops: ['Soybean', 'Cotton', 'Pulses', 'Vegetables'],
    keyOpportunities: ['Mini Agro-Processing', 'Custom Equipment Rental', 'Cold Storage Aggregation']
  };

  let defaultText = '';
  if (lang === 'mr') {
    defaultText = `### 🌾 महाउद्यम व्यवसाय सल्लागार (MahaUdyam AI Advisor)

नमस्कार! मी **${district}** परिसरातील ग्रामीण उद्योगांसाठी तुमचा समर्पित व्यावसायिक सल्लागार आहे. 

**${district}** जिल्ह्यासाठी सध्याचे सर्वात व्यवहार्य पर्याय:
${districtInfo.keyOpportunities.map(o => `- **${o}**`).join('\n')}

💡 **मी तुम्हाला खालील बाबतीत थेट आकडेमोड करून मदत करू शकतो:**
1. **व्यवसाय वास्तव तपासणी (Reality Check):** मशिनरी खर्च, दरमहा शेड भाडे, कच्चा माल आणि सुरक्षित नफ्याचा हिशोब.
2. **शासकीय अनुदान (PMFME / CMEGP):** २५% ते ३५% शासकीय अनुदान मिळवण्याचे नियम.
3. **शिल्लक माल बचाव (Unsold Stock Rescue):** भाजीपाला व नाशवंत मालाचे नुकसान टाळणे.
4. **आठवडे बाजार नफा (BazaarPath):** गाडी भाडे आणि सुरक्षित विक्री दर ठरवणे.

तुम्हाला कोणत्या व्यवसायाबद्दल माहिती हवी आहे? उदा. *"हळद पावडर उद्योग कसा सुरू करावा?"* किंवा *"माझ्या गावासाठी कोणती व्यवसाय संधी योग्य आहे?"*`;
  } else if (lang === 'hi') {
    defaultText = `### 🌾 महाउद्यम व्यवसाय सलाहकार (MahaUdyam AI Advisor)

नमस्ते! मैं **${district}** क्षेत्र में ग्रामीण उद्यमों के लिए आपका समर्पित बिजनेस सलाहकार हूँ।

**${district}** जिले के लिए शीर्ष व्यवहार्य अवसर:
${districtInfo.keyOpportunities.map(o => `- **${o}**`).join('\n')}

💡 **मैं आपकी कैसे मदद कर सकता हूँ:**
1. **बिजनेस रियलिटी चेक:** मशीनरी लागत, मासिक खर्च, यूनिट इकोनॉमिक्स और ब्रेक-ईवन विश्लेषण।
2. **सरकारी सब्सिडी (PMFME/CMEGP):** 35% तक की योजनाओं का व्यावहारिक मार्गदर्शन।
3. **बचाव योजना (Unsold Stock):** खराब होने वाली उपज का त्वरित समाधान।
4. **साप्ताहिक बाजार (BazaarPath):** वाहन भाड़ा और शुद्ध मुनाफा गणना।

आप किसी भी विषय पर पूछ सकते हैं!`;
  } else {
    defaultText = `### 🌾 MahaUdyam AI Business Advisor

Hello! I am your dedicated grassroots business advisor for **${district}** and rural Maharashtra.

Top Viable Opportunities in **${district}**:
${districtInfo.keyOpportunities.map(o => `- **${o}**`).join('\n')}

💡 **What I can do for you:**
1. **Business Reality Check:** Real Capex, monthly fixed overheads, contribution margin, and break-even sales volume.
2. **Government Subsidies:** 35% capital subsidy via PMFME or CMEGP with realistic approval steps.
3. **Perishable Rescue:** Actionable strategies to prevent farmgate crop spoilage.
4. **Market Logistics:** Round-trip transit costs and minimum profitable selling prices for weekly haats.

Ask any question directly or try: *"Analyze turmeric processing reality"*, *"How to apply for PMFME?"*, or *"Which business is best for my village?"*`;
  }

  return {
    success: true,
    text: defaultText,
    suggestedActions: [
      { label: lang === 'mr' ? 'गावातील व्यवसाय संधी शोधा' : 'Explore Village Opportunities', moduleId: 'opportunity-detector' },
      { label: lang === 'mr' ? 'मागणी व तुटवडा विश्लेषण' : 'View Demand Signals', moduleId: 'demand-collector' },
      { label: lang === 'mr' ? 'हळद/तेल उद्योग नफा तपासा' : 'Check Reality Simulator', moduleId: 'ai-advisor' }
    ]
  };
}

/**
 * Optional External Cloud LLM Caller (when API Key is configured)
 */
async function callExternalLlm({ userText, apiKey, context, history, lang }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const systemInstruction = `You are the MahaUdyam AI Business Advisor for rural Maharashtra. 
Always provide ground-truth business calculations with real arithmetic: Capex, Opex, Contribution margin per unit, and Break-even units. 
Respond in ${lang === 'mr' ? 'Marathi' : (lang === 'hi' ? 'Hindi' : 'English')}. 
Warn about rural pitfalls like uncollateralized credit (उधारी) and harvest price drops.`;

  const payload = {
    contents: [
      ...history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      })),
      { role: 'user', parts: [{ text: userText }] }
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from LLM');

  return {
    success: true,
    text,
    suggestedActions: [
      { label: lang === 'mr' ? 'संधी शोधक' : 'Opportunity Detector', moduleId: 'opportunity-detector' },
      { label: lang === 'mr' ? 'बाजारपेठ मार्गदर्शक' : 'BazaarPath', moduleId: 'bazaarpath' }
    ]
  };
}
