/**
 * MahaUdyam — Unsold Stock Rescue
 * BuyerResponseModal.jsx
 * 
 * Allows entrepreneurs to log buyer responses, counteroffers, or rejections.
 * Preserves a complete negotiation history timeline.
 */

import React, { useState } from 'react';
import { useLanguage } from '../../i18n';
import { unsoldStockService } from '../../services/stock/unsoldStockService.js';

export function BuyerResponseModal({ isOpen, onClose, enquiry, userId, onResponseRecorded }) {
  const { t } = useLanguage();
  if (!isOpen || !enquiry) return null;

  const [responseType, setResponseType] = useState('counteroffer');
  const [offeredPrice, setOfferedPrice] = useState(enquiry.proposedPricePerUnit || 12);
  const [offeredQuantity, setOfferedQuantity] = useState(enquiry.enquiryQuantity || 1);
  const [pickupDeliveryTerms, setPickupDeliveryTerms] = useState(enquiry.deliveryTerms || 'pickup');
  const [conditions, setConditions] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      setIsSubmitting(true);
      const updated = await unsoldStockService.recordBuyerResponse(userId, enquiry.id, {
        responseType,
        offeredPrice: Number(offeredPrice),
        offeredQuantity: Number(offeredQuantity),
        pickupDeliveryTerms,
        conditions: conditions.trim(),
        notes: notes.trim(),
        recordedBy: 'manual_entrepreneur'
      });

      if (onResponseRecorded) {
        onResponseRecorded(updated);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to record buyer response.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">
              💬 {t('unsoldStock.enquiry.responseModalTitle', 'Record Buyer Response / Negotiation')}
            </h3>
            <p className="modal-subtitle">
              Buyer: <strong>{enquiry.buyerName}</strong> • Original Ask: ₹{enquiry.proposedPricePerUnit}/{enquiry.unit}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {errorMsg && (
            <div className="form-error-banner" role="alert">
              {errorMsg}
            </div>
          )}

          {/* Response Type Selector */}
          <div className="form-group">
            <label className="form-label">{t('unsoldStock.enquiry.responseType', 'Response Type')}</label>
            <div className="response-type-pill-group">
              <button
                type="button"
                className={`type-pill ${responseType === 'counteroffer' ? 'active' : ''}`}
                onClick={() => setResponseType('counteroffer')}
              >
                ⚖️ {t('unsoldStock.enquiry.counteroffer', 'Counteroffer Received')}
              </button>
              <button
                type="button"
                className={`type-pill ${responseType === 'acceptance' ? 'active' : ''}`}
                onClick={() => setResponseType('acceptance')}
              >
                ✓ {t('unsoldStock.enquiry.acceptance', 'Full Acceptance')}
              </button>
              <button
                type="button"
                className={`type-pill ${responseType === 'interested' ? 'active' : ''}`}
                onClick={() => setResponseType('interested')}
              >
                👀 {t('unsoldStock.enquiry.interested', 'Expressed Interest')}
              </button>
              <button
                type="button"
                className={`type-pill ${responseType === 'rejection' ? 'active' : ''}`}
                onClick={() => setResponseType('rejection')}
              >
                ✕ {t('unsoldStock.enquiry.rejection', 'Rejection')}
              </button>
            </div>
          </div>

          {/* Price & Quantity Offered */}
          {(responseType === 'counteroffer' || responseType === 'acceptance') && (
            <div className="form-row-grid">
              <div className="form-group">
                <label className="form-label">
                  {t('unsoldStock.enquiry.offeredPrice', 'Buyer Offered Price / Unit (₹)')}
                </label>
                <input
                  type="number"
                  step="any"
                  className="touch-num-input"
                  value={offeredPrice}
                  onChange={(e) => setOfferedPrice(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  {t('unsoldStock.enquiry.offeredQuantity', 'Buyer Offered Quantity')} ({enquiry.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  className="touch-num-input"
                  value={offeredQuantity}
                  onChange={(e) => setOfferedQuantity(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Conditions & Notes */}
          <div className="form-group">
            <label className="form-label">Buyer Terms / Special Conditions</label>
            <input
              type="text"
              className="touch-text-input"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              placeholder="e.g. Requires sorting of grade-A only, cash payment on delivery..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Entrepreneur Follow-up Notes</label>
            <textarea
              className="touch-textarea"
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Spoke on phone, agreed to ₹12.50 if delivered before 10 AM..."
            />
          </div>

          <div className="manual-disclaimer-box">
            ℹ️ {t('unsoldStock.enquiry.manualRecordDisclaimer', 'Note: Manually recorded by entrepreneur. Does not imply automatic WhatsApp/SMS confirmation.')}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : t('unsoldStock.enquiry.recordResponseBtn', 'Save Buyer Response')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BuyerResponseModal;
