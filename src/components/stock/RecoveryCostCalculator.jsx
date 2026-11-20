import React, { useState, useId } from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';
import { unsoldStockService } from '../../services/stock/unsoldStockService';

export function RecoveryCostCalculator({ stock, onSaveCalculation = null }) {
  const { t, isMarathi } = useLanguage();
  const quantityInputId = useId();
  const priceInputId = useId();

  const [quantitySold, setQuantitySold] = useState(stock ? stock.availableQuantity : 0);
  const [expectedPrice, setExpectedPrice] = useState(stock ? (stock.expectedRecoveryPricePerUnit || 0) : 0);
  
  // Expenses breakdown
  const [transportation, setTransportation] = useState(0);
  const [packaging, setPackaging] = useState(0);
  const [processing, setProcessing] = useState(0);
  const [storage, setStorage] = useState(0);
  const [handling, setHandling] = useState(0);
  const [other, setOther] = useState(0);

  if (!stock) return null;

  const calculation = unsoldStockService.calculateRecoveryCosts(stock, {
    expectedQuantitySold: quantitySold,
    expectedRecoveryPricePerUnit: expectedPrice,
    expenses: {
      transportation,
      packaging,
      processing,
      storage,
      handling,
      other
    }
  });

  return (
    <div className="recovery-calculator-card">
      <div className="calc-header">
        <div className="calc-title-row">
          <AppIcon name="analysis" size={20} color="#2e7d32" />
          <h3>{t('unsoldStock.calculator.title')}</h3>
        </div>
        <p className="calc-subtitle">{t('unsoldStock.calculator.subtitle')}</p>
      </div>

      <div className="calc-grid-layout">
        {/* Left Column: Interactive Inputs */}
        <div className="calc-inputs-col">
          <h4 className="calc-section-title">
            <AppIcon name="edit" size={16} />
            <span>{isMarathi ? '१. विक्री व दर अंदाज' : '1. Recovery & Pricing Estimates'}</span>
          </h4>

          <div className="calc-form-group">
            <label htmlFor={quantityInputId}>
              {t('unsoldStock.calculator.expectedQtySold')} ({stock.unit}):
            </label>
            <div className="input-slider-combo">
              <input
                id={quantityInputId}
                type="number"
                min="0"
                max={stock.availableQuantity}
                value={quantitySold}
                onChange={(e) => setQuantitySold(Math.min(stock.availableQuantity, Math.max(0, Number(e.target.value))))}
                className="touch-num-input"
              />
              <span className="unit-tag">{stock.unit}</span>
            </div>
            <span className="input-hint">
              {isMarathi ? `एकूण उपलब्ध: ${stock.availableQuantity} ${stock.unit}` : `Total available: ${stock.availableQuantity} ${stock.unit}`}
            </span>
          </div>

          <div className="calc-form-group">
            <label htmlFor={priceInputId}>
              {t('unsoldStock.calculator.expectedPricePerUnit')} (₹/{stock.unit}):
            </label>
            <div className="input-slider-combo">
              <input
                id={priceInputId}
                type="number"
                min="0"
                value={expectedPrice}
                onChange={(e) => setExpectedPrice(Math.max(0, Number(e.target.value)))}
                className="touch-num-input"
              />
              <span className="unit-tag">₹ / {stock.unit}</span>
            </div>
          </div>

          <h4 className="calc-section-title mt-3">
            <AppIcon name="shop" size={16} />
            <span>{t('unsoldStock.calculator.expensesHeader')}</span>
          </h4>

          <div className="expenses-form-grid">
            <div className="expense-field">
              <label>{t('unsoldStock.calculator.transportation')} (₹):</label>
              <input
                type="number"
                min="0"
                value={transportation}
                onChange={(e) => setTransportation(Math.max(0, Number(e.target.value)))}
                className="touch-num-input-sm"
              />
            </div>

            <div className="expense-field">
              <label>{t('unsoldStock.calculator.packaging')} (₹):</label>
              <input
                type="number"
                min="0"
                value={packaging}
                onChange={(e) => setPackaging(Math.max(0, Number(e.target.value)))}
                className="touch-num-input-sm"
              />
            </div>

            <div className="expense-field">
              <label>{t('unsoldStock.calculator.processing')} (₹):</label>
              <input
                type="number"
                min="0"
                value={processing}
                onChange={(e) => setProcessing(Math.max(0, Number(e.target.value)))}
                className="touch-num-input-sm"
              />
            </div>

            <div className="expense-field">
              <label>{t('unsoldStock.calculator.storage')} (₹):</label>
              <input
                type="number"
                min="0"
                value={storage}
                onChange={(e) => setStorage(Math.max(0, Number(e.target.value)))}
                className="touch-num-input-sm"
              />
            </div>

            <div className="expense-field">
              <label>{t('unsoldStock.calculator.handling')} (₹):</label>
              <input
                type="number"
                min="0"
                value={handling}
                onChange={(e) => setHandling(Math.max(0, Number(e.target.value)))}
                className="touch-num-input-sm"
              />
            </div>

            <div className="expense-field">
              <label>{t('unsoldStock.calculator.otherExpenses')} (₹):</label>
              <input
                type="number"
                min="0"
                value={other}
                onChange={(e) => setOther(Math.max(0, Number(e.target.value)))}
                className="touch-num-input-sm"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Calculated Results Matrix */}
        <div className="calc-results-col">
          <h4 className="calc-section-title">
            <AppIcon name="analysis" size={16} />
            <span>{isMarathi ? '२. पारदर्शक मूल्य विवरण' : '2. Transparent Value Breakdown'}</span>
          </h4>

          <div className="calc-metric-cards">
            {/* Revenue */}
            <div className="calc-card-row">
              <span className="calc-card-label">{t('unsoldStock.calculator.potentialRevenue')}:</span>
              <strong className="calc-card-val text-success">
                + ₹{calculation.potentialRecoveryRevenue.toLocaleString()}
              </strong>
            </div>

            {/* Total Additional Expenses */}
            <div className="calc-card-row">
              <span className="calc-card-label">{t('unsoldStock.calculator.totalExpenses')}:</span>
              <strong className="calc-card-val text-danger">
                - ₹{calculation.expenses.totalAdditionalExpenses.toLocaleString()}
              </strong>
            </div>

            {/* NET RECOVERY VALUE (Highlight) */}
            <div className="calc-card-row calc-card-row--primary">
              <span className="calc-card-label font-bold">
                {t('unsoldStock.calculator.netRecoveryValue')}:
              </span>
              <span className="calc-card-val-lg font-bold">
                ₹{calculation.netRecoveryValue.toLocaleString()}
              </span>
            </div>

            {/* Original Cost & Attributable Cost Comparison */}
            <div className="calc-divider" />

            <div className="calc-card-row">
              <span className="calc-card-label">{t('unsoldStock.calculator.originalCostPerUnit')}:</span>
              <span>
                {calculation.isOriginalCostKnown
                  ? `₹${calculation.originalCostPerUnit.toFixed(1)} / ${stock.unit}`
                  : (isMarathi ? 'नोंद नाही (अज्ञात)' : 'Unrecorded (Unknown)')}
              </span>
            </div>

            {calculation.isOriginalCostKnown ? (
              <>
                <div className="calc-card-row">
                  <span className="calc-card-label">
                    {t('unsoldStock.calculator.attributableCost')} ({calculation.expectedQuantitySold} {stock.unit}):
                  </span>
                  <span className="text-muted">
                    ₹{Math.round(calculation.attributableInventoryCost).toLocaleString()}
                  </span>
                </div>

                <div className="calc-card-row">
                  <span className="calc-card-label">{t('unsoldStock.calculator.netVsAttributable')}:</span>
                  <strong className={calculation.netRecoveryVsAttributableCost >= 0 ? 'text-success' : 'text-danger'}>
                    {calculation.netRecoveryVsAttributableCost >= 0 ? '+' : ''}
                    ₹{Math.round(calculation.netRecoveryVsAttributableCost).toLocaleString()}
                  </strong>
                </div>

                {calculation.remainingQuantity > 0 && (
                  <div className="calc-card-row">
                    <span className="calc-card-label">
                      {t('unsoldStock.calculator.unrecoveredValue')} ({calculation.remainingQuantity} {stock.unit}):
                    </span>
                    <span className="text-warning">
                      ₹{Math.round(calculation.unrecoveredInventoryValue).toLocaleString()}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="calc-notice-banner">
                ℹ️ {t('unsoldStock.calculator.costUnknownNotice')}
              </div>
            )}
          </div>

          <div className="calc-partial-tip">
            {t('unsoldStock.calculator.partialNotice')}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecoveryCostCalculator;
