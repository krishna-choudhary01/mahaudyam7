import { createServer } from 'vite';
import React from 'react';
import { renderToString } from 'react-dom/server';

// Mock browser globals
globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  scrollTo: () => {},
  history: { pushState: () => {} },
  navigator: { onLine: true }
};
globalThis.document = {
  documentElement: { setAttribute: () => {} },
  addEventListener: () => {},
  removeEventListener: () => {}
};
globalThis.localStorage = {
  _store: {},
  getItem: (k) => globalThis.localStorage._store[k] || null,
  setItem: (k, v) => { globalThis.localStorage._store[k] = String(v); },
  removeItem: (k) => { delete globalThis.localStorage._store[k]; }
};

async function testSelectorSafety() {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  try {
    const { LanguageProvider } = await vite.ssrLoadModule('/src/i18n/index.js');
    const { LocationHierarchySelector } = await vite.ssrLoadModule('/src/components/home/LocationHierarchySelector.jsx');

    console.log('--- TEST: LocationHierarchySelector in English ---');
    globalThis.localStorage.setItem('mahaudyam_language', 'en');
    const enHtml = renderToString(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(LocationHierarchySelector, null)
      )
    );
    console.log(`✓ English render OK (len: ${enHtml.length})`);

    console.log('--- TEST: LocationHierarchySelector in Marathi ---');
    globalThis.localStorage.setItem('mahaudyam_language', 'mr');
    const mrHtml = renderToString(
      React.createElement(
        LanguageProvider,
        null,
        React.createElement(LocationHierarchySelector, null)
      )
    );
    console.log(`✓ Marathi render OK (len: ${mrHtml.length})`);

    console.log('--- ALL SELECTOR SAFETY CHECKS PASSED ---');
  } finally {
    await vite.close();
  }
}

testSelectorSafety();
