import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';
import {
  STOCK_CATEGORIES,
  PERISHABILITY_LEVELS,
  PRODUCT_CONDITIONS,
  UNITS_OF_MEASUREMENT,
  STORAGE_CONDITIONS,
  PACKAGING_CONDITIONS
} from '../../data/stock/stockConstants.js';
import { locationService } from '../../services/location/locationService.js';
import { unsoldStockService } from '../../services/stock/unsoldStockService.js';

export function RegisterStockModal({ userId, onClose, onSuccess }) {
  const { t, isMarathi } = useLanguage();

  const [activeStep, setActiveStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Step 1: Product Information
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState(STOCK_CATEGORIES.VEGETABLES_FRUITS);
  const [availableQuantity, setAvailableQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [condition, setCondition] = useState(PRODUCT_CONDITIONS.GOOD);
  const [perishability, setPerishability] = useState(PERISHABILITY_LEVELS.PERISHABLE);
  const [remainingShelfLifeHours, setRemainingShelfLifeHours] = useState('48');

  // Step 2: Financial Information (Optional when unknown)
  const [originalTotalCost, setOriginalTotalCost] = useState('');
  const [originalQuantity, setOriginalQuantity] = useState('');
  const [originalSellingPricePerUnit, setOriginalSellingPricePerUnit] = useState('');
  const [expectedRecoveryPricePerUnit, setExpectedRecoveryPricePerUnit] = useState('');

  // Step 3: Location & Storage
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(490); // Nashik
  const [talukas, setTalukas] = useState([]);
  const [selectedTaluka, setSelectedTaluka] = useState(4154); // Sinnar
  const [villages, setVillages] = useState([]);
  const [selectedVillage, setSelectedVillage] = useState(551322); // Baragaon Pimpri

  const [storageCondition, setStorageCondition] = useState('shaded_ventilated');
  const [packagingCondition, setPackagingCondition] = useState('plastic_crate');
  const [notes, setNotes] = useState('');

  // Load locations on mount
  useEffect(() => {
    const dList = locationService.getAllDistricts();
    setDistricts(dList);
    const tList = locationService.getTalukasForDistrict(selectedDistrict);
    setTalukas(tList);
    loadVillages(selectedDistrict, selectedTaluka);
  }, []);

  const loadVillages = async (dCode, tCode) => {
    try {
      const res = await locationService.getVillagesForTaluka(dCode, tCode);
      const list = Array.isArray(res) ? res : (res?.villages || []);
      setVillages(list);
    } catch (e) {
      setVillages([]);
    }
  };

  const handleDistrictChange = (e) => {
    const dCode = Number(e.target.value);
    setSelectedDistrict(dCode);
    const tList = locationService.getTalukasForDistrict(dCode);
    setTalukas(tList);
    const firstTaluka = tList[0]?.code || '';
    setSelectedTaluka(firstTaluka);
    loadVillages(dCode, firstTaluka);
  };

  const handleTalukaChange = (e) => {
    const tCode = Number(e.target.value);
    setSelectedTaluka(tCode);
    loadVillages(selectedDistrict, tCode);
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!productName.trim()) {
      setError(isMarathi ? 'कृपया मालाचे नाव टाका.' : 'Product name is required.');
      setActiveStep(1);
      return;
    }

    if (!availableQuantity || Number(availableQuantity) <= 0) {
      setError(isMarathi ? 'कृपया वैध प्रमाण टाका (> 0).' : 'Please enter valid quantity greater than 0.');
      setActiveStep(1);
      return;
    }

    setSubmitting(true);
    try {
      const distObj = locationService.getDistrictByCode(selectedDistrict);
      const talObj = locationService.getTalukaByCode(selectedTaluka);
      const safeVillages = Array.isArray(villages) ? villages : [];
      const villObj = safeVillages.find((v) => (v.code || v.c) === Number(selectedVillage));

      const stockPayload = {
        productName: productName.trim(),
        productName_mr: productName.trim(),
        category,
        availableQuantity: Number(availableQuantity),
        unit,
        condition,
        perishability,
        remainingShelfLifeHours: perishability !== PERISHABILITY_LEVELS.NON_PERISHABLE && remainingShelfLifeHours !== ''
          ? Number(remainingShelfLifeHours)
          : null,

        // Financials
        originalTotalCost: originalTotalCost !== '' ? Number(originalTotalCost) : null,
        originalQuantity: originalQuantity !== '' ? Number(originalQuantity) : Number(availableQuantity),
        originalSellingPricePerUnit: originalSellingPricePerUnit !== '' ? Number(originalSellingPricePerUnit) : null,
        expectedRecoveryPricePerUnit: expectedRecoveryPricePerUnit !== '' ? Number(expectedRecoveryPricePerUnit) : null,
        financialsEstimated: originalTotalCost === '',

        // Location
        districtCode: selectedDistrict,
        districtName: distObj?.name || 'Nashik',
        districtName_mr: distObj?.marathiName || 'नाशिक',
        talukaCode: selectedTaluka,
        talukaName: talObj?.name || 'Sinnar',
        talukaName_mr: talObj?.marathiName || 'सिन्नर',
        villageCode: selectedVillage,
        villageName: villObj ? (villObj.name_en || villObj.n) : 'Village',
        villageName_mr: villObj ? (villObj.name_mr || villObj.m) : 'गाव',

        // Storage & Notes
        storageCondition,
        packagingCondition,
        notes: notes.trim()
      };

      const saved = await unsoldStockService.registerStock(userId, stockPayload);
      if (onSuccess) onSuccess(saved);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to register stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card register-stock-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <AppIcon name="box" size={22} color="#2e7d32" />
            <h3>{t('unsoldStock.registerModal.modalTitle')}</h3>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close">
            <AppIcon name="close" size={18} />
          </button>
        </div>

        {/* Step Wizard Indicator */}
        <div className="wizard-steps-bar">
          <button
            type="button"
            className={`wizard-step-btn ${activeStep === 1 ? 'active' : ''} ${activeStep > 1 ? 'completed' : ''}`}
            onClick={() => setActiveStep(1)}
          >
            <span>1</span> {t('unsoldStock.registerModal.step1')}
          </button>
          <button
            type="button"
            className={`wizard-step-btn ${activeStep === 2 ? 'active' : ''} ${activeStep > 2 ? 'completed' : ''}`}
            onClick={() => setActiveStep(2)}
          >
            <span>2</span> {t('unsoldStock.registerModal.step2')}
          </button>
          <button
            type="button"
            className={`wizard-step-btn ${activeStep === 3 ? 'active' : ''}`}
            onClick={() => setActiveStep(3)}
          >
            <span>3</span> {t('unsoldStock.registerModal.step3')}
          </button>
        </div>

        {error && <div className="alert-banner alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="register-stock-form">
          {/* STEP 1: Product Information */}
          {activeStep === 1 && (
            <div className="step-content">
              <div className="form-group">
                <label>{t('unsoldStock.registerModal.productName')}</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder={t('unsoldStock.registerModal.productNamePlaceholder')}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group-row">
                <div className="form-group flex-1">
                  <label>{t('unsoldStock.registerModal.category')}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="form-select"
                  >
                    {Object.values(STOCK_CATEGORIES).map((catKey) => (
                      <option key={catKey} value={catKey}>
                        {t(`unsoldStock.categories.${catKey}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label>{t('unsoldStock.registerModal.unit')}</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="form-select"
                  >
                    {UNITS_OF_MEASUREMENT.map((u) => (
                      <option key={u.value} value={u.value}>
                        {isMarathi ? u.label_mr : u.label_en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-group flex-1">
                  <label>{t('unsoldStock.registerModal.quantity')}</label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={availableQuantity}
                    onChange={(e) => setAvailableQuantity(e.target.value)}
                    placeholder="e.g. 50"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group flex-1">
                  <label>{t('unsoldStock.registerModal.condition')}</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="form-select"
                  >
                    {Object.values(PRODUCT_CONDITIONS).map((cKey) => (
                      <option key={cKey} value={cKey}>
                        {t(`unsoldStock.conditions.${cKey}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-group flex-1">
                  <label>{t('unsoldStock.registerModal.perishability')}</label>
                  <select
                    value={perishability}
                    onChange={(e) => setPerishability(e.target.value)}
                    className="form-select"
                  >
                    {Object.values(PERISHABILITY_LEVELS).map((pKey) => (
                      <option key={pKey} value={pKey}>
                        {t(`unsoldStock.perishability.${pKey}`)}
                      </option>
                    ))}
                  </select>
                </div>

                {perishability !== PERISHABILITY_LEVELS.NON_PERISHABLE && (
                  <div className="form-group flex-1">
                    <label>{t('unsoldStock.registerModal.shelfLife')}</label>
                    <input
                      type="number"
                      min="1"
                      value={remainingShelfLifeHours}
                      onChange={(e) => setRemainingShelfLifeHours(e.target.value)}
                      placeholder="e.g. 48"
                      className="form-input"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: Financial Details */}
          {activeStep === 2 && (
            <div className="step-content">
              <div className="info-banner-tip mb-3">
                {isMarathi
                  ? 'टीप: खरेदी किंमत माहित नसल्यास किंवा घरचा शेतमाल असल्यास हे रकाने रिकामे ठेवू शकता.'
                  : 'Note: If purchase cost is unknown or self-produced, leave blank. Calculations will adapt transparently.'}
              </div>

              <div className="form-group-row">
                <div className="form-group flex-1">
                  <label>{t('unsoldStock.registerModal.originalCost')}</label>
                  <input
                    type="number"
                    min="0"
                    value={originalTotalCost}
                    onChange={(e) => setOriginalTotalCost(e.target.value)}
                    placeholder="e.g. 1500"
                    className="form-input"
                  />
                  <span className="input-hint">{t('unsoldStock.registerModal.originalCostHelp')}</span>
                </div>

                <div className="form-group flex-1">
                  <label>{t('unsoldStock.registerModal.originalQty')} ({unit}):</label>
                  <input
                    type="number"
                    min="0"
                    value={originalQuantity}
                    onChange={(e) => setOriginalQuantity(e.target.value)}
                    placeholder={availableQuantity || 'Original batch qty'}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group-row">
                <div className="form-group flex-1">
                  <label>{t('unsoldStock.registerModal.sellingPrice')}</label>
                  <input
                    type="number"
                    min="0"
                    value={originalSellingPricePerUnit}
                    onChange={(e) => setOriginalSellingPricePerUnit(e.target.value)}
                    placeholder="Original retail target"
                    className="form-input"
                  />
                </div>

                <div className="form-group flex-1">
                  <label>{t('unsoldStock.registerModal.expectedRecoveryPrice')}</label>
                  <input
                    type="number"
                    min="0"
                    value={expectedRecoveryPricePerUnit}
                    onChange={(e) => setExpectedRecoveryPricePerUnit(e.target.value)}
                    placeholder="Target discounted price"
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Location, Storage & Notes */}
          {activeStep === 3 && (
            <div className="step-content">
              <div className="form-group-row">
                <div className="form-group flex-1">
                  <label>{isMarathi ? 'जिल्हा:' : 'District:'}</label>
                  <select
                    value={selectedDistrict}
                    onChange={handleDistrictChange}
                    className="form-select"
                  >
                    {districts.map((d) => (
                      <option key={d.code} value={d.code}>
                        {isMarathi ? d.marathiName : d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label>{isMarathi ? 'तालुका:' : 'Taluka:'}</label>
                  <select
                    value={selectedTaluka}
                    onChange={handleTalukaChange}
                    className="form-select"
                  >
                    {talukas.map((t) => (
                      <option key={t.code} value={t.code}>
                        {isMarathi ? t.marathiName : t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>{isMarathi ? 'गाव:' : 'Village:'}</label>
                <select
                  value={selectedVillage}
                  onChange={(e) => setSelectedVillage(Number(e.target.value))}
                  className="form-select"
                >
                  {(Array.isArray(villages) ? villages : []).map((v) => (
                    <option key={v.code || v.c} value={v.code || v.c}>
                      {isMarathi ? (v.name_mr || v.m) : (v.name_en || v.n)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group-row">
                <div className="form-group flex-1">
                  <label>{t('unsoldStock.registerModal.storageCondition')}</label>
                  <select
                    value={storageCondition}
                    onChange={(e) => setStorageCondition(e.target.value)}
                    className="form-select"
                  >
                    {STORAGE_CONDITIONS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {isMarathi ? s.label_mr : s.label_en}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label>{t('unsoldStock.registerModal.packagingCondition')}</label>
                  <select
                    value={packagingCondition}
                    onChange={(e) => setPackagingCondition(e.target.value)}
                    className="form-select"
                  >
                    {PACKAGING_CONDITIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {isMarathi ? p.label_mr : p.label_en}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>{t('unsoldStock.registerModal.notes')}</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isMarathi ? 'उदा. मालाचा दर्जा, बाजार संपल्याची वेळ...' : 'e.g. Market leftover notes, grading condition...'}
                  className="form-textarea"
                />
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="modal-actions-bar">
            {activeStep > 1 && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setActiveStep(activeStep - 1)}
                disabled={submitting}
              >
                ← {isMarathi ? 'मागे' : 'Back'}
              </button>
            )}

            {activeStep < 3 ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setActiveStep(activeStep + 1)}
              >
                {isMarathi ? 'पुढे →' : 'Next Step →'}
              </button>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting
                  ? (isMarathi ? 'जतन करत आहे...' : 'Saving Stock...')
                  : t('unsoldStock.registerModal.submit')}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterStockModal;
