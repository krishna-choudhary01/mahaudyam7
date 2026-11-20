import React from 'react';
import { useLanguage } from '../../i18n/index.js';
import { AppIcon } from '../common/Icons.jsx';
import { Button } from '../common/Button.jsx';
import { Card } from '../common/Card.jsx';
import {
  GAP_CLASSIFICATIONS,
  DEMAND_TRENDS,
  CONFIDENCE_LEVEL,
  DATA_COVERAGE_LEVELS
} from '../../services/gap/gapAnalyzerService.js';

export function GapDetailModal({ gap, onClose, onSaveOpportunity, isSaved }) {
  const { t, isMarathi } = useLanguage();
  if (!gap) return null;

  const {
    transparency,
    verifiedSuppliers = [],
    unverifiedSuppliers = [],
    fieldInvestigationQuestions = [],
    fieldInvestigationQuestions_mr = []
  } = gap;

  const questions = isMarathi ? fieldInvestigationQuestions_mr : fieldInvestigationQuestions;

  return (
    <div className="gap-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="gap-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="gap-modal-header">
          <div>
            <div className="modal-badge-row">
              <span className="modal-category-tag">
                {isMarathi ? gap.productOrService_mr : gap.productOrService}
              </span>
              <span className="modal-classification-badge">
                {isMarathi ? gap.classificationLabel_mr : gap.classificationLabel}
              </span>
              {gap.isScoreValid ? (
                <span className="modal-score-badge">
                  {t('gapAnalyzer.scoring.scoreLabel')} <strong>{isMarathi ? gap.gapScoreLabel_mr : gap.gapScoreLabel}</strong>
                </span>
              ) : (
                <span className="modal-score-badge modal-score-badge--na">
                  {t('gapAnalyzer.scoring.insufficientData')}
                </span>
              )}
            </div>

            <h2 className="modal-title">
              {t('gapAnalyzer.modal.title')}
            </h2>
            <span className="modal-subtitle">
              📍 {gap.village}, {gap.taluka}, {gap.district} • {isMarathi ? `अखेरची नोंद: ${new Date(gap.latestReportDate).toLocaleDateString()}` : `Latest citizen report: ${new Date(gap.latestReportDate).toLocaleDateString()}`}
            </span>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="gap-modal-body">
          {/* Section A: Why This Opportunity Was Identified (Explanation) */}
          <div className="modal-explanation-callout">
            <div className="callout-header">
              <span className="callout-icon">💡</span>
              <h3 className="callout-title">{t('gapAnalyzer.card.explanationHeading')}</h3>
            </div>
            <p className="callout-text">
              {isMarathi ? gap.explanation_mr : gap.explanation_en}
            </p>
            <p className="callout-subtext">
              <strong>{isMarathi ? 'प्रणाली वर्गीकरण तर्क:' : 'Classification Logic:'}</strong> {isMarathi ? gap.classificationLogic_mr : gap.classificationLogic_en}
            </p>
          </div>

          {/* Section B: Demand Trend Breakdown (Section 5) */}
          <div className="modal-trend-box">
            <div className="trend-box-header">
              <span className="trend-icon">📈</span>
              <h4 className="trend-box-title">{isMarathi ? 'मागणीचा कल व कालखंड तुलना:' : 'Recent Demand Trend & Comparable Time Windows:'}</h4>
              <span className="trend-badge-large">
                {isMarathi ? gap.trendLabel_mr : gap.trendLabel}
              </span>
            </div>
            <p className="trend-desc">
              {isMarathi ? gap.trendExplanation_mr : gap.trendExplanation_en}
            </p>
          </div>

          {/* Section C: Field Investigation Checklist (Section 8) */}
          <div className="modal-investigation-section">
            <div className="investigation-header">
              <span className="investigation-icon">🔍</span>
              <div>
                <h4 className="investigation-title">{t('gapAnalyzer.modal.investigationTitle')}</h4>
                <p className="investigation-subtitle">{t('gapAnalyzer.modal.investigationSubtitle')}</p>
              </div>
            </div>
            <ul className="investigation-checklist">
              {questions.map((q, idx) => (
                <li key={idx} className="checklist-item">
                  <span className="checklist-check">☐</span>
                  <span className="checklist-text">{q}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section D: Known Suppliers (Verified & Unverified) */}
          <div className="modal-suppliers-section">
            <h4 className="suppliers-section-heading">
              {t('gapAnalyzer.modal.suppliersListTitle')} ({verifiedSuppliers.length} {isMarathi ? 'अधिकृत' : 'Verified'}{unverifiedSuppliers.length > 0 ? `, ${unverifiedSuppliers.length} ${isMarathi ? 'अनधिकृत/स्थानिक' : 'Unverified'}` : ''})
            </h4>

            {verifiedSuppliers.length === 0 && unverifiedSuppliers.length === 0 ? (
              <div className="zero-suppliers-alert">
                <AppIcon name="shield" size={18} color="#b78103" />
                <span>{t('gapAnalyzer.modal.noSuppliersFound')}</span>
              </div>
            ) : (
              <div className="modal-suppliers-cards-list">
                {/* 1. Verified Suppliers */}
                {verifiedSuppliers.map((sup) => (
                  <div key={sup.id} className="mini-supplier-card mini-supplier-card--verified">
                    <div className="mini-sup-header">
                      <div>
                        <span className="sup-badge sup-badge--verified">
                          ✓ {isMarathi ? 'अधिकृत नोंदणीकृत' : 'Verified Registered'}
                        </span>
                        <strong className="mini-sup-name">
                          {isMarathi ? sup.businessName_mr : sup.businessName}
                        </strong>
                      </div>
                      <span className="mini-sup-dist">
                        {sup.isSameVillage ? (isMarathi ? '📍 याच गावात' : '📍 In Village') : `🚗 ${sup.distanceKm} km`}
                      </span>
                    </div>
                    <div className="mini-sup-source">
                      📜 {sup.verificationSource}
                    </div>
                    <div className="mini-sup-products">
                      {isMarathi ? sup.productsSupplied_mr?.join(', ') : sup.productsSupplied?.join(', ')}
                    </div>
                  </div>
                ))}

                {/* 2. Unverified / Community Listings */}
                {unverifiedSuppliers.map((sup) => (
                  <div key={sup.id} className="mini-supplier-card mini-supplier-card--unverified">
                    <div className="mini-sup-header">
                      <div>
                        <span className="sup-badge sup-badge--unverified">
                          ℹ️ {isMarathi ? 'स्थानिक अनोंदणीकृत नोंद' : 'Unverified Local Listing'}
                        </span>
                        <strong className="mini-sup-name">
                          {isMarathi ? sup.businessName_mr : sup.businessName}
                        </strong>
                      </div>
                      <span className="mini-sup-dist">
                        {sup.isSameVillage ? (isMarathi ? '📍 याच गावात' : '📍 In Village') : `🚗 ${sup.distanceKm} km`}
                      </span>
                    </div>
                    <div className="mini-sup-source">
                      ⚠️ {sup.verificationSource}
                    </div>
                    <div className="mini-sup-products">
                      {isMarathi ? sup.productsSupplied_mr?.join(', ') : sup.productsSupplied?.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section E: 5 Pillars of Transparency */}
          <div className="pillars-collapsible-container">
            <h4 className="pillars-section-title">
              ⚖️ {isMarathi ? 'माहिती पारदर्शकता तपशील (५ आधारस्तंभ):' : 'Data Transparency Breakdown (5 Pillars):'}
            </h4>

            {/* Pillar 1: Confirmed Information */}
            <div className="transparency-pillar-box pillar--confirmed">
              <div className="pillar-header">
                <span className="pillar-icon">🏛️</span>
                <h5 className="pillar-title">{t('gapAnalyzer.modal.confirmedSection')}</h5>
              </div>
              <ul className="pillar-list">
                {transparency.confirmedInformation.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Pillar 2: Citizen User Reports */}
            <div className="transparency-pillar-box pillar--demand">
              <div className="pillar-header">
                <span className="pillar-icon">👥</span>
                <h5 className="pillar-title">{t('gapAnalyzer.modal.userReportsSection')}</h5>
              </div>
              <ul className="pillar-list">
                {transparency.userReportedDemand.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
                <li>
                  {isMarathi ? 'मागणीची नोंदणी वारंवारता:' : 'Dominant Reported Frequency:'} <strong>{gap.dominantFrequency || 'Weekly'}</strong>
                </li>
                <li>
                  {isMarathi ? 'पडताळणी स्थिती:' : 'Citizen Report Status:'} <strong>{gap.demandStatus}</strong>
                </li>
              </ul>
            </div>

            {/* Pillar 3: Rule-Based Classification & Logic */}
            <div className="transparency-pillar-box pillar--logic">
              <div className="pillar-header">
                <span className="pillar-icon">⚖️</span>
                <h5 className="pillar-title">{t('gapAnalyzer.modal.estimatesSection')}</h5>
              </div>
              <ul className="pillar-list">
                {transparency.estimatesAndLogic.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Pillar 4: Unknown / Unrecorded Information */}
            <div className="transparency-pillar-box pillar--unknown">
              <div className="pillar-header">
                <span className="pillar-icon">❓</span>
                <h5 className="pillar-title">{t('gapAnalyzer.modal.unknownSection')}</h5>
              </div>
              <ul className="pillar-list">
                {transparency.unknownInformation.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Pillar 5: Crucial Decision Limitations (Mandatory Warning) */}
            <div className="transparency-pillar-box pillar--limitations">
              <div className="pillar-header">
                <span className="pillar-icon">⚠️</span>
                <h5 className="pillar-title">{t('gapAnalyzer.modal.limitationsSection')}</h5>
              </div>
              <p className="limitations-notice-text">
                {transparency.mandatoryLimitations}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="gap-modal-footer">
          <Button
            variant={isSaved ? 'success' : 'outline'}
            onClick={() => onSaveOpportunity(gap.id)}
          >
            {isSaved ? '★ ' + t('gapAnalyzer.card.savedBadge') : '☆ ' + t('gapAnalyzer.card.saveOpportunityBtn')}
          </Button>

          <Button variant="primary" onClick={onClose}>
            {t('gapAnalyzer.modal.closeBtn')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default GapDetailModal;
