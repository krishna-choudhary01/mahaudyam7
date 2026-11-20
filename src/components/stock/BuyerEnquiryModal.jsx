/**
 * MahaUdyam — Unsold Stock Rescue
 * BuyerEnquiryModal.jsx
 * 
 * Allows entrepreneurs to initiate and record an enquiry with a buyer.
 * Distinguishes verified directory buyers from manual unverified contacts.
 * Enforces offline draft queueing and ownership validation.
 */

import React, { useState } from 'react';
import { useLanguage } from '../../i18n';
import { unsoldStockService } from '../../services/stock/unsoldStockService.js';
import { DELIVERY_TERMS } from '../../data/stock/stockConstants.js';

export function BuyerEnquiryModal({
  isOpen,
  onClose,
  stock,
  userId,
  initialBuyer = null,
  initialChannel = 'weekly_markets',
  onEnquiryCreated
}) {
  const { t, isMarathi } = useLanguage();
  if (!isOpen || !stock) return null;

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const [buyerName, setBuyerName] = useState(
    initialBuyer ? (isMarathi && initialBuyer.name_mr ? initialBuyer.name_mr : initialBuyer.name) : ''
  );
  const [buyerId] = useState(initialBuyer?.id || null);
  const isVerified = Boolean(initialBuyer?.verificationStatus || initialBuyer?.verificationSource);

  const [recoveryChannel, setRecoveryChannel] = useState(initialChannel);
  const [enquiryQuantity, setEnquiryQuantity] = useState(stock.availableQuantity || 1);
  const [proposedPrice, setProposedPrice] = useState(stock.expectedRecoveryPricePerUnit || 15);
  const [deliveryTerms, setDeliveryTerms] = useState(DELIVERY_TERMS.PICKUP);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e, asDraft = false) => {
    e.preventDefault();
    setErrorMessage(null);

    const qty = Number(enquiryQuantity);
    if (!qty || qty <= 0) {
      setErrorMessage(t('unsoldStock.enquiry.qtyError', 'Quantity must be greater than zero.'));
      return;
    }

    if (qty > Number(stock.availableQuantity)) {
      setErrorMessage(
        t(
          'unsoldStock.enquiry.overageError',
          `Quantity (${qty} ${stock.unit}) cannot exceed available stock (${stock.availableQuantity} ${stock.unit}).`
        )
      );
      return;
    }

    if (!buyerName.trim()) {
      setErrorMessage(t('unsoldStock.enquiry.buyerNameError', 'Please enter a buyer or contact name.'));
      return;
    }

    try {
      setIsSubmitting(true);
      const newEnquiry = await unsoldStockService.createEnquiry(userId, {
        stockId: stock.id,
        buyerId,
        buyerName: buyerName.trim(),
        recoveryChannel,
        enquiryQuantity: qty,
        proposedPricePerUnit: Number(proposedPrice),
        deliveryTerms,
        deliveryNotes: deliveryNotes.trim(),
        isManualRecording: true,
        isOffline: !isOnline || asDraft
      });

      if (onEnquiryCreated) {
        onEnquiryCreated(newEnquiry);
      }
      onClose();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to initiate buyer enquiry.');
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
              ✉️ {t('unsoldStock.enquiry.modalTitle', 'Initiate Buyer Enquiry')}
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

        <form onSubmit={(e) => handleSubmit(e, false)} className="modal-body">
          {/* Offline Warning Banner */}
          {!isOnline && (
            <div className="offline-notice-banner" role="alert">
              ⚠️ {t('unsoldStock.enquiry.offlineWarning', 'You are currently offline. This enquiry will be queued locally as Pending Sync and sent once online.')}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="form-error-banner" role="alert">
              {errorMessage}
            </div>
          )}

          {/* Buyer Information & Verification Badge */}
          <div className="form-group">
            <label className="form-label">
              {t('unsoldStock.enquiry.buyerLabel', 'Target Buyer / Merchant')}
            </label>
            <div className="buyer-display-wrap">
              <input
                type="text"
                className="touch-text-input"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Enter trader, mandi merchant, or processing unit name..."
                required
              />
              <span className={`buyer-verify-tag ${isVerified ? 'verified' : 'unverified'}`}>
                {isVerified
                  ? `✓ ${t('unsoldStock.enquiry.verifiedBuyerBadge', 'Verified Directory Buyer')}`
                  : `⚠️ ${t('unsoldStock.enquiry.unverifiedBuyerBadge', 'Unverified External Contact')}`}
              </span>
            </div>
          </div>

          {/* Quantity & Proposed Price */}
          <div className="form-row-grid">
            <div className="form-group">
              <label className="form-label">
                {t('unsoldStock.enquiry.enquiryQtyLabel', 'Enquiry Quantity')} ({stock.unit}) *
              </label>
              <input
                type="number"
                min="0.1"
                max={stock.availableQuantity}
                step="any"
                className="touch-num-input"
                value={enquiryQuantity}
                onChange={(e) => setEnquiryQuantity(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                {t('unsoldStock.enquiry.proposedPriceLabel', 'Proposed Price / Unit (₹)')}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                className="touch-num-input"
                value={proposedPrice}
                onChange={(e) => setProposedPrice(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Delivery & Logistics Terms */}
          <div className="form-group">
            <label className="form-label">
              {t('unsoldStock.enquiry.deliveryTermsLabel', 'Delivery / Pickup Arrangement')}
            </label>
            <select
              className="touch-select"
              value={deliveryTerms}
              onChange={(e) => setDeliveryTerms(e.target.value)}
            >
              <option value={DELIVERY_TERMS.PICKUP}>
                {t('unsoldStock.enquiry.pickupTerms', 'Buyer Pickup from Village / Farm')}
              </option>
              <option value={DELIVERY_TERMS.DELIVERY}>
                {t('unsoldStock.enquiry.deliveryTerms', 'Entrepreneur Delivers to Mandi / Depot')}
              </option>
              <option value={DELIVERY_TERMS.MUTUAL_TRANSIT}>
                {t('unsoldStock.enquiry.mutualTransitTerms', 'Mutual Midpoint Handover')}
              </option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              {t('unsoldStock.enquiry.deliveryNotesLabel', 'Logistics & Condition Notes')}
            </label>
            <textarea
              className="touch-textarea"
              rows="2"
              value={deliveryNotes}
              onChange={(e) => setDeliveryNotes(e.target.value)}
              placeholder="e.g. Ready in 4 crates, pick up between 8 AM and 11 AM..."
            />
          </div>

          {/* Honest Disclaimer */}
          <div className="manual-disclaimer-box">
            ℹ️ {t('unsoldStock.enquiry.manualRecordDisclaimer', 'Note: Manually recorded by entrepreneur. Does not imply automatic WhatsApp/SMS confirmation.')}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={(e) => handleSubmit(e, true)}
              disabled={isSubmitting}
            >
              {t('unsoldStock.enquiry.saveDraftBtn', 'Save as Draft')}
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : t('unsoldStock.enquiry.submitBtn', 'Send Enquiry')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BuyerEnquiryModal;
