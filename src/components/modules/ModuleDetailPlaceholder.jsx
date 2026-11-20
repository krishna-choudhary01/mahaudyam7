import React from 'react';
import { AppIcon } from '../common/Icons';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { getLocalizedModule } from '../../data/modulesData';
import { useLanguage } from '../../i18n';
import './ModuleDetailPlaceholder.css';

export function ModuleDetailPlaceholder({ module, onBack }) {
  const { t, isMarathi } = useLanguage();
  if (!module) return null;

  const loc = getLocalizedModule(module, isMarathi);

  return (
    <div className="module-detail">
      <div className="module-detail__nav">
        <Button
          variant="outline"
          onClick={onBack}
          className="module-detail__back-btn"
          aria-label={t('modules.placeholder.backBtn')}
        >
          <AppIcon name="arrow-left" size={16} />
          {t('modules.placeholder.backBtn')}
        </Button>
      </div>

      <header className="module-detail__header">
        <div className="module-detail__title-row">
          <div className="module-detail__icon-box">
            <AppIcon name={loc.iconType} size={32} color="#1b5e20" />
          </div>
          <div>
            <div className="module-detail__category-badge">{loc.category}</div>
            <h2 className="module-detail__title">{loc.title}</h2>
          </div>
        </div>
        <p className="module-detail__lead">{loc.shortDescription}</p>
      </header>

      {/* Clear Status Notice */}
      <div className="module-detail__status-notice" role="note">
        <div className="status-notice__icon">
          <AppIcon name="sync" size={20} color="#e65100" />
        </div>
        <div>
          <strong>{t('modules.placeholder.statusNoticeTitle')}</strong>
          <p>
            {t('modules.placeholder.statusNoticeBody')}
          </p>
        </div>
      </div>

      <div className="module-detail__grid">
        <Card title={t('modules.placeholder.benefitsTitle')}>
          <ul className="module-detail__benefits-list">
            {loc.keyBenefits.map((benefit, idx) => (
              <li key={idx}>
                <span className="benefit-check">✓</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
