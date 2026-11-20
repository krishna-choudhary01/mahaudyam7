import React from 'react';
import { useLanguage } from '../../i18n';
import { AppIcon } from '../common/Icons';

export function RawMaterialsSkillsCard({ profile }) {
  const { t, isMarathi } = useLanguage();

  if (!profile) return null;

  const raw = profile.rawMaterials || {};
  const materials = raw.availableMaterials || [];

  const skillsObj = profile.localSkills || {};
  const skillsList = skillsObj.skills || [];

  return (
    <div className="intelligence-dual-container">
      {/* 1. Raw Materials Card */}
      <div className="intelligence-detail-card">
        <div className="card-top-bar">
          <div className="card-top-bar__title">
            <AppIcon name="box" size={20} />
            <h3>{t('villageDetector.rawMaterialsCard.title')}</h3>
          </div>
          <span className={`status-badge status-${raw.status || 'unknown'}`}>
            {t(`villageDetector.qualityBadges.${raw.status || 'unknown'}`)}
          </span>
        </div>

        <div className="intelligence-section">
          {materials.length > 0 ? (
            <div className="table-responsive-wrapper">
              <table className="village-data-table">
                <thead>
                  <tr>
                    <th>{t('villageDetector.rawMaterialsCard.materialName')}</th>
                    <th>{t('villageDetector.rawMaterialsCard.category')}</th>
                    <th>{t('villageDetector.rawMaterialsCard.seasonality')}</th>
                    <th>{t('villageDetector.rawMaterialsCard.volumeIndex')}</th>
                    <th>{t('villageDetector.rawMaterialsCard.verifiedSource')}</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((mat, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong>{isMarathi ? mat.name_mr : mat.name}</strong>
                        {mat.legalClearanceNeeded && (
                          <div className="regulatory-warning-tag">
                            ⚠️ {t('villageDetector.rawMaterialsCard.legalPermitRequired')}
                          </div>
                        )}
                      </td>
                      <td><span className="category-pill">{mat.category}</span></td>
                      <td>{mat.seasonality}</td>
                      <td>
                        <span className={`volume-badge volume-${(mat.volumeIndex || 'low').toLowerCase()}`}>
                          {mat.volumeIndex}
                        </span>
                      </td>
                      <td className="source-cell">{mat.verifiedSource}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-section-notice">
              {t('villageDetector.rawMaterialsCard.emptyNotice')}
            </p>
          )}
        </div>

        {raw.source && (
          <div className="data-source-footer">
            <AppIcon name="shield" size={13} />
            <span>
              {t('villageDetector.agricultureCard.sourceAttribution')} {raw.source.name} • {raw.source.ref}
              {raw.source.retrievalDate && ` (${raw.source.retrievalDate})`}
            </span>
          </div>
        )}
      </div>

      {/* 2. Local Skills & Occupations Card */}
      <div className="intelligence-detail-card">
        <div className="card-top-bar">
          <div className="card-top-bar__title">
            <AppIcon name="hammer" size={20} />
            <h3>{t('villageDetector.localSkillsCard.title')}</h3>
          </div>
          <span className={`status-badge status-${skillsObj.status || 'unknown'}`}>
            {t(`villageDetector.qualityBadges.${skillsObj.status || 'unknown'}`)}
          </span>
        </div>

        <div className="intelligence-section">
          {skillsList.length > 0 ? (
            <div className="skills-cards-grid">
              {skillsList.map((sk, idx) => (
                <div key={idx} className="skill-item-card">
                  <div className="skill-header">
                    <span className="skill-title">{isMarathi ? sk.skill_mr : sk.skill}</span>
                    <span className="artisan-count-badge">
                      {sk.countEstimate} {isMarathi ? 'कारागीर' : 'Artisans'}
                    </span>
                  </div>
                  <div className="skill-meta-row">
                    <div>
                      <strong>{t('villageDetector.localSkillsCard.masterTrainers')}:</strong> {sk.masterArtisansKnown}
                    </div>
                    {sk.trainingInstitutesNearby && (
                      <div>
                        <strong>{t('villageDetector.localSkillsCard.trainingCenters')}:</strong> {sk.trainingInstitutesNearby}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-section-notice">
              {t('villageDetector.localSkillsCard.emptyNotice')}
            </p>
          )}
        </div>

        {skillsObj.source && (
          <div className="data-source-footer">
            <AppIcon name="shield" size={13} />
            <span>
              {t('villageDetector.agricultureCard.sourceAttribution')} {skillsObj.source.name} • {skillsObj.source.ref}
              {skillsObj.source.retrievalDate && ` (${skillsObj.source.retrievalDate})`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default RawMaterialsSkillsCard;
