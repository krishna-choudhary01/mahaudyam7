import React from 'react';
import { useLanguage } from '../../i18n';
import { MODULES_DATA, getLocalizedModule } from '../../data/modulesData';
import { AppIcon } from '../common/Icons';
import './CitizenGuestSection.css';

export function CitizenGuestSection({ onOpenDemandCollector, onRequireAuth, onNavigateRegister, onNavigateLogin }) {
  const { isMarathi } = useLanguage();

  // Filter the 8 entrepreneur modules (everything except demand-collector)
  const lockedModules = MODULES_DATA.filter((m) => m.id !== 'demand-collector');

  return (
    <div className="citizen-guest-view" aria-label={isMarathi ? 'नागरिक व उद्योजक प्रवेश' : 'Citizen & Entrepreneur Portal'}>
      {/* 1. Citizen Need Reporting (Public & Free) */}
      <section className="citizen-hero-card">
        <div className="citizen-hero-card__badge">
          <span>📣 {isMarathi ? 'नागरिक व ग्रामस्थ मंच' : 'Citizen & Customer Portal'}</span>
          <span className="citizen-hero-card__tag">{isMarathi ? 'विनामूल्य व नोंदणीशिवाय' : 'Free • No Registration Required'}</span>
        </div>

        <h2 className="citizen-hero-card__title">
          {isMarathi ? 'गावाची गरज नोंदवा (वस्तू किंवा सेवांची कमतरता)' : 'Tell Us What Your Village Needs'}
        </h2>

        <p className="citizen-hero-card__desc">
          {isMarathi
            ? 'आपल्या गावात शेतमाल प्रक्रिया, खते, शीतगृह, वाहतूक किंवा दैनंदिन सेवांची कमतरता आहे का? कोणतीही वैयक्तिक माहिती न देता थेट गरज नोंदवा. स्थानिक उद्योजक या नोंदी पाहून गावात योग्य व्यवसाय सुरू करतील.'
            : 'Are goods, agro-processing facilities, cold storage, transport routes, or daily essential services missing in your village? Report your need directly without any account. Local entrepreneurs review these requests to launch viable rural enterprises.'}
        </p>

        <div className="citizen-hero-card__actions">
          <button
            type="button"
            className="btn-report-need"
            onClick={onOpenDemandCollector}
            aria-label={isMarathi ? 'गावाची गरज नोंदवा' : 'Report Village Need'}
          >
            <span className="btn-icon">✍️</span>
            <span>{isMarathi ? 'गावाची गरज नोंदवा' : 'Report Village Need Now'}</span>
            <span className="btn-arrow">→</span>
          </button>
        </div>
      </section>

      {/* 2. Entrepreneur Access Gate (Requires Registration) */}
      <section className="entrepreneur-gate-section">
        <div className="entrepreneur-gate-header">
          <div className="gate-badge">
            <span>🔒 {isMarathi ? 'केवळ उद्योजकांसाठी' : 'Entrepreneur Workspace'}</span>
          </div>
          <h2 className="entrepreneur-gate-title">
            {isMarathi ? 'तुम्ही ग्रामीण उद्योजक किंवा व्यावसायिक आहात का?' : 'Are You a Rural Entrepreneur or Business Owner?'}
          </h2>
          <p className="entrepreneur-gate-subtitle">
            {isMarathi
              ? 'महाउद्यमचे सर्व व्यवसाय विश्लेषण व नफा मार्गदर्शक मोड्युल्स केवळ नोंदणीकृत उद्योजकांसाठी उपलब्ध आहेत. व्यवसाय सुरू करण्यासाठी किंवा वाढवण्यासाठी मोफत नोंदणी करा.'
              : 'All 8 business intelligence modules are reserved for registered entrepreneurs. Register or login to evaluate opportunities, calculate profit, find raw materials, and source equipment.'}
          </p>

          <div className="entrepreneur-gate-cta-group">
            <button
              type="button"
              className="btn-gate-register"
              onClick={onNavigateRegister}
            >
              <span>🚀 {isMarathi ? 'उद्योजक म्हणून मोफत नोंदणी करा' : 'Register as an Entrepreneur (Free)'}</span>
            </button>
            <button
              type="button"
              className="btn-gate-login"
              onClick={onNavigateLogin}
            >
              <span>🔑 {isMarathi ? 'खात्यात लॉगिन करा' : 'Login to Account'}</span>
            </button>
          </div>
        </div>

        {/* Locked Modules Preview Grid */}
        <div className="locked-modules-grid">
          {lockedModules.map((module) => {
            const loc = getLocalizedModule(module, isMarathi);
            return (
              <div
                key={module.id}
                className="locked-module-card"
                onClick={() => onRequireAuth(module.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onRequireAuth(module.id);
                  }
                }}
                aria-label={`${loc.title} - ${isMarathi ? 'नोंदणी आवश्यक' : 'Registration Required'}`}
              >
                <div className="locked-module-card__header">
                  <div className="locked-module-card__icon-box">
                    <AppIcon name={module.iconType} size={22} color="#2e7d32" />
                  </div>
                  <span className="locked-badge">
                    🔒 {isMarathi ? 'नोंदणी आवश्यक' : 'Requires Registration'}
                  </span>
                </div>

                <h3 className="locked-module-card__title">{loc.title}</h3>
                <p className="locked-module-card__desc">{loc.shortDescription}</p>

                <div className="locked-module-card__footer">
                  <span className="locked-unlock-text">
                    {isMarathi ? 'उघडण्यासाठी नोंदणी करा →' : 'Register to Unlock →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
