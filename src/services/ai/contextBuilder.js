/**
 * MahaUdyam — AI Business Advisor Context Builder
 * 
 * Automatically gathers user profile, active location (district/taluka/village),
 * saved opportunities, registered unsold stocks, recent market visits, and current
 * module state so the advisor can answer with precise local context without asking
 * redundant questions.
 */

import { authService } from '../auth/authService.js';
import { db } from '../db/index.js';

export async function buildAdvisorContext(activeModuleId = null) {
  const context = {
    user: null,
    location: {
      district: 'Maharashtra',
      taluka: null,
      village: null
    },
    activeModule: activeModuleId,
    savedOpportunitiesCount: 0,
    activeUnsoldStocksCount: 0,
    recentMarketsCount: 0,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    timestamp: new Date().toISOString()
  };

  try {
    const user = authService.getCurrentUser();
    if (user) {
      context.user = {
        name: user.name || 'Entrepreneur',
        role: user.role || 'user',
        preferredLanguage: user.preferredLanguage || user.language || 'mr'
      };

      if (user.districtCode) context.location.district = user.districtCode;
      if (user.talukaCode) context.location.taluka = user.talukaCode;
      if (user.villageCode) context.location.village = user.villageCode;
    }

    // Inspect user settings for explicitly selected district/village
    if (db.userSettings) {
      const selectedDistrict = await db.userSettings.get('selected_district').catch(() => null);
      if (selectedDistrict && selectedDistrict.value) {
        context.location.district = selectedDistrict.value;
      }
      const selectedTaluka = await db.userSettings.get('selected_taluka').catch(() => null);
      if (selectedTaluka && selectedTaluka.value) {
        context.location.taluka = selectedTaluka.value;
      }
      const selectedVillage = await db.userSettings.get('selected_village').catch(() => null);
      if (selectedVillage && selectedVillage.value) {
        context.location.village = selectedVillage.value;
      }
    }

    // Check count of user saved items to personalize recommendations
    const userId = authService.getUserId();
    if (userId) {
      if (db.opportunities) {
        context.savedOpportunitiesCount = await db.opportunities.where('userId').equals(userId).count().catch(() => 0);
      }
      if (db.unsoldStock) {
        context.activeUnsoldStocksCount = await db.unsoldStock.where('userId').equals(userId).and(s => s.status === 'active').count().catch(() => 0);
      }
      if (db.marketVisits) {
        context.recentMarketsCount = await db.marketVisits.where('userId').equals(userId).count().catch(() => 0);
      }
    }
  } catch (err) {
    console.warn('Non-fatal error building advisor context:', err);
  }

  return context;
}

/**
 * Generates system prompt with injected context for LLM or rule engine
 */
export function formatAdvisorPrompt(context, language = 'mr') {
  const locStr = `${context.location.village ? context.location.village + ', ' : ''}${context.location.taluka ? context.location.taluka + ', ' : ''}${context.location.district || 'Maharashtra'}`;
  
  return `You are the MahaUdyam AI Business Advisor (महाउद्यम व्यवसाय सल्लागार), an expert rural enterprise advisor specializing in grassroots entrepreneurship in Maharashtra.

CURRENT USER CONTEXT:
- Entrepreneur: ${context.user ? context.user.name : 'Rural Entrepreneur'}
- Location: ${locStr}
- Active Screen / Module: ${context.activeModule || 'General Advisory'}
- Registered Active Stocks: ${context.activeUnsoldStocksCount}
- Saved Opportunities: ${context.savedOpportunitiesCount}
- Offline Mode: ${context.isOffline ? 'YES (Rely on local cache)' : 'NO (Online)'}
- Language: ${language === 'mr' ? 'Marathi (मराठी)' : (language === 'hi' ? 'Hindi (हिंदी)' : 'English')}

CORE PRINCIPLES:
1. No generic fluff. Give practical, street-smart rural advice with real numbers and verifiable assumptions.
2. When discussing any business idea, ALWAYS evaluate the financial reality: setup cost, variable costs, unit economics, monthly fixed rent/wages, and break-even sales volume.
3. Reference Maharashtra-specific schemes (PMFME, CMEGP, PMEGP, MUDRA), APMC markets, and weekly haats where relevant.
4. If the user asks in Marathi, respond in respectful, natural rural Marathi (गावरान, समजण्यास सोपी व सन्मानजनक भाषा). If in Hindi or English, respond in that language.
5. Emphasize risk mitigation: avoid excess uncollateralized credit (उधारी), test small before buying heavy machines, and plan for seasonal price drops.`;
}
