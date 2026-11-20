import React from 'react';
import { AppIcon } from '../common/Icons';
import { MODULES_DATA, getLocalizedModule } from '../../data/modulesData';
import { useLanguage } from '../../i18n';
import './RecentModules.css';

export function RecentModules({ onSelect }) {
  const { t, isMarathi } = useLanguage();

  // Prominent module shortcuts including Flagship BazaarPath and Customer Demand Collector
  const quickModules = [
    MODULES_DATA.find((m) => m.id === 'bazaarpath'),
    MODULES_DATA.find((m) => m.id === 'demand-collector'),
    MODULES_DATA.find((m) => m.id === 'opportunity-detector')
  ].filter(Boolean);

  return (
    <section className="quick-access-section" aria-label={t('home.quickAccessTitle')}>
      <div className="quick-access__header">
        <h3 className="quick-access__title">{t('home.quickAccessTitle')}</h3>
        <span className="quick-access__subtitle">{t('home.quickAccessSubtitle')}</span>
      </div>

      <div className="quick-access__cards">
        {quickModules.map((module) => {
          const loc = getLocalizedModule(module, isMarathi);
          return (
            <button
              key={module.id}
              type="button"
              className="quick-card"
              onClick={() => onSelect(module.id)}
              aria-label={`${t('home.openModule')}: ${loc.title}`}
            >
              <div className="quick-card__icon-box">
                <AppIcon name={module.iconType} size={24} color="#1b5e20" />
              </div>
              <div className="quick-card__info">
                <span className="quick-card__title">{loc.title}</span>
                <span className="quick-card__desc">{loc.shortDescription}</span>
              </div>
              <div className="quick-card__action">
                <span className="quick-card__btn">{t('home.openBtn')}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
