import React from 'react';
import { AppIcon } from '../common/Icons';
import { Button } from '../common/Button';
import { getLocalizedModule } from '../../data/modulesData';
import { useLanguage } from '../../i18n';
import './ModuleCard.css';

export function ModuleCard({ module, onSelect }) {
  const { t, isMarathi } = useLanguage();
  const loc = getLocalizedModule(module, isMarathi);
  const { id, title, category, shortDescription, iconType, badge } = loc;

  return (
    <div className="module-card">
      <div className="module-card__header">
        <div className="module-card__icon-wrap">
          <AppIcon name={iconType} size={24} color="#1b5e20" />
        </div>
        <span className="module-card__category">{category}</span>
      </div>

      <div className="module-card__body">
        <div className="module-card__title-group">
          <h3 className="module-card__title">{title}</h3>
        </div>
        <p className="module-card__desc">{shortDescription}</p>
      </div>

      <div className="module-card__footer">
        {badge && (
          <span
            className={`module-card__badge ${
              id === 'bazaarpath' ? 'module-card__badge--flagship' : ''
            }`}
          >
            {badge}
          </span>
        )}
        <Button
          variant="primary"
          className="module-card__btn"
          onClick={() => onSelect(id)}
          aria-label={`${t('home.openModule')}: ${title}`}
        >
          {t('home.openModule')}
        </Button>
      </div>
    </div>
  );
}
