import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';
import { authService } from '../../services/auth/authService.js';
import { unsoldStockService } from '../../services/stock/unsoldStockService.js';
import { UnsoldStockDashboard } from './UnsoldStockDashboard.jsx';
import { RegisterStockModal } from './RegisterStockModal.jsx';
import { StockDetailModal } from './StockDetailModal.jsx';
import { OutcomeIntelligenceView } from './OutcomeIntelligenceView.jsx';
import { BuyerMarketplace } from './BuyerMarketplace.jsx';
import './UnsoldStock.css';

export function UnsoldStockRescueModule({ onBack, onNavigateModule }) {
  const { t, isMarathi } = useLanguage();

  const currentUser = authService.getCurrentUser() || {
    userId: 'ent_nashik_ramesh_001',
    name: 'Ramesh Jadhav',
    role: 'entrepreneur'
  };

  const [moduleView, setModuleView] = useState('inventory'); // 'inventory' | 'intelligence'
  const [stocks, setStocks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPerishability, setFilterPerishability] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  // Load stocks and dashboard metrics
  const loadUserStockData = async () => {
    setLoading(true);
    try {
      const list = await unsoldStockService.getStocksForUser(currentUser.userId, {
        category: filterCategory,
        status: filterStatus,
        perishability: filterPerishability,
        search: searchQuery
      });
      setStocks(list);

      const stats = await unsoldStockService.getDashboardSummary(currentUser.userId);
      setSummary(stats);
    } catch (err) {
      console.error('Failed to load user unsold stock:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserStockData();
  }, [currentUser.userId, filterCategory, filterStatus, filterPerishability, searchQuery]);

  return (
    <div className="unsold-stock-module">
      {/* 1. Header Bar */}
      <div className="module-top-header">
        <div className="module-top-header__left">
          <button type="button" className="module-back-btn" onClick={onBack}>
            <AppIcon name="arrow-left" size={16} />
            <span>{isMarathi ? 'मुख्य पृष्ठ' : 'Home'}</span>
          </button>
          <div className="module-title-wrap">
            <div className="title-row">
              <h1 className="module-title">{t('unsoldStock.moduleTitle')}</h1>
              <span className="phase-badge">{t('unsoldStock.phase3Badge', 'Phase 3: Enquiries, Transactions & Outcome Intelligence')}</span>
            </div>
            <p className="module-subtitle">{t('unsoldStock.moduleSubtitle')}</p>
          </div>
        </div>

        {/* View Switcher & User Identity Pill */}
        <div className="header-right-actions">
          <div className="module-view-switcher">
            <button
              type="button"
              className={`view-toggle-btn ${moduleView === 'inventory' ? 'active' : ''}`}
              onClick={() => setModuleView('inventory')}
            >
              📦 {isMarathi ? 'माझा साठा' : 'Inventory'}
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${moduleView === 'marketplace' ? 'active' : ''}`}
              onClick={() => setModuleView('marketplace')}
            >
              🛒 {isMarathi ? 'खरेदीदार बाजार' : 'Buyer Marketplace'}
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${moduleView === 'intelligence' ? 'active' : ''}`}
              onClick={() => setModuleView('intelligence')}
            >
              📊 {isMarathi ? 'परिणाम विश्लेषण' : 'Outcome Intelligence'}
            </button>
          </div>

          <div className="user-privacy-pill" title="Private inventory workspace">
            <AppIcon name="shield" size={14} color="#2e7d32" />
            <span>{currentUser.name}</span>
            <span className="privacy-badge">{isMarathi ? 'खाजगी साठा' : 'Private'}</span>
          </div>
        </div>
      </div>

      {/* 2. Main Content Area */}
      {moduleView === 'marketplace' ? (
        <BuyerMarketplace
          currentUser={currentUser}
          onOfferSubmitted={() => loadUserStockData()}
        />
      ) : moduleView === 'intelligence' ? (
        <OutcomeIntelligenceView userId={currentUser.userId} />
      ) : loading && stocks.length === 0 ? (
        <div className="loading-state-card">
          <div className="spinner-icon">🔄</div>
          <p>{isMarathi ? 'शिल्लक मालाची माहिती लोड होत आहे...' : 'Loading unsold stock records...'}</p>
        </div>
      ) : (
        <UnsoldStockDashboard
          stocks={stocks}
          summary={summary}
          onOpenRegister={() => setShowRegisterModal(true)}
          onSelectStock={(stk) => setSelectedStock(stk)}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterPerishability={filterPerishability}
          setFilterPerishability={setFilterPerishability}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}

      {/* 3. Register Stock Modal */}
      {showRegisterModal && (
        <RegisterStockModal
          userId={currentUser.userId}
          onClose={() => setShowRegisterModal(false)}
          onSuccess={() => {
            loadUserStockData();
          }}
        />
      )}

      {/* 4. Stock Details & Calculator Modal */}
      {selectedStock && (
        <StockDetailModal
          stock={selectedStock}
          userId={currentUser.userId}
          onClose={() => setSelectedStock(null)}
          onStockUpdated={(updated) => {
            setSelectedStock(updated);
            loadUserStockData();
          }}
        />
      )}
    </div>
  );
}

export default UnsoldStockRescueModule;
