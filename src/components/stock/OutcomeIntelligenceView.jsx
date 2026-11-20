/**
 * MahaUdyam — Unsold Stock Rescue
 * OutcomeIntelligenceView.jsx
 * 
 * Displays genuine recovery outcome intelligence based strictly on real transactions.
 * Excludes demo transactions and transparently flags sample size limitations.
 */

import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n';
import { unsoldStockService } from '../../services/stock/unsoldStockService.js';

export function OutcomeIntelligenceView({ userId }) {
  const { t, isMarathi } = useLanguage();
  const [intel, setIntel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadIntelligence();
    }
  }, [userId]);

  const loadIntelligence = async () => {
    try {
      setLoading(true);
      const data = await unsoldStockService.getOutcomeIntelligence(userId);
      setIntel(data);
    } catch (err) {
      console.error('Failed to load outcome intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="intelligence-loading">
        <p>Loading genuine recovery outcome intelligence...</p>
      </div>
    );
  }

  if (!intel || intel.totalTransactionsCount === 0) {
    return (
      <div className="intelligence-empty-card">
        <span className="empty-icon" aria-hidden="true">📊</span>
        <h4>{t('unsoldStock.intelligence.headerTitle', 'Recovery Outcome Intelligence')}</h4>
        <p>
          {isMarathi
            ? intel?.sampleSizeNotice_mr || t('unsoldStock.intelligence.noDataNotice')
            : intel?.sampleSizeNotice_en || t('unsoldStock.intelligence.noDataNotice')}
        </p>
      </div>
    );
  }

  return (
    <div className="outcome-intelligence-view">
      {/* Reporting Period & Sample Size Header */}
      <div className="intel-header-card">
        <div>
          <h3 className="intel-title">
            📈 {t('unsoldStock.intelligence.headerTitle', 'Genuine Recovery Outcome Intelligence')}
          </h3>
          <p className="intel-subtitle">
            {isMarathi
              ? `प्रत्यक्ष व्यवहारांवर आधारित विश्लेषण (${intel.reportingPeriod})`
              : `Analytics based on verified transactions across reporting period: ${intel.reportingPeriod}`}
          </p>
        </div>
        <span className="sample-badge">
          Sample Size: <strong>{intel.sampleSize}</strong> authentic transaction(s)
        </span>
      </div>

      {/* Low Sample Size Caution Alert */}
      {!intel.isSampleSufficient && (
        <div className="intel-caution-banner" role="alert">
          <span className="alert-icon" aria-hidden="true">⚠️</span>
          <div>
            <strong>Preliminary Analytics</strong>
            <p>
              {isMarathi
                ? intel.sampleSizeNotice_mr || t('unsoldStock.intelligence.lowSampleCaution')
                : intel.sampleSizeNotice_en || t('unsoldStock.intelligence.lowSampleCaution')}
            </p>
          </div>
        </div>
      )}

      {/* Top Level Metric Cards */}
      <div className="intel-metrics-grid">
        <div className="intel-metric-card">
          <span className="metric-label">{t('unsoldStock.intelligence.totalVolume', 'Volume Recovered')}</span>
          <strong className="metric-val">{intel.totalVolumeRecovered?.toLocaleString('en-IN')} units</strong>
          <span className="metric-sub">Across {intel.totalTransactionsCount} completed lots</span>
        </div>

        <div className="intel-metric-card highlight">
          <span className="metric-label">{t('unsoldStock.intelligence.totalNet', 'Realized Net Value')}</span>
          <strong className="metric-val text-success">₹{intel.totalNetRecovery?.toLocaleString('en-IN')}</strong>
          <span className="metric-sub">After all transportation & handling expenses</span>
        </div>

        <div className="intel-metric-card">
          <span className="metric-label">{t('unsoldStock.intelligence.avgTurnaround', 'Avg. Turnaround')}</span>
          <strong className="metric-val">{intel.averageTurnaroundDays} days</strong>
          <span className="metric-sub">From stock registration to confirmed payment</span>
        </div>

        <div className="intel-metric-card">
          <span className="metric-label">{t('unsoldStock.intelligence.rejectionRate', 'Enquiry Rejection Rate')}</span>
          <strong className="metric-val">{intel.enquiryRejectionRate}%</strong>
          <span className="metric-sub">Of initiated buyer negotiations</span>
        </div>
      </div>

      {/* Channel-by-Channel Realized Net Value Breakdown */}
      <div className="intel-channel-table-card">
        <h4 className="table-card-heading">
          {t('unsoldStock.intelligence.channelPerformanceHeader', 'Channel-by-Channel Realized Net Value')}
        </h4>

        <div className="table-wrapper">
          <table className="intel-table">
            <thead>
              <tr>
                <th>Recovery Channel</th>
                <th>Transactions</th>
                <th>Volume Recovered</th>
                <th>Gross Revenue</th>
                <th>Incurred Expenses</th>
                <th>Net Realized Value</th>
                <th>Avg. Net / Unit</th>
              </tr>
            </thead>
            <tbody>
              {intel.channelSuccessRates.map((ch) => (
                <tr key={ch.channelId}>
                  <td>
                    <strong>{isMarathi ? ch.title_mr : ch.title_en}</strong>
                  </td>
                  <td>{ch.transactionsCount}</td>
                  <td>{ch.volumeRecovered}</td>
                  <td>₹{ch.grossRevenue?.toLocaleString('en-IN')}</td>
                  <td className="text-danger">-₹{ch.expenses?.toLocaleString('en-IN')}</td>
                  <td className="text-success">
                    <strong>₹{ch.netRecovery?.toLocaleString('en-IN')}</strong>
                  </td>
                  <td>₹{ch.avgNetPerUnit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default OutcomeIntelligenceView;
