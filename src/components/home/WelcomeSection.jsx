import React from 'react';
import { LocationHierarchySelector } from './LocationHierarchySelector';
import { useLanguage } from '../../i18n';
import './WelcomeSection.css';

export function WelcomeSection({ currentUser }) {
  const { t, isMarathi } = useLanguage();

  return (
    <section className="welcome-banner" aria-label={t('home.welcomeTitle')}>
      <div className="welcome-banner__content">
        <h1 className="welcome-banner__title">
          {currentUser
            ? (isMarathi ? 'महाउद्यम उद्योजक व्यासपीठ' : 'MahaUdyam Entrepreneur Portal')
            : t('home.welcomeTitle')}
        </h1>
        <h2 className="welcome-banner__subtitle">
          {currentUser
            ? (isMarathi ? `पुन्हा स्वागत आहे, ${currentUser.name || 'उद्योजक'}!` : `Welcome Back, ${currentUser.name || 'Entrepreneur'}!`)
            : (isMarathi ? 'ग्रामस्थ गरज नोंदणी व ग्रामीण उद्योग व्यासपीठ' : 'Citizen Need Reporting & Rural Enterprise Platform')}
        </h2>
        <p className="welcome-banner__description">
          {currentUser
            ? (isMarathi
                ? 'आपल्या व्यवसायासाठी आठवडे बाजार, कच्चा माल शोध, नफा विश्लेषण आणि यंत्रसामग्री भाडेतत्त्वावर मिळवण्याचे पर्याय खाली उपलब्ध आहेत.'
                : 'Access weekly mandi discovery, raw materials, profit intelligence, and equipment sharing for your local jurisdiction.')
            : (isMarathi
                ? 'गावातील कमतरता नोंदवण्यासाठी प्रथम खालील गाव निवडा. सर्व व्यवसाय मोड्युल्स वापरण्यासाठी उद्योजक म्हणून नोंदणी आवश्यक आहे.'
                : 'Select your village below to report local shortages or register as an entrepreneur to access all business modules.')}
        </p>

        {/* Complete Dependent Location Hierarchy: Maharashtra → District → Taluka → Village */}
        <LocationHierarchySelector />
      </div>
    </section>
  );
}
