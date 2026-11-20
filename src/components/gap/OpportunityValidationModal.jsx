import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/index.js';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { AppIcon } from '../common/Icons.jsx';
import { Button } from '../common/Button.jsx';
import { Card } from '../common/Card.jsx';
import {
  gapValidationService,
  VALIDATION_STAGES,
  DEFAULT_CHECKLIST_TEMPLATE,
  DEFAULT_OBSERVATIONS_TEMPLATE
} from '../../services/gap/gapValidationService.js';

export function OpportunityValidationModal({ userId, gapId, initialData, onClose, onSaved }) {
  const { t, isMarathi } = useLanguage();
  const { isOnline } = useOnlineStatus();

  const [loading, setLoading] = useState(() => !initialData);
  const [activeTab, setActiveTab] = useState('checklist'); // 'checklist' | 'observations' | 'status' | 'notes'
  const [activeCategory, setActiveCategory] = useState('demand'); // 'demand' | 'competition' | 'supply' | 'feasibility'

  // Form State
  const [validationStatus, setValidationStatus] = useState(
    () => initialData?.validationStatus || VALIDATION_STAGES.NEW_OPPORTUNITY
  );
  const [checklist, setChecklist] = useState(
    () => initialData?.checklist || JSON.parse(JSON.stringify(DEFAULT_CHECKLIST_TEMPLATE))
  );
  const [observations, setObservations] = useState(
    () => initialData?.observations || JSON.parse(JSON.stringify(DEFAULT_OBSERVATIONS_TEMPLATE))
  );
  const [personalNotes, setPersonalNotes] = useState(
    () => initialData?.personalNotes || ''
  );
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load existing validation record
  useEffect(() => {
    async function loadRecord() {
      if (!initialData) setLoading(true);
      try {
        const record = await gapValidationService.getValidationRecord(userId, gapId);
        if (record) {
          if (record.validationStatus) setValidationStatus(record.validationStatus);
          if (record.checklist) setChecklist(record.checklist);
          if (record.observations) setObservations(record.observations);
          if (record.personalNotes !== undefined) setPersonalNotes(record.personalNotes);
        } else if (initialData) {
          if (initialData.validationStatus) setValidationStatus(initialData.validationStatus);
          if (initialData.personalNotes) setPersonalNotes(initialData.personalNotes);
        }
      } catch (err) {
        console.warn('Could not load validation record', err);
      } finally {
        setLoading(false);
      }
    }
    loadRecord();
  }, [userId, gapId]);

  const snap = initialData?.gapSnapshot || initialData || {};
  const progress = gapValidationService.calculateChecklistProgress(checklist);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const updated = await gapValidationService.saveOrUpdateValidation(
        userId,
        gapId,
        {
          validationStatus,
          checklist,
          observations,
          personalNotes,
          gapSnapshot: snap
        },
        isOnline
      );
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      if (onSaved) onSaved(updated);
    } catch (err) {
      alert(`Error saving validation record: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Checklist Change Handlers
  const handleCategoryFieldChange = (category, field, value) => {
    setChecklist((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleObservationChange = (field, value) => {
    setObservations((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const getStageLabel = (stage) => {
    switch (stage) {
      case VALIDATION_STAGES.NEW_OPPORTUNITY:
        return isMarathi ? '१. नवी संधी' : '1. New Opportunity';
      case VALIDATION_STAGES.UNDER_INVESTIGATION:
        return isMarathi ? '२. तपास सुरू आहे' : '2. Under Investigation';
      case VALIDATION_STAGES.DEMAND_VERIFIED:
        return isMarathi ? '३. स्थानिक मागणी पडताळली' : '3. Local Demand Verified';
      case VALIDATION_STAGES.COMPETITION_CHECKED:
        return isMarathi ? '४. स्थानिक स्पर्धा तपासली' : '4. Existing Competition Checked';
      case VALIDATION_STAGES.SUPPLIER_CHECKED:
        return isMarathi ? '५. पुरवठादार उपलब्धता तपासली' : '5. Supplier Availability Checked';
      case VALIDATION_STAGES.FEASIBILITY_REVIEWED:
        return isMarathi ? '६. व्यवहार्यता तपासणी पूर्ण' : '6. Feasibility Reviewed';
      case VALIDATION_STAGES.READY_FOR_DECISION:
        return isMarathi ? '७. उद्योजक निर्णयासाठी तयार' : '7. Ready for Entrepreneur Decision';
      case VALIDATION_STAGES.REJECTED_NOT_SUITABLE:
        return isMarathi ? '८. अयोग्य / नाकारलेली संधी' : '8. Rejected / Not Suitable';
      default:
        return stage;
    }
  };

  if (loading) {
    return (
      <div className="gap-modal-backdrop" onClick={onClose}>
        <div className="gap-modal-card validation-modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="gap-loading-box">
            <div className="spinner"></div>
            <p>{isMarathi ? 'माहिती लोड होत आहे...' : 'Loading validation checklist...'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="gap-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="gap-modal-card validation-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="gap-modal-header validation-modal-header">
          <div>
            <div className="modal-badge-row">
              <span className="modal-category-tag">
                {isMarathi ? snap.productOrService_mr || snap.productOrService : snap.productOrService}
              </span>
              <span className={`validation-stage-pill validation-stage-pill--${validationStatus}`}>
                {getStageLabel(validationStatus)}
              </span>
              <span className="validation-progress-pill">
                ✓ {progress.completed}/{progress.total} ({progress.percentage}%)
              </span>
            </div>
            <h2 className="modal-title">
              {isMarathi ? 'संधी पडताळणी व उद्योजक निर्णय कार्यशाळा' : 'Opportunity Validation & Field Investigation'}
            </h2>
            <span className="modal-subtitle">
              📍 {snap.village || 'Village'}, {snap.taluka || ''}, {snap.district || ''}
            </span>
          </div>

          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Modal Progress Bar */}
        <div className="validation-progress-bar-container">
          <div
            className="validation-progress-bar-fill"
            style={{ width: `${progress.percentage}%` }}
          ></div>
        </div>

        {/* Navigation Tabs */}
        <div className="validation-subtabs-nav" role="tablist">
          <button
            type="button"
            className={`subtab-btn ${activeTab === 'checklist' ? 'subtab-btn--active' : ''}`}
            onClick={() => setActiveTab('checklist')}
          >
            📋 {isMarathi ? 'तपासणी सूची (Checklist)' : 'Field Checklist'}
          </button>

          <button
            type="button"
            className={`subtab-btn ${activeTab === 'observations' ? 'subtab-btn--active' : ''}`}
            onClick={() => setActiveTab('observations')}
          >
            📊 {isMarathi ? 'प्रत्यक्ष नोंदी (Evidence)' : 'Field Observations'}
          </button>

          <button
            type="button"
            className={`subtab-btn ${activeTab === 'status' ? 'subtab-btn--active' : ''}`}
            onClick={() => setActiveTab('status')}
          >
            🎯 {isMarathi ? 'संधीची स्थिती (Stage)' : 'Validation Stage'}
          </button>

          <button
            type="button"
            className={`subtab-btn ${activeTab === 'notes' ? 'subtab-btn--active' : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            📝 {isMarathi ? 'माझ्या खाजगी नोंदी' : 'Personal Notes'}
          </button>
        </div>

        {/* Modal Body */}
        <div className="gap-modal-body validation-modal-body">
          {/* TAB 1: FIELD CHECKLIST (4 CATEGORIES) */}
          {activeTab === 'checklist' && (
            <div className="validation-checklist-pane">
              {/* Category Sub-pills */}
              <div className="checklist-category-pills">
                <button
                  type="button"
                  className={`cat-pill ${activeCategory === 'demand' ? 'cat-pill--active' : ''}`}
                  onClick={() => setActiveCategory('demand')}
                >
                  👥 {isMarathi ? '१. ग्राहक मागणी' : '1. Demand Validation'}
                </button>
                <button
                  type="button"
                  className={`cat-pill ${activeCategory === 'competition' ? 'cat-pill--active' : ''}`}
                  onClick={() => setActiveCategory('competition')}
                >
                  🏢 {isMarathi ? '२. स्थानिक स्पर्धा' : '2. Competition'}
                </button>
                <button
                  type="button"
                  className={`cat-pill ${activeCategory === 'supply' ? 'cat-pill--active' : ''}`}
                  onClick={() => setActiveCategory('supply')}
                >
                  🚚 {isMarathi ? '३. पुरवठा व कच्चा माल' : '3. Supply Chain'}
                </button>
                <button
                  type="button"
                  className={`cat-pill ${activeCategory === 'feasibility' ? 'cat-pill--active' : ''}`}
                  onClick={() => setActiveCategory('feasibility')}
                >
                  ⚖️ {isMarathi ? '४. व्यावसायिक व्यवहार्यता' : '4. Feasibility'}
                </button>
              </div>

              {/* Category 1: Demand Validation */}
              {activeCategory === 'demand' && (
                <div className="checklist-category-form">
                  <div className="form-question-card">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={checklist.demand.spokenToCustomers}
                        onChange={(e) => handleCategoryFieldChange('demand', 'spokenToCustomers', e.target.checked)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="question-text">
                        {isMarathi ? 'तुम्ही गावातील प्रत्यक्ष संभाव्य ग्राहकांशी बोललात का?' : 'Have you spoken to potential customers in this village?'}
                      </span>
                    </label>
                  </div>

                  <div className="form-question-card">
                    <label className="input-field-label">
                      {isMarathi ? 'गावात अंदाजे किती लोकांना या वस्तू/सेवेची प्रत्यक्ष गरज आहे?' : 'How many people in the village actually need this product/service?'}
                    </label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder={isMarathi ? 'उदा. ५०-६० कुटुंबे / १० दुग्ध उत्पादक' : 'e.g., 40-50 households or 15 farmers'}
                      value={checklist.demand.estimatedNeedCount}
                      onChange={(e) => handleCategoryFieldChange('demand', 'estimatedNeedCount', e.target.value)}
                    />
                  </div>

                  <div className="form-question-card">
                    <label className="input-field-label">
                      {isMarathi ? 'त्यांना ही वस्तू/सेवा किती वेळा लागते?' : 'How frequently do they need it?'}
                    </label>
                    <select
                      className="filter-select"
                      value={checklist.demand.frequencyConfirmed}
                      onChange={(e) => handleCategoryFieldChange('demand', 'frequencyConfirmed', e.target.value)}
                    >
                      <option value="">{isMarathi ? '-- निवडा --' : '-- Select Frequency --'}</option>
                      <option value="daily">{isMarathi ? 'दररोज (Daily)' : 'Daily'}</option>
                      <option value="weekly">{isMarathi ? 'आठवड्यातून एकदा (Weekly)' : 'Weekly'}</option>
                      <option value="monthly">{isMarathi ? 'महिन्यातून एकदा (Monthly)' : 'Monthly'}</option>
                      <option value="seasonal">{isMarathi ? 'हंगामी / गरजेनुसार (Seasonal / As needed)' : 'Seasonal / As needed'}</option>
                    </select>
                  </div>

                  <div className="form-question-card">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={checklist.demand.willingToPayConfirmed}
                        onChange={(e) => handleCategoryFieldChange('demand', 'willingToPayConfirmed', e.target.checked)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="question-text">
                        {isMarathi ? 'ग्रामस्थ रास्त दर देऊन ही वस्तू/सेवा विकत घेण्यास तयार आहेत का?' : 'Are customers willing to pay a sustainable price for it?'}
                      </span>
                    </label>
                  </div>

                  <div className="form-question-card">
                    <label className="input-field-label">
                      {isMarathi ? 'हंगामी स्वरूप (उन्हाळा/पावसाळा/सण):' : 'Is demand seasonal or consistent year-round?'}
                    </label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder={isMarathi ? 'उदा. खरीप हंगामात जास्त मागणी, उन्हाळ्यात कमी' : 'e.g., Peaks during harvest season'}
                      value={checklist.demand.seasonalDemand}
                      onChange={(e) => handleCategoryFieldChange('demand', 'seasonalDemand', e.target.value)}
                    />
                  </div>

                  <div className="form-question-card">
                    <label className="input-field-label">
                      {isMarathi ? 'ग्राहक अभिप्रायाबाबत तुमच्या नोंदी:' : 'Specific notes on customer conversations:'}
                    </label>
                    <textarea
                      rows="2"
                      className="text-area-input"
                      placeholder={isMarathi ? 'गावातील चर्चा व महत्त्वाच्या सूचना येथे लिहा...' : 'Record specific customer feedback here...'}
                      value={checklist.demand.notes}
                      onChange={(e) => handleCategoryFieldChange('demand', 'notes', e.target.value)}
                    ></textarea>
                  </div>
                </div>
              )}

              {/* Category 2: Competition Validation */}
              {activeCategory === 'competition' && (
                <div className="checklist-category-form">
                  <div className="form-question-card">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={checklist.competition.unlistedBusinessesFound}
                        onChange={(e) => handleCategoryFieldChange('competition', 'unlistedBusinessesFound', e.target.checked)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="question-text">
                        {isMarathi ? 'गावात अनोंदणीकृत/घरगुती व्यावसायिक आधीच काम करत आहेत का?' : 'Are there unlisted informal businesses already operating locally?'}
                      </span>
                    </label>
                  </div>

                  <div className="form-question-card">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={checklist.competition.nearbyVillagesServed}
                        onChange={(e) => handleCategoryFieldChange('competition', 'nearbyVillagesServed', e.target.checked)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="question-text">
                        {isMarathi ? 'शेजारच्या गावातून किंवा तालुक्याच्या शहरातून ग्रामस्थ ही सेवा मिळवतात का?' : 'Do villagers easily travel to nearby towns for this?'}
                      </span>
                    </label>
                  </div>

                  <div className="form-question-card">
                    <label className="input-field-label">
                      {isMarathi ? 'सध्या ग्रामस्थ कोणता पर्याय वापरतात?' : 'What alternatives do customers currently use?'}
                    </label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder={isMarathi ? 'उदा. १० किमी अंतरावरील सिन्नर आठवडे बाजार' : 'e.g., Weekly haat in nearby town'}
                      value={checklist.competition.customerAlternatives}
                      onChange={(e) => handleCategoryFieldChange('competition', 'customerAlternatives', e.target.value)}
                    />
                  </div>

                  <div className="form-question-card">
                    <label className="input-field-label">
                      {isMarathi ? 'सध्याच्या पुरवठ्यात काय उणीव आहे? (उदा. महाग, निकृष्ट दर्जा, वेळेवर न मिळणे)' : 'What makes current supply insufficient or inconvenient?'}
                    </label>
                    <input
                      type="text"
                      className="text-input"
                      placeholder={isMarathi ? 'उदा. तालुक्यात जाण्याचा वेळ व प्रवास खर्च वाया जातो' : 'e.g., High travel cost and repair delays'}
                      value={checklist.competition.insufficiencyReason}
                      onChange={(e) => handleCategoryFieldChange('competition', 'insufficiencyReason', e.target.value)}
                    />
                  </div>

                  <div className="form-question-card">
                    <label className="input-field-label">
                      {isMarathi ? 'स्थानिक स्पर्धेबाबत तुमच्या नोंदी:' : 'Notes on local competition and pricing:'}
                    </label>
                    <textarea
                      rows="2"
                      className="text-area-input"
                      value={checklist.competition.notes}
                      onChange={(e) => handleCategoryFieldChange('competition', 'notes', e.target.value)}
                    ></textarea>
                  </div>
                </div>
              )}

              {/* Category 3: Supply Validation */}
              {activeCategory === 'supply' && (
                <div className="checklist-category-form">
                  <div className="form-question-card">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={checklist.supply.rawMaterialsAccessible}
                        onChange={(e) => handleCategoryFieldChange('supply', 'rawMaterialsAccessible', e.target.checked)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="question-text">
                        {isMarathi ? 'आवश्यक कच्चा माल नियमित व रास्त दरात मिळणे शक्य आहे का?' : 'Can you obtain the necessary raw materials consistently?'}
                      </span>
                    </label>
                  </div>

                  <div className="form-question-card">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={checklist.supply.suppliersReachable}
                        onChange={(e) => handleCategoryFieldChange('supply', 'suppliersReachable', e.target.checked)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="question-text">
                        {isMarathi ? 'अधिकृत ठोक पुरवठादार किंवा वितरक सहज संपर्क कक्षेत आहेत का?' : 'Are wholesale suppliers accessible and reliable?'}
                      </span>
                    </label>
                  </div>

                  <div className="form-question-card">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={checklist.supply.transportPractical}
                        onChange={(e) => handleCategoryFieldChange('supply', 'transportPractical', e.target.checked)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="question-text">
                        {isMarathi ? 'गावापर्यंत मालवाहतूक (टेम्पो/पिकअप/बस) परवडणारी आहे का?' : 'Is transport practical and affordable for this village?'}
                      </span>
                    </label>
                  </div>

                  <div className="form-question-card">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={checklist.supply.equipmentAvailable}
                        onChange={(e) => handleCategoryFieldChange('supply', 'equipmentAvailable', e.target.checked)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="question-text">
                        {isMarathi ? 'व्यवसायासाठी लागणारी यंत्रसामग्री व अवजारे सहज उपलब्ध आहेत का?' : 'Is required equipment or machinery readily available?'}
                      </span>
                    </label>
                  </div>

                  <div className="form-question-card">
                    <label className="input-field-label">
                      {isMarathi ? 'पुरवठा साखळीबाबत तुमच्या नोंदी:' : 'Notes on supplier accessibility and minimum order quantities:'}
                    </label>
                    <textarea
                      rows="2"
                      className="text-area-input"
                      value={checklist.supply.notes}
                      onChange={(e) => handleCategoryFieldChange('supply', 'notes', e.target.value)}
                    ></textarea>
                  </div>
                </div>
              )}

              {/* Category 4: Feasibility Validation */}
              {activeCategory === 'feasibility' && (
                <div className="checklist-category-form">
                  <div className="form-question-card">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={checklist.feasibility.requiredSkillsPresent}
                        onChange={(e) => handleCategoryFieldChange('feasibility', 'requiredSkillsPresent', e.target.checked)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="question-text">
                        {isMarathi ? 'तुमच्याकडे किंवा तुमच्या सहकाऱ्यांकडे आवश्यक तांत्रिक/व्यावसायिक कौशल्य आहे का?' : 'Do you have the required technical and operational skills?'}
                      </span>
                    </label>
                  </div>

                  <div className="form-question-card">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={checklist.feasibility.investmentAffordable}
                        onChange={(e) => handleCategoryFieldChange('feasibility', 'investmentAffordable', e.target.checked)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="question-text">
                        {isMarathi ? 'प्रारंभिक भांडवली गुंतवणूक तुमच्या बजेटमध्ये किंवा मुद्रालोनात बसते का?' : 'Is estimated investment affordable within your available capital/loan?'}
                      </span>
                    </label>
                  </div>

                  <div className="form-question-card">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={checklist.feasibility.licensesIdentified}
                        onChange={(e) => handleCategoryFieldChange('feasibility', 'licensesIdentified', e.target.checked)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="question-text">
                        {isMarathi ? 'ग्रामपंचायत एनओसी, उद्यम नोंदणी, किंवा एफएसएसएआय परवान्यांची माहिती घेतली का?' : 'Have you identified required local licenses (Panchayat NOC, Udyam)?'}
                      </span>
                    </label>
                  </div>

                  <div className="form-question-card">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={checklist.feasibility.infrastructureReady}
                        onChange={(e) => handleCategoryFieldChange('feasibility', 'infrastructureReady', e.target.checked)}
                      />
                      <span className="checkbox-custom"></span>
                      <span className="question-text">
                        {isMarathi ? 'गावात वीज (थ्री-फेज), पाणी, साठवणूक जागा व इंटरनेटची सोय आहे का?' : 'Are electricity, storage, and premises requirements met?'}
                      </span>
                    </label>
                  </div>

                  <div className="form-question-card">
                    <label className="input-field-label">
                      {isMarathi ? 'व्यवहार्यता व परवान्यांबाबत तुमच्या नोंदी:' : 'Notes on permits, capital, and setup timeline:'}
                    </label>
                    <textarea
                      rows="2"
                      className="text-area-input"
                      value={checklist.feasibility.notes}
                      onChange={(e) => handleCategoryFieldChange('feasibility', 'notes', e.target.value)}
                    ></textarea>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FIELD OBSERVATIONS (Section 4) */}
          {activeTab === 'observations' && (
            <div className="validation-observations-pane">
              <div className="observations-disclaimer-card">
                <AppIcon name="shield" size={18} color="#b78103" />
                <p>
                  {isMarathi
                    ? 'सूचना: तुम्ही नोंदवलेली प्रत्यक्ष माहिती तुमच्या खाजगी खात्यात सुरक्षित साठवली जाते. ही माहिती इतरांच्या अधिकृत सिस्टीम स्कोअरमध्ये परस्पर मिसळली जात नाही.'
                    : 'Notice: Your field observations remain strictly private to your account. They do not alter official registry records or other entrepreneurs’ analyses.'}
                </p>
              </div>

              <div className="observations-grid">
                <div className="form-group">
                  <label className="input-field-label">
                    {isMarathi ? 'प्रत्यक्ष संपर्क केलेले ग्राहक (संख्या):' : 'Customers Personally Contacted (Count):'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="text-input"
                    value={observations.customersContacted || ''}
                    onChange={(e) => handleObservationChange('customersContacted', Number(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label className="input-field-label">
                    {isMarathi ? 'वस्तू/सेवेत रस दाखवलेले ग्राहक (संख्या):' : 'Customers Interested (Count):'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="text-input"
                    value={observations.customersInterested || ''}
                    onChange={(e) => handleObservationChange('customersInterested', Number(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label className="input-field-label">
                    {isMarathi ? 'निश्चित पैसे देऊन खरेदीस तयार (संख्या):' : 'Customers Willing to Pay (Count):'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="text-input"
                    value={observations.customersWillingToPay || ''}
                    onChange={(e) => handleObservationChange('customersWillingToPay', Number(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label className="input-field-label">
                    {isMarathi ? 'तपासणीची तारीख (Validation Date):' : 'Date of Field Validation:'}
                  </label>
                  <input
                    type="date"
                    className="text-input"
                    value={observations.validationDate || ''}
                    onChange={(e) => handleObservationChange('validationDate', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="input-field-label">
                  {isMarathi ? 'स्थानिक पातळीवर आढळलेले अनोंदणीकृत व्यावसायिक (नावे/पत्ता):' : 'Existing Unlisted Businesses Discovered Locally:'}
                </label>
                <textarea
                  rows="2"
                  className="text-area-input"
                  placeholder={isMarathi ? 'उदा. विठ्ठल मंदिरामागे श्री. साळुंखे यांचे लहान वर्कशॉप' : 'e.g., Local informal repair booth near temple'}
                  value={observations.discoveredLocalBusinesses}
                  onChange={(e) => handleObservationChange('discoveredLocalBusinesses', e.target.value)}
                ></textarea>
              </div>

              <div className="form-group">
                <label className="input-field-label">
                  {isMarathi ? 'स्थानिक पुरवठादार माहिती (नाव/मोबाईल/दर):' : 'Confirmed Local Supplier Information:'}
                </label>
                <textarea
                  rows="2"
                  className="text-area-input"
                  placeholder={isMarathi ? 'उदा. सिन्नर एमआयडीसीतील महालक्ष्मी ॲग्रो - दर आठवड्याला डिलिव्हरी' : 'e.g., Sinnar MIDC distributor confirmed weekly tempo delivery'}
                  value={observations.confirmedLocalSuppliers}
                  onChange={(e) => handleObservationChange('confirmedLocalSuppliers', e.target.value)}
                ></textarea>
              </div>

              <div className="form-group">
                <label className="input-field-label">
                  {isMarathi ? 'इतर महत्त्वाचे प्रत्यक्ष निरीक्षण:' : 'General Field Observations & Notes:'}
                </label>
                <textarea
                  rows="2"
                  className="text-area-input"
                  value={observations.generalNotes}
                  onChange={(e) => handleObservationChange('generalNotes', e.target.value)}
                ></textarea>
              </div>
            </div>
          )}

          {/* TAB 3: VALIDATION STAGE WORKFLOW (Section 2) */}
          {activeTab === 'status' && (
            <div className="validation-stage-selector-pane">
              <h4 className="stage-selector-heading">
                {isMarathi ? 'या संधीचा सद्य तपासणी टप्पा निवडा:' : 'Select Current Opportunity Validation Stage:'}
              </h4>
              <p className="stage-selector-sub">
                {isMarathi
                  ? 'टीप: प्रणालीतील संभाव्य तुटवडा आपोआप व्यवसाय संधी बनत नाही. प्रत्यक्ष तपासणीनुसार योग्य टप्पा निवडा.'
                  : 'Principle: A detected gap never automatically becomes a validated business opportunity. Update your stage based on local evidence.'}
              </p>

              <div className="stages-radio-list">
                {Object.values(VALIDATION_STAGES).map((stg) => (
                  <label
                    key={stg}
                    className={`stage-radio-card ${validationStatus === stg ? 'stage-radio-card--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="validationStage"
                      value={stg}
                      checked={validationStatus === stg}
                      onChange={() => setValidationStatus(stg)}
                    />
                    <div className="stage-radio-content">
                      <strong className="stage-title">{getStageLabel(stg)}</strong>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PERSONAL NOTES */}
          {activeTab === 'notes' && (
            <div className="validation-notes-pane">
              <label className="input-field-label">
                {isMarathi ? 'तुमच्या वैयक्तिक योजना, संपर्क व विचार:' : 'Your Private Business Notes & Planning:'}
              </label>
              <textarea
                rows="8"
                className="text-area-input text-area-large"
                placeholder={isMarathi ? 'या संधीबाबत तुमची वैयक्तिक मते, पुढची पावले व संदर्भ येथे जतन करा...' : 'Record your private analysis, contacts, and next steps...'}
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
              ></textarea>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="gap-modal-footer validation-modal-footer">
          <div className="footer-left-status">
            {saveSuccess && (
              <span className="save-success-tag">
                ✓ {isMarathi ? 'यशस्वीरित्या जतन झाले!' : 'Successfully Saved Locally!'}
              </span>
            )}
            {!isOnline && (
              <span className="offline-pill-tag">
                ⚠️ {isMarathi ? 'ऑफलाइन साठवले (पुढील सिंकमध्ये अपलोड होईल)' : 'Offline (Queued for sync)'}
              </span>
            )}
          </div>

          <div className="footer-right-buttons">
            <Button variant="secondary" onClick={onClose}>
              {isMarathi ? 'रद्द करा' : 'Cancel'}
            </Button>
            <Button variant="primary" onClick={handleSaveAll} disabled={saving}>
              {saving ? (isMarathi ? 'जतन होत आहे...' : 'Saving...') : (isMarathi ? 'जतन करा (Save Updates)' : 'Save Validation Updates')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OpportunityValidationModal;
