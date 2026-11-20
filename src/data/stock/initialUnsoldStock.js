/**
 * MahaUdyam — Initial Unsold Stock Test Fixtures
 * Authentic baseline inventory records for testing rural recovery workflows.
 * 
 * Rules:
 * - Real location coordinates and LGD hierarchy
 * - Strict multi-tenant owner association (userId)
 * - Safe handling of unknown financial values
 * - Food safety flags for expired/damaged records
 */

import {
  STOCK_CATEGORIES,
  STOCK_STATUSES,
  PERISHABILITY_LEVELS,
  PRODUCT_CONDITIONS
} from './stockConstants.js';

export const INITIAL_UNSOLD_STOCKS = [
  // 1. Surplus Tomatoes after Weekly Bazaar (Perishable, Urgent)
  {
    id: 'stock_sinnar_tomatoes_01',
    userId: 'ent_nashik_ramesh_001',
    productName: 'Fresh Ripe Hybrid Tomatoes',
    productName_mr: 'ताजे लाल हायब्रिड टोमॅटो',
    category: STOCK_CATEGORIES.VEGETABLES_FRUITS,
    availableQuantity: 85,
    unit: 'kg',
    condition: PRODUCT_CONDITIONS.GOOD,
    perishability: PERISHABILITY_LEVELS.PERISHABLE,
    remainingShelfLifeHours: 36,
    expiryDate: null,
    
    // Financials
    originalQuantity: 120,
    originalTotalCost: 1800, // ₹15/kg
    originalSellingPricePerUnit: 25,
    expectedRecoveryPricePerUnit: 14,
    financialsEstimated: false,

    // Location
    districtCode: 490,
    districtName: 'Nashik',
    districtName_mr: 'नाशिक',
    talukaCode: 4154,
    talukaName: 'Sinnar',
    talukaName_mr: 'सिन्नर',
    villageCode: 551322,
    villageName: 'Baragaon Pimpri',
    villageName_mr: 'बारागाव पिंप्री',
    coordinates: { lat: 19.7892, lng: 74.0512 },

    // Storage & Condition
    storageCondition: 'shaded_ventilated',
    packagingCondition: 'plastic_crate',
    notes: 'Leftover from Sinnar Monday market. Firm texture, suitable for local puree or immediate hotel supply.',
    selectedRecoveryChannels: ['food_processors', 'weekly_markets'],

    status: STOCK_STATUSES.AVAILABLE_FOR_RECOVERY,
    statusHistory: [
      {
        status: STOCK_STATUSES.NEWLY_REGISTERED,
        timestamp: '2026-11-14T10:00:00.000Z',
        notes: 'Initial registration after weekly market close.'
      },
      {
        status: STOCK_STATUSES.AVAILABLE_FOR_RECOVERY,
        timestamp: '2026-11-14T11:30:00.000Z',
        notes: 'Graded into 4 plastic crates.'
      }
    ],

    registeredDate: '2026-11-14T10:00:00.000Z',
    updatedAt: '2026-11-14T11:30:00.000Z',
    syncStatus: 'synced'
  },

  // 2. Handloom Paithani Stoles (Non-Perishable, High Margin)
  {
    id: 'stock_yeola_paithani_02',
    userId: 'ent_nashik_ramesh_001',
    productName: 'Handloom Paithani Border Stoles',
    productName_mr: 'हातमाग पैठणी पदर शेले / दुपट्टे',
    category: STOCK_CATEGORIES.CLOTHING_TEXTILES,
    availableQuantity: 18,
    unit: 'piece',
    condition: PRODUCT_CONDITIONS.FRESH,
    perishability: PERISHABILITY_LEVELS.NON_PERISHABLE,
    remainingShelfLifeHours: null,
    expiryDate: null,

    // Financials
    originalQuantity: 25,
    originalTotalCost: 15000, // ₹600/piece
    originalSellingPricePerUnit: 1100,
    expectedRecoveryPricePerUnit: 850,
    financialsEstimated: false,

    districtCode: 490,
    districtName: 'Nashik',
    districtName_mr: 'नाशिक',
    talukaCode: 4154,
    talukaName: 'Sinnar',
    talukaName_mr: 'सिन्नर',
    villageCode: 524440,
    villageName: 'Sinnar Town',
    villageName_mr: 'सिन्नर शहर',
    coordinates: { lat: 19.8465, lng: 73.9965 },

    storageCondition: 'dry_godown',
    packagingCondition: 'corrugated_box',
    notes: 'Exhibition leftover. Pristine silk blend with zari border.',
    selectedRecoveryChannels: ['alternative_markets', 'local_retailers'],

    status: STOCK_STATUSES.AVAILABLE_FOR_RECOVERY,
    statusHistory: [
      {
        status: STOCK_STATUSES.NEWLY_REGISTERED,
        timestamp: '2026-11-12T14:00:00.000Z',
        notes: 'Registered after regional craft mela.'
      }
    ],

    registeredDate: '2026-11-12T14:00:00.000Z',
    updatedAt: '2026-11-12T14:00:00.000Z',
    syncStatus: 'synced'
  },

  // 3. Evening Raw Cow Milk (Critical Perishable - 4hr window)
  {
    id: 'stock_pohegaon_milk_03',
    userId: 'ent_ahmednagar_vikram_003',
    productName: 'Fresh Evening Cow Milk (3.8% Fat)',
    productName_mr: 'ताजे संध्याकाळचे गाईचे दूध (३.८% फॅट)',
    category: STOCK_CATEGORIES.DAIRY,
    availableQuantity: 40,
    unit: 'litre',
    condition: PRODUCT_CONDITIONS.FRESH,
    perishability: PERISHABILITY_LEVELS.PERISHABLE,
    remainingShelfLifeHours: 4, // Critical urgency!
    expiryDate: null,

    // Financials: Genuine Unknown Original Cost (Home farm reared)
    originalQuantity: 40,
    originalTotalCost: null, // Unknown!
    originalSellingPricePerUnit: 38,
    expectedRecoveryPricePerUnit: 32,
    financialsEstimated: true,

    districtCode: 494,
    districtName: 'Ahmednagar',
    districtName_mr: 'अहिल्यानगर (अहमदनगर)',
    talukaCode: 4212,
    talukaName: 'Kopargaon',
    talukaName_mr: 'कोपरगाव',
    villageCode: 557623,
    villageName: 'Pohegaon',
    villageName_mr: 'पोहेगाव',
    coordinates: { lat: 19.8211, lng: 74.4512 },

    storageCondition: 'refrigerated',
    packagingCondition: 'unpacked_loose',
    notes: 'Collection center tanker missed evening trip. Looking for immediate paneer maker or bulk sweet shop.',
    selectedRecoveryChannels: ['food_processors', 'local_retailers'],

    status: STOCK_STATUSES.AVAILABLE_FOR_RECOVERY,
    statusHistory: [
      {
        status: STOCK_STATUSES.NEWLY_REGISTERED,
        timestamp: '2026-11-15T08:00:00.000Z',
        notes: 'Surplus milk registered at 8:00 AM.'
      }
    ],

    registeredDate: '2026-11-15T08:00:00.000Z',
    updatedAt: '2026-11-15T08:00:00.000Z',
    syncStatus: 'synced'
  },

  // 4. Semi-perishable Red Garva Onions (In recovery progress)
  {
    id: 'stock_wavi_onion_04',
    userId: 'ent_nashik_ramesh_001',
    productName: 'Red Garva Onion (Grade B)',
    productName_mr: 'उन्हाळी लाल कांदा (मध्यम प्रत)',
    category: STOCK_CATEGORIES.AGRICULTURAL_PRODUCE,
    availableQuantity: 12,
    unit: 'quintal',
    condition: PRODUCT_CONDITIONS.FAIR,
    perishability: PERISHABILITY_LEVELS.SEMI_PERISHABLE,
    remainingShelfLifeHours: 360, // ~15 days
    expiryDate: null,

    originalQuantity: 15,
    originalTotalCost: 15000, // ₹1,000/quintal
    originalSellingPricePerUnit: 1800,
    expectedRecoveryPricePerUnit: 1350,
    financialsEstimated: false,

    districtCode: 490,
    districtName: 'Nashik',
    districtName_mr: 'नाशिक',
    talukaCode: 4154,
    talukaName: 'Sinnar',
    talukaName_mr: 'सिन्नर',
    villageCode: 551352,
    villageName: 'Wavi',
    villageName_mr: 'वावी',
    coordinates: { lat: 19.7421, lng: 74.1523 },

    storageCondition: 'shaded_ventilated',
    packagingCondition: 'gunny_bag',
    notes: 'B-grade medium bulb size. Good for hotel slicing or dehydration unit.',
    selectedRecoveryChannels: ['bulk_buyers', 'food_processors', 'storage_preservation'],

    status: STOCK_STATUSES.RECOVERY_IN_PROGRESS,
    statusHistory: [
      {
        status: STOCK_STATUSES.NEWLY_REGISTERED,
        timestamp: '2026-11-10T09:00:00.000Z',
        notes: 'Chawl sorted.'
      },
      {
        status: STOCK_STATUSES.RECOVERY_IN_PROGRESS,
        timestamp: '2026-11-13T11:00:00.000Z',
        notes: 'Discussing sample delivery with Sinnar onion dehydrator.'
      }
    ],

    registeredDate: '2026-11-10T09:00:00.000Z',
    updatedAt: '2026-11-13T11:00:00.000Z',
    syncStatus: 'synced'
  },

  // 5. Expired / Damaged Produce (Food Safety Guard Test Fixture)
  {
    id: 'stock_damaged_spinach_05',
    userId: 'ent_pune_sneha_002',
    productName: 'Decayed Wet Spinach (Palak)',
    productName_mr: 'खराब झालेली ओली पालक भाजी',
    category: STOCK_CATEGORIES.VEGETABLES_FRUITS,
    availableQuantity: 30,
    unit: 'kg',
    condition: PRODUCT_CONDITIONS.DAMAGED,
    perishability: PERISHABILITY_LEVELS.PERISHABLE,
    remainingShelfLifeHours: 0,
    expiryDate: '2026-11-14T00:00:00.000Z',

    originalQuantity: 30,
    originalTotalCost: 600,
    originalSellingPricePerUnit: 30,
    expectedRecoveryPricePerUnit: 0,
    financialsEstimated: false,

    districtCode: 490,
    districtName: 'Nashik',
    districtName_mr: 'नाशिक',
    talukaCode: 4154,
    talukaName: 'Sinnar',
    talukaName_mr: 'सिन्नर',
    villageCode: 551322,
    villageName: 'Baragaon Pimpri',
    villageName_mr: 'बारागाव पिंप्री',

    storageCondition: 'open_air',
    packagingCondition: 'unpacked_loose',
    notes: 'Rain rot. Strictly unsafe for consumption. Recommended for vermicompost only.',
    selectedRecoveryChannels: [],

    status: STOCK_STATUSES.EXPIRED_DAMAGED,
    statusHistory: [
      {
        status: STOCK_STATUSES.NEWLY_REGISTERED,
        timestamp: '2026-11-14T07:00:00.000Z',
        notes: 'Rain damage noted.'
      },
      {
        status: STOCK_STATUSES.EXPIRED_DAMAGED,
        timestamp: '2026-11-14T15:00:00.000Z',
        notes: 'Food safety officer inspection flagged as unfit for food sales.'
      }
    ],

    registeredDate: '2026-11-14T07:00:00.000Z',
    updatedAt: '2026-11-14T15:00:00.000Z',
    syncStatus: 'synced'
  }
];

export default INITIAL_UNSOLD_STOCKS;
