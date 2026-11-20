import React, { useState } from 'react';
import { useLanguage } from '../../i18n';
import './AIBusinessAdvisor.css';

export function BusinessRealityScenarioCard({ scenario, onRecalculate }) {
  const { isMarathi } = useLanguage();
  const [showTransparency, setShowTransparency] = useState(false);

  if (!scenario) return null;

  const {
    businessTitle,
    unit,
    capitalSummary,
    unitEconomics,
    fixedCostSummary,
    breakEvenAnalysis,
    scenarios,
    warnings = [],
    strengths = [],
    dataTransparency = []
  } = scenario;

  return (
    <div className="reality-card" aria-label="Business Reality Simulation">
      <div className="reality-card__header">
        <div className="reality-card__title-row">
          <span className="reality-badge">📊 {isMarathi ? 'वास्तववादी नफा तपासणी' : 'Reality Check'}</span>
          <h4 className="reality-card__title">{businessTitle}</h4>
        </div>
        <p className="reality-card__subtitle">
          {isMarathi
            ? 'अनुमानांऐवजी प्रत्यक्ष गणित — भांडवल, युनिट खर्च आणि नफा-तोटा समतोल'
            : 'Factual financial arithmetic — capex, unit economics, and break-even sales'}
        </p>
      </div>

      {/* Warnings & Strengths Alerts */}
      {warnings.length > 0 && (
        <div className="reality-alerts">
          {warnings.map((w, idx) => (
            <div key={idx} className={`reality-alert reality-alert--${w.severity ? w.severity.toLowerCase() : 'warning'}`}>
              <span className="alert-icon">⚠️</span>
              <span>{isMarathi ? w.text_mr : w.text_en}</span>
            </div>
          ))}
        </div>
      )}

      {strengths.length > 0 && (
        <div className="reality-alerts">
          {strengths.map((s, idx) => (
            <div key={idx} className="reality-alert reality-alert--success">
              <span className="alert-icon">✓</span>
              <span>{isMarathi ? s.text_mr : s.text_en}</span>
            </div>
          ))}
        </div>
      )}

      {/* Core Capital & Unit Economics Grid */}
      <div className="reality-metrics-grid">
        <div className="metric-box">
          <span className="metric-box__label">{isMarathi ? 'एकूण भांडवल' : 'Total Capital'}</span>
          <span className="metric-box__value highlight">₹{capitalSummary.totalCapitalRequired.toLocaleString('en-IN')}</span>
          <span className="metric-box__sub">
            {isMarathi 
              ? `मशिनरी ₹${capitalSummary.capex.toLocaleString('en-IN')} + २ महिने खर्च ₹${capitalSummary.workingCapital.toLocaleString('en-IN')}`
              : `Capex ₹${capitalSummary.capex.toLocaleString('en-IN')} + Buffer ₹${capitalSummary.workingCapital.toLocaleString('en-IN')}`}
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-box__label">{isMarathi ? `किमान समतोल (Break-Even)` : 'Break-Even Volume'}</span>
          <span className="metric-box__value">{breakEvenAnalysis.breakEvenUnits} {unit}</span>
          <span className="metric-box__sub">
            {isMarathi ? `क्षमतेच्या ${breakEvenAnalysis.breakEvenCapacityPercent}% विक्री आवश्यक` : `${breakEvenAnalysis.breakEvenCapacityPercent}% of monthly target`}
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-box__label">{isMarathi ? 'प्रति युनिट नफा मार्जिन' : 'Unit Margin'}</span>
          <span className="metric-box__value">₹{unitEconomics.unitContributionMargin}</span>
          <span className="metric-box__sub">
            {isMarathi ? `दर ₹${unitEconomics.sellingPricePerUnit} - खर्च ₹${unitEconomics.totalVariableCostPerUnit}` : `Price ₹${unitEconomics.sellingPricePerUnit} - Cost ₹${unitEconomics.totalVariableCostPerUnit}`}
          </span>
        </div>

        <div className="metric-box">
          <span className="metric-box__label">{isMarathi ? 'मासिक स्थिर खर्च' : 'Fixed Monthly Cost'}</span>
          <span className="metric-box__value">₹{fixedCostSummary.totalMonthlyFixedCost.toLocaleString('en-IN')}</span>
          <span className="metric-box__sub">{isMarathi ? 'शेड भाडे, मजूर, वीज' : 'Rent, wages, power'}</span>
        </div>
      </div>

      {/* 3-Tier Sensitivity Scenarios (Conservative, Expected, Optimistic) */}
      <div className="scenarios-container">
        <h5 className="scenarios-title">
          {isMarathi ? 'तीन संभाव्य परिस्थितींमध्ये मासिक नफा (Scenarios)' : 'Three Sensitivity Scenarios'}
        </h5>
        <div className="scenarios-grid">
          {/* 1. Conservative */}
          <div className="scenario-col scenario-col--conservative">
            <div className="scenario-col__header">
              <span className="scenario-tag">{isMarathi ? 'कमी मागणी (६०%)' : 'Conservative (60%)'}</span>
              <span className="scenario-label">{isMarathi ? scenarios.conservative.label_mr : scenarios.conservative.label}</span>
            </div>
            <div className="scenario-body">
              <div className="scenario-stat">
                <span>{isMarathi ? 'विक्री:' : 'Sales:'}</span>
                <strong>{scenarios.conservative.monthlyUnits} {unit}</strong>
              </div>
              <div className="scenario-stat">
                <span>{isMarathi ? 'उलाढाल:' : 'Revenue:'}</span>
                <strong>₹{scenarios.conservative.monthlyRevenue.toLocaleString('en-IN')}</strong>
              </div>
              <div className={`scenario-profit ${scenarios.conservative.monthlyNetProfit >= 0 ? 'profit-pos' : 'profit-neg'}`}>
                <span>{isMarathi ? 'मासिक निव्वळ नफा:' : 'Net Profit:'}</span>
                <strong>₹{scenarios.conservative.monthlyNetProfit.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>

          {/* 2. Expected Baseline */}
          <div className="scenario-col scenario-col--expected">
            <div className="scenario-col__header">
              <span className="scenario-tag scenario-tag--highlight">{isMarathi ? 'अपेक्षित (१००%)' : 'Expected (100%)'}</span>
              <span className="scenario-label">{isMarathi ? scenarios.expected.label_mr : scenarios.expected.label}</span>
            </div>
            <div className="scenario-body">
              <div className="scenario-stat">
                <span>{isMarathi ? 'विक्री:' : 'Sales:'}</span>
                <strong>{scenarios.expected.monthlyUnits} {unit}</strong>
              </div>
              <div className="scenario-stat">
                <span>{isMarathi ? 'उलाढाल:' : 'Revenue:'}</span>
                <strong>₹{scenarios.expected.monthlyRevenue.toLocaleString('en-IN')}</strong>
              </div>
              <div className="scenario-profit profit-pos">
                <span>{isMarathi ? 'मासिक निव्वळ नफा:' : 'Net Profit:'}</span>
                <strong>₹{scenarios.expected.monthlyNetProfit.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>

          {/* 3. Optimistic Peak */}
          <div className="scenario-col scenario-col--optimistic">
            <div className="scenario-col__header">
              <span className="scenario-tag">{isMarathi ? 'सणासुदीचा काळ (१३०%)' : 'Optimistic (130%)'}</span>
              <span className="scenario-label">{isMarathi ? scenarios.optimistic.label_mr : scenarios.optimistic.label}</span>
            </div>
            <div className="scenario-body">
              <div className="scenario-stat">
                <span>{isMarathi ? 'विक्री:' : 'Sales:'}</span>
                <strong>{scenarios.optimistic.monthlyUnits} {unit}</strong>
              </div>
              <div className="scenario-stat">
                <span>{isMarathi ? 'उलाढाल:' : 'Revenue:'}</span>
                <strong>₹{scenarios.optimistic.monthlyRevenue.toLocaleString('en-IN')}</strong>
              </div>
              <div className="scenario-profit profit-pos">
                <span>{isMarathi ? 'मासिक निव्वळ नफा:' : 'Net Profit:'}</span>
                <strong>₹{scenarios.optimistic.monthlyNetProfit.toLocaleString('en-IN')}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verified vs Assumptions Disclosure Accordion */}
      <div className="transparency-section">
        <button
          type="button"
          className="transparency-toggle-btn"
          onClick={() => setShowTransparency(!showTransparency)}
          aria-expanded={showTransparency}
        >
          <span>🔍 {isMarathi ? 'आकडेमोड पारदर्शकता: काय सिद्ध आहे व काय गृहीतक आहे?' : 'Data Transparency: Verified vs Assumed Values'}</span>
          <span>{showTransparency ? '▲' : '▼'}</span>
        </button>

        {showTransparency && (
          <div className="transparency-content">
            <table className="transparency-table">
              <thead>
                <tr>
                  <th>{isMarathi ? 'घटक' : 'Item'}</th>
                  <th>{isMarathi ? 'रक्कम / दर' : 'Value'}</th>
                  <th>{isMarathi ? 'स्थिती' : 'Status'}</th>
                  <th>{isMarathi ? 'स्पष्टीकरण' : 'Note'}</th>
                </tr>
              </thead>
              <tbody>
                {dataTransparency.map((item, idx) => (
                  <tr key={idx}>
                    <td><strong>{item.item}</strong></td>
                    <td>{item.value}</td>
                    <td>
                      <span className={`status-pill status-pill--${item.status.toLowerCase().replace(/_/g, '-')}`}>
                        {item.status === 'VERIFIED' ? '✓ Verified' : 'Assumption'}
                      </span>
                    </td>
                    <td><small>{item.note}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
