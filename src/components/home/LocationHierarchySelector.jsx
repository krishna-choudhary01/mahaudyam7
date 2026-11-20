import React, { useState, useEffect } from 'react';
import { locationService } from '../../services/location/locationService';
import { SearchableSelect } from '../common/SearchableSelect';
import { db } from '../../services/db';
import { AppIcon } from '../common/Icons';
import { useLanguage } from '../../i18n';
import './LocationHierarchySelector.css';

export function LocationHierarchySelector() {
  const { t, isMarathi } = useLanguage();
  const [districts, setDistricts] = useState([]);
  const [selectedDistrictCode, setSelectedDistrictCode] = useState(490); // Default demonstration: Nashik (490)
  
  const [talukas, setTalukas] = useState([]);
  const [selectedTalukaCode, setSelectedTalukaCode] = useState(4154); // Default demonstration: Sinnar (4154)
  
  const [villages, setVillages] = useState([]);
  const [selectedVillageCode, setSelectedVillageCode] = useState('');
  
  const [villageLoading, setVillageLoading] = useState(false);
  const [villageError, setVillageError] = useState(null);
  const [dataSourceInfo, setDataSourceInfo] = useState('');

  // 1. Initialize districts on mount
  useEffect(() => {
    const allDistricts = locationService.getAllDistricts();
    setDistricts(allDistricts);
    loadSavedLocationPreferences(allDistricts);
  }, []);

  // 2. Load saved location preferences from Dexie IndexedDB and localStorage fallback
  async function loadSavedLocationPreferences(districtsList) {
    try {
      let savedLoc = await db.userSettings.get('userLocationHierarchy');
      if (!savedLoc) {
        savedLoc = await db.userSettings.where('key').equals('userLocationHierarchy').first();
      }
      let locData = savedLoc?.value;
      if (!locData) {
        const ls = localStorage.getItem('userLocationHierarchy');
        if (ls) {
          try { locData = JSON.parse(ls); } catch (e) { /* ignore */ }
        }
      }

      if (locData && locData.districtCode) {
        const { districtCode, talukaCode, villageCode } = locData;
        setSelectedDistrictCode(Number(districtCode));
        const tList = locationService.getTalukasForDistrict(Number(districtCode));
        setTalukas(tList);

        if (talukaCode) {
          setSelectedTalukaCode(Number(talukaCode));
          loadVillages(Number(districtCode), Number(talukaCode), villageCode);
        }
        return;
      }

      // If no saved preference, load default demonstration (Nashik -> Sinnar)
      const defaultTalukas = locationService.getTalukasForDistrict(490);
      setTalukas(defaultTalukas);
      loadVillages(490, 4154, '');
    } catch (err) {
      console.warn('Could not read userLocationHierarchy preference', err);
      // Try localStorage fallback on error
      try {
        const ls = localStorage.getItem('userLocationHierarchy');
        if (ls) {
          const locData = JSON.parse(ls);
          if (locData?.districtCode) {
            setSelectedDistrictCode(Number(locData.districtCode));
            const tList = locationService.getTalukasForDistrict(Number(locData.districtCode));
            setTalukas(tList);
            if (locData.talukaCode) {
              setSelectedTalukaCode(Number(locData.talukaCode));
              loadVillages(Number(locData.districtCode), Number(locData.talukaCode), locData.villageCode);
            }
            return;
          }
        }
      } catch (e) { /* ignore */ }

      const defaultTalukas = locationService.getTalukasForDistrict(490);
      setTalukas(defaultTalukas);
      loadVillages(490, 4154, '');
    }
  }

  // Helper to load villages for a district & taluka
  async function loadVillages(districtCode, talukaCode, selectCodeAfterLoad = null, forceRefresh = false) {
    if (!districtCode || !talukaCode) {
      setVillages([]);
      return;
    }

    setVillageLoading(true);
    setVillageError(null);

    try {
      if (forceRefresh) {
        await locationService.refreshDistrict(districtCode);
      }

      const res = await locationService.getVillagesForTaluka(districtCode, talukaCode);
      const talukaVillages = Array.isArray(res) ? res : (res?.villages || []);
      setVillages(talukaVillages);

      const isCached = await locationService.isDistrictCached(districtCode);
      const statusText = isCached
        ? (isMarathi ? `स्थानिक साठ्यातून सुरक्षित (${talukaVillages.length} गावे)` : `IndexedDB Cached (${talukaVillages.length} villages)`)
        : (isMarathi ? `ऑनलाइन लोड झाले (${talukaVillages.length} गावे)` : `Online Loaded (${talukaVillages.length} villages)`);
      setDataSourceInfo(statusText);

      // Restore specific village selection if requested and valid
      if (selectCodeAfterLoad && talukaVillages.some((v) => (v.code || v.c) === Number(selectCodeAfterLoad))) {
        setSelectedVillageCode(Number(selectCodeAfterLoad));
      } else {
        setSelectedVillageCode('');
      }
    } catch (e) {
      setVillageError(isMarathi ? `गावे लोड करण्यात त्रुटी: ${e.message}` : `Failed to load villages: ${e.message}`);
      setVillages([]);
    } finally {
      setVillageLoading(false);
    }
  }

  // 3. District change handler
  const handleDistrictChange = (newCode) => {
    const codeNum = newCode ? Number(newCode) : '';
    setSelectedDistrictCode(codeNum);
    
    // Changing district resets selected taluka and village
    setSelectedTalukaCode('');
    setSelectedVillageCode('');
    setVillages([]);
    setDataSourceInfo('');

    if (codeNum) {
      const newTalukas = locationService.getTalukasForDistrict(codeNum);
      setTalukas(newTalukas);
      persistLocationHierarchy(codeNum, '', '');
    } else {
      setTalukas([]);
      persistLocationHierarchy('', '', '');
    }
  };

  // 4. Taluka change handler
  const handleTalukaChange = (newCode) => {
    const codeNum = newCode ? Number(newCode) : '';
    setSelectedTalukaCode(codeNum);
    
    // Changing taluka resets selected village
    setSelectedVillageCode('');

    if (codeNum) {
      loadVillages(selectedDistrictCode, codeNum);
      persistLocationHierarchy(selectedDistrictCode, codeNum, '');
    } else {
      setVillages([]);
      setDataSourceInfo('');
      persistLocationHierarchy(selectedDistrictCode, '', '');
    }
  };

  // 5. Village change handler
  const handleVillageChange = (newCode) => {
    const codeNum = newCode ? Number(newCode) : '';
    setSelectedVillageCode(codeNum);
    persistLocationHierarchy(selectedDistrictCode, selectedTalukaCode, codeNum);
  };

  // Save selected hierarchy into IndexedDB userSettings and localStorage fallback
  async function persistLocationHierarchy(dCode, tCode, vCode) {
    const locPayload = {
      districtCode: dCode,
      talukaCode: tCode,
      villageCode: vCode
    };

    try {
      localStorage.setItem('userLocationHierarchy', JSON.stringify(locPayload));
    } catch (e) { /* ignore storage quotas */ }

    try {
      await db.userSettings.put({
        id: 'userLocationHierarchy',
        key: 'userLocationHierarchy',
        value: locPayload,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('Could not persist location hierarchy in Dexie', err);
    }
  }

  // Format options for SearchableSelect with defensive array guards
  const safeDistricts = Array.isArray(districts) ? districts : [];
  const safeTalukas = Array.isArray(talukas) ? talukas : [];
  const safeVillages = Array.isArray(villages)
    ? villages
    : (villages && Array.isArray(villages.villages) ? villages.villages : []);

  const districtOptions = safeDistricts.map((d) => ({
    value: d.code,
    label: isMarathi ? d.marathiName : d.name,
    marathiLabel: isMarathi ? d.name : d.marathiName,
    code: `LGD ${d.code} (${d.talukaCount} ${isMarathi ? 'तालुके' : 'Talukas'})`
  }));

  const talukaOptions = safeTalukas.map((t) => ({
    value: t.code,
    label: isMarathi ? t.marathiName : t.name,
    marathiLabel: isMarathi ? t.name : t.marathiName,
    code: `LGD ${t.code}`
  }));

  const villageOptions = safeVillages.map((v) => ({
    value: v.code || v.c,
    label: isMarathi ? (v.name_mr || v.m) : (v.name_en || v.n),
    marathiLabel: isMarathi ? (v.name_en || v.n) : (v.name_mr || v.m),
    code: `LGD ${v.code || v.c}`,
    keywords: `${v.name_en || v.n} ${v.name_mr || v.m} ${v.code || v.c}`
  }));

  const currentDistrict = locationService.getDistrictByCode(selectedDistrictCode);
  const currentTaluka = locationService.getTalukaByCode(selectedTalukaCode);
  const currentVillage = safeVillages.find((v) => (v.code || v.c) === Number(selectedVillageCode));

  return (
    <div className="location-hierarchy" aria-label={t('home.stateMaharashtra')}>
      <div className="location-hierarchy__header">
        <div className="location-state-pill">
          <span className="state-badge">{isMarathi ? 'राज्य:' : 'State:'}</span>
          <strong>{isMarathi ? 'महाराष्ट्र' : 'Maharashtra'}</strong>
          <span className="state-stats">
            • {isMarathi ? '३६ जिल्हे' : '36 Districts'} • {isMarathi ? '३५८ तालुके' : '358 Talukas'} • {isMarathi ? '४४,९२९ गावे' : '44,929 Villages'}
          </span>
        </div>

        {dataSourceInfo && (
          <div className="location-cache-pill" title="Offline location cache status">
            <AppIcon name="check" size={13} color="#2e7d32" />
            <span>{dataSourceInfo}</span>
            <button
              type="button"
              className="refresh-location-btn"
              onClick={() => loadVillages(selectedDistrictCode, selectedTalukaCode, selectedVillageCode, true)}
              title={isMarathi ? 'गाव यादी रीफ्रेश करा' : 'Refresh village directory'}
            >
              🔄
            </button>
          </div>
        )}
      </div>

      <div className="location-selectors-grid">
        {/* 1. District Selector */}
        <div className="selector-col">
          <SearchableSelect
            id="district-selector"
            label={isMarathi ? '१. जिल्हा निवडा:' : '1. District:'}
            placeholder={isMarathi ? 'जिल्हा निवडा (३६ उपलब्ध)' : 'Select District (36 Available)'}
            searchPlaceholder={t('home.districtSearchPlaceholder')}
            options={districtOptions}
            value={selectedDistrictCode}
            onChange={handleDistrictChange}
            badge={isMarathi ? '३६ जिल्हे' : '36 Districts'}
          />
        </div>

        {/* 2. Taluka Selector (Enabled when District is chosen) */}
        <div className="selector-col">
          <SearchableSelect
            id="taluka-selector"
            label={isMarathi ? '२. तालुका निवडा:' : '2. Taluka:'}
            placeholder={
              selectedDistrictCode
                ? (isMarathi ? `तालुका निवडा (${talukas.length} तालुके)` : `Select Taluka (${talukas.length} in this District)`)
                : t('home.chooseDistrictFirst')
            }
            searchPlaceholder={t('home.talukaSearchPlaceholder')}
            options={talukaOptions}
            value={selectedTalukaCode}
            onChange={handleTalukaChange}
            disabled={!selectedDistrictCode}
            badge={selectedDistrictCode ? `${talukas.length} ${isMarathi ? 'तालुके' : 'Talukas'}` : null}
          />
        </div>

        {/* 3. Village Selector (Enabled when Taluka is chosen) */}
        <div className="selector-col">
          <SearchableSelect
            id="village-selector"
            label={isMarathi ? '३. गाव निवडा (महसूल गाव):' : '3. Village (Revenue Village):'}
            placeholder={
              !selectedTalukaCode
                ? t('home.chooseTalukaFirst')
                : villageLoading
                ? t('common.loading')
                : (isMarathi ? `गाव निवडा (${safeVillages.length} गावे)` : `Select Village (${safeVillages.length} in this Taluka)`)
            }
            searchPlaceholder={t('home.villageSearchPlaceholder')}
            options={villageOptions}
            value={selectedVillageCode}
            onChange={handleVillageChange}
            disabled={!selectedTalukaCode || villageLoading}
            loading={villageLoading}
            error={villageError}
            onRetry={() => loadVillages(selectedDistrictCode, selectedTalukaCode, selectedVillageCode, true)}
            badge={safeVillages.length > 0 ? `${safeVillages.length} ${isMarathi ? 'गावे' : 'Villages'}` : null}
          />
        </div>
      </div>

      {/* Active Location Breadcrumb Display */}
      <div className="location-summary-card">
        <span className="summary-label">
          {isMarathi ? 'निवडलेले कार्यक्षेत्र:' : 'Active Administrative Jurisdiction:'}
        </span>
        <div className="summary-values">
          <span className="summary-crumb">
            {isMarathi ? 'जिल्हा:' : 'District:'} <strong>{currentDistrict ? (isMarathi ? currentDistrict.marathiName : currentDistrict.name) : t('common.na')}</strong>
          </span>
          <span className="summary-arrow">→</span>
          <span className="summary-crumb">
            {isMarathi ? 'तालुका:' : 'Taluka:'} <strong>{currentTaluka ? (isMarathi ? currentTaluka.marathiName : currentTaluka.name) : (isMarathi ? 'निवडलेला नाही' : 'None Selected')}</strong>
          </span>
          <span className="summary-arrow">→</span>
          <span className="summary-crumb">
            {isMarathi ? 'गाव:' : 'Village:'} <strong>{currentVillage ? `${isMarathi ? (currentVillage.name_mr || currentVillage.m) : (currentVillage.name_en || currentVillage.n)} [LGD: ${currentVillage.code || currentVillage.c}]` : (isMarathi ? 'सर्व गावे / यादीतून निवडा' : 'All Villages / Select from list')}</strong>
          </span>
        </div>
      </div>
    </div>
  );
}
