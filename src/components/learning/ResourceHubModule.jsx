import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';
import { learningResourceService } from '../../services/learning/learningResourceService';
import { RESOURCE_HUB_CATEGORIES } from '../../data/learning/initialLearningResources';
import { authService } from '../../services/auth/authService';
import './ResourceHub.css';

export function ResourceHubModule({ onBack, onNavigateModule }) {
  const { t, isMarathi } = useLanguage();
  const currentUser = authService.getCurrentUser();
  const userId = currentUser?.userId || 'guest_user';

  // Active tab: 'library' | 'calculator' | 'milestones'
  const [activeTab, setActiveTab] = useState('library');

  // Library State (Phase 1)
  const [resources, setResources] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Subsidy Estimator State (Phase 2)
  const [proposedInvestment, setProposedInvestment] = useState(500000);
  const [businessCategory, setBusinessCategory] = useState('Food Processing');
  const [socialCategory, setSocialCategory] = useState('General');
  const [isWomanEntrepreneur, setIsWomanEntrepreneur] = useState(false);
  const [isRuralArea, setIsRuralArea] = useState(true);
  const [matchedSchemes, setMatchedSchemes] = useState([]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Business Launch Tracker State (Phase 3)
  const [launchProgress, setLaunchProgress] = useState(null);
  const [activeStepNotes, setActiveStepNotes] = useState({});

  const [notification, setNotification] = useState(null);

  useEffect(() => {
    loadLibrary();
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    if (activeTab === 'milestones') {
      loadLaunchProgress();
    }
  }, [activeTab]);

  const showToast = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadLibrary = async () => {
    setLoading(true);
    try {
      const list = await learningResourceService.getAllResources({
        category: selectedCategory,
        search: searchQuery
      });
      setResources(list);
    } catch (e) {
      console.error('Failed to load learning resources:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadLaunchProgress = async () => {
    try {
      const prog = await learningResourceService.getUserLaunchProgress(userId);
      setLaunchProgress(prog);
      const notesMap = {};
      prog.milestones.forEach((m) => {
        notesMap[m.id] = m.notes || '';
      });
      setActiveStepNotes(notesMap);
    } catch (e) {
      console.error('Failed to load user launch progress:', e);
    }
  };

  const handleRunSubsidyEstimator = async () => {
    setIsCalculating(true);
    try {
      const results = await learningResourceService.matchGovernmentSchemes({
        businessCategory,
        proposedInvestment: Number(proposedInvestment) || 500000,
        isRural: isRuralArea,
        socialCategory,
        isWomanEntrepreneur
      });
      setMatchedSchemes(results);
    } catch (e) {
      console.error('Error running subsidy estimator:', e);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleToggleStep = async (stepId, currentCompleted) => {
    try {
      const updated = await learningResourceService.toggleMilestoneStep(
        userId,
        stepId,
        !currentCompleted,
        activeStepNotes[stepId] || ''
      );
      setLaunchProgress(updated);
      showToast(
        !currentCompleted
          ? (isMarathi ? 'टप्पा पूर्ण म्हणून नोंदवला!' : 'Milestone marked completed!')
          : (isMarathi ? 'टप्पा अपूर्ण म्हणून बदलला.' : 'Milestone marked incomplete.')
      );
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSaveStepNote = async (stepId) => {
    try {
      const currentCompleted = launchProgress?.completedSteps?.includes(stepId) || false;
      const updated = await learningResourceService.toggleMilestoneStep(
        userId,
        stepId,
        currentCompleted,
        activeStepNotes[stepId] || ''
      );
      setLaunchProgress(updated);
      showToast(isMarathi ? 'टीप जतन झाली!' : 'Note saved successfully!');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const getCategoryTitle = (catKey) => {
    switch (catKey) {
      case 'government_schemes': return isMarathi ? 'शासकीय योजना व अनुदान' : 'Government Schemes';
      case 'regulatory_compliance': return isMarathi ? 'परवाने व कायदेशीर नियम' : 'Regulatory Compliance';
      case 'project_templates': return isMarathi ? 'प्रकल्प अहवाल (DPR)' : 'Project DPR Templates';
      case 'technical_training': return isMarathi ? 'तांत्रिक मार्गदर्शन' : 'Technical Training';
      default: return catKey;
    }
  };

  return (
    <div className="resource-hub-module">
      {/* Topbar Header */}
      <div className="module-topbar">
        <button type="button" className="btn-back" onClick={onBack}>
          <AppIcon name="arrow-left" size={18} />
          <span>{isMarathi ? 'मुख्य पृष्ठ' : 'Home'}</span>
        </button>
        <div className="module-title-wrap">
          <span className="module-badge">
            <AppIcon name="hub" size={16} />
            {isMarathi ? 'शासकीय योजना व माहिती केंद्र' : 'Schemes, Compliance & DPRs'}
          </span>
          <h1 className="module-heading">
            {isMarathi ? 'शासकीय योजना व माहिती केंद्र' : 'Resource Hub'}
          </h1>
        </div>
      </div>

      {notification && (
        <div className={`toast-alert toast-${notification.type}`}>
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Multi-Tab Navigation */}
      <div className="hub-tabs" role="tablist">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'library' ? 'active' : ''}`}
          onClick={() => setActiveTab('library')}
        >
          📚 {isMarathi ? 'योजना व नियमावली ग्रंथालय (Phase 1)' : 'Official Library (Phase 1)'}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'calculator' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('calculator');
            if (matchedSchemes.length === 0) handleRunSubsidyEstimator();
          }}
        >
          💰 {isMarathi ? 'अनुदान व कर्ज कॅल्क्युलेटर (Phase 2)' : 'Subsidy Estimator (Phase 2)'}
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'milestones' ? 'active' : ''}`}
          onClick={() => setActiveTab('milestones')}
        >
          🚀 {isMarathi ? 'उद्योग सुरू करण्याचे ७ टप्पे (Phase 3)' : 'Launch Checklist (Phase 3)'}
          {launchProgress && <span className="tab-pill">{launchProgress.progressPercent}%</span>}
        </button>
      </div>

      {/* TAB 1: Official Library */}
      {activeTab === 'library' && (
        <div className="library-view">
          <div className="filter-card">
            <div className="search-bar-row">
              <input
                type="text"
                placeholder={isMarathi ? 'योजना, परवाना किंवा प्रकल्प अहवाल शोधा...' : 'Search scheme, compliance, or DPR template...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="filter-select"
              >
                <option value="all">{isMarathi ? 'सर्व विभाग (All Categories)' : 'All Categories'}</option>
                {Object.values(RESOURCE_HUB_CATEGORIES).map((cat) => (
                  <option key={cat} value={cat}>{getCategoryTitle(cat)}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <AppIcon name="sync" size={24} className="spin" />
              <p>{isMarathi ? 'माहिती लोड होत आहे...' : 'Loading official resources...'}</p>
            </div>
          ) : resources.length === 0 ? (
            <div className="empty-state">
              <p>{isMarathi ? 'कोणतीही माहिती सापडली नाही.' : 'No resources matched your search.'}</p>
            </div>
          ) : (
            <div className="resources-grid">
              {resources.map((res) => (
                <div key={res.id} className="resource-card">
                  <div className="res-card-header">
                    <span className="res-category-pill">{getCategoryTitle(res.category)}</span>
                    <span className="res-agency-badge">
                      🏛️ {isMarathi ? res.nodalAgency_mr || res.nodalAgency : res.nodalAgency}
                    </span>
                  </div>

                  <h3 className="res-title">{isMarathi ? res.title_mr : res.title}</h3>
                  <p className="res-specs">{isMarathi ? res.shortDescription_mr : res.shortDescription}</p>

                  {/* Highlights / Economics if available */}
                  {res.subsidyPercentage && (
                    <div className="subsidy-highlight-card">
                      <div className="sub-metric">
                        <span className="sub-lbl">{isMarathi ? 'अनुदान प्रमाण' : 'Subsidy Pct'}</span>
                        <span className="sub-val">{res.subsidyPercentage}%</span>
                      </div>
                      <div className="sub-metric">
                        <span className="sub-lbl">{isMarathi ? 'कमाल अनुदान मर्यादा' : 'Max Subsidy'}</span>
                        <span className="sub-val">₹{(res.maxSubsidyAmount / 100000).toFixed(1)} Lakh</span>
                      </div>
                      <div className="sub-metric">
                        <span className="sub-lbl">{isMarathi ? 'स्वतःचे भांडवल' : 'Margin Money'}</span>
                        <span className="sub-val">{res.entrepreneurContributionMinPct}%</span>
                      </div>
                    </div>
                  )}

                  {res.projectCostTotal && (
                    <div className="subsidy-highlight-card">
                      <div className="sub-metric">
                        <span className="sub-lbl">{isMarathi ? 'एकूण प्रकल्प खर्च' : 'Project Cost'}</span>
                        <span className="sub-val">₹{(res.projectCostTotal / 100000).toFixed(1)} Lakh</span>
                      </div>
                      {res.economics?.estimatedMonthlyNetProfit && (
                        <div className="sub-metric">
                          <span className="sub-lbl">{isMarathi ? 'मासिक नफा अंदाज' : 'Est. Monthly Net'}</span>
                          <span className="sub-val highlight">₹{res.economics.estimatedMonthlyNetProfit}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Required Documents / Checklist */}
                  {res.requiredDocuments && res.requiredDocuments.length > 0 && (
                    <div className="doc-checklist-box">
                      <span className="doc-lbl">📋 {isMarathi ? 'आवश्यक कागदपत्रे:' : 'Required Documents:'}</span>
                      <ul className="doc-list">
                        {(isMarathi ? res.requiredDocuments_mr : res.requiredDocuments).slice(0, 4).map((doc, idx) => (
                          <li key={idx}>✓ {doc}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="res-actions">
                    {res.officialPortalUrl && (
                      <a
                        href={res.officialPortalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-external-link"
                      >
                        🌐 {isMarathi ? 'अधिकृत शासकीय पोर्टल' : 'Official Portal'}
                      </a>
                    )}
                    <button
                      type="button"
                      className="btn-apply-check"
                      onClick={() => {
                        setActiveTab('calculator');
                        if (res.title.includes('PMFME')) setBusinessCategory('Food Processing');
                        handleRunSubsidyEstimator();
                      }}
                    >
                      💰 {isMarathi ? 'अनुदान पात्रता तपासा' : 'Check Subsidy'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Subsidy Estimator & Scheme Matcher */}
      {activeTab === 'calculator' && (
        <div className="calculator-view">
          <div className="matcher-controls-card">
            <h3 className="matcher-title">
              💰 {isMarathi ? 'शासकीय अनुदान व भांडवल कॅल्क्युलेटर' : 'Government Subsidy & Capital Estimator'}
            </h3>
            <p className="matcher-subtext">
              {isMarathi
                ? 'तुमच्या प्रस्तावित प्रकल्प खर्चावर मिळणारे कमाल अनुदान, स्वतःचे भांडवल व बँक कर्ज त्वरित जाणून घ्या.'
                : 'Calculate applicable capital subsidy, entrepreneur margin money, and net bank loan required.'}
            </p>

            <div className="matcher-form-grid">
              <div className="form-group">
                <label>{isMarathi ? 'प्रस्तावित एकूण प्रकल्प खर्च (₹)' : 'Proposed Investment (₹)'}</label>
                <input
                  type="number"
                  step="50000"
                  min="50000"
                  value={proposedInvestment}
                  onChange={(e) => setProposedInvestment(e.target.value)}
                  className="form-control"
                />
              </div>

              <div className="form-group">
                <label>{isMarathi ? 'उद्योगाचा प्रकार' : 'Enterprise Category'}</label>
                <select
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                  className="form-control"
                >
                  <option value="Food Processing">{isMarathi ? 'अन्न व कृषी प्रक्रिया (Food / Agro)' : 'Food Processing'}</option>
                  <option value="Manufacturing">{isMarathi ? 'उत्पादन उद्योग (Manufacturing)' : 'Manufacturing'}</option>
                  <option value="Service Sector">{isMarathi ? 'सेवा क्षेत्र (Service Sector)' : 'Service Sector'}</option>
                  <option value="Packaging">{isMarathi ? 'पॅकेजिंग व ग्रेडिंग' : 'Packaging'}</option>
                </select>
              </div>

              <div className="form-group">
                <label>{isMarathi ? 'सामाजिक प्रवर्ग (Social Category)' : 'Social Category'}</label>
                <select
                  value={socialCategory}
                  onChange={(e) => setSocialCategory(e.target.value)}
                  className="form-control"
                >
                  <option value="General">{isMarathi ? 'सामान्य (General)' : 'General'}</option>
                  <option value="Women">{isMarathi ? 'महिला उद्योजक (Women)' : 'Women Entrepreneur'}</option>
                  <option value="SC/ST">{isMarathi ? 'अनु. जाती / जमाती (SC/ST)' : 'SC/ST'}</option>
                  <option value="Minority">{isMarathi ? 'अल्पसंख्यांक (Minority)' : 'Minority'}</option>
                </select>
              </div>

              <div className="form-group btn-col">
                <button
                  type="button"
                  className="btn-calculate"
                  onClick={handleRunSubsidyEstimator}
                  disabled={isCalculating}
                >
                  {isCalculating
                    ? (isMarathi ? 'गणना चालू आहे...' : 'Calculating...')
                    : (isMarathi ? '⚡ अनुदान व कर्ज गणना करा' : '⚡ Calculate Subsidy & Margin')}
                </button>
              </div>
            </div>
          </div>

          <div className="matcher-results-section">
            <h4 className="results-heading">
              {isMarathi ? 'पात्र शासकीय योजना व अनुदान विवरण' : 'Eligible Government Schemes & Subsidy Breakdown'}
            </h4>

            {isCalculating ? (
              <div className="loading-state">
                <AppIcon name="sync" size={24} className="spin" />
                <p>{isMarathi ? 'शासकीय योजनांचे निकष तपासत आहे...' : 'Evaluating scheme subsidy formulas...'}</p>
              </div>
            ) : matchedSchemes.length === 0 ? (
              <div className="empty-state">
                <p>{isMarathi ? 'योजनांची माहिती पाहण्यासाठी वरील बटणावर क्लिक करा.' : 'Click Calculate to evaluate eligible schemes.'}</p>
              </div>
            ) : (
              <div className="ranked-sources-list">
                {matchedSchemes.map((res, idx) => (
                  <div key={res.scheme.id} className="source-ranked-card">
                    <div className="source-rank-badge">#{idx + 1}</div>

                    <div className="source-main-info">
                      <div className="source-header-row">
                        <h4 className="source-name">
                          {isMarathi ? res.scheme.title_mr : res.scheme.title}
                        </h4>
                        <span className="source-score-pill">
                          ⭐ {res.score}/100 {isMarathi ? 'पात्रता' : 'Match'}
                        </span>
                      </div>

                      <div className="source-supplier-name">
                        🏛️ {isMarathi ? res.scheme.nodalAgency_mr : res.scheme.nodalAgency}
                      </div>

                      {/* Financial Breakdown Grid */}
                      <div className="route-metrics-bar">
                        <div className="route-metric">
                          <span className="r-label">{isMarathi ? 'प्रकल्प खर्च' : 'Project Cost'}</span>
                          <span className="r-val">₹{res.proposedInvestment.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="route-metric highlight">
                          <span className="r-label">{isMarathi ? `अनुदान (${res.applicableSubsidyPct}%)` : `Govt Subsidy (${res.applicableSubsidyPct}%)`}</span>
                          <span className="r-val">₹{res.estimatedSubsidy.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="route-metric">
                          <span className="r-label">{isMarathi ? `स्वतःचे भांडवल (${res.marginPct}%)` : `Your Margin (${res.marginPct}%)`}</span>
                          <span className="r-val">₹{res.entrepreneurMarginMoney.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="route-metric">
                          <span className="r-label">{isMarathi ? 'अपेक्षित बँक कर्ज' : 'Bank Loan Needed'}</span>
                          <span className="r-val">₹{res.bankLoanRequired.toLocaleString('en-IN')}</span>
                        </div>
                      </div>

                      <div className="moq-alert-banner moq-ok">
                        <span>✅ {isMarathi ? res.explanation_mr : res.explanation_en}</span>
                      </div>
                    </div>

                    <div className="source-actions">
                      {res.scheme.officialPortalUrl && (
                        <a
                          href={res.scheme.officialPortalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-order-now"
                        >
                          🌐 {isMarathi ? 'अर्ज पोर्टल' : 'Apply Online'}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: 7-Step Business Launch Milestone Tracker */}
      {activeTab === 'milestones' && (
        <div className="milestones-view">
          <div className="procurement-header">
            <div>
              <h3 className="procurement-title">
                🚀 {isMarathi ? 'ग्रामीण उद्योग उभारणीचे ७ टप्पे' : '7-Step Rural Business Launch Roadmap'}
              </h3>
              <p className="procurement-sub">
                {isMarathi
                  ? 'संकल्पनेपासून प्रत्यक्ष उत्पादनापर्यंत — प्रत्येक टप्पा तपासा, तुमच्या नोंदी ठेवा आणि प्रगतीचा मागोवा घ्या.'
                  : 'From initial market validation to commercial launch — track your readiness and keep personal notes.'}
              </p>
            </div>
            {launchProgress && (
              <div className="progress-badge-box">
                <span className="prog-percent">{launchProgress.progressPercent}%</span>
                <span className="prog-label">{isMarathi ? 'तयारी पूर्ण' : 'Launch Ready'}</span>
              </div>
            )}
          </div>

          {/* Visual Progress Bar */}
          {launchProgress && (
            <div className="launch-progress-bar-wrap">
              <div
                className="launch-progress-bar-fill"
                style={{ width: `${launchProgress.progressPercent}%` }}
              ></div>
            </div>
          )}

          {launchProgress && (
            <div className="milestones-list">
              {launchProgress.milestones.map((ms) => (
                <div
                  key={ms.id}
                  className={`milestone-card ${ms.isCompleted ? 'milestone-completed' : ''}`}
                >
                  <div className="ms-checkbox-col">
                    <button
                      type="button"
                      className={`btn-toggle-step ${ms.isCompleted ? 'checked' : ''}`}
                      onClick={() => handleToggleStep(ms.id, ms.isCompleted)}
                      title={isMarathi ? 'टप्पा पूर्ण/अपूर्ण करा' : 'Toggle Milestone'}
                    >
                      {ms.isCompleted ? '✓' : ms.stepNumber}
                    </button>
                  </div>

                  <div className="ms-content-col">
                    <div className="ms-header-row">
                      <span className="ms-step-tag">
                        {isMarathi ? `टप्पा ${ms.stepNumber}` : `Step ${ms.stepNumber}`}
                      </span>
                      <h4 className="ms-title">{isMarathi ? ms.title_mr : ms.title}</h4>
                    </div>

                    <p className="ms-desc">{isMarathi ? ms.description_mr : ms.description}</p>

                    {/* Personal Notes / Action Input */}
                    <div className="ms-notes-section">
                      <input
                        type="text"
                        placeholder={isMarathi ? 'तुमची वैयक्तिक नोंद किंवा स्थिती लिहा...' : 'Add personal note or tracking details...'}
                        value={activeStepNotes[ms.id] || ''}
                        onChange={(e) =>
                          setActiveStepNotes({ ...activeStepNotes, [ms.id]: e.target.value })
                        }
                        className="ms-note-input"
                      />
                      <button
                        type="button"
                        className="btn-save-note"
                        onClick={() => handleSaveStepNote(ms.id)}
                      >
                        💾 {isMarathi ? 'जतन करा' : 'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
