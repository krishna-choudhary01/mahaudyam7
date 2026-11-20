/**
 * MahaUdyam — Client AI Advisor Service
 * 
 * Manages conversation history, offline resiliency, and server communication.
 */

import { buildAdvisorContext } from './contextBuilder.js';
import { executeAiTool } from './aiToolRegistry.js';
import { calculateBusinessReality, getBenchmarkPreset } from './businessRealityCheckService.js';
import { db } from '../db/index.js';
import { authService } from '../auth/authService.js';

const STORAGE_PREFIX = 'mahaudyam_ai_conv_';

export class AiAdvisorService {
  constructor() {
    this.currentConversationId = 'default';
    this.messages = [];
    this.listeners = new Set();
    this.activeScenario = null;
  }

  async init(conversationId = 'default') {
    this.currentConversationId = conversationId;
    this.loadMessages();
  }

  loadMessages() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${this.currentConversationId}`);
        if (stored) {
          this.messages = JSON.parse(stored);
          this.notify();
          return;
        }
      }
    } catch (e) {
      console.warn('Could not load AI messages from localStorage:', e);
    }
    this.messages = [];
    this.notify();
  }

  saveMessages() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(
          `${STORAGE_PREFIX}${this.currentConversationId}`,
          JSON.stringify(this.messages)
        );
      }
    } catch (e) {
      console.warn('Could not save AI messages to localStorage:', e);
    }
  }

  async sendMessage(text, activeModuleId = null, language = 'mr') {
    if (!text || !text.trim()) return;

    const userMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date().toISOString()
    };

    this.messages.push(userMessage);
    this.notify();
    this.saveMessages();

    // Context gathered automatically
    const context = await buildAdvisorContext(activeModuleId);

    // Placeholder advisor message with loading state
    const advisorMessageId = `msg_${Date.now()}_model`;
    const advisorLoadingMsg = {
      id: advisorMessageId,
      role: 'model',
      text: '',
      isLoading: true,
      timestamp: new Date().toISOString()
    };
    this.messages.push(advisorLoadingMsg);
    this.notify();

    try {
      // 1. Attempt API call to backend /api/v1/ai/chat
      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          context,
          history: this.messages.filter(m => !m.isLoading).slice(-6),
          language
        })
      });

      if (response.ok) {
        const result = await response.json();
        const index = this.messages.findIndex(m => m.id === advisorMessageId);
        if (index !== -1) {
          this.messages[index] = {
            id: advisorMessageId,
            role: 'model',
            text: result.text || 'Advice generated.',
            realityScenario: result.realityScenario || null,
            suggestedActions: result.suggestedActions || [],
            toolData: result.toolData || null,
            isLoading: false,
            timestamp: new Date().toISOString()
          };
          if (result.realityScenario) {
            this.activeScenario = result.realityScenario;
          }
        }
      } else {
        throw new Error(`Server returned status ${response.status}`);
      }
    } catch (err) {
      console.warn('Network / Server call failed, using client fallback engine:', err.message);
      // Run tool directly on client side for offline resilience
      const lower = text.toLowerCase();
      let fallbackText = '';
      let scenario = null;

      if (lower.includes('reality') || lower.includes('हळद') || lower.includes('turmeric') || lower.includes('oil') || lower.includes('घाणी') || lower.includes('नफा')) {
        let presetKey = lower.includes('oil') || lower.includes('घाणी') ? 'soybean-oil-ghani' : 'turmeric-processing';
        scenario = calculateBusinessReality({ ...getBenchmarkPreset(presetKey) });
        fallbackText = language === 'mr'
          ? `### 📊 ${scenario.businessTitle} — वास्तववादी नफा-तोटा विश्लेषण (ऑफलाइन मोड)\n\n- **एकूण आवश्यक भांडवल:** ₹${scenario.capitalSummary.totalCapitalRequired.toLocaleString('en-IN')}\n- **Break-Even विक्री:** दरमहा किमान ${scenario.breakEvenAnalysis.breakEvenUnits} ${scenario.unit} (₹${scenario.breakEvenAnalysis.breakEvenRevenue.toLocaleString('en-IN')})\n- **अपेक्षित मासिक निव्वळ नफा:** ₹${scenario.scenarios.expected.monthlyNetProfit.toLocaleString('en-IN')}\n\n*टीप: ऑफलाइन मोडमध्ये उपलब्ध मानकांनुसार हिशोब दाखवला आहे.*`
          : `### 📊 ${scenario.businessTitle} — Financial Reality Check (Offline Mode)\n\n- **Total Capital Required:** ₹${scenario.capitalSummary.totalCapitalRequired.toLocaleString('en-IN')}\n- **Break-Even Volume:** ${scenario.breakEvenAnalysis.breakEvenUnits} ${scenario.unit}/month\n- **Expected Net Profit:** ₹${scenario.scenarios.expected.monthlyNetProfit.toLocaleString('en-IN')}/month`;
      } else {
        fallbackText = language === 'mr'
          ? `### 🌾 महाउद्यम सल्लागार (ऑफलाइन मोड)\n\nइंटरनेट उपलब्ध नसल्यामुळे स्थानिक कॅशमधील माहिती वापरली जात आहे. आपण हळद प्रक्रिया, लाकडी घाणी, शेळीपालन, आठवडे बाजार प्रवास किंवा शिल्लक माल बचाव याविषयी विचारू शकता.`
          : `### 🌾 MahaUdyam Advisor (Offline Mode)\n\nRunning in offline resilience mode with cached Maharashtra business benchmarks. You can ask about Turmeric, Oil Ghani, Goat farming, Haat travel, or Unsold stock rescue.`;
      }

      const index = this.messages.findIndex(m => m.id === advisorMessageId);
      if (index !== -1) {
        this.messages[index] = {
          id: advisorMessageId,
          role: 'model',
          text: fallbackText,
          realityScenario: scenario,
          isLoading: false,
          isOfflineFallback: true,
          timestamp: new Date().toISOString()
        };
        if (scenario) this.activeScenario = scenario;
      }
    }

    this.notify();
    this.saveMessages();
  }

  clearHistory() {
    this.messages = [];
    this.activeScenario = null;
    this.saveMessages();
    this.notify();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.messages, this.activeScenario);
      } catch (e) {
        console.error('Error notifying AI advisor subscriber:', e);
      }
    }
  }
}

export const aiAdvisorService = new AiAdvisorService();
