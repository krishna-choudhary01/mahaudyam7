import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { en } from './translations/en.js';
import { mr } from './translations/mr.js';
import { db } from '../services/db/index.js';
import { authService } from '../services/auth/authService.js';

const TRANSLATIONS = { en, mr };
const STORAGE_KEY = 'mahaudyam_language';

const LanguageContext = createContext(null);

export function LanguageProvider({ children, initialLanguage }) {
  // Synchronous initial value from initialLanguage prop, localStorage, or safe default 'en'
  const [language, setLanguageState] = useState(() => {
    if (initialLanguage === 'mr' || initialLanguage === 'en') {
      return initialLanguage;
    }
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === 'mr' || stored === 'en') return stored;
      }
    } catch (e) {
      // localStorage may fail in private mode or non-browser environments
    }
    return 'en';
  });

  const [activeUserId, setActiveUserId] = useState(() => {
    try {
      return authService?.getUserId?.() || null;
    } catch (e) {
      return null;
    }
  });

  // Asynchronously load language preference from Dexie IndexedDB without blocking initial render
  const loadPreferenceFromDb = useCallback(async (userId) => {
    try {
      if (!db || !db.isOpen || typeof db.isOpen !== 'function') {
        // DB not ready or not initialized
        return;
      }

      if (userId) {
        // 1. Check userSettings store for user
        if (db.userSettings) {
          const setting = await db.userSettings.get(`${userId}_languagePreference`).catch(() => null);
          if (setting && (setting.value === 'mr' || setting.value === 'en')) {
            setLanguageState(setting.value);
            try {
              localStorage.setItem(STORAGE_KEY, setting.value);
            } catch (e) {}
            return;
          }
        }

        // 2. Check userProfiles table
        if (db.userProfiles) {
          const profile = await db.userProfiles.get(userId).catch(() => null);
          if (profile && (profile.language === 'mr' || profile.language === 'en')) {
            setLanguageState(profile.language);
            try {
              localStorage.setItem(STORAGE_KEY, profile.language);
            } catch (e) {}
            return;
          }
        }
      } else {
        // Logged-out user: check guest setting
        if (db.userSettings) {
          const guestSetting = await db.userSettings.get('guest_languagePreference').catch(() => null);
          if (guestSetting && (guestSetting.value === 'mr' || guestSetting.value === 'en')) {
            setLanguageState(guestSetting.value);
            try {
              localStorage.setItem(STORAGE_KEY, guestSetting.value);
            } catch (e) {}
            return;
          }
        }
      }
    } catch (err) {
      console.warn('[i18n] Could not retrieve language preference from Dexie', err);
    }
  }, []);

  // Listen to auth changes and restore corresponding user's language
  useEffect(() => {
    let unsub = () => {};
    try {
      if (authService && typeof authService.subscribe === 'function') {
        unsub = authService.subscribe((user) => {
          const newUserId = user ? user.userId : null;
          setActiveUserId(newUserId);
          loadPreferenceFromDb(newUserId);
        });
      }

      const initialUserId = authService?.getUserId?.() || null;
      loadPreferenceFromDb(initialUserId);
    } catch (e) {
      console.warn('[i18n] Failed to subscribe to authService', e);
    }

    return () => {
      try {
        if (typeof unsub === 'function') unsub();
      } catch (e) {}
    };
  }, [loadPreferenceFromDb]);

  // Set language function with immediate reactivity & dual offline persistence
  const setLanguage = useCallback(async (newLang) => {
    if (newLang !== 'en' && newLang !== 'mr') return;

    // 1. Immediate React state update (No page reload)
    setLanguageState(newLang);

    // 2. LocalStorage for synchronous initial load
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, newLang);
      }
    } catch (e) {
      // Ignore localStorage failure in restricted sandbox / private browsing
    }

    // 3. Persist in Dexie userSettings store asynchronously
    try {
      const userId = authService?.getUserId?.() || null;
      const settingKey = `${userId || 'guest'}_languagePreference`;
      if (db?.userSettings) {
        await db.userSettings.put({
          id: settingKey,
          userId: userId || 'guest',
          key: 'languagePreference',
          value: newLang,
          updatedAt: new Date().toISOString()
        }).catch(() => null);
      }

      // 4. If user is logged in, update profile language as well
      if (userId && db?.userProfiles) {
        await db.userProfiles.update(userId, {
          language: newLang,
          updatedAt: new Date().toISOString()
        }).catch(() => null);
      }
    } catch (dbErr) {
      console.warn('[i18n] Failed to persist language in Dexie', dbErr);
    }
  }, []);

  // Bulletproof translation helper function
  const t = useCallback((key, params = null) => {
    if (!key || typeof key !== 'string') return '';

    const getNestedValue = (obj, path) => {
      if (!obj || typeof obj !== 'object') return null;
      const parts = path.split('.');
      let current = obj;
      for (const part of parts) {
        if (current == null || typeof current !== 'object') return null;
        current = current[part];
      }
      return current;
    };

    // 1. Look up in active language dictionary
    const currentDict = TRANSLATIONS[language] || TRANSLATIONS.en;
    let text = getNestedValue(currentDict, key);

    // 2. Fall back to English dictionary if missing
    if (text == null && language !== 'en') {
      text = getNestedValue(TRANSLATIONS.en, key);
    }

    // 3. Fall back to key itself if not found
    if (text == null) {
      return key;
    }

    // 4. CRASH PREVENTION: If translation resolves to an object/array, NEVER return raw object to React JSX
    if (typeof text !== 'string' && typeof text !== 'number' && typeof text !== 'boolean') {
      return key;
    }

    // 5. Parameter interpolation: {param}
    if (params && typeof text === 'string') {
      let interpolated = text;
      try {
        Object.entries(params).forEach(([pKey, pVal]) => {
          const replacement = (pVal !== null && pVal !== undefined) ? String(pVal) : '';
          interpolated = interpolated.replace(new RegExp(`\\{${pKey}\\}`, 'g'), replacement);
        });
      } catch (err) {
        // Fallback to uninterpolated text if regex fails
      }
      return interpolated;
    }

    return String(text);
  }, [language]);

  const value = {
    language,
    setLanguage,
    t,
    isMarathi: language === 'mr',
    isEnglish: language === 'en',
    availableLanguages: [
      { code: 'en', label: 'English', nativeLabel: 'English' },
      { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' }
    ]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    console.warn('[MahaUdyam i18n] useLanguage used outside of LanguageProvider; falling back to safe English default.');
    return {
      language: 'en',
      setLanguage: () => {},
      t: (key) => (typeof key === 'string' ? key : ''),
      isMarathi: false,
      isEnglish: true,
      availableLanguages: [
        { code: 'en', label: 'English', nativeLabel: 'English' },
        { code: 'mr', label: 'Marathi', nativeLabel: 'मराठी' }
      ]
    };
  }
  return context;
}

export default LanguageProvider;
