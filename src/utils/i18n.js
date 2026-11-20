/**
 * Backward compatibility wrapper for I18N
 * Delegates to centralized translations in src/i18n/
 */
import { en } from '../i18n/translations/en.js';
import { mr } from '../i18n/translations/mr.js';

export const I18N = {
  mr: {
    ...mr.auth,
    ...mr.common,
    ...mr.home,
    langName: 'मराठी',
    appTitle: mr.nav.brandTitle,
    appSubtitle: mr.nav.brandSubtitle,
    welcomeHeading: mr.home.welcomeTitle,
    welcomeSub: mr.home.welcomeSubtitle,
    stateLabel: mr.home.stateMaharashtra,
    districtLabel: mr.home.selectDistrict,
    talukaLabel: mr.home.selectTaluka,
    villageLabel: mr.home.selectVillage,
    offlineModeNotice: mr.sync.bannerOffline,
    syncPendingNotice: mr.sync.pendingChanges
  },
  en: {
    ...en.auth,
    ...en.common,
    ...en.home,
    langName: 'English',
    appTitle: en.nav.brandTitle,
    appSubtitle: en.nav.brandSubtitle,
    welcomeHeading: en.home.welcomeTitle,
    welcomeSub: en.home.welcomeSubtitle,
    stateLabel: en.home.stateMaharashtra,
    districtLabel: en.home.selectDistrict,
    talukaLabel: en.home.selectTaluka,
    villageLabel: en.home.selectVillage,
    offlineModeNotice: en.sync.bannerOffline,
    syncPendingNotice: en.sync.pendingChanges
  }
};
