import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n/index.js';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';
import { authService } from '../../services/auth/authService.js';
import { AppIcon } from '../common/Icons.jsx';
import { Card } from '../common/Card.jsx';
import { Button } from '../common/Button.jsx';
import {
  gapValidationService,
  VALIDATION_STAGES
} from '../../services/gap/gapValidationService.js';
import { OpportunityValidationModal } from './OpportunityValidationModal.jsx';
import { OpportunityComparisonModal } from './OpportunityComparisonModal.jsx';

export function InvestigatedOpportunitiesSection({ onNavigateModule, onExploreMore }) {
  const { t, isMarathi } = useLanguage();
  const { isOnline } = useOnlineStatus();
  const currentUserId = authService.getUserId();

  const [savedRecords, setSavedRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stageFilter, setStageFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection for Comparison Modal
  const [selectedForComparison, setSelectedForComparison] = useState(new Set());
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [comparisonMatrix, setComparisonMatrix] = useState([]);

  // Active Validation Modal
  const [activeModalGapId, setActiveModalGapId] = useState(null);
  const [activeModalItem, setActiveModalItem] = useState(null);

  // Syncing state
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  const loadOpportunities = async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const records = await gapValidationService.getUserInvestigatedOpportunities(currentUserId);
      setSavedRecords(records);
    } catch (err) {
      console.warn('Could not load investigated opportunities', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpportunities();
  }, [currentUserId]);

  const handleToggleSelectForComparison = (gapId) => {
    const updated = new Set(selectedForComparison);
    if (updated.has(gapId)) {
      updated.delete(gapId);
    } else {
      updated.add(gapId);
    }
    setSelectedForComparison(updated);
  };

  const handleOpenComparison = async () => {
    let ids = Array.from(selectedForComparison);
    if (ids.length < 2) {
      // If none or only 1 selected, compare all saved records (up to 4)
      ids = savedRecords.slice(0, 4).map((r) => r.gapId);
    }
    const matrix = await gapValidationService.buildComparisonMatrix(currentUserId, ids);
    setComparisonMatrix(matrix);
    setShowComparisonModal(true);
  };

  const handleOpenValidationModal = (gapId) => {
    const item = savedRecords.find((r) => r.gapId === gapId);
    setActiveModalGapId(gapId);
    setActiveModalItem(item);
  };

  const handleValidationSaved = (updatedRecord) => {
    loadOpportunities();
  };

  const handleDeleteOpportunity = async (gapId) => {
    const confirmMsg = isMarathi
      ? 'तुम्हाला ही संधी जतन यादीतून काढायची आहे का?'
      : 'Are you sure you want to remove this opportunity from your saved workspace?';
    if (!window.confirm(confirmMsg)) return;

    await gapValidationService.deleteSavedOpportunity(currentUserId, gapId);
    const updatedSel = new Set(selectedForComparison);
    updatedSel.delete(gapId);
    setSelectedForComparison(updatedSel);
    loadOpportunities();
  };

  const handleSyncPending = async () => {
    setSyncing(true);
    setSyncMessage('');
    try {
      const res = await gapValidationService.syncPendingValidations(currentUserId);
      setSyncMessage(
        isMarathi
          ? `यशस्वी! ${res.syncedCount} नोंदी स्थानिक साठ्यातून सिंक झाल्या.`
          : `Sync complete: ${res.syncedCount} local updates synchronized.`
      );
      loadOpportunities();
    } catch (e) {
      setSyncMessage(isMarathi ? 'सिंक करताना त्रुटी आली.' : 'Sync failed.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(''), 3000);
    }
  };

  const getStageBadge = (stage) => {
    switch (stage) {
      case VALIDATION_STAGES.NEW_OPPORTUNITY:
        return <span className="stage-badge stage-badge--new">१. {isMarathi ? 'नवी संधी' : 'New'}</span>;
      case VALIDATION_STAGES.UNDER_INVESTIGATION:
        return <span className="stage-badge stage-badge--investigating">२. {isMarathi ? 'तपास सुरू' : 'Investigating'}</span>;
      case VALIDATION_STAGES.DEMAND_VERIFIED:
        return <span className="stage-badge stage-badge--demand">३. {isMarathi ? 'मागणी पडताळली' : 'Demand Verified'}</span>;
      case VALIDATION_STAGES.COMPETITION_CHECKED:
        return <span className="stage-badge stage-badge--competition">४. {isMarathi ? 'स्पर्धा तपासली' : 'Competition Checked'}</span>;
      case VALIDATION_STAGES.SUPPLIER_CHECKED:
        return <span className="stage-badge stage-badge--supplier">५. {isMarathi ? 'पुरवठादार तपासले' : 'Suppliers Checked'}</span>;
      case VALIDATION_STAGES.FEASIBILITY_REVIEWED:
        return <span className="stage-badge stage-badge--feasibility">६. {isMarathi ? 'व्यवहार्यता पूर्ण' : 'Feasibility Reviewed'}</span>;
      case VALIDATION_STAGES.READY_FOR_DECISION:
        return <span className="stage-badge stage-badge--ready">🎯 ७. {isMarathi ? 'निर्णयासाठी तयार' : 'Ready for Decision'}</span>;
      case VALIDATION_STAGES.REJECTED_NOT_SUITABLE:
        return <span className="stage-badge stage-badge--rejected">✕ ८. {isMarathi ? 'नाकारलेली' : 'Rejected'}</span>;
      default:
        return <span className="stage-badge">{stage}</span>;
    }
  };

  // Stats calculation
  const totalSaved = savedRecords.length;
  const underInvest = savedRecords.filter((r) => r.validationStatus === VALIDATION_STAGES.UNDER_INVESTIGATION).length;
  const verifiedCount = savedRecords.filter(
    (r) =>
      r.validationStatus === VALIDATION_STAGES.DEMAND_VERIFIED ||
      r.validationStatus === VALIDATION_STAGES.COMPETITION_CHECKED ||
      r.validationStatus === VALIDATION_STAGES.SUPPLIER_CHECKED ||
      r.validationStatus === VALIDATION_STAGES.FEASIBILITY_REVIEWED
  ).length;
  const readyDecision = savedRecords.filter((r) => r.validationStatus === VALIDATION_STAGES.READY_FOR_DECISION).length;
  const rejectedCount = savedRecords.filter((r) => r.validationStatus === VALIDATION_STAGES.REJECTED_NOT_SUITABLE).length;

  const pendingSyncCount = savedRecords.filter((r) => r.syncStatus === 'pending_sync').length;

  // Filter records
  const filteredRecords = savedRecords.filter((r) => {
    if (stageFilter !== 'all' && r.validationStatus !== stageFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const snap = r.gapSnapshot || {};
      const matchName = (snap.productOrService || '').toLowerCase().includes(q) || (snap.productOrService_mr || '').toLowerCase().includes(q);
      const matchVillage = (snap.village || '').toLowerCase().includes(q);
      const matchNotes = (r.personalNotes || '').toLowerCase().includes(q);
      return matchName || matchVillage || matchNotes;
    }
    return true;
  });

  if (!currentUserId) {
    return (
      <div className="investigated-opportunities-section">
        <Card className="auth-required-card">
          <AppIcon name="user" size={32} color="#2e7d32" />
          <h3>{isMarathi ? 'उद्योजक खात्यात प्रवेश आवश्यक' : 'Entrepreneur Account Required'}</h3>
          <p>
            {isMarathi
              ? 'संधी जतन करण्यासाठी, स्थानिक तपासणी सूची पूर्ण करण्यासाठी आणि खाजगी नोंदी ठेवण्यासाठी कृपया प्रवेश (Login) करा.'
              : 'Please log in with your entrepreneur profile to save opportunities, complete field checklists, and track validation stages.'}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="investigated-opportunities-section">
      {/* Workspace Banner */}
      <div className="workspace-hero-card">
        <div className="hero-text-wrap">
          <span className="hero-badge-tag">
            ★ {isMarathi ? 'माझी खाजगी कार्यशाळा' : 'Private Entrepreneur Workspace'}
          </span>
          <h2 className="hero-main-title">
            {isMarathi ? 'माझ्या तपासलेल्या व्यवसाय संधी' : 'My Investigated Opportunities'}
          </h2>
          <p className="hero-subtext">
            {isMarathi
              ? 'स्थानिक पुरावे गोळा करा, ग्राहक व पुरवठादारांची खात्री करा आणि व्यवसायाचा निर्णय घेण्यापूर्वी व्यवहार्यता तपासा.'
              : 'Validate local customer willingness to pay, verify suppliers and competition, and complete field due diligence before investing.'}
          </p>
        </div>

        {/* Sync Status Badge */}
        <div className="workspace-sync-badge-box">
          {pendingSyncCount > 0 ? (
            <button
              type="button"
              className="sync-pending-pill"
              onClick={handleSyncPending}
              disabled={syncing}
            >
              🔄 {pendingSyncCount} {isMarathi ? 'स्थानिक नोंदी सिंक प्रलंबित' : 'updates pending sync'}
            </button>
          ) : (
            <span className="sync-ok-pill">
              ✓ {isMarathi ? 'सर्व नोंदी सुरक्षित साठवल्या' : 'All records synced'}
            </span>
          )}
          {syncMessage && <span className="sync-msg-toast">{syncMessage}</span>}
        </div>
      </div>

      {/* Summary Statistics Cards */}
      <div className="investigated-stats-grid">
        <Card className="stat-card">
          <span className="stat-number">{totalSaved}</span>
          <span className="stat-label">{isMarathi ? 'एकूण जतन केलेल्या संधी' : 'Total Saved'}</span>
        </Card>

        <Card className="stat-card">
          <span className="stat-number stat-number--investigating">{underInvest}</span>
          <span className="stat-label">{isMarathi ? 'तपासणी सुरू' : 'Under Investigation'}</span>
        </Card>

        <Card className="stat-card">
          <span className="stat-number stat-number--demand">{verifiedCount}</span>
          <span className="stat-label">{isMarathi ? 'पुरावे तपासलेले' : 'Evidence Verified'}</span>
        </Card>

        <Card className="stat-card">
          <span className="stat-number stat-number--ready">{readyDecision}</span>
          <span className="stat-label">{isMarathi ? 'निर्णयासाठी तयार' : 'Ready for Decision'}</span>
        </Card>

        <Card className="stat-card">
          <span className="stat-number stat-number--rejected">{rejectedCount}</span>
          <span className="stat-label">{isMarathi ? 'नाकारलेल्या संधी' : 'Not Suitable'}</span>
        </Card>
      </div>

      {/* Controls & Filter Bar */}
      <Card className="investigated-controls-card">
        <div className="controls-row">
          {/* Search */}
          <div className="filter-search-box">
            <AppIcon name="search" size={18} color="#555" />
            <input
              type="text"
              className="demand-search-input"
              placeholder={isMarathi ? 'संधी, गाव किंवा नोंदी शोधा...' : 'Search by product, village, or notes...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" className="clear-search-btn" onClick={() => setSearchQuery('')}>✕</button>
            )}
          </div>

          {/* Stage Filter */}
          <div className="filter-select-box">
            <label className="filter-label">{isMarathi ? 'तपासणी टप्पा:' : 'Validation Stage:'}</label>
            <select
              className="filter-select"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
            >
              <option value="all">{isMarathi ? 'सर्व टप्पे' : 'All Stages'}</option>
              <option value={VALIDATION_STAGES.NEW_OPPORTUNITY}>{isMarathi ? '१. नवी संधी' : '1. New Opportunity'}</option>
              <option value={VALIDATION_STAGES.UNDER_INVESTIGATION}>{isMarathi ? '२. तपास सुरू आहे' : '2. Under Investigation'}</option>
              <option value={VALIDATION_STAGES.DEMAND_VERIFIED}>{isMarathi ? '३. स्थानिक मागणी पडताळली' : '3. Demand Verified'}</option>
              <option value={VALIDATION_STAGES.COMPETITION_CHECKED}>{isMarathi ? '४. स्थानिक स्पर्धा तपासली' : '4. Competition Checked'}</option>
              <option value={VALIDATION_STAGES.SUPPLIER_CHECKED}>{isMarathi ? '५. पुरवठादार तपासले' : '5. Suppliers Checked'}</option>
              <option value={VALIDATION_STAGES.FEASIBILITY_REVIEWED}>{isMarathi ? '६. व्यवहार्यता पूर्ण' : '6. Feasibility Reviewed'}</option>
              <option value={VALIDATION_STAGES.READY_FOR_DECISION}>{isMarathi ? '७. निर्णयासाठी तयार' : '7. Ready for Decision'}</option>
              <option value={VALIDATION_STAGES.REJECTED_NOT_SUITABLE}>{isMarathi ? '८. नाकारलेली संधी' : '8. Rejected / Not Suitable'}</option>
            </select>
          </div>

          {/* Side-by-Side Comparison Trigger */}
          <div className="compare-btn-wrap">
            <Button
              variant="primary"
              onClick={handleOpenComparison}
              disabled={savedRecords.length < 2}
              className="compare-action-btn"
            >
              ⚖️ {isMarathi ? `संधींची तुलना करा (${selectedForComparison.size || savedRecords.length})` : `Compare Opportunities (${selectedForComparison.size || savedRecords.length})`}
            </Button>
          </div>
        </div>
      </Card>

      {/* Opportunities Stack */}
      <div className="saved-opportunities-stack">
        {loading ? (
          <div className="gap-loading-box">
            <div className="spinner"></div>
            <p>{isMarathi ? 'माहिती लोड होत आहे...' : 'Loading investigated opportunities...'}</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <Card className="gap-empty-card">
            <div className="empty-icon-wrap">🌾</div>
            <h3>{isMarathi ? 'कोणतीही जतन केलेली संधी आढळली नाही' : 'No Investigated Opportunities Yet'}</h3>
            <p>
              {isMarathi
                ? 'पुरवठा-मागणी अंतर विश्लेषक टॅबवर जाऊन तुमच्या गावातील संभाव्य तुटवडे शोधा आणि "संधी जतन करा" बटणावर क्लिक करा.'
                : 'Browse the Supply Gaps & Opportunities tab to find unmet needs in your locality, then click "Save Opportunity" to investigate.'}
            </p>
            {onExploreMore && (
              <Button variant="primary" onClick={onExploreMore}>
                🔍 {isMarathi ? 'नवीन संधी शोधा' : 'Discover Opportunities'}
              </Button>
            )}
          </Card>
        ) : (
          <div className="investigated-cards-grid">
            {filteredRecords.map((item) => {
              const snap = item.gapSnapshot || {};
              const obs = item.observations || {};
              const prog = item.progress || gapValidationService.calculateChecklistProgress(item.checklist);
              const isSelected = selectedForComparison.has(item.gapId);

              return (
                <Card key={item.id} className="investigated-opportunity-card">
                  {/* Card Header */}
                  <div className="card-top-row">
                    <div className="top-title-wrap">
                      <div className="stage-badges-wrap">
                        {getStageBadge(item.validationStatus)}
                        {snap.gapScore != null && (
                          <span className="card-score-pill">
                            {isMarathi ? 'गुण:' : 'Score:'} <strong>{snap.gapScore}/100</strong>
                          </span>
                        )}
                      </div>
                      <h3 className="card-product-title">
                        {isMarathi ? snap.productOrService_mr || snap.productOrService : snap.productOrService || 'Opportunity'}
                      </h3>
                      <span className="card-location-sub">
                        📍 {snap.village || 'Local Village'}, {snap.taluka || ''}, {snap.district || ''}
                      </span>
                    </div>

                    <div className="top-actions-wrap">
                      {/* Select for comparison checkbox */}
                      <label className="comparison-select-label" title={isMarathi ? 'तुलनेसाठी निवडा' : 'Select for comparison'}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectForComparison(item.gapId)}
                        />
                        <span className="comp-checkbox-text">{isMarathi ? 'तुलना' : 'Compare'}</span>
                      </label>

                      {/* Delete / Unsave button */}
                      <button
                        type="button"
                        className="delete-opp-btn"
                        onClick={() => handleDeleteOpportunity(item.gapId)}
                        title={isMarathi ? 'काढून टाका' : 'Remove opportunity'}
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Checklist Progress Bar */}
                  <div className="card-progress-section">
                    <div className="progress-label-row">
                      <span>{isMarathi ? 'तपासणी सूची प्रगती:' : 'Validation Checklist Progress:'}</span>
                      <strong>{prog.completed}/{prog.total} ({prog.percentage}%)</strong>
                    </div>
                    <div className="card-progress-track">
                      <div className="card-progress-bar" style={{ width: `${prog.percentage}%` }}></div>
                    </div>
                  </div>

                  {/* Summary Evidence Chips */}
                  <div className="card-evidence-chips">
                    <div className="evidence-chip">
                      <span className="chip-label">{isMarathi ? 'नागरिक मागणी:' : 'Citizen Reports:'}</span>
                      <strong className="chip-val">{snap.totalValidReports || 0} {isMarathi ? 'नोंदी' : 'reports'}</strong>
                    </div>
                    <div className="evidence-chip">
                      <span className="chip-label">{isMarathi ? 'अधिकृत पुरवठादार:' : 'Known Suppliers:'}</span>
                      <strong className="chip-val">{snap.knownVerifiedSuppliersCount ?? snap.knownSuppliersCount ?? 0} {isMarathi ? 'व्यावसायिक' : 'suppliers'}</strong>
                    </div>
                    <div className="evidence-chip">
                      <span className="chip-label">{isMarathi ? 'संपर्क केलेले ग्राहक:' : 'Contacted Customers:'}</span>
                      <strong className="chip-val">{obs.customersContacted || 0} ({obs.customersInterested || 0} {isMarathi ? 'इच्छुक' : 'interested'})</strong>
                    </div>
                  </div>

                  {/* Personal Notes Snippet */}
                  {item.personalNotes && (
                    <div className="card-notes-snippet">
                      <span className="notes-icon">📝</span>
                      <p className="notes-preview-text">{item.personalNotes}</p>
                    </div>
                  )}

                  {/* Card Bottom Actions */}
                  <div className="card-footer-actions">
                    <Button
                      variant="primary"
                      onClick={() => handleOpenValidationModal(item.gapId)}
                      className="investigate-btn"
                    >
                      ✏️ {isMarathi ? 'तपासणी व सूची अपडेट करा' : 'Investigate & Update Checklist'}
                    </Button>

                    <span className="last-updated-text">
                      🕒 {isMarathi ? 'अद्यतन:' : 'Updated:'} {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Validation Checklist & Observations Modal */}
      {activeModalGapId && (
        <OpportunityValidationModal
          userId={currentUserId}
          gapId={activeModalGapId}
          initialData={activeModalItem}
          onClose={() => {
            setActiveModalGapId(null);
            setActiveModalItem(null);
          }}
          onSaved={handleValidationSaved}
        />
      )}

      {/* Side-by-Side Comparison Modal */}
      {showComparisonModal && (
        <OpportunityComparisonModal
          comparisonItems={comparisonMatrix}
          onClose={() => setShowComparisonModal(false)}
          onOpenValidationModal={(gapId) => handleOpenValidationModal(gapId)}
        />
      )}
    </div>
  );
}

export default InvestigatedOpportunitiesSection;
