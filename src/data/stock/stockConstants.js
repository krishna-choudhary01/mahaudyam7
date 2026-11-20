/**
 * MahaUdyam — Unsold Stock Rescue Constants & Enumerations
 * Standard taxonomies for rural Maharashtra agricultural and enterprise inventory recovery.
 */

export const STOCK_CATEGORIES = {
  VEGETABLES_FRUITS: 'vegetables_fruits',
  GRAINS_PULSES: 'grains_pulses',
  DAIRY: 'dairy',
  PROCESSED_FOOD: 'processed_food',
  AGRICULTURAL_PRODUCE: 'agricultural_produce',
  HANDICRAFTS: 'handicrafts',
  CLOTHING_TEXTILES: 'clothing_textiles',
  HOUSEHOLD: 'household',
  OTHER: 'other'
};

export const STOCK_STATUSES = {
  NEWLY_REGISTERED: 'newly_registered',           // 1. Newly Registered (नवीन नोंदणीकृत)
  AVAILABLE_FOR_RECOVERY: 'available_for_recovery', // 2. Available for Recovery (पुनर्प्राप्तीसाठी उपलब्ध)
  RECOVERY_IN_PROGRESS: 'recovery_in_progress',   // 3. Recovery in Progress (पुनर्प्राप्ती सुरू)
  PARTIALLY_RECOVERED: 'partially_recovered',     // 4. Partially Recovered (अंशतः पुनर्प्राप्त)
  FULLY_RECOVERED: 'fully_recovered',             // 5. Fully Recovered (पूर्ण पुनर्प्राप्त)
  EXPIRED_DAMAGED: 'expired_damaged',             // 6. Expired or Damaged (कालबाह्य किंवा खराब)
  DISPOSED: 'disposed'                            // 7. Disposed (विल्हेवाट लावली)
};

export const PERISHABILITY_LEVELS = {
  PERISHABLE: 'perishable',         // e.g. tomatoes, fresh milk, leafy greens (hours to days)
  SEMI_PERISHABLE: 'semi_perishable', // e.g. onions, potatoes, processed snacks (weeks to months)
  NON_PERISHABLE: 'non_perishable'   // e.g. textiles, handicrafts, dry grains, tools
};

export const PRODUCT_CONDITIONS = {
  FRESH: 'fresh',                 // Fresh / Prime
  GOOD: 'good',                   // Good condition
  FAIR: 'fair',                   // Usable with minor aesthetic drop
  DETERIORATING: 'deteriorating', // Rapidly losing quality, urgent action required
  DAMAGED: 'damaged'              // Expired / Spoiled / Unsafe for human consumption
};

export const UNITS_OF_MEASUREMENT = [
  { value: 'kg', label_en: 'Kilogram (kg)', label_mr: 'किलो (kg)' },
  { value: 'quintal', label_en: 'Quintal (100 kg)', label_mr: 'क्विंटल (१०० किलो)' },
  { value: 'litre', label_en: 'Litre (L)', label_mr: 'लिटर (L)' },
  { value: 'piece', label_en: 'Piece / Unit', label_mr: 'नग / पीस' },
  { value: 'packet', label_en: 'Packet', label_mr: 'पाकीट' },
  { value: 'box', label_en: 'Box / Corrugated Carton', label_mr: 'बॉक्स' },
  { value: 'crate', label_en: 'Plastic Crate (~20-25 kg)', label_mr: 'क्रेट' },
  { value: 'bag', label_en: 'Gunny / Jute Bag (50 kg)', label_mr: 'गोणपाट / पोते' },
  { value: 'dozen', label_en: 'Dozen (12 units)', label_mr: 'डझन' }
];

export const STORAGE_CONDITIONS = [
  { value: 'open_air', label_en: 'Open Air (Unshaded)', label_mr: 'उघड्या हवेत (उन्हात)' },
  { value: 'shaded_ventilated', label_en: 'Shaded & Ventilated Room', label_mr: 'सावलीत व हवेशीर खोली' },
  { value: 'cold_storage', label_en: 'Commercial Cold Storage', label_mr: 'व्यावसायिक शीतगृह' },
  { value: 'refrigerated', label_en: 'Domestic / Commercial Chiller', label_mr: 'रेफ्रिजरेटर / चिलर' },
  { value: 'dry_godown', label_en: 'Dry Moisture-free Godown', label_mr: 'कोरडे बंदिस्त गोदाम' },
  { value: 'airtight_container', label_en: 'Airtight Sealed Drum', label_mr: 'हवाबंद ड्रम' }
];

export const PACKAGING_CONDITIONS = [
  { value: 'unpacked_loose', label_en: 'Loose / Unpacked', label_mr: 'सुटा माल (विनापॅकिंग)' },
  { value: 'plastic_crate', label_en: 'Plastic Harvesting Crate', label_mr: 'प्लॅस्टिक क्रेट' },
  { value: 'gunny_bag', label_en: 'Jute / Burlap Sack', label_mr: 'गोणपाट / पोते' },
  { value: 'corrugated_box', label_en: 'Corrugated Paper Box', label_mr: 'पुठ्ठा खोके' },
  { value: 'sealed_packet', label_en: 'Hermetically Sealed Pouch', label_mr: 'सील केलेले पाकीट' }
];

/**
 * 8 Standard Recovery Options / Channels (Phase 1 Foundation)
 */
export const RECOVERY_CHANNELS = [
  {
    id: 'weekly_markets',
    title_en: 'Nearby Weekly Haats & Rural Bazaars',
    title_mr: 'जवळचे आठवडे बाजार व ग्रामीण हाट',
    desc_en: 'Re-route unsold stock to consecutive weekly village bazaars within 20 km.',
    desc_mr: '२० किमी परिसरातील पुढील दिवसांच्या आठवडे बाजारात माल वळवा.',
    icon: 'shop',
    suitability: ['vegetables_fruits', 'agricultural_produce', 'handicrafts', 'clothing_textiles', 'household']
  },
  {
    id: 'local_retailers',
    title_en: 'Local Kirana Stores & Neighborhood Retailers',
    title_mr: 'स्थानिक किराणा व किरकोळ दुकाने',
    desc_en: 'Offer discounted consignment stock directly to village kirana stores.',
    desc_mr: 'गावातील किराणा दुकानांना सवलतीत तात्काळ विक्री करा.',
    icon: 'shop',
    suitability: ['processed_food', 'grains_pulses', 'dairy', 'household', 'vegetables_fruits']
  },
  {
    id: 'bulk_buyers',
    title_en: 'Bulk Buyers & Mandi Commission Agents',
    title_mr: 'घाऊक व्यापारी व बाजार समिती अडते',
    desc_en: 'Liquidate high-volume inventory in single lots to wholesale traders.',
    desc_mr: 'मोठ्या प्रमाणातील साठा घाऊक व्यापाऱ्यांना एकाच वेळी द्या.',
    icon: 'box',
    suitability: ['grains_pulses', 'agricultural_produce', 'vegetables_fruits']
  },
  {
    id: 'food_processors',
    title_en: 'Food Processing Units & Value-Adders',
    title_mr: 'अन्न प्रक्रिया उद्योग व मूल्यवर्धन केंद्र',
    desc_en: 'Supply processing-grade surplus for pulp, puree, pickles, drying, or silage.',
    desc_mr: 'पल्प, प्युरी, लोणचे, वाळवणे किंवा मुरघासासाठी प्रक्रिया केंद्रांना पुरवठा करा.',
    icon: 'farmer',
    suitability: ['vegetables_fruits', 'dairy', 'agricultural_produce', 'grains_pulses']
  },
  {
    id: 'cooperatives',
    title_en: 'Farmer Producer Companies (FPOs) & Cooperatives',
    title_mr: 'शेतकरी उत्पादक संस्था (FPO) व सहकारी संस्था',
    desc_en: 'Aggregate surplus through local FPOs with institutional storage access.',
    desc_mr: 'स्थानिक एफपीओ किंवा सहकारी संस्थेमार्फत साठा एकत्र करा.',
    icon: 'shield',
    suitability: ['agricultural_produce', 'grains_pulses', 'dairy', 'vegetables_fruits']
  },
  {
    id: 'alternative_markets',
    title_en: 'Direct-to-Consumer Popups & Temples/Highway Hubs',
    title_mr: 'महामार्ग स्टॉल्स, देवस्थान व थेट ग्राहक विक्री',
    desc_en: 'Set up temporary evening roadside or pilgrim town retail stalls.',
    desc_mr: 'महामार्ग किंवा यात्रा-देवस्थान परिसरात तात्पुरता विक्री स्टॉल लावा.',
    icon: 'location',
    suitability: ['vegetables_fruits', 'handicrafts', 'processed_food', 'clothing_textiles']
  },
  {
    id: 'storage_preservation',
    title_en: 'Cold Storage & Warehousing Preservation',
    title_mr: 'शीतगृह किंवा वखार महामंडळ साठवणूक',
    desc_en: 'Place inventory in licensed cold chambers or godowns until prices rebound.',
    desc_mr: 'बाजारभाव सुधारेपर्यंत माल अधिकृत शीतगृहात किंवा गोदामात साठवा.',
    icon: 'box',
    suitability: ['vegetables_fruits', 'grains_pulses', 'agricultural_produce']
  },
  {
    id: 'value_addition',
    title_en: 'On-Farm Dehydration, Grading & Packaging',
    title_mr: 'शेतपातळीवर वाळवणे, प्रतवारी व पॅकेजिंग',
    desc_en: 'Dehydrate surplus, sort smaller grades for consumer packs, or boil/cure.',
    desc_mr: 'मालाचे सौर निर्जलीकरण करा, लहान पॅकिंग तयार करा किंवा मूल्यवर्धन करा.',
    icon: 'hammer',
    suitability: ['vegetables_fruits', 'agricultural_produce', 'processed_food', 'handicrafts']
  }
];

/**
 * Phase 3: Buyer Enquiry Statuses
 */
export const ENQUIRY_STATUSES = {
  DRAFT: 'draft',
  PENDING_SYNC: 'pending_sync',
  SENT: 'sent',
  VIEWED: 'viewed',
  INTERESTED: 'interested',
  COUNTEROFFER_RECEIVED: 'counteroffer_received',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
};

/**
 * Phase 3: Pickup & Delivery Arrangement Terms
 */
export const DELIVERY_TERMS = {
  PICKUP: 'pickup',                   // Buyer arranges vehicle to farm/village
  DELIVERY: 'delivery',               // Entrepreneur delivers to buyer's depot/mandi
  MUTUAL_TRANSIT: 'mutual_transit'    // Handover at a shared highway hub or market
};

/**
 * Phase 3: Recovery Transaction Completion Statuses
 */
export const TRANSACTION_COMPLETION_STATUSES = {
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

/**
 * Phase 3: Payment Settlement Statuses
 */
export const PAYMENT_STATUSES = {
  PENDING: 'pending',
  PARTIAL: 'partial',
  PAID: 'paid',
  FAILED: 'failed'
};
