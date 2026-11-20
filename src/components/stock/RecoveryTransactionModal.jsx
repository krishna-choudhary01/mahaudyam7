/**
 * MahaUdyam — Unsold Stock Rescue
 * RecoveryTransactionModal.jsx
 * 
 * Allows entrepreneurs to record a confirmed recovery transaction.
 * Supports partial recovery, itemized expenses, and strict quantity overage protection.
 */

import React, { useState } from 'react';
import { useLanguage } from '../../i18n';
import { unsoldStockService } from '../../services/stock/unsoldStockService.js';
import { PAYMENT_STATUSES, TRANSACTION_COMPLETION_STATUSES } from '../../data/stock/stockConstants.js';

export function RecoveryTransactionModal({
  isOpen,
  onClose,
  stock,
  userId,
  initialBuyerName = '',
  initialBuyerId = null,
  initialChannel = 'weekly_markets',
  initialPrice = null,
  initialQuantity = null,
  linkedEnquiryId = null,
  onTransactionCompleted
}) {
  const { t, isMarathi } = useLanguage();
  if (!isOpen || !stock) return null;

  const availQty = Number(stock.availableQuantity) || 0;

  const [buyerName, setBuyerName] = useState(initialBuyerName || 'Local Buyer');
  const [agreedQuantity, setAgreedQuantity] = useState(
    initialQuantity != null ? Math.min(availQty, Number(initialQuantity)) : availQty
  );
  const [agreedPricePerUnit, setAgreedPricePerUnit] = useState(
    initialPrice != null ? Number(initialPrice) : (stock.expectedRecoveryPricePerUnit || 15)
  );
  const [recoveryChannel, setRecoveryChannel] = useState(initialChannel);

  // Expenses itemization
  const [transportation, setTransportation] = useState(100);
  const [packaging, setPackaging] = useState(30);
  const [processing, setProcessing] = useState(0);
  const [storage, setStorage] = useState(0);
  const [handling, setHandling] = useState(40);
  const [otherExpenses, setOtherExpenses] = useState(0);

  const [paymentStatus, setPaymentStatus] = useState(PAYMENT_STATUSES.PAID);
  const [completionStatus, setCompletionStatus] = useState(TRANSACTION_COMPLETION_STATUSES.COMPLETED);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Live Calculations
  const qtyNum = Number(agreedQuantity) || 0;
  const priceNum = Number(agreedPricePerUnit) || 0;
  const grossRevenue = Math.round(qtyNum * priceNum);
  const totalExpenses =
    Number(transportation || 0) +
    Number(packaging || 0) +
    Number(processing || 0) +
    Number(storage || 0) +
    Number(handling || 0) +
    Number(otherExpenses || 0);
  const netRecoveryValue = grossRevenue - totalExpenses;

  // Attributable inventory cost
  const origCost =
    stock.originalTotalCost != null && stock.originalQuantity
      ? Number(stock.originalTotalCost) / Number(stock.originalQuantity)
      : null;
  const attributableCost = origCost != null ? Math.round(origCost * qtyNum) : null;
  const netVsAttributable = attributableCost != null ? netRecoveryValue - attributableCost : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (qtyNum <= 0) {
      setErrorMessage(t('unsoldStock.transaction.qtyError', 'Quantity must be greater than zero.'));
      return;
    }

    if (qtyNum > availQty) {
      setErrorMessage(
        t(
          'unsoldStock.transaction.overageError',
          `Confirmed quantity (${qtyNum} ${stock.unit}) cannot exceed currently available quantity (${availQty} ${stock.unit}).`
        )
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await unsoldStockService.createRecoveryTransaction(userId, {
        stockId: stock.id,
        enquiryId: linkedEnquiryId,
        buyerId: initialBuyerId,
        buyerName: buyerName.trim(),
        recoveryChannel,
        agreedQuantity: qtyNum,
        agreedPricePerUnit: priceNum,
        expenses: {
          transportation: Number(transportation || 0),
          packaging: Number(packaging || 0),
          processing: Number(processing || 0),
          storage: Number(storage || 0),
          handling: Number(handling || 0),
          other: Number(otherExpenses || 0)
        },
        paymentStatus,
        recoveryCompletionStatus: completionStatus,
        isDemoTransaction: false
      });

      if (onTransactionCompleted) {
        onTransactionCompleted(result);
      }
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to record recovery transaction.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">
              💰 {t('unsoldStock.transaction.modalTitle', 'Record Recovery Transaction')}
            </h3>
            <p className="modal-subtitle">
              {isMarathi ? (stock.productName_mr || stock.productName) : stock.productName} •{' '}
              {stock.availableQuantity} {stock.unit} available
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {errorMessage && (
            <div className="form-error-banner" role="alert">
              {errorMessage}
            </div>
          )}

          <div className="tx-form-grid">
            {/* Left Column: Transaction Details */}
            <div className="tx-form-col">
              <h4 className="tx-col-heading">1. Sale Details</h4>

              <div className="form-group">
                <label className="form-label">Buyer / Merchant Name</label>
                <input
                  type="text"
                  className="touch-text-input"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  required
                />
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label className="form-label">
                    {t('unsoldStock.transaction.agreedQtyLabel', 'Confirmed Quantity *')} ({stock.unit})
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    max={availQty}
                    step="any"
                    className="touch-num-input"
                    value={agreedQuantity}
                    onChange={(e) => setAgreedQuantity(e.target.value)}
                    required
                  />
                  <small className="form-help-text">Max available: {availQty} {stock.unit}</small>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {t('unsoldStock.transaction.agreedPriceLabel', 'Agreed Price / Unit (₹) *')}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="touch-num-input"
                    value={agreedPricePerUnit}
                    onChange={(e) => setAgreedPricePerUnit(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row-grid">
                <div className="form-group">
                  <label className="form-label">{t('unsoldStock.transaction.paymentStatus', 'Payment Status')}</label>
                  <select
                    className="touch-select"
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                  >
                    <option value={PAYMENT_STATUSES.PAID}>Paid in Full</option>
                    <option value={PAYMENT_STATUSES.PARTIAL}>Partial Payment</option>
                    <option value={PAYMENT_STATUSES.PENDING}>Payment Pending</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">{t('unsoldStock.transaction.completionStatus', 'Completion Status')}</label>
                  <select
                    className="touch-select"
                    value={completionStatus}
                    onChange={(e) => setCompletionStatus(e.target.value)}
                  >
                    <option value={TRANSACTION_COMPLETION_STATUSES.COMPLETED}>Completed & Handed Over</option>
                    <option value={TRANSACTION_COMPLETION_STATUSES.DELIVERED}>Delivered to Depot</option>
                    <option value={TRANSACTION_COMPLETION_STATUSES.IN_TRANSIT}>In Transit</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Column: Incurred Recovery Expenses */}
            <div className="tx-form-col">
              <h4 className="tx-col-heading">2. Additional Expenses Incurred</h4>

              <div className="expenses-form-grid">
                <div className="expense-field">
                  <label>Transportation (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="touch-num-input-sm"
                    value={transportation}
                    onChange={(e) => setTransportation(e.target.value)}
                  />
                </div>
                <div className="expense-field">
                  <label>Packaging (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="touch-num-input-sm"
                    value={packaging}
                    onChange={(e) => setPackaging(e.target.value)}
                  />
                </div>
                <div className="expense-field">
                  <label>Processing (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="touch-num-input-sm"
                    value={processing}
                    onChange={(e) => setProcessing(e.target.value)}
                  />
                </div>
                <div className="expense-field">
                  <label>Storage (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="touch-num-input-sm"
                    value={storage}
                    onChange={(e) => setStorage(e.target.value)}
                  />
                </div>
                <div className="expense-field">
                  <label>Handling / Labor (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="touch-num-input-sm"
                    value={handling}
                    onChange={(e) => setHandling(e.target.value)}
                  />
                </div>
                <div className="expense-field">
                  <label>Other Expenses (₹)</label>
                  <input
                    type="number"
                    min="0"
                    className="touch-num-input-sm"
                    value={otherExpenses}
                    onChange={(e) => setOtherExpenses(e.target.value)}
                  />
                </div>
              </div>

              {/* Real-time Summary Box */}
              <div className="tx-summary-box">
                <div className="tx-sum-row">
                  <span>{t('unsoldStock.transaction.grossRevenue', 'Gross Revenue')}:</span>
                  <strong>₹{grossRevenue.toLocaleString('en-IN')}</strong>
                </div>
                <div className="tx-sum-row">
                  <span>Total Incurred Expenses:</span>
                  <span className="text-danger">-₹{totalExpenses.toLocaleString('en-IN')}</span>
                </div>
                <div className="tx-sum-row highlight">
                  <span>{t('unsoldStock.transaction.netRecoveryValue', 'Actual Net Recovery Value')}:</span>
                  <strong className="text-success">₹{netRecoveryValue.toLocaleString('en-IN')}</strong>
                </div>

                {attributableCost != null ? (
                  <div className="tx-sum-row small">
                    <span>{t('unsoldStock.transaction.netVsAttributable', 'Net vs Capital')}:</span>
                    <span className={netVsAttributable >= 0 ? 'text-success' : 'text-danger'}>
                      {netVsAttributable >= 0 ? '+' : ''}₹{netVsAttributable.toLocaleString('en-IN')}
                    </span>
                  </div>
                ) : (
                  <div className="tx-sum-row small muted">
                    <span>Attributable Cost: Unrecorded purchase cost</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : t('unsoldStock.transaction.createTxBtn', 'Confirm & Record Transaction')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RecoveryTransactionModal;
