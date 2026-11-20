import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';
import { opportunityDiscoveryEngine } from '../../services/village/opportunityDiscoveryEngine.js';
import { personalDecisionSupportService } from '../../services/village/personalDecisionSupportService.js';
import { authService } from '../../services/auth/authService.js';

export function VillageOpportunitiesSection({ villageCode, onNavigateModule, onSelectForChecklist }) {
  const { t, isMarathi } = useLanguage();
  const userId = authService.getUserId() || 'ent_nashik_ramesh_001';

  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());
  const [saveBanner, setSaveBanner] = useState(null);

  // Load Opportunities for this village
  const loadOpportunities = async () => {
    if (!villageCode) return;
    setLoading(true);
    try {
      const res = await opportunityDiscoveryEngine.generateOpportunitiesForVillage(villageCode);
      setOpportunities(res.opportunities || []);

      if (userId) {
        const saved = await personalDecisionSupportService.getSavedOpportunities(userId);
        setSavedIds(new Set(saved.map((o) => o.id)));
      }
    } catch (err) {
      console.error('Failed to generate village opportunities', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, [villageCode]);

  // Handle Save / Unsave
  const handleToggleSave = async (opp) => {
    try {
      if (savedIds.has(opp.id)) {
        await personalDecisionSupportService.removeSavedOpportunity(userId, opp.id);
        const next = new Set(savedIds);
        next.delete(opp.id);
        setSavedIds(next);
      } else {
        await personalDecisionSupportService.saveOpportunity(userId, opp);
        const next = new Set(savedIds);
        next.add(opp.id);
        setSavedIds(next);
        setSaveBanner(isMarathi ? `"${opp.title_mr || opp.title_en}" संधी तुमच्या वर्कस्पेसमध्ये जतन झाली.` : `"${opp.title_en}" saved to your personal workspace.`);
        setTimeout(() => setSaveBanner(null), 3000);
      }
    } catch (e) {
      console.warn('Could not toggle save', e);
    }
  };

  return (
    <div className="village-opportunities-section">
      <div className="opp-engine-header">
        <div className="opp-engine-badge">
          <AppIcon name="cpu" size={16} />
          <span>{isMarathi ? 'टप्पा २: स्थानिक व्यवसाय संधी शोध इंजिन' : 'Phase 2: Evidence-Based Opportunity Engine'}</span>
        </div>
        <h3>{isMarathi ? 'स्थानिक स्रोत व मागणीवर आधारित व्यवसाय संधी' : 'Tailored Rural Business Opportunities'}</h3>
        <p>
          {isMarathi
            ? 'गावातील शेतीमाल, स्थानिक कच्चा माल, कारागीर कौशल्ये आणि नागरिकांनी नोंदवलेल्या प्रत्यक्ष मागण्यांचे विश्लेषण करून तयार केलेल्या वास्तववादी संधी.'
            : 'Synthesized directly from village agricultural surplus, raw materials, workforce skills, and citizen demand signals.'}
        </p>
      </div>

      {saveBanner && (
        <div className="opp-save-banner">
          <AppIcon name="check-circle" size={16} color="#2e7d32" />
          <span>{saveBanner}</span>
        </div>
      )}

      {loading ? (
        <div className="opp-loading">
          <div className="spinner-icon">🔄</div>
          <p>{isMarathi ? 'गावाच्या आकडेवारीचे विश्लेषण करून संधी शोधत आहे...' : 'Analyzing village economic indicators...'}</p>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="opp-empty-card">
          <AppIcon name="alert-circle" size={40} color="#ff9800" />
          <h4>{isMarathi ? 'या गावासाठी पुरेशी माहिती उपलब्ध नाही' : 'Insufficient Village Data for Accurate Recommendations'}</h4>
          <p>
            {isMarathi
              ? 'या गावाची शेती, कौशल्य व मागणीची माहिती अद्याप परिपूर्ण नाही. कृपया इतर गावांचे नमुने तपासा किंवा माहिती जोडा.'
              : 'Detailed agricultural and skills records are missing for this village. Please explore representative profiles.'}
          </p>
        </div>
      ) : (
        <div className="opportunities-cards-grid">
          {opportunities.map((opp) => {
            const isSaved = savedIds.has(opp.id);
            const title = isMarathi ? (opp.title_mr || opp.title_en) : opp.title_en;
            const risks = isMarathi ? (opp.risks_mr || opp.risks_en) : opp.risks_en;
            const explanation = isMarathi ? (opp.explanation_mr || opp.explanation_en) : opp.explanation_en;

            return (
              <div key={opp.id} className="opportunity-card">
                {/* Header: Score & Category */}
                <div className="opp-card-header">
                  <span className="opp-cat-pill">
                    {opp.category.replace(/_/g, ' ')}
                  </span>
                  <div className="score-pill-wrap">
                    <span className="score-lbl">{isMarathi ? 'उपयुक्तता:' : 'Viability:'}</span>
                    <strong className="score-val">{opp.viabilityScore}/100</strong>
                  </div>
                </div>

                {/* Title */}
                <h4 className="opp-title">{title}</h4>

                {/* Evidence Pillars */}
                <div className="opp-evidence-box">
                  <div className="evidence-row">
                    <span className="ev-icon">🌾</span>
                    <span className="ev-text">
                      <strong>{isMarathi ? 'शेतमाल/कच्चा माल:' : 'Crops/Inputs:'}</strong>{' '}
                      {(opp.supportingEvidence?.matchedCrops || []).join(', ') || (isMarathi ? 'स्थानिक शेतमाल' : 'Local produce')}
                    </span>
                  </div>
                  <div className="evidence-row">
                    <span className="ev-icon">🛠️</span>
                    <span className="ev-text">
                      <strong>{isMarathi ? 'गावातील कौशल्ये:' : 'Skills:'}</strong>{' '}
                      {(opp.supportingEvidence?.matchedSkills || []).join(', ') || (isMarathi ? 'सामान्य कारागीर' : 'General skills')}
                    </span>
                  </div>
                  <div className="evidence-row">
                    <span className="ev-icon">👥</span>
                    <span className="ev-text">
                      <strong>{isMarathi ? 'नागरिक मागणी नोंदी:' : 'Citizen Demand:'}</strong>{' '}
                      {opp.supportingEvidence?.totalDemandReports || 0} {isMarathi ? 'मागण्या नोंदवल्या' : 'unmet requests'}
                    </span>
                  </div>
                  <div className="evidence-row">
                    <span className="ev-icon">🏪</span>
                    <span className="ev-text">
                      <strong>{isMarathi ? 'ज्ञात स्थानिक स्पर्धा:' : 'Competition:'}</strong>{' '}
                      {opp.supportingEvidence?.knownCompetitorsCount || 0} {isMarathi ? 'स्थानिक उद्योग' : 'known competitors'}
                    </span>
                  </div>
                </div>

                {/* Investment & Equipment Box */}
                <div className="opp-financial-box">
                  <div className="fin-col">
                    <span className="fin-lbl">{isMarathi ? 'अंदाजित भांडवल' : 'Est. Investment'}</span>
                    <strong className="fin-val">{opp.investmentRange?.formatted}</strong>
                  </div>
                  <div className="fin-col">
                    <span className="fin-lbl">{isMarathi ? 'विश्वासार्हता' : 'Confidence'}</span>
                    <span className={`confidence-badge conf-${opp.confidenceLevel}`}>
                      {opp.confidenceLevel === 'high' ? '🟢 High' : opp.confidenceLevel === 'moderate' ? '🟡 Moderate' : '🟠 Exploratory'}
                    </span>
                  </div>
                </div>

                {/* Risks & Bottlenecks */}
                <div className="opp-risks-box">
                  <span className="risks-lbl">⚠️ {isMarathi ? 'प्रमुख जोखीम व मर्यादा:' : 'Main Risks & Bottlenecks:'}</span>
                  <p className="risks-text">{risks}</p>
                </div>

                {/* Explanation */}
                <div className="opp-explanation">
                  <p>💡 {explanation}</p>
                </div>

                {/* Action Buttons */}
                <div className="opp-actions-footer">
                  <button
                    type="button"
                    className={`btn-save-opp ${isSaved ? 'saved' : ''}`}
                    onClick={() => handleToggleSave(opp)}
                  >
                    <AppIcon name={isSaved ? 'bookmark-fill' : 'bookmark'} size={14} />
                    <span>{isSaved ? (isMarathi ? 'जतन केले' : 'Saved') : (isMarathi ? 'संधी जतन करा' : 'Save')}</span>
                  </button>

                  {onSelectForChecklist && (
                    <button
                      type="button"
                      className="btn-start-checklist"
                      onClick={() => onSelectForChecklist(opp)}
                    >
                      <AppIcon name="check-square" size={14} />
                      <span>{isMarathi ? 'कृती आराखडा (Checklist)' : '7-Step Action Plan'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
