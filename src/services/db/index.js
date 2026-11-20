import Dexie from 'dexie';

/**
 * MahaUdyamDB - Client-side IndexedDB database
 * Powered by Dexie.js for offline persistence
 * 
 * Stores local market insights, business opportunities, and an offline mutation sync queue.
 */
export const db = new Dexie('MahaUdyamDB');

// Define database schema and versioning
db.version(1).stores({
  // Business opportunities identified for Maharashtra talukas/districts
  opportunities: '++id, title, category, district, viabilityScore, isFavorite, updatedAt',
  
  // Market intelligence / APMC commodity price trends
  marketPrices: '++id, commodity, marketName, district, modalPrice, recordedDate',
  
  // Mutation sync queue for operations carried out while offline
  syncQueue: '++id, actionType, payload, status, createdAt, retryCount',
  
  // Local user settings & preferences (e.g. chosen district, language preference)
  userSettings: 'key, value, updatedAt'
});

// Version 2: Adds offline location caching store for villages
db.version(2).stores({
  opportunities: '++id, title, category, district, viabilityScore, isFavorite, updatedAt',
  marketPrices: '++id, commodity, marketName, district, modalPrice, recordedDate',
  syncQueue: '++id, actionType, payload, status, createdAt, retryCount',
  userSettings: 'key, value, updatedAt',
  cachedVillages: 'c, t, d, n, m'
});

// Version 3: Adds User Profiles, Private User Data Isolation, and Offline Sessions
db.version(3).stores({
  opportunities: '++id, userId, title, category, district, viabilityScore, isFavorite, updatedAt',
  marketPrices: '++id, userId, commodity, marketName, district, modalPrice, recordedDate',
  syncQueue: '++id, userId, actionType, payload, status, createdAt, retryCount',
  userSettings: 'id, userId, key, value, updatedAt',
  cachedVillages: 'c, t, d, n, m',
  userProfiles: 'userId, mobile, name, language, districtCode, talukaCode, villageCode, createdAt, updatedAt',
  userSessions: 'sessionId, userId, sessionToken, expiresAt, isOfflineAuthorized'
});

// Version 4: Adds BazaarPath Weekly Markets, User Favorites, and Recent Searches
db.version(4).stores({
  opportunities: '++id, userId, title, category, district, viabilityScore, isFavorite, updatedAt',
  marketPrices: '++id, userId, commodity, marketName, district, modalPrice, recordedDate',
  syncQueue: '++id, userId, actionType, payload, status, createdAt, retryCount',
  userSettings: 'id, userId, key, value, updatedAt',
  cachedVillages: 'c, t, d, n, m',
  userProfiles: 'userId, mobile, name, language, districtCode, talukaCode, villageCode, createdAt, updatedAt',
  userSessions: 'sessionId, userId, sessionToken, expiresAt, isOfflineAuthorized',
  bazaarMarkets: 'id, name, districtCode, talukaCode, villageCode, operatingDay, verificationStatus, lastUpdated',
  userFavorites: 'id, userId, marketId, createdAt',
  recentSearches: 'id, userId, category, districtCode, talukaCode, villageCode, searchedAt'
});

// Version 5: Adds Market Submissions (corrections/unverified) and Saved Profit Scenarios
db.version(5).stores({
  opportunities: '++id, userId, title, category, district, viabilityScore, isFavorite, updatedAt',
  marketPrices: '++id, userId, commodity, marketName, district, modalPrice, recordedDate',
  syncQueue: '++id, userId, actionType, payload, status, createdAt, retryCount',
  userSettings: 'id, userId, key, value, updatedAt',
  cachedVillages: 'c, t, d, n, m',
  userProfiles: 'userId, mobile, name, language, districtCode, talukaCode, villageCode, createdAt, updatedAt',
  userSessions: 'sessionId, userId, sessionToken, expiresAt, isOfflineAuthorized',
  bazaarMarkets: 'id, name, districtCode, talukaCode, villageCode, operatingDay, verificationStatus, lastUpdated',
  userFavorites: 'id, userId, marketId, createdAt',
  recentSearches: 'id, userId, category, districtCode, talukaCode, villageCode, searchedAt',
  marketSubmissions: 'id, userId, marketId, type, status, createdAt',
  profitScenarios: 'id, userId, marketId, calculatedAt'
});

// Version 6: Adds Administrative Authentication, Role-Based Access Control, and Audit Logging
db.version(6).stores({
  opportunities: '++id, userId, title, category, district, viabilityScore, isFavorite, updatedAt',
  marketPrices: '++id, userId, commodity, marketName, district, modalPrice, recordedDate',
  syncQueue: '++id, userId, actionType, payload, status, createdAt, retryCount',
  userSettings: 'id, userId, key, value, updatedAt',
  cachedVillages: 'c, t, d, n, m',
  userProfiles: 'userId, mobile, name, language, districtCode, talukaCode, villageCode, role, createdAt, updatedAt',
  userSessions: 'sessionId, userId, sessionToken, role, expiresAt, isOfflineAuthorized',
  bazaarMarkets: 'id, name, districtCode, talukaCode, villageCode, operatingDay, marketType, verificationStatus, lastUpdated',
  userFavorites: 'id, userId, marketId, createdAt',
  recentSearches: 'id, userId, category, districtCode, talukaCode, villageCode, searchedAt',
  marketSubmissions: 'id, userId, marketId, type, status, createdAt',
  profitScenarios: 'id, userId, marketId, calculatedAt',
  adminUsers: 'userId, username, email, role, status, createdAt, lastLogin',
  auditLogs: 'id, adminId, action, recordType, recordId, timestamp',
  marketCategories: 'id, name, name_mr, icon, active'
});

// Version 7: Adds Customer-Driven Demand Signal Collector, Moderation & Saved Demand Signals
db.version(7).stores({
  opportunities: '++id, userId, title, category, district, viabilityScore, isFavorite, updatedAt',
  marketPrices: '++id, userId, commodity, marketName, district, modalPrice, recordedDate',
  syncQueue: '++id, userId, actionType, payload, status, createdAt, retryCount',
  userSettings: 'id, userId, key, value, updatedAt',
  cachedVillages: 'c, t, d, n, m',
  userProfiles: 'userId, mobile, name, language, districtCode, talukaCode, villageCode, role, createdAt, updatedAt',
  userSessions: 'sessionId, userId, sessionToken, role, expiresAt, isOfflineAuthorized',
  bazaarMarkets: 'id, name, districtCode, talukaCode, villageCode, operatingDay, marketType, verificationStatus, lastUpdated',
  userFavorites: 'id, userId, marketId, createdAt',
  recentSearches: 'id, userId, category, districtCode, talukaCode, villageCode, searchedAt',
  marketSubmissions: 'id, userId, marketId, type, status, createdAt',
  profitScenarios: 'id, userId, marketId, calculatedAt',
  adminUsers: 'userId, username, email, role, status, createdAt, lastLogin',
  auditLogs: 'id, adminId, action, recordType, recordId, timestamp',
  marketCategories: 'id, name, name_mr, icon, active',
  customerDemandReports: 'id, category, districtCode, talukaCode, villageCode, availability, frequency, status, syncStatus, createdAt',
  savedDemandSignals: 'id, userId, demandId, savedAt'
});

// Version 8: Adds Supply-Demand Gap Analyzer (Verified Suppliers & Saved Gap Analyses)
db.version(8).stores({
  opportunities: '++id, userId, title, category, district, viabilityScore, isFavorite, updatedAt',
  marketPrices: '++id, userId, commodity, marketName, district, modalPrice, recordedDate',
  syncQueue: '++id, userId, actionType, payload, status, createdAt, retryCount',
  userSettings: 'id, userId, key, value, updatedAt',
  cachedVillages: 'c, t, d, n, m',
  userProfiles: 'userId, mobile, name, language, districtCode, talukaCode, villageCode, role, createdAt, updatedAt',
  userSessions: 'sessionId, userId, sessionToken, role, expiresAt, isOfflineAuthorized',
  bazaarMarkets: 'id, name, districtCode, talukaCode, villageCode, operatingDay, marketType, verificationStatus, lastUpdated',
  userFavorites: 'id, userId, marketId, createdAt',
  recentSearches: 'id, userId, category, districtCode, talukaCode, villageCode, searchedAt',
  marketSubmissions: 'id, userId, marketId, type, status, createdAt',
  profitScenarios: 'id, userId, marketId, calculatedAt',
  adminUsers: 'userId, username, email, role, status, createdAt, lastLogin',
  auditLogs: 'id, adminId, action, recordType, recordId, timestamp',
  marketCategories: 'id, name, name_mr, icon, active',
  customerDemandReports: 'id, category, districtCode, talukaCode, villageCode, availability, frequency, status, syncStatus, createdAt',
  savedDemandSignals: 'id, userId, demandId, savedAt',
  verifiedSuppliers: 'id, businessName, category, districtCode, talukaCode, villageCode, verificationStatus, operationalStatus, updatedAt',
  savedGapAnalyses: 'id, userId, gapId, savedAt'
});

// Version 9: Phase 3 Opportunity Validation, Checklists & Offline Decision Support
db.version(9).stores({
  opportunities: '++id, userId, title, category, district, viabilityScore, isFavorite, updatedAt',
  marketPrices: '++id, userId, commodity, marketName, district, modalPrice, recordedDate',
  syncQueue: '++id, userId, actionType, payload, status, createdAt, retryCount',
  userSettings: 'id, userId, key, value, updatedAt',
  cachedVillages: 'c, t, d, n, m',
  userProfiles: 'userId, mobile, name, language, districtCode, talukaCode, villageCode, role, createdAt, updatedAt',
  userSessions: 'sessionId, userId, sessionToken, role, expiresAt, isOfflineAuthorized',
  bazaarMarkets: 'id, name, districtCode, talukaCode, villageCode, operatingDay, marketType, verificationStatus, lastUpdated',
  userFavorites: 'id, userId, marketId, createdAt',
  recentSearches: 'id, userId, category, districtCode, talukaCode, villageCode, searchedAt',
  marketSubmissions: 'id, userId, marketId, type, status, createdAt',
  profitScenarios: 'id, userId, marketId, calculatedAt',
  adminUsers: 'userId, username, email, role, status, createdAt, lastLogin',
  auditLogs: 'id, adminId, action, recordType, recordId, timestamp',
  marketCategories: 'id, name, name_mr, icon, active',
  customerDemandReports: 'id, category, districtCode, talukaCode, villageCode, availability, frequency, status, syncStatus, createdAt',
  savedDemandSignals: 'id, userId, demandId, savedAt',
  verifiedSuppliers: 'id, businessName, category, districtCode, talukaCode, villageCode, verificationStatus, operationalStatus, updatedAt',
  savedGapAnalyses: 'id, userId, gapId, validationStatus, syncStatus, savedAt, updatedAt'
});

// Version 10: Village Opportunity Detector — Village Intelligence, Resources & Admin Contributions
db.version(10).stores({
  opportunities: '++id, userId, title, category, district, viabilityScore, isFavorite, updatedAt',
  marketPrices: '++id, userId, commodity, marketName, district, modalPrice, recordedDate',
  syncQueue: '++id, userId, actionType, payload, status, createdAt, retryCount',
  userSettings: 'id, userId, key, value, updatedAt',
  cachedVillages: 'c, t, d, n, m',
  userProfiles: 'userId, mobile, name, language, districtCode, talukaCode, villageCode, role, createdAt, updatedAt',
  userSessions: 'sessionId, userId, sessionToken, role, expiresAt, isOfflineAuthorized',
  bazaarMarkets: 'id, name, districtCode, talukaCode, villageCode, operatingDay, marketType, verificationStatus, lastUpdated',
  userFavorites: 'id, userId, marketId, createdAt',
  recentSearches: 'id, userId, category, districtCode, talukaCode, villageCode, searchedAt',
  marketSubmissions: 'id, userId, marketId, type, status, createdAt',
  profitScenarios: 'id, userId, marketId, calculatedAt',
  adminUsers: 'userId, username, email, role, status, createdAt, lastLogin',
  auditLogs: 'id, adminId, action, recordType, recordId, timestamp',
  marketCategories: 'id, name, name_mr, icon, active',
  customerDemandReports: 'id, category, districtCode, talukaCode, villageCode, availability, frequency, status, syncStatus, createdAt',
  savedDemandSignals: 'id, userId, demandId, savedAt',
  verifiedSuppliers: 'id, businessName, category, districtCode, talukaCode, villageCode, verificationStatus, operationalStatus, updatedAt',
  savedGapAnalyses: 'id, userId, gapId, validationStatus, syncStatus, savedAt, updatedAt',
  villageIntelligence: 'villageCode, districtCode, talukaCode, dataCompleteness, lastUpdated, syncStatus',
  adminVillageContributions: 'id, adminId, villageCode, category, status, createdAt'
});

// Version 11: Unsold Stock Rescue — Stock Registration, Recovery Options & Tracking
db.version(11).stores({
  opportunities: '++id, userId, title, category, district, viabilityScore, isFavorite, updatedAt',
  marketPrices: '++id, userId, commodity, marketName, district, modalPrice, recordedDate',
  syncQueue: '++id, userId, actionType, payload, status, createdAt, retryCount',
  userSettings: 'id, userId, key, value, updatedAt',
  cachedVillages: 'c, t, d, n, m',
  userProfiles: 'userId, mobile, name, language, districtCode, talukaCode, villageCode, role, createdAt, updatedAt',
  userSessions: 'sessionId, userId, sessionToken, role, expiresAt, isOfflineAuthorized',
  bazaarMarkets: 'id, name, districtCode, talukaCode, villageCode, operatingDay, marketType, verificationStatus, lastUpdated',
  userFavorites: 'id, userId, marketId, createdAt',
  recentSearches: 'id, userId, category, districtCode, talukaCode, villageCode, searchedAt',
  marketSubmissions: 'id, userId, marketId, type, status, createdAt',
  profitScenarios: 'id, userId, marketId, calculatedAt',
  adminUsers: 'userId, username, email, role, status, createdAt, lastLogin',
  auditLogs: 'id, adminId, action, recordType, recordId, timestamp',
  marketCategories: 'id, name, name_mr, icon, active',
  customerDemandReports: 'id, category, districtCode, talukaCode, villageCode, availability, frequency, status, syncStatus, createdAt',
  savedDemandSignals: 'id, userId, demandId, savedAt',
  verifiedSuppliers: 'id, businessName, category, districtCode, talukaCode, villageCode, verificationStatus, operationalStatus, updatedAt',
  savedGapAnalyses: 'id, userId, gapId, validationStatus, syncStatus, savedAt, updatedAt',
  villageIntelligence: 'villageCode, districtCode, talukaCode, dataCompleteness, lastUpdated, syncStatus',
  adminVillageContributions: 'id, adminId, villageCode, category, status, createdAt',
  unsoldStock: 'id, userId, productName, category, perishability, status, districtCode, talukaCode, villageCode, syncStatus, registeredDate, updatedAt',
  recoveryLogs: 'id, stockId, userId, actionType, timestamp, syncStatus'
});

// Version 12: Unsold Stock Rescue Phase 2 — Smart Recovery Channel Recommendations & Entrepreneur Actions
db.version(12).stores({
  opportunities: '++id, userId, title, category, district, viabilityScore, isFavorite, updatedAt',
  marketPrices: '++id, userId, commodity, marketName, district, modalPrice, recordedDate',
  syncQueue: '++id, userId, actionType, payload, status, createdAt, retryCount',
  userSettings: 'id, userId, key, value, updatedAt',
  cachedVillages: 'c, t, d, n, m',
  userProfiles: 'userId, mobile, name, language, districtCode, talukaCode, villageCode, role, createdAt, updatedAt',
  userSessions: 'sessionId, userId, sessionToken, role, expiresAt, isOfflineAuthorized',
  bazaarMarkets: 'id, name, districtCode, talukaCode, villageCode, operatingDay, marketType, verificationStatus, lastUpdated',
  userFavorites: 'id, userId, marketId, createdAt',
  recentSearches: 'id, userId, category, districtCode, talukaCode, villageCode, searchedAt',
  marketSubmissions: 'id, userId, marketId, type, status, createdAt',
  profitScenarios: 'id, userId, marketId, calculatedAt',
  adminUsers: 'userId, username, email, role, status, createdAt, lastLogin',
  auditLogs: 'id, adminId, action, recordType, recordId, timestamp',
  marketCategories: 'id, name, name_mr, icon, active',
  customerDemandReports: 'id, category, districtCode, talukaCode, villageCode, availability, frequency, status, syncStatus, createdAt',
  savedDemandSignals: 'id, userId, demandId, savedAt',
  verifiedSuppliers: 'id, businessName, category, districtCode, talukaCode, villageCode, verificationStatus, operationalStatus, updatedAt',
  savedGapAnalyses: 'id, userId, gapId, validationStatus, syncStatus, savedAt, updatedAt',
  villageIntelligence: 'villageCode, districtCode, talukaCode, dataCompleteness, lastUpdated, syncStatus',
  adminVillageContributions: 'id, adminId, villageCode, category, status, createdAt',
  unsoldStock: 'id, userId, productName, category, perishability, status, districtCode, talukaCode, villageCode, syncStatus, registeredDate, updatedAt',
  recoveryLogs: 'id, stockId, userId, actionType, timestamp, syncStatus',
  stockRecommendations: 'id, stockId, userId, generatedAt, syncStatus',
  stockChannelActions: 'id, stockId, userId, channelId, actionType, timestamp, syncStatus'
});

// Version 13: Unsold Stock Rescue Phase 3 — Buyer Enquiries, Recovery Transactions & Outcome Intelligence
db.version(13).stores({
  opportunities: '++id, userId, title, category, district, viabilityScore, isFavorite, updatedAt',
  marketPrices: '++id, userId, commodity, marketName, district, modalPrice, recordedDate',
  syncQueue: '++id, userId, actionType, payload, status, createdAt, retryCount',
  userSettings: 'id, userId, key, value, updatedAt',
  cachedVillages: 'c, t, d, n, m',
  userProfiles: 'userId, mobile, name, language, districtCode, talukaCode, villageCode, role, createdAt, updatedAt',
  userSessions: 'sessionId, userId, sessionToken, role, expiresAt, isOfflineAuthorized',
  bazaarMarkets: 'id, name, districtCode, talukaCode, villageCode, operatingDay, marketType, verificationStatus, lastUpdated',
  userFavorites: 'id, userId, marketId, createdAt',
  recentSearches: 'id, userId, category, districtCode, talukaCode, villageCode, searchedAt',
  marketSubmissions: 'id, userId, marketId, type, status, createdAt',
  profitScenarios: 'id, userId, marketId, calculatedAt',
  adminUsers: 'userId, username, email, role, status, createdAt, lastLogin',
  auditLogs: 'id, adminId, action, recordType, recordId, timestamp',
  marketCategories: 'id, name, name_mr, icon, active',
  customerDemandReports: 'id, category, districtCode, talukaCode, villageCode, availability, frequency, status, syncStatus, createdAt',
  savedDemandSignals: 'id, userId, demandId, savedAt',
  verifiedSuppliers: 'id, businessName, category, districtCode, talukaCode, villageCode, verificationStatus, operationalStatus, updatedAt',
  savedGapAnalyses: 'id, userId, gapId, validationStatus, syncStatus, savedAt, updatedAt',
  villageIntelligence: 'villageCode, districtCode, talukaCode, dataCompleteness, lastUpdated, syncStatus',
  adminVillageContributions: 'id, adminId, villageCode, category, status, createdAt',
  unsoldStock: 'id, userId, productName, category, perishability, status, districtCode, talukaCode, villageCode, syncStatus, registeredDate, updatedAt',
  recoveryLogs: 'id, stockId, userId, actionType, timestamp, syncStatus',
  stockRecommendations: 'id, stockId, userId, generatedAt, syncStatus',
  stockChannelActions: 'id, stockId, userId, channelId, actionType, timestamp, syncStatus',
  stockEnquiries: 'id, stockId, userId, buyerId, status, syncStatus, enquiryDate, updatedAt',
  stockTransactions: 'id, stockId, userId, buyerId, recoveryChannel, recoveryCompletionStatus, syncStatus, transactionDate, isDemoTransaction, updatedAt'
});

// Version 14: BazaarPath Phase 3, Raw-Material Route Finder, Shared Resource Matcher & Resource Hub
db.version(14).stores({
  opportunities: '++id, userId, title, category, district, viabilityScore, isFavorite, updatedAt',
  marketPrices: '++id, userId, commodity, marketName, district, modalPrice, recordedDate',
  syncQueue: '++id, userId, actionType, payload, status, createdAt, retryCount',
  userSettings: 'id, userId, key, value, updatedAt',
  cachedVillages: 'c, t, d, n, m',
  userProfiles: 'userId, mobile, name, language, districtCode, talukaCode, villageCode, role, createdAt, updatedAt',
  userSessions: 'sessionId, userId, sessionToken, role, expiresAt, isOfflineAuthorized',
  bazaarMarkets: 'id, name, districtCode, talukaCode, villageCode, operatingDay, marketType, verificationStatus, lastUpdated',
  userFavorites: 'id, userId, marketId, createdAt',
  recentSearches: 'id, userId, category, districtCode, talukaCode, villageCode, searchedAt',
  marketSubmissions: 'id, userId, marketId, type, status, createdAt',
  profitScenarios: 'id, userId, marketId, calculatedAt',
  adminUsers: 'userId, username, email, role, status, createdAt, lastLogin',
  auditLogs: 'id, adminId, action, recordType, recordId, timestamp',
  marketCategories: 'id, name, name_mr, icon, active',
  customerDemandReports: 'id, category, districtCode, talukaCode, villageCode, availability, frequency, status, syncStatus, createdAt',
  savedDemandSignals: 'id, userId, demandId, savedAt',
  verifiedSuppliers: 'id, businessName, category, districtCode, talukaCode, villageCode, verificationStatus, operationalStatus, updatedAt',
  savedGapAnalyses: 'id, userId, gapId, validationStatus, syncStatus, savedAt, updatedAt',
  villageIntelligence: 'villageCode, districtCode, talukaCode, dataCompleteness, lastUpdated, syncStatus',
  adminVillageContributions: 'id, adminId, villageCode, category, status, createdAt',
  unsoldStock: 'id, userId, productName, category, perishability, status, districtCode, talukaCode, villageCode, syncStatus, registeredDate, updatedAt',
  recoveryLogs: 'id, stockId, userId, actionType, timestamp, syncStatus',
  stockRecommendations: 'id, stockId, userId, generatedAt, syncStatus',
  stockChannelActions: 'id, stockId, userId, channelId, actionType, timestamp, syncStatus',
  stockEnquiries: 'id, stockId, userId, buyerId, status, syncStatus, enquiryDate, updatedAt',
  stockTransactions: 'id, stockId, userId, buyerId, recoveryChannel, recoveryCompletionStatus, syncStatus, transactionDate, isDemoTransaction, updatedAt',
  marketVisits: 'id, userId, marketId, productCategory, visitDate, syncStatus, createdAt',
  rawMaterialSuppliers: 'id, materialName, category, districtCode, talukaCode, villageCode, verificationStatus, updatedAt',
  procurementEnquiries: 'id, userId, supplierId, materialId, status, syncStatus, enquiryDate, updatedAt',
  sharedResources: 'id, resourceName, category, districtCode, talukaCode, villageCode, verificationStatus, availabilityStatus, updatedAt',
  resourceBookings: 'id, userId, resourceId, bookingStatus, syncStatus, startDate, endDate, createdAt',
  learningResources: 'id, category, difficulty, verificationStatus, updatedAt',
  userLearningProgress: 'id, userId, resourceId, completionStatus, progressPercent, lastAccessedAt'
});

/**
 * Helper to check database connectivity and retrieve record counts
 */
export async function getDbStatus() {
  try {
    await db.open();
    const opportunityCount = await db.opportunities.count();
    const priceCount = await db.marketPrices.count();
    const queueCount = await db.syncQueue.where('status').equals('pending').count();
    const settingsCount = await db.userSettings.count();
    const cachedVillagesCount = await db.cachedVillages.count();
    const profilesCount = await db.userProfiles.count();
    const marketsCount = await db.bazaarMarkets.count();
    const favoritesCount = await db.userFavorites.count();
    const submissionsCount = await db.marketSubmissions.count();
    const adminCount = await db.adminUsers ? await db.adminUsers.count() : 0;
    const auditCount = await db.auditLogs ? await db.auditLogs.count() : 0;
    const customerDemandCount = await db.customerDemandReports ? await db.customerDemandReports.count() : 0;
    const savedDemandCount = await db.savedDemandSignals ? await db.savedDemandSignals.count() : 0;
    const verifiedSuppliersCount = await db.verifiedSuppliers ? await db.verifiedSuppliers.count() : 0;
    const savedGapsCount = await db.savedGapAnalyses ? await db.savedGapAnalyses.count() : 0;
    const villageIntelCount = await db.villageIntelligence ? await db.villageIntelligence.count() : 0;
    const contributionsCount = await db.adminVillageContributions ? await db.adminVillageContributions.count() : 0;
    const unsoldStockCount = await db.unsoldStock ? await db.unsoldStock.count() : 0;
    const recoveryLogsCount = await db.recoveryLogs ? await db.recoveryLogs.count() : 0;
    const recommendationsCount = await db.stockRecommendations ? await db.stockRecommendations.count() : 0;
    const actionsCount = await db.stockChannelActions ? await db.stockChannelActions.count() : 0;
    const enquiriesCount = await db.stockEnquiries ? await db.stockEnquiries.count() : 0;
    const transactionsCount = await db.stockTransactions ? await db.stockTransactions.count() : 0;

    return {
      isOpen: db.isOpen(),
      name: db.name,
      version: db.verno,
      counts: {
        opportunities: opportunityCount,
        marketPrices: priceCount,
        pendingSyncItems: queueCount,
        userSettings: settingsCount,
        cachedVillages: cachedVillagesCount,
        userProfiles: profilesCount,
        bazaarMarkets: marketsCount,
        userFavorites: favoritesCount,
        marketSubmissions: submissionsCount,
        adminUsers: adminCount,
        auditLogs: auditCount,
        customerDemandReports: customerDemandCount,
        savedDemandSignals: savedDemandCount,
        verifiedSuppliers: verifiedSuppliersCount,
        savedGapAnalyses: savedGapsCount,
        villageIntelligence: villageIntelCount,
        adminVillageContributions: contributionsCount,
        unsoldStock: unsoldStockCount,
        recoveryLogs: recoveryLogsCount,
        stockRecommendations: recommendationsCount,
        stockChannelActions: actionsCount,
        stockEnquiries: enquiriesCount,
        stockTransactions: transactionsCount
      }
    };
  } catch (error) {
    console.error('Dexie IndexedDB initialization error:', error);
    return {
      isOpen: false,
      name: db.name,
      version: db.verno,
      error: error.message
    };
  }
}

export default db;
