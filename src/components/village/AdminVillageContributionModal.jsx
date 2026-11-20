import React, { useState } from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';
import { villageOpportunityService, INTELLIGENCE_CATEGORIES } from '../../services/village/villageOpportunityService';
import { adminAuthService } from '../../services/auth/adminAuthService';

export function AdminVillageContributionModal({ profile, onClose, onContributionSuccess }) {
  const { t, isMarathi } = useLanguage();
  const currentAdmin = adminAuthService.getCurrentAdminUser();

  const [category, setCategory] = useState(INTELLIGENCE_CATEGORIES.AGRICULTURE);
  const [sourceName, setSourceName] = useState('');
  const [sourceRef, setSourceRef] = useState('');
  const [detailsText, setDetailsText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!sourceName.trim()) {
      setError(isMarathi ? 'कृपया अधिकृत स्रोत / विभाग नाव भरा.' : 'Please provide official source agency.');
      return;
    }

    setSubmitting(true);
    try {
      let parsedData = {};
      try {
        if (detailsText.trim().startsWith('{')) {
          parsedData = JSON.parse(detailsText);
        } else {
          parsedData = { notes: detailsText, contributedByAdmin: true };
        }
      } catch (err) {
        parsedData = { rawText: detailsText, contributedByAdmin: true };
      }

      await villageOpportunityService.submitAdminVillageContribution(
        currentAdmin,
        profile.villageCode,
        category,
        parsedData,
        {
          name: sourceName.trim(),
          ref: sourceRef.trim() || 'Official Administrative Field Audit',
          retrievalDate: new Date().toISOString().split('T')[0]
        }
      );

      setSuccess(t('villageDetector.adminContribution.successMessage'));
      setTimeout(() => {
        if (onContributionSuccess) onContributionSuccess();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Contribution failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card admin-contrib-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <AppIcon name="shield" size={20} color="#2e7d32" />
            <h3>{t('villageDetector.adminContribution.modalTitle')}</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            <AppIcon name="close" size={18} />
          </button>
        </div>

        <p className="admin-modal-notice">
          {t('villageDetector.adminContribution.authorizedNotice')}
        </p>

        {error && <div className="alert-banner alert-danger">{error}</div>}
        {success && <div className="alert-banner alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="admin-contrib-form">
          <div className="form-group">
            <label>{isMarathi ? 'गाव:' : 'Target Village:'}</label>
            <input
              type="text"
              readOnly
              value={`${isMarathi ? (profile.villageName_mr || profile.villageName) : profile.villageName} (LGD: ${profile.villageCode})`}
              className="readonly-input"
            />
          </div>

          <div className="form-group">
            <label>{t('villageDetector.adminContribution.selectCategory')}:</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="form-select"
            >
              <option value={INTELLIGENCE_CATEGORIES.AGRICULTURE}>{isMarathi ? 'कृषी व दुग्धव्यवसाय' : 'Agriculture & Dairy'}</option>
              <option value={INTELLIGENCE_CATEGORIES.RAW_MATERIALS}>{isMarathi ? 'कच्चा माल व नैसर्गिक संसाधने' : 'Raw Materials & Resources'}</option>
              <option value={INTELLIGENCE_CATEGORIES.LOCAL_SKILLS}>{isMarathi ? 'स्थानिक कौशल्ये व कारागीर' : 'Local Skills & Trades'}</option>
              <option value={INTELLIGENCE_CATEGORIES.INFRASTRUCTURE}>{isMarathi ? 'पायाभूत सुविधा व दळणवळण' : 'Infrastructure & Connectivity'}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t('villageDetector.adminContribution.sourceNameLabel')} *:</label>
            <input
              type="text"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder={t('villageDetector.adminContribution.sourcePlaceholder')}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label>{isMarathi ? 'अधिकृत अहवाल / आदेश क्रमांक:' : 'Reference Doc / Survey Order No:'}</label>
            <input
              type="text"
              value={sourceRef}
              onChange={(e) => setSourceRef(e.target.value)}
              placeholder="e.g. TAO/Survey/2024/71"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>{t('villageDetector.adminContribution.detailsLabel')}:</label>
            <textarea
              rows={4}
              value={detailsText}
              onChange={(e) => setDetailsText(e.target.value)}
              placeholder={isMarathi ? 'नोंदी, उत्पादन अंदाज किंवा JSON तपशील टाका...' : 'Enter structured notes or JSON payload...'}
              className="form-textarea"
            />
          </div>

          <div className="modal-actions-bar">
            <button
              type="button"
              className="btn btn-outline"
              onClick={onClose}
              disabled={submitting}
            >
              {t('villageDetector.adminContribution.cancelBtn')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? (isMarathi ? 'जतन करत आहे...' : 'Verifying & Saving...') : t('villageDetector.adminContribution.submitBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminVillageContributionModal;
