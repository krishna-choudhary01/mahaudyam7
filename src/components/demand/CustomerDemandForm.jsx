import React, { useState, useEffect } from 'react';
import { demandSignalService } from '../../services/demand/demandSignalService.js';
import { locationService } from '../../services/location/locationService.js';
import { DEMAND_CATEGORIES, AVAILABILITY_OPTIONS, FREQUENCY_OPTIONS } from '../../data/demand/initialDemandSignals.js';
import { useLanguage } from '../../i18n/index.js';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { AppIcon } from '../common/Icons.jsx';
import { Button } from '../common/Button.jsx';
import { Card } from '../common/Card.jsx';

export function CustomerDemandForm({ onDemandSubmitted, defaultDistrictCode, defaultTalukaCode }) {
  const { t, isMarathi } = useLanguage();
  const { isOnline } = useOnlineStatus();

  // Form State
  const [productOrService, setProductOrService] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('repair_maintenance');
  const [districtCode, setDistrictCode] = useState(defaultDistrictCode || 490); // Default Nashik
  const [talukaCode, setTalukaCode] = useState(defaultTalukaCode || 4154); // Default Sinnar
  const [villageCode, setVillageCode] = useState('');
  const [villageName, setVillageName] = useState('');
  const [availability, setAvailability] = useState('not_available');
  const [frequency, setFrequency] = useState('weekly');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Location Selector Lists
  const [districts, setDistricts] = useState([]);
  const [talukas, setTalukas] = useState([]);
  const [villages, setVillages] = useState([]);
  const [villageLoading, setVillageLoading] = useState(false);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [submissionSuccess, setSubmissionSuccess] = useState(null);

  // Initialize districts and talukas
  useEffect(() => {
    const distList = locationService.getAllDistricts();
    setDistricts(distList);

    if (districtCode) {
      const talList = locationService.getTalukasForDistrict(districtCode);
      setTalukas(talList);
    }
  }, []);

  // Update talukas when district changes
  const handleDistrictChange = (e) => {
    const dCode = Number(e.target.value);
    setDistrictCode(dCode);
    setTalukaCode('');
    setVillageCode('');
    setVillageName('');
    setVillages([]);

    if (dCode) {
      const newTalukas = locationService.getTalukasForDistrict(dCode);
      setTalukas(newTalukas);
    } else {
      setTalukas([]);
    }
  };

  // Update villages when taluka changes
  const handleTalukaChange = async (e) => {
    const tCode = Number(e.target.value);
    setTalukaCode(tCode);
    setVillageCode('');
    setVillageName('');

    if (districtCode && tCode) {
      setVillageLoading(true);
      try {
        const res = await locationService.getVillagesForTaluka(districtCode, tCode);
        const list = Array.isArray(res) ? res : (res?.villages || []);
        setVillages(list);
      } catch (err) {
        console.warn('Could not load villages for taluka', err);
        setVillages([]);
      } finally {
        setVillageLoading(false);
      }
    } else {
      setVillages([]);
    }
  };

  // Load initial villages on mount for default taluka
  useEffect(() => {
    if (districtCode && talukaCode) {
      locationService.getVillagesForTaluka(districtCode, talukaCode).then((res) => {
        const list = Array.isArray(res) ? res : (res?.villages || []);
        setVillages(list);
      });
    }
  }, []);

  const handleVillageChange = (e) => {
    const vCode = e.target.value ? Number(e.target.value) : '';
    setVillageCode(vCode);
    const found = villages.find((v) => (v.code || v.c) === vCode);
    if (found) {
      setVillageName(isMarathi ? (found.name_mr || found.m) : (found.name_en || found.n));
    } else {
      setVillageName('');
    }
  };

  const handleQuickSuggestionClick = (suggestion) => {
    // Strip parenthetical Marathi/English description for concise entry
    const clean = suggestion.split('(')[0].trim();
    setProductOrService(clean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const selectedDistObj = locationService.getDistrictByCode(districtCode);
      const selectedTalObj = locationService.getTalukaByCode(talukaCode);

      const payload = {
        productOrService,
        category: selectedCategory,
        district: selectedDistObj?.name || 'Maharashtra',
        districtCode,
        taluka: selectedTalObj?.name || 'Taluka',
        talukaCode,
        village: villageName || (villages[0] ? (isMarathi ? villages[0].m : villages[0].n) : 'Grampanchayat Area'),
        villageCode: villageCode || (villages[0] ? (villages[0].c || villages[0].code) : null),
        availability,
        frequency,
        additionalNotes
      };

      const result = await demandSignalService.submitCustomerReport(payload, isOnline);
      setSubmissionSuccess(result);
      if (onDemandSubmitted) {
        onDemandSubmitted(result);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit demand report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setProductOrService('');
    setAdditionalNotes('');
    setSubmissionSuccess(null);
    setErrorMessage('');
  };

  const currentCategoryObj = DEMAND_CATEGORIES.find((c) => c.id === selectedCategory) || DEMAND_CATEGORIES[0];

  return (
    <div className="customer-demand-form-container">
      {/* Hero Banner for Village Residents */}
      <div className="demand-hero-card">
        <div className="demand-hero-badge">
          <span className="badge-pulse"></span>
          <span>{t('demand.hero.badge')}</span>
        </div>
        <h2 className="demand-hero-title">{t('demand.hero.title')}</h2>
        <p className="demand-hero-subtitle">{t('demand.hero.subtitle')}</p>
        <div className="demand-hero-assurance">
          <span>{t('demand.hero.anonymousNotice')}</span>
        </div>
      </div>

      {submissionSuccess ? (
        /* Success Confirmation Card */
        <Card className="demand-success-card">
          <div className="success-icon-wrap">
            <AppIcon name="check" size={32} color="#2e7d32" />
          </div>
          <h3 className="success-title">{t('demand.form.successTitle')}</h3>
          <p className="success-message">{t('demand.form.successMessage')}</p>
          <div className="success-sync-pill">
            <span className={`sync-dot ${submissionSuccess.syncStatus === 'synced' ? 'sync-dot--online' : 'sync-dot--offline'}`}></span>
            <span>
              {submissionSuccess.syncStatus === 'synced'
                ? (isMarathi ? 'थेट सर्व्हरवर नोंद झाली' : 'Submitted & Synced to Platform')
                : t('demand.form.offlineNotice')}
            </span>
          </div>

          <div className="success-actions">
            <Button variant="primary" onClick={handleResetForm}>
              {t('demand.form.submitAnotherBtn')}
            </Button>
          </div>
        </Card>
      ) : (
        /* Active Submission Form */
        <form onSubmit={handleSubmit} className="demand-form">
          {errorMessage && (
            <div className="demand-alert-banner demand-alert-banner--error" role="alert">
              <AppIcon name="warning" size={18} color="#c62828" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. What do you need? */}
          <div className="form-group-card">
            <label htmlFor="product-service-input" className="form-label form-label--required">
              <strong>1. {t('demand.form.needQuestion')}</strong>
            </label>
            <input
              id="product-service-input"
              type="text"
              className="demand-text-input"
              placeholder={t('demand.form.needPlaceholder')}
              value={productOrService}
              onChange={(e) => setProductOrService(e.target.value)}
              required
            />

            {/* Quick 1-Tap Need Suggestions */}
            {currentCategoryObj?.popularNeeds && (
              <div className="quick-suggestions-wrap">
                <span className="quick-suggestions-label">{t('demand.form.popularSuggestions')}</span>
                <div className="suggestions-chips-grid">
                  {currentCategoryObj.popularNeeds.map((need, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="suggestion-chip-btn"
                      onClick={() => handleQuickSuggestionClick(need)}
                    >
                      + {need}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Select Category */}
          <div className="form-group-card">
            <label className="form-label form-label--required">
              <strong>2. {t('demand.form.categoryLabel')}</strong>
            </label>
            <div className="categories-selection-grid">
              {DEMAND_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`category-select-card ${isSelected ? 'category-select-card--selected' : ''}`}
                    onClick={() => setSelectedCategory(cat.id)}
                    aria-pressed={isSelected}
                  >
                    <span className="category-select-icon">{cat.icon}</span>
                    <span className="category-select-name">
                      {isMarathi ? cat.name_mr : cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3, 4, 5. Location Hierarchy (District -> Taluka -> Village) */}
          <div className="form-group-card">
            <div className="location-section-header">
              <AppIcon name="location" size={18} color="#2e7d32" />
              <strong>{isMarathi ? 'गावाचे स्थान निवडा:' : '3. Village Location Selection:'}</strong>
            </div>

            <div className="location-dropdowns-row">
              {/* District */}
              <div className="form-col">
                <label htmlFor="demand-dist-select" className="sub-label">
                  {t('demand.form.districtLabel')}
                </label>
                <select
                  id="demand-dist-select"
                  className="demand-select"
                  value={districtCode}
                  onChange={handleDistrictChange}
                  required
                >
                  <option value="">{isMarathi ? '-- जिल्हा निवडा --' : '-- Select District --'}</option>
                  {districts.map((d) => (
                    <option key={d.code} value={d.code}>
                      {isMarathi ? d.marathiName : d.name} (LGD {d.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Taluka */}
              <div className="form-col">
                <label htmlFor="demand-taluka-select" className="sub-label">
                  {t('demand.form.talukaLabel')}
                </label>
                <select
                  id="demand-taluka-select"
                  className="demand-select"
                  value={talukaCode}
                  onChange={handleTalukaChange}
                  disabled={!districtCode}
                  required
                >
                  <option value="">{isMarathi ? '-- तालुका निवडा --' : '-- Select Taluka --'}</option>
                  {talukas.map((t) => (
                    <option key={t.code} value={t.code}>
                      {isMarathi ? t.marathiName : t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Village */}
              <div className="form-col">
                <label htmlFor="demand-village-select" className="sub-label">
                  {t('demand.form.villageLabel')}
                  {villageLoading && <span className="mini-spinner"> ⏳</span>}
                </label>
                <select
                  id="demand-village-select"
                  className="demand-select"
                  value={villageCode}
                  onChange={handleVillageChange}
                  disabled={!talukaCode || villageLoading}
                  required
                >
                  <option value="">
                    {villageLoading
                      ? (isMarathi ? 'गावे लोड होत आहेत...' : 'Loading villages...')
                      : (isMarathi ? '-- महसूल गाव निवडा --' : '-- Select Revenue Village --')}
                  </option>
                  {(Array.isArray(villages) ? villages : []).map((v) => {
                    const c = v.code || v.c;
                    const name = isMarathi ? (v.name_mr || v.m) : (v.name_en || v.n);
                    return (
                      <option key={c} value={c}>
                        {name} [LGD: {c}]
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          {/* 6. Current Availability */}
          <div className="form-group-card">
            <label className="form-label form-label--required">
              <strong>4. {t('demand.form.availabilityLabel')}</strong>
            </label>
            <div className="radio-cards-grid">
              {AVAILABILITY_OPTIONS.map((opt) => {
                const isSelected = availability === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`radio-card ${isSelected ? 'radio-card--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="availability"
                      value={opt.value}
                      checked={isSelected}
                      onChange={() => setAvailability(opt.value)}
                      className="radio-native-input"
                    />
                    <div className="radio-card-content">
                      <span className="radio-indicator"></span>
                      <span className="radio-card-text">
                        {isMarathi ? opt.label_mr : opt.label}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 7. Frequency of Need */}
          <div className="form-group-card">
            <label className="form-label form-label--required">
              <strong>5. {t('demand.form.frequencyLabel')}</strong>
            </label>
            <div className="radio-cards-grid radio-cards-grid--compact">
              {FREQUENCY_OPTIONS.map((freq) => {
                const isSelected = frequency === freq.value;
                return (
                  <label
                    key={freq.value}
                    className={`radio-card ${isSelected ? 'radio-card--selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="frequency"
                      value={freq.value}
                      checked={isSelected}
                      onChange={() => setFrequency(freq.value)}
                      className="radio-native-input"
                    />
                    <div className="radio-card-content">
                      <span className="radio-indicator"></span>
                      <span className="radio-card-text">
                        {isMarathi ? freq.label_mr : freq.label}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 8. Additional Explanation (Optional) */}
          <div className="form-group-card">
            <div className="label-with-counter">
              <label htmlFor="additional-notes" className="form-label">
                <strong>6. {t('demand.form.notesLabel')}</strong>
              </label>
              <span className="char-count">{additionalNotes.length}/500</span>
            </div>
            <textarea
              id="additional-notes"
              className="demand-textarea"
              placeholder={t('demand.form.notesPlaceholder')}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value.slice(0, 500))}
              rows={3}
            />
          </div>

          {/* Submit Action Bar */}
          <div className="form-submit-bar">
            <Button
              type="submit"
              variant="primary"
              size="large"
              disabled={isSubmitting || !productOrService.trim()}
              className="demand-submit-btn"
            >
              {isSubmitting ? t('demand.form.submitting') : t('demand.form.submitBtn')}
            </Button>
            <span className="submit-privacy-hint">
              🔒 {isMarathi ? 'कोणतीही वैयक्तिक माहिती विचारली जात नाही' : 'Anonymous submission • No personal info required'}
            </span>
          </div>
        </form>
      )}
    </div>
  );
}
