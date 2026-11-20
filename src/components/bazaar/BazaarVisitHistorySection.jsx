import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';
import { bazaarPerformanceService } from '../../services/bazaar/bazaarPerformanceService.js';
import { bazaarDataService } from '../../services/bazaar/bazaarDataService.js';

export function BazaarVisitHistorySection({ userId, onVisitRecorded }) {
  const { t, isMarathi } = useLanguage();

  const [history, setHistory] = useState([]);
  const [intel, setIntel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allMarkets, setAllMarkets] = useState([]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalForm, setModalForm] = useState({
    marketId: '',
    visitDate: new Date().toISOString().split('T')[0],
    productCategory: 'Vegetables',
    productName: 'Tomatoes',
    quantityTaken: '100',
    quantitySold: '85',
    quantityUnit: 'kg',
    productCostPerUnit: '15',
    expectedPricePerUnit: '25',
    actualSellingPricePerUnit: '24',
    travelExpense: '120',
    stallFee: '50',
    packagingExpense: '30',
    otherExpenses: '10',
    notes: '',
    customerResponse: 'moderate'
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);
  const [successBanner, setSuccessBanner] = useState(null);

  // Load Visit Data & Markets
  const loadData = async () => {
    setLoading(true);
    try {
      await bazaarPerformanceService.init();
      const list = await bazaarPerformanceService.getVisitHistory(userId);
      setHistory(list);

      const metrics = await bazaarPerformanceService.getMarketPerformanceIntelligence(userId);
      setIntel(metrics);

      const markets = await bazaarDataService.getAllMarkets();
      setAllMarkets(markets);
      if (markets.length > 0 && !modalForm.marketId) {
        setModalForm((prev) => ({ ...prev, marketId: markets[0].id }));
      }
    } catch (err) {
      console.error('Failed to load visit history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  // Live Modal calculations
  const qtyTaken = Number(modalForm.quantityTaken) || 0;
  const qtySold = Number(modalForm.quantitySold) || 0;
  const actualPrice = Number(modalForm.actualSellingPricePerUnit) || 0;
  const costUnit = Number(modalForm.productCostPerUnit) || 0;
  const travelCost = Number(modalForm.travelExpense) || 0;
  const feeCost = Number(modalForm.stallFee) || 0;
  const pkgCost = Number(modalForm.packagingExpense) || 0;
  const otherCost = Number(modalForm.otherExpenses) || 0;

  const liveRevenue = qtySold * actualPrice;
  const liveExpenses = travelCost + feeCost + pkgCost + otherCost + ((qtyTaken - qtySold) * costUnit);
  const liveNetProfit = liveRevenue - (qtySold * costUnit) - (travelCost + feeCost + pkgCost + otherCost);
  const liveSellThrough = qtyTaken > 0 ? Math.round((qtySold / qtyTaken) * 100) : 0;

  // Handle Form Submit
  const handleSaveVisit = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (qtySold > qtyTaken) {
        throw new Error(isMarathi ? 'विक्री झालेले प्रमाण आणलेल्या प्रमाणापेक्षा जास्त असू शकत नाही.' : 'Quantity sold cannot exceed quantity carried.');
      }

      await bazaarPerformanceService.recordMarketVisit(userId, {
        marketId: modalForm.marketId,
        visitDate: modalForm.visitDate,
        productCategory: modalForm.productCategory,
        productName: modalForm.productName,
        quantityTaken: qtyTaken,
        quantitySold: qtySold,
        quantityUnit: modalForm.quantityUnit,
        productCostPerUnit: costUnit,
        expectedPricePerUnit: Number(modalForm.expectedPricePerUnit),
        actualSellingPricePerUnit: actualPrice,
        expenses: {
          travelExpense: travelCost,
          stallFee: feeCost,
          packagingExpense: pkgCost,
          otherExpenses: otherCost
        },
        notes: modalForm.notes,
        customerResponse: modalForm.customerResponse
      });

      setSuccessBanner(isMarathi ? 'बाजार भेट व प्रत्यक्ष विक्री यशस्वीरित्या नोंदवली!' : 'Market visit and actual profit logged successfully!');
      setShowModal(false);
      await loadData();
      if (onVisitRecorded) onVisitRecorded();
    } catch (err) {
      setFormError(err.message || 'Failed to record visit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bazaar-performance-section">
      {/* 1. Header & Actions */}
      <div className="history-header-card">
        <div className="history-header-left">
          <h3>{isMarathi ? 'प्रत्यक्ष बाजार भेट व नफा इतिहास' : 'Market Visit History & Actuals Intelligence'}</h3>
          <p>
            {isMarathi
              ? 'आठवडे बाजारातील प्रत्यक्ष विक्री, खर्च व नफ्याची नोंद ठेवा. ही माहिती भविष्यातील बाजार शिफारसी अधिक अचूक बनवते.'
              : 'Log actual weekly haat sales and expenses to evaluate realized margins and refine future market recommendations.'}
          </p>
        </div>
        <button
          type="button"
          className="btn-record-visit"
          onClick={() => {
            setFormError(null);
            setShowModal(true);
          }}
        >
          <AppIcon name="plus" size={16} />
          <span>{isMarathi ? '+ बाजार भेटीची नोंद करा' : '+ Record Market Visit'}</span>
        </button>
      </div>

      {successBanner && (
        <div className="history-success-banner">
          <AppIcon name="check-circle" size={16} color="#2e7d32" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* 2. Aggregate Intelligence Metrics */}
      {intel && intel.totalVisits > 0 && (
        <div className="history-metrics-grid">
          <div className="metric-box">
            <span className="metric-label">{isMarathi ? 'एकूण बाजार फेऱ्या' : 'Total Trips'}</span>
            <strong className="metric-num">{intel.totalVisits}</strong>
            <span className="metric-sub">{intel.totalVolumeSold} {isMarathi ? 'एकक विक्री' : 'units sold'}</span>
          </div>
          <div className="metric-box highlight-green">
            <span className="metric-label">{isMarathi ? 'एकूण प्रत्यक्ष निव्वळ नफा' : 'Total Net Profit'}</span>
            <strong className="metric-num">₹{intel.totalNetProfit.toLocaleString('en-IN')}</strong>
            <span className="metric-sub">₹{intel.avgNetProfitPerVisit} {isMarathi ? '/ फेरी सरासरी' : '/ trip avg'}</span>
          </div>
          <div className="metric-box">
            <span className="metric-label">{isMarathi ? 'सरासरी विक्री प्रमाण' : 'Avg. Sell-Through'}</span>
            <strong className="metric-num">{intel.avgSellThroughRate}%</strong>
            <span className="metric-sub">{intel.avgSellThroughRate >= 80 ? '🟢 ' + (isMarathi ? 'उत्कृष्ट' : 'Optimal') : '🟠 ' + (isMarathi ? 'सुधारणा आवश्यक' : 'Moderate')}</span>
          </div>
          <div className="metric-box">
            <span className="metric-label">{isMarathi ? 'सर्वात फायदेशीर बाजार' : 'Top Performing Market'}</span>
            <strong className="metric-num" style={{ fontSize: '1rem' }}>
              {isMarathi ? (intel.topMarket?.marketName_mr || intel.topMarket?.marketName || '—') : (intel.topMarket?.marketName || '—')}
            </strong>
            <span className="metric-sub">{intel.topMarket ? `₹${intel.topMarket.totalProfit} ${isMarathi ? 'नफा' : 'profit'}` : ''}</span>
          </div>
        </div>
      )}

      {/* 3. Table of Historical Visits */}
      {loading ? (
        <div className="history-loading">
          <div className="spinner-icon">🔄</div>
          <p>{isMarathi ? 'इतिहास लोड होत आहे...' : 'Loading recorded visits...'}</p>
        </div>
      ) : history.length === 0 ? (
        <div className="history-empty-card">
          <AppIcon name="calendar" size={40} color="#888" />
          <h4>{isMarathi ? 'कोणतीही बाजार भेट नोंदवलेली नाही' : 'No Market Visits Recorded Yet'}</h4>
          <p>
            {isMarathi
              ? 'तुमच्या आठवडे बाजारातील विक्री, वाहतूक खर्च आणि प्रत्यक्ष नफा नोंदवण्यासाठी वर "+ बाजार भेटीची नोंद करा" बटणावर क्लिक करा.'
              : 'Log your visits to weekly haats to track profit margins and train your personalized recommendation score.'}
          </p>
        </div>
      ) : (
        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>{isMarathi ? 'तारीख व बाजार' : 'Date & Market'}</th>
                <th>{isMarathi ? 'शेतमाल' : 'Product'}</th>
                <th>{isMarathi ? 'विक्री प्रमाण' : 'Volume Sold'}</th>
                <th>{isMarathi ? 'दर (प्रत्यक्ष / अपेक्षित)' : 'Price (Act / Exp)'}</th>
                <th>{isMarathi ? 'एकूण खर्च' : 'Expenses'}</th>
                <th>{isMarathi ? 'निव्वळ नफा' : 'Net Profit'}</th>
                <th>{isMarathi ? 'तुलना (Variance)' : 'vs Expected'}</th>
              </tr>
            </thead>
            <tbody>
              {history.map((v) => {
                const diff = (v.actualNetProfit || 0) - (v.expectedNetProfit || 0);
                const isPositive = (v.actualNetProfit || 0) >= 0;
                return (
                  <tr key={v.id}>
                    <td>
                      <div className="td-market-name">{isMarathi ? (v.marketName_mr || v.marketName) : v.marketName}</div>
                      <div className="td-date">{new Date(v.visitDate).toLocaleDateString()}</div>
                    </td>
                    <td>
                      <strong>{v.productName}</strong>
                      <div className="td-category">{v.productCategory}</div>
                    </td>
                    <td>
                      <strong>{v.quantitySold} / {v.quantityTaken} {v.quantityUnit}</strong>
                      <div className="td-sellthrough">({v.sellThroughRate}%)</div>
                    </td>
                    <td>
                      <span className="td-actual-price">₹{v.actualSellingPricePerUnit}</span>
                      {v.expectedPricePerUnit && (
                        <span className="td-expected-price"> / ₹{v.expectedPricePerUnit}</span>
                      )}
                    </td>
                    <td>
                      <span>₹{v.expenses?.totalExpenses || 0}</span>
                      <div className="td-fee-hint">{isMarathi ? 'वाहतूक + भाडे' : 'Travel+Stall'}</div>
                    </td>
                    <td>
                      <strong className={isPositive ? 'profit-pos' : 'profit-neg'}>
                        {isPositive ? '+' : ''}₹{v.actualNetProfit}
                      </strong>
                    </td>
                    <td>
                      <span className={`variance-pill ${diff >= 0 ? 'var-beat' : 'var-miss'}`}>
                        {diff >= 0 ? `+₹${diff}` : `-₹${Math.abs(diff)}`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Record Visit Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="record-visit-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <h3>{isMarathi ? 'प्रत्यक्ष बाजार विक्री व खर्चाची नोंद' : 'Record Actual Market Visit & Profit'}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowModal(false)}
                disabled={submitting}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVisit} className="record-visit-form">
              {formError && (
                <div className="form-error-alert">
                  <AppIcon name="alert-triangle" size={16} color="#d32f2f" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Market & Date */}
              <div className="form-grid-two">
                <div className="form-field">
                  <label>{isMarathi ? 'बाजार निवडा *' : 'Select Market *'}</label>
                  <select
                    value={modalForm.marketId}
                    onChange={(e) => setModalForm({ ...modalForm, marketId: e.target.value })}
                    required
                  >
                    {allMarkets.map((m) => (
                      <option key={m.id} value={m.id}>
                        {isMarathi ? (m.name_mr || m.name) : m.name} ({m.operatingDay})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label>{isMarathi ? 'भेटीची तारीख *' : 'Visit Date *'}</label>
                  <input
                    type="date"
                    required
                    value={modalForm.visitDate}
                    onChange={(e) => setModalForm({ ...modalForm, visitDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Product Info */}
              <div className="form-grid-two">
                <div className="form-field">
                  <label>{isMarathi ? 'मालाचे नाव *' : 'Product Name *'}</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tomatoes / Onion / Milk"
                    value={modalForm.productName}
                    onChange={(e) => setModalForm({ ...modalForm, productName: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>{isMarathi ? 'एकक (Unit)' : 'Unit'}</label>
                  <input
                    type="text"
                    value={modalForm.quantityUnit}
                    onChange={(e) => setModalForm({ ...modalForm, quantityUnit: e.target.value })}
                    placeholder="kg / quintal / litre"
                  />
                </div>
              </div>

              {/* Quantities */}
              <div className="form-grid-two">
                <div className="form-field">
                  <label>{isMarathi ? 'बाजारत आणलेले प्रमाण *' : 'Quantity Carried *'}</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={modalForm.quantityTaken}
                    onChange={(e) => setModalForm({ ...modalForm, quantityTaken: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>{isMarathi ? 'प्रत्यक्ष विकलेले प्रमाण *' : 'Quantity Sold *'}</label>
                  <input
                    type="number"
                    min="0"
                    max={modalForm.quantityTaken}
                    required
                    value={modalForm.quantitySold}
                    onChange={(e) => setModalForm({ ...modalForm, quantitySold: e.target.value })}
                  />
                </div>
              </div>

              {/* Prices */}
              <div className="form-grid-three">
                <div className="form-field">
                  <label>{isMarathi ? 'मूळ उत्पादन खर्च (₹)' : 'Unit Cost (₹)'}</label>
                  <input
                    type="number"
                    min="0"
                    value={modalForm.productCostPerUnit}
                    onChange={(e) => setModalForm({ ...modalForm, productCostPerUnit: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>{isMarathi ? 'प्रत्यक्ष विक्री दर (₹) *' : 'Actual Price (₹) *'}</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={modalForm.actualSellingPricePerUnit}
                    onChange={(e) => setModalForm({ ...modalForm, actualSellingPricePerUnit: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label>{isMarathi ? 'अपेक्षित दर (₹)' : 'Expected Price (₹)'}</label>
                  <input
                    type="number"
                    min="0"
                    value={modalForm.expectedPricePerUnit}
                    onChange={(e) => setModalForm({ ...modalForm, expectedPricePerUnit: e.target.value })}
                  />
                </div>
              </div>

              {/* Itemized Expenses */}
              <div className="expenses-box">
                <span className="expenses-box-title">{isMarathi ? 'प्रत्यक्ष खर्च तपशील' : 'Actual Trip Expenses'}</span>
                <div className="form-grid-four">
                  <div className="form-field">
                    <label>{isMarathi ? 'वाहतूक खर्च (₹)' : 'Travel (₹)'}</label>
                    <input
                      type="number"
                      min="0"
                      value={modalForm.travelExpense}
                      onChange={(e) => setModalForm({ ...modalForm, travelExpense: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label>{isMarathi ? 'बाजार / ओटा फी (₹)' : 'Stall Fee (₹)'}</label>
                    <input
                      type="number"
                      min="0"
                      value={modalForm.stallFee}
                      onChange={(e) => setModalForm({ ...modalForm, stallFee: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label>{isMarathi ? 'पॅकिंग खर्च (₹)' : 'Packaging (₹)'}</label>
                    <input
                      type="number"
                      min="0"
                      value={modalForm.packagingExpense}
                      onChange={(e) => setModalForm({ ...modalForm, packagingExpense: e.target.value })}
                    />
                  </div>
                  <div className="form-field">
                    <label>{isMarathi ? 'इतर खर्च (₹)' : 'Other (₹)'}</label>
                    <input
                      type="number"
                      min="0"
                      value={modalForm.otherExpenses}
                      onChange={(e) => setModalForm({ ...modalForm, otherExpenses: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Strip */}
              <div className="live-preview-strip">
                <div className="preview-stat">
                  <span>{isMarathi ? 'विक्री दर / प्रमाण:' : 'Sold:'}</span>
                  <strong>{qtySold} {modalForm.quantityUnit} ({liveSellThrough}%)</strong>
                </div>
                <div className="preview-stat">
                  <span>{isMarathi ? 'एकूण उत्पन्न:' : 'Revenue:'}</span>
                  <strong>₹{liveRevenue.toLocaleString('en-IN')}</strong>
                </div>
                <div className="preview-stat">
                  <span>{isMarathi ? 'निव्वळ नफा:' : 'Net Profit:'}</span>
                  <strong className={liveNetProfit >= 0 ? 'profit-pos' : 'profit-neg'}>
                    {liveNetProfit >= 0 ? '+' : ''}₹{liveNetProfit.toLocaleString('en-IN')}
                  </strong>
                </div>
              </div>

              {/* Notes */}
              <div className="form-field">
                <label>{isMarathi ? 'नोंदी / ग्राहक प्रतिसाद (ऐच्छिक)' : 'Notes / Market Footfall'}</label>
                <textarea
                  rows={2}
                  placeholder={isMarathi ? 'उदा. दुपारनंतर दर कमी झाले, हॉटेल ग्राहकांकडून जास्त मागणी...' : 'e.g. Peak morning footfall, high demand from local restaurants.'}
                  value={modalForm.notes}
                  onChange={(e) => setModalForm({ ...modalForm, notes: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  {isMarathi ? 'रद्द करा' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={submitting}
                >
                  {submitting ? (isMarathi ? 'जतन करत आहे...' : 'Saving...') : (isMarathi ? 'नोंद जतन करा' : 'Save Visit Record')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
