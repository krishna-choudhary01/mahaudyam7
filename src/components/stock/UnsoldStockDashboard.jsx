import React from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';
import {
  STOCK_CATEGORIES,
  STOCK_STATUSES,
  PERISHABILITY_LEVELS
} from '../../data/stock/stockConstants.js';
import { unsoldStockService } from '../../services/stock/unsoldStockService.js';

export function UnsoldStockDashboard({
  stocks = [],
  summary = null,
  onOpenRegister,
  onSelectStock,
  filterCategory,
  setFilterCategory,
  filterStatus,
  setFilterStatus,
  filterPerishability,
  setFilterPerishability,
  searchQuery,
  setSearchQuery
}) {
  const { t, isMarathi } = useLanguage();

  const getStatusBadge = (status) => {
    switch (status) {
      case STOCK_STATUSES.AVAILABLE_FOR_RECOVERY:
        return { label: t('unsoldStock.statuses.available_for_recovery'), class: 'status-available' };
      case STOCK_STATUSES.RECOVERY_IN_PROGRESS:
        return { label: t('unsoldStock.statuses.recovery_in_progress'), class: 'status-progress' };
      case STOCK_STATUSES.PARTIALLY_RECOVERED:
        return { label: t('unsoldStock.statuses.partially_recovered'), class: 'status-partial' };
      case STOCK_STATUSES.FULLY_RECOVERED:
        return { label: t('unsoldStock.statuses.fully_recovered'), class: 'status-recovered' };
      case STOCK_STATUSES.EXPIRED_DAMAGED:
        return { label: t('unsoldStock.statuses.expired_damaged'), class: 'status-damaged' };
      case STOCK_STATUSES.DISPOSED:
        return { label: t('unsoldStock.statuses.disposed'), class: 'status-disposed' };
      case STOCK_STATUSES.NEWLY_REGISTERED:
      default:
        return { label: t('unsoldStock.statuses.newly_registered'), class: 'status-new' };
    }
  };

  return (
    <div className="unsold-stock-dashboard">
      {/* 1. Urgent Perishable Warning Banner */}
      {summary && summary.urgentPerishableCount > 0 && (
        <div className="urgent-banner-callout">
          <div className="urgent-banner-icon">⚠️</div>
          <div className="urgent-banner-text">
            <strong>
              {t('unsoldStock.dashboard.urgentWarningBanner', { count: summary.urgentPerishableCount })}
            </strong>
            <p>
              {isMarathi
                ? 'नाशवंत शेतमालाचे नुकसान टाळण्यासाठी तात्काळ जवळचे शीतगृह, प्रक्रिया केंद्र किंवा हॉटेल पुरवठादाराशी संपर्क साधा.'
                : 'Expedite alternative recovery or cold chain preservation to avoid complete inventory loss.'}
            </p>
          </div>
        </div>
      )}

      {/* 2. Top Metrics Grid */}
      <div className="metrics-cards-grid">
        <div className="stock-metric-card">
          <span className="stock-metric-label">{t('unsoldStock.dashboard.totalStocks')}</span>
          <span className="stock-metric-value">{summary?.totalStocksCount ?? 0}</span>
          <span className="stock-metric-sub">
            {isMarathi ? 'नोंदवलेल्या मालाची यादी' : 'Registered lots'}
          </span>
        </div>

        <div className="stock-metric-card stock-metric-card--highlight">
          <span className="stock-metric-label">{t('unsoldStock.dashboard.potentialValue')}</span>
          <span className="stock-metric-value font-bold text-success">
            ₹{(summary?.potentialRecoveryValueSum ?? 0).toLocaleString()}
          </span>
          <span className="stock-metric-sub">
            {isMarathi ? 'अपेक्षित संभाव्य उत्पन्न' : 'Gross estimated value'}
          </span>
        </div>

        <div className="stock-metric-card">
          <span className="stock-metric-label">{t('unsoldStock.dashboard.awaitingRecovery')}</span>
          <span className="stock-metric-value text-primary">{summary?.awaitingRecoveryCount ?? 0}</span>
          <span className="stock-metric-sub">
            {isMarathi ? 'पुनर्प्राप्तीस तयार' : 'Ready for channels'}
          </span>
        </div>

        <div className="stock-metric-card">
          <span className="stock-metric-label">{t('unsoldStock.dashboard.underRecovery')}</span>
          <span className="stock-metric-value text-warning">{summary?.underRecoveryCount ?? 0}</span>
          <span className="stock-metric-sub">
            {isMarathi ? 'चर्चा / प्रक्रिया सुरू' : 'In negotiation'}
          </span>
        </div>

        <div className="stock-metric-card">
          <span className="stock-metric-label">{t('unsoldStock.dashboard.fullyRecovered')}</span>
          <span className="stock-metric-value text-success">{summary?.fullyRecoveredCount ?? 0}</span>
          <span className="stock-metric-sub">
            {isMarathi ? 'यशस्वी पुनर्प्राप्त' : 'Complete recovery'}
          </span>
        </div>
      </div>

      {/* 3. Controls & Filter Bar */}
      <div className="dashboard-controls-bar">
        <div className="search-box-wrapper">
          <AppIcon name="search" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('unsoldStock.dashboard.searchPlaceholder')}
            className="search-input"
          />
        </div>

        <div className="filters-row">
          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="filter-select"
          >
            <option value="all">{isMarathi ? 'सर्व वर्गवारी' : 'All Categories'}</option>
            {Object.values(STOCK_CATEGORIES).map((cKey) => (
              <option key={cKey} value={cKey}>
                {t(`unsoldStock.categories.${cKey}`)}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="all">{isMarathi ? 'सर्व स्थिती' : 'All Statuses'}</option>
            {Object.values(STOCK_STATUSES).map((stKey) => (
              <option key={stKey} value={stKey}>
                {t(`unsoldStock.statuses.${stKey}`)}
              </option>
            ))}
          </select>

          {/* Perishability Filter */}
          <select
            value={filterPerishability}
            onChange={(e) => setFilterPerishability(e.target.value)}
            className="filter-select"
          >
            <option value="all">{isMarathi ? 'सर्व टिकाऊपणा' : 'All Perishability'}</option>
            {Object.values(PERISHABILITY_LEVELS).map((pKey) => (
              <option key={pKey} value={pKey}>
                {t(`unsoldStock.perishability.${pKey}`)}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn btn-primary register-cta-btn"
          onClick={onOpenRegister}
        >
          <AppIcon name="box" size={16} />
          <span>{t('unsoldStock.dashboard.registerStockBtn')}</span>
        </button>
      </div>

      {/* 4. Stock Cards Grid */}
      {stocks.length > 0 ? (
        <div className="stocks-grid">
          {stocks.map((stock) => {
            const badge = getStatusBadge(stock.status);
            const safety = unsoldStockService.evaluateFoodSafety(stock);
            const isUrgent = safety.urgency === 'urgent_action';
            const isUnsafe = !safety.isSafe;

            return (
              <div
                key={stock.id}
                className={`stock-item-card ${isUrgent ? 'card-urgent' : ''} ${isUnsafe ? 'card-unsafe' : ''}`}
                onClick={() => onSelectStock(stock)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onSelectStock(stock); }}
              >
                <div className="stock-card-header">
                  <div className="stock-title-group">
                    <span className="stock-category-tag">
                      {t(`unsoldStock.categories.${stock.category}`)}
                    </span>
                    <h4 className="stock-item-title">
                      {isMarathi ? (stock.productName_mr || stock.productName) : stock.productName}
                    </h4>
                  </div>
                  <span className={`status-pill ${badge.class}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="stock-card-body">
                  <div className="stock-metric-row">
                    <span className="metric-label">{isMarathi ? 'उपलब्ध प्रमाण:' : 'Available:'}</span>
                    <strong className="metric-val">
                      {stock.availableQuantity} {stock.unit}
                    </strong>
                  </div>

                  <div className="stock-metric-row">
                    <span className="metric-label">{isMarathi ? 'अपेक्षित दर:' : 'Expected Price:'}</span>
                    <span>
                      {stock.expectedRecoveryPricePerUnit
                        ? `₹${stock.expectedRecoveryPricePerUnit} / ${stock.unit}`
                        : (isMarathi ? 'अज्ञात' : 'Unknown')}
                    </span>
                  </div>

                  <div className="stock-metric-row">
                    <span className="metric-label">{isMarathi ? 'ठिकाण:' : 'Location:'}</span>
                    <span className="village-label">
                      {isMarathi ? stock.villageName_mr : stock.villageName} ({isMarathi ? stock.talukaName_mr : stock.talukaName})
                    </span>
                  </div>

                  {stock.remainingShelfLifeHours != null && (
                    <div className="stock-metric-row">
                      <span className="metric-label">{isMarathi ? 'उर्वरित मुदत:' : 'Shelf Life:'}</span>
                      <span className={stock.remainingShelfLifeHours <= 24 ? 'text-danger font-bold' : ''}>
                        {stock.remainingShelfLifeHours} {isMarathi ? 'तास' : 'hrs'}
                      </span>
                    </div>
                  )}

                  {isUnsafe && (
                    <div className="card-food-safety-pill">
                      ⚠️ {isMarathi ? 'खाण्यासाठी असुरक्षित' : 'Unfit for Consumption'}
                    </div>
                  )}
                </div>

                <div className="stock-card-footer">
                  <span className="inspect-link">
                    {isMarathi ? 'तपशील व मूल्य गणक →' : 'View Details & Calculator →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-stock-state">
          <AppIcon name="box" size={36} color="#728c68" />
          <p>{t('unsoldStock.dashboard.noStocksEmptyState')}</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenRegister}
          >
            {t('unsoldStock.dashboard.registerStockBtn')}
          </button>
        </div>
      )}
    </div>
  );
}

export default UnsoldStockDashboard;
