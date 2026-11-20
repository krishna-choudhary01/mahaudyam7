import React from 'react';
import { useLanguage } from '../../i18n/index.js';
import { AppIcon } from '../common/Icons.jsx';
import { Button } from '../common/Button.jsx';
import { Card } from '../common/Card.jsx';
import { VALIDATION_STAGES } from '../../services/gap/gapValidationService.js';

export function OpportunityComparisonModal({ comparisonItems = [], onClose, onOpenValidationModal }) {
  const { t, isMarathi } = useLanguage();

  if (!comparisonItems || comparisonItems.length === 0) return null;

  const getStageLabel = (stage) => {
    switch (stage) {
      case VALIDATION_STAGES.NEW_OPPORTUNITY:
        return isMarathi ? 'नवी संधी' : 'New Opportunity';
      case VALIDATION_STAGES.UNDER_INVESTIGATION:
        return isMarathi ? 'तपास सुरू' : 'Under Investigation';
      case VALIDATION_STAGES.DEMAND_VERIFIED:
        return isMarathi ? 'मागणी पडताळली' : 'Demand Verified';
      case VALIDATION_STAGES.COMPETITION_CHECKED:
        return isMarathi ? 'स्पर्धा तपासली' : 'Competition Checked';
      case VALIDATION_STAGES.SUPPLIER_CHECKED:
        return isMarathi ? 'पुरवठादार तपासले' : 'Suppliers Checked';
      case VALIDATION_STAGES.FEASIBILITY_REVIEWED:
        return isMarathi ? 'व्यवहार्यता पूर्ण' : 'Feasibility Reviewed';
      case VALIDATION_STAGES.READY_FOR_DECISION:
        return isMarathi ? 'निर्णयासाठी तयार' : 'Ready for Decision';
      case VALIDATION_STAGES.REJECTED_NOT_SUITABLE:
        return isMarathi ? 'नाकारलेली संधी' : 'Rejected / Not Suitable';
      default:
        return stage;
    }
  };

  return (
    <div className="gap-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="gap-modal-card comparison-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="gap-modal-header comparison-modal-header">
          <div>
            <span className="modal-category-tag">
              ⚖️ {isMarathi ? 'संधी तुलना विश्लेषक' : 'Side-by-Side Opportunity Matrix'}
            </span>
            <h2 className="modal-title">
              {isMarathi ? 'माझ्या जतन केलेल्या संधींची तुलना' : 'Compare Saved Opportunities'}
            </h2>
            <span className="modal-subtitle">
              {isMarathi
                ? `निवडलेल्या ${comparisonItems.length} संधींची तुलना — नफ्याची हमी न देता वस्तुनिष्ठ माहिती`
                : `Comparing ${comparisonItems.length} opportunities side-by-side without speculative profit promises`}
            </span>
          </div>

          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Modal Body: Comparison Table */}
        <div className="gap-modal-body comparison-modal-body">
          <div className="comparison-table-wrapper">
            <table className="comparison-matrix-table">
              <thead>
                <tr>
                  <th className="feature-col-header">
                    {isMarathi ? 'तुलना निकष (Criteria)' : 'Comparison Criteria'}
                  </th>
                  {comparisonItems.map((item) => (
                    <th key={item.gapId} className="item-col-header">
                      <div className="item-header-title">
                        {isMarathi ? item.productOrService_mr : item.productOrService}
                      </div>
                      <div className="item-header-location">
                        📍 {item.village}, {item.taluka}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* 1. Validation Stage */}
                <tr>
                  <td className="criteria-label">
                    🎯 {isMarathi ? 'तपासणी टप्पा (Validation Stage):' : 'Validation Stage:'}
                  </td>
                  {comparisonItems.map((item) => (
                    <td key={item.gapId} className="criteria-val">
                      <span className={`validation-stage-pill validation-stage-pill--${item.validationStatus}`}>
                        {getStageLabel(item.validationStatus)}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* 2. Checklist Progress */}
                <tr>
                  <td className="criteria-label">
                    📋 {isMarathi ? 'तपासणी सूची प्रगती (Checklist):' : 'Checklist Progress:'}
                  </td>
                  {comparisonItems.map((item) => (
                    <td key={item.gapId} className="criteria-val">
                      <div className="progress-inline-wrap">
                        <strong>{item.progressCompleted}/{item.progressTotal} ({item.progressPercentage}%)</strong>
                        <div className="mini-prog-bar">
                          <div className="mini-prog-fill" style={{ width: `${item.progressPercentage}%` }}></div>
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>

                {/* 3. Potential Gap Score */}
                <tr>
                  <td className="criteria-label">
                    ⚖️ {isMarathi ? 'संभाव्य तुटवडा गुण (Phase 2 Score):' : 'Potential Gap Score:'}
                  </td>
                  {comparisonItems.map((item) => (
                    <td key={item.gapId} className="criteria-val">
                      <span className="comp-score-badge">
                        {item.gapScore != null ? `${item.gapScore} / 100` : t('gapAnalyzer.scoring.insufficientData')}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* 4. Demand Reports */}
                <tr>
                  <td className="criteria-label">
                    👥 {isMarathi ? 'नागरिक मागणी नोंदी (Citizen Demand):' : 'Citizen Demand Reports:'}
                  </td>
                  {comparisonItems.map((item) => (
                    <td key={item.gapId} className="criteria-val">
                      <strong>{item.totalValidReports} {isMarathi ? 'नागरिक नोंदी' : 'valid reports'}</strong>
                      <span className="sub-criteria-text">({item.notAvailablePercentage}% {isMarathi ? 'अनुपलब्ध' : 'unavailable'})</span>
                    </td>
                  ))}
                </tr>

                {/* 5. Known Suppliers */}
                <tr>
                  <td className="criteria-label">
                    🏢 {isMarathi ? 'नोंदणीकृत स्थानिक पुरवठादार:' : 'Known Local Suppliers:'}
                  </td>
                  {comparisonItems.map((item) => (
                    <td key={item.gapId} className="criteria-val">
                      <span>{item.knownVerifiedSuppliersCount} {isMarathi ? 'अधिकृत व्यावसायिक' : 'verified supplier(s)'}</span>
                      {item.unverifiedSuppliersCount > 0 && (
                        <span className="sub-criteria-text"> + {item.unverifiedSuppliersCount} {isMarathi ? 'स्थानिक गाळे' : 'unverified'}</span>
                      )}
                    </td>
                  ))}
                </tr>

                {/* 6. Demand Trend */}
                <tr>
                  <td className="criteria-label">
                    📈 {isMarathi ? 'मागणीचा कल (Demand Trend):' : 'Demand Trend:'}
                  </td>
                  {comparisonItems.map((item) => (
                    <td key={item.gapId} className="criteria-val">
                      <span className="trend-text-pill">{item.trendLabel || item.trend}</span>
                    </td>
                  ))}
                </tr>

                {/* 7. Evidence Confidence */}
                <tr>
                  <td className="criteria-label">
                    🛡️ {isMarathi ? 'पुरावा विश्वासार्हता (Confidence):' : 'Evidence Confidence:'}
                  </td>
                  {comparisonItems.map((item) => (
                    <td key={item.gapId} className="criteria-val">
                      <span className="conf-text-pill">{item.confidence?.toUpperCase()}</span>
                    </td>
                  ))}
                </tr>

                {/* 8. Customers Personally Contacted (Entrepreneur Observation) */}
                <tr>
                  <td className="criteria-label">
                    📞 {isMarathi ? 'प्रत्यक्ष संपर्क केलेले ग्राहक:' : 'Customers Contacted (Field Observation):'}
                  </td>
                  {comparisonItems.map((item) => (
                    <td key={item.gapId} className="criteria-val">
                      <span>{item.customersContacted || 0} {isMarathi ? 'ग्राहक' : 'contacted'}</span>
                      <span className="sub-criteria-text">({item.customersInterested || 0} {isMarathi ? 'इच्छुक' : 'interested'})</span>
                    </td>
                  ))}
                </tr>

                {/* 9. Customers Willing to Pay */}
                <tr>
                  <td className="criteria-label">
                    💰 {isMarathi ? 'पैसे देण्यास तयार ग्राहक:' : 'Willing to Pay (Field Observation):'}
                  </td>
                  {comparisonItems.map((item) => (
                    <td key={item.gapId} className="criteria-val">
                      <strong>{item.customersWillingToPay || 0} {isMarathi ? 'ग्राहक' : 'confirmed'}</strong>
                    </td>
                  ))}
                </tr>

                {/* 10. Last Activity Date */}
                <tr>
                  <td className="criteria-label">
                    🕒 {isMarathi ? 'अखेरचे अद्यतन (Last Updated):' : 'Last Updated:'}
                  </td>
                  {comparisonItems.map((item) => (
                    <td key={item.gapId} className="criteria-val">
                      <span className="date-sub-text">
                        {item.lastUpdated ? new Date(item.lastUpdated).toLocaleDateString() : 'N/A'}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* 11. Quick Investigation Action */}
                <tr>
                  <td className="criteria-label">
                    ⚡ {isMarathi ? 'कृती (Actions):' : 'Action:'}
                  </td>
                  {comparisonItems.map((item) => (
                    <td key={item.gapId} className="criteria-val">
                      <Button
                        variant="primary"
                        size="small"
                        onClick={() => {
                          onClose();
                          if (onOpenValidationModal) onOpenValidationModal(item.gapId);
                        }}
                      >
                        ✏️ {isMarathi ? 'तपासणी सूची उघडा' : 'Open Checklist'}
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="gap-modal-footer">
          <Button variant="secondary" onClick={onClose}>
            {isMarathi ? 'बंद करा' : 'Close Comparison'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default OpportunityComparisonModal;
