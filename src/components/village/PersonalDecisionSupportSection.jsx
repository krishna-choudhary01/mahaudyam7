import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';
import { personalDecisionSupportService } from '../../services/village/personalDecisionSupportService.js';
import { authService } from '../../services/auth/authService.js';

export function PersonalDecisionSupportSection({ villageCode, selectedOpportunity, onNavigateModule }) {
  const { t, isMarathi } = useLanguage();
  const userId = authService.getUserId() || 'ent_nashik_ramesh_001';

  // Personal Constraints & Matching State
  const [userSkills, setUserSkills] = useState(['Solar Dehydration', 'Dairy Processing']);
  const [maxBudget, setMaxBudget] = useState('200000');
  const [matchedOpportunities, setMatchedOpportunities] = useState([]);
  const [activeOpportunity, setActiveOpportunity] = useState(selectedOpportunity || null);
  const [checklist, setChecklist] = useState(null);
  const [loading, setLoading] = useState(true);

  // Available skills presets
  const SKILL_PRESETS = [
    'Solar Dehydration',
    'Dairy Processing',
    'Food Processing',
    'Grain Processing',
    'Agricultural Machinery Repair',
    'Paithani Weaving',
    'Tailoring & Stitching',
    'Vegetable Sorting'
  ];

  // Load Matched Opportunities
  const loadMatches = async () => {
    if (!villageCode) return;
    setLoading(true);
    try {
      const matches = await personalDecisionSupportService.matchPersonalOpportunities({
        villageCode,
        userSkills,
        maxBudget: maxBudget ? Number(maxBudget) : null
      });
      setMatchedOpportunities(matches);
      if (!activeOpportunity && matches.length > 0) {
        setActiveOpportunity(matches[0]);
      }
    } catch (e) {
      console.warn('Failed to match personal opportunities', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
  }, [villageCode, userSkills, maxBudget]);

  // Load Checklist when activeOpportunity changes
  const loadChecklist = async () => {
    if (!activeOpportunity) return;
    try {
      const cl = await personalDecisionSupportService.getChecklistForOpportunity(
        userId,
        activeOpportunity.id,
        activeOpportunity.category
      );
      setChecklist(cl);
    } catch (e) {
      console.warn('Failed to load checklist', e);
    }
  };

  useEffect(() => {
    loadChecklist();
  }, [activeOpportunity, userId]);

  // Toggle Checklist Step
  const handleToggleStep = async (stepId) => {
    if (!activeOpportunity) return;
    try {
      await personalDecisionSupportService.toggleChecklistStep(userId, activeOpportunity.id, stepId);
      await loadChecklist();
    } catch (e) {
      console.warn('Could not toggle step', e);
    }
  };

  const handleToggleSkill = (skill) => {
    if (userSkills.includes(skill)) {
      setUserSkills(userSkills.filter((s) => s !== skill));
    } else {
      setUserSkills([...userSkills, skill]);
    }
  };

  return (
    <div className="personal-decision-support-section">
      {/* 1. Header Card */}
      <div className="decision-header-card">
        <div className="decision-badge">
          <AppIcon name="user-check" size={16} />
          <span>{isMarathi ? 'टप्पा ३: वैयक्तिक उद्योजक निर्णय सहाय्य' : 'Phase 3: Personalized Entrepreneur Decision Support'}</span>
        </div>
        <h3>{isMarathi ? 'माझी कौशल्ये व उपलब्ध भांडवलावर आधारित व्यवसाय योजना' : 'Personal Skill & Investment Matching Engine'}</h3>
        <p>
          {isMarathi
            ? 'तुमची वैयक्तिक पार्श्वभूमी, कौशल्ये व भांडवल मर्यादा जोडा. प्रणाली तुमच्यासाठी योग्य व्यवसाय निवडून ७-टप्प्यांचा कृती आराखडा तयार करेल.'
            : 'Align your background, available investment capital, and skills with verified local village opportunities.'}
        </p>
      </div>

      {/* 2. Personal Constraints Controls Bar */}
      <div className="personal-filters-card">
        <div className="filter-group-budget">
          <label className="filter-label">
            💰 {isMarathi ? 'माझे उपलब्ध भांडवल (₹):' : 'My Available Investment Budget (₹):'}
          </label>
          <div className="budget-input-wrap">
            <span className="currency-prefix">₹</span>
            <input
              type="number"
              min="10000"
              step="10000"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              className="budget-input"
            />
            <span className="budget-preset-chips">
              <button type="button" onClick={() => setMaxBudget('100000')}>₹1L</button>
              <button type="button" onClick={() => setMaxBudget('250000')}>₹2.5L</button>
              <button type="button" onClick={() => setMaxBudget('500000')}>₹5L</button>
            </span>
          </div>
        </div>

        <div className="filter-group-skills">
          <label className="filter-label">
            🛠️ {isMarathi ? 'माझी कौशल्ये व अनुभव (निवडा):' : 'My Skills & Experience (Select):'}
          </label>
          <div className="skills-chips-list">
            {SKILL_PRESETS.map((skill) => (
              <button
                key={skill}
                type="button"
                className={`skill-chip ${userSkills.includes(skill) ? 'active' : ''}`}
                onClick={() => handleToggleSkill(skill)}
              >
                {userSkills.includes(skill) ? '✓ ' : '+ '}
                {skill}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Two-Column Layout: Opportunities Matching List on Left, 7-Step Checklist on Right */}
      <div className="decision-layout-grid">
        {/* Left Column: Matched Opportunities */}
        <div className="matched-opps-column">
          <h4>{isMarathi ? 'कौशल्यानुसार सुसंगत व्यवसाय संधी' : 'Matched Opportunities'}</h4>
          {loading ? (
            <div className="loading-state">
              <div className="spinner-icon">🔄</div>
              <p>{isMarathi ? 'संधींची जुळवणी करत आहे...' : 'Matching with your profile...'}</p>
            </div>
          ) : matchedOpportunities.length === 0 ? (
            <p className="empty-hint">
              {isMarathi ? 'निवडलेल्या भांडवल व कौशल्यानुसार संधी आढळली नाही.' : 'No opportunities match your current budget & skills.'}
            </p>
          ) : (
            <div className="matched-opps-list">
              {matchedOpportunities.map((opp) => {
                const isActive = activeOpportunity?.id === opp.id;
                const title = isMarathi ? (opp.title_mr || opp.title_en) : opp.title_en;

                return (
                  <div
                    key={opp.id}
                    className={`matched-opp-item ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveOpportunity(opp)}
                  >
                    <div className="item-header">
                      <span className="match-pill">
                        🎯 {opp.personalMatchPercent}% {isMarathi ? 'सुसंगत' : 'Match'}
                      </span>
                      <span className={`budget-tag ${opp.isWithinBudget ? 'tag-green' : 'tag-orange'}`}>
                        {opp.isWithinBudget ? (isMarathi ? 'भांडवलात बसणारा' : 'Within Budget') : (isMarathi ? 'अतिरिक्त भांडवल हवे' : 'Higher Capital')}
                      </span>
                    </div>

                    <strong className="item-title">{title}</strong>

                    <div className="item-meta">
                      <span>💰 {opp.investmentRange?.formatted}</span>
                      <span>⭐ {opp.viabilityScore}/100</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: 7-Step Business Preparation Checklist */}
        <div className="checklist-column">
          {activeOpportunity ? (
            <div className="checklist-card">
              <div className="checklist-card-header">
                <div>
                  <span className="opp-tag">{activeOpportunity.category.replace(/_/g, ' ')}</span>
                  <h4>
                    {isMarathi
                      ? `"${activeOpportunity.title_mr || activeOpportunity.title_en}" व्यवसाय तयारी कृती आराखडा`
                      : `7-Step Launch Action Plan: ${activeOpportunity.title_en}`}
                  </h4>
                </div>
                {checklist && (
                  <div className="progress-radial-wrap">
                    <span className="progress-num">{checklist.progressPercent}%</span>
                    <span className="progress-lbl">{checklist.completedCount}/{checklist.totalSteps} {isMarathi ? 'पूर्ण' : 'Done'}</span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {checklist && (
                <div className="checklist-progress-bar-wrap">
                  <div
                    className="checklist-progress-bar-fill"
                    style={{ width: `${checklist.progressPercent}%` }}
                  />
                </div>
              )}

              {/* Checklist Steps */}
              {checklist && (
                <div className="checklist-steps-list">
                  {checklist.items.map((step) => {
                    const stepTitle = isMarathi ? step.title_mr : step.title_en;
                    const stepDesc = isMarathi ? step.description_mr : step.description_en;

                    return (
                      <div
                        key={step.stepId}
                        className={`checklist-step-item ${step.isCompleted ? 'step-completed' : ''}`}
                      >
                        <input
                          type="checkbox"
                          id={step.stepId}
                          checked={step.isCompleted}
                          onChange={() => handleToggleStep(step.stepId)}
                          className="step-checkbox"
                        />
                        <div className="step-content">
                          <label htmlFor={step.stepId} className="step-title">
                            {stepTitle}
                          </label>
                          <p className="step-desc">{stepDesc}</p>

                          {/* Quick Cross-Module Integration Actions */}
                          {step.linkedModule && onNavigateModule && (
                            <button
                              type="button"
                              className="btn-cross-module-link"
                              onClick={() => onNavigateModule(step.linkedModule)}
                            >
                              <AppIcon name="external-link" size={12} />
                              <span>
                                {step.linkedModule === 'route-finder'
                                  ? (isMarathi ? 'कच्चा माल पुरवठादार शोधा →' : 'Find Raw Material Suppliers →')
                                  : step.linkedModule === 'resource-matcher'
                                  ? (isMarathi ? 'सामायिक यंत्रसामग्री भाड्याने शोधा →' : 'Find Shared Machinery →')
                                  : (isMarathi ? 'आठवडे बाजार तपासा →' : 'Check Weekly Haats →')}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Statutory Non-Guarantee Notice */}
              <div className="statutory-notice-box">
                <span className="statutory-icon">⚖️</span>
                <p>
                  {isMarathi
                    ? 'वैधानिक सूचना: हा कृती आराखडा आणि शिफारसी केवळ मार्गदर्शनासाठी आहेत. नफ्याची अथवा व्यावसायिक यशाची कोणतीही हमी दिली जात नाही. प्रत्यक्ष गुंतवणुकीपूर्वी स्थानिक बाजाराची स्वतः पडताळणी करावी.'
                    : 'Statutory Notice: This action plan and recommendation is for guidance purposes only. MahaUdyam does not promise guaranteed profit or business success. Conduct personal due diligence before capital commitments.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="checklist-placeholder">
              <AppIcon name="file-text" size={40} color="#999" />
              <p>{isMarathi ? 'कृती आराखडा पाहण्यासाठी डावीकडील कोणत्याही व्यवसाय संधीवर क्लिक करा.' : 'Select an opportunity on the left to inspect its 7-Step Action Plan.'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
