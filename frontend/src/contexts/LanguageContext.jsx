import React, { createContext, useState, useContext, useEffect } from 'react';
import { changeLanguage } from '../i18n'; // Import from your i18n setup

// Create the context
const LanguageContext = createContext(null);

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        const savedLang = localStorage.getItem('i18nextLng');
        // Only use saved language if it's explicitly 'en' or 'ar', otherwise default to 'en'
        return (savedLang === 'en' || savedLang === 'ar') ? savedLang : 'en';
    });

    // Function to handle language change
    const switchLanguage = (lang) => {
        // Change language in i18next
        changeLanguage(lang);

        // Update local state
        setLanguage(lang);

        // Save to localStorage
        localStorage.setItem('i18nextLng', lang);

        // Update document direction for RTL support
        if (lang === 'ar') {
            document.documentElement.dir = 'rtl';
            document.documentElement.lang = 'ar';
            document.body.classList.add('rtl');
        } else {
            document.documentElement.dir = 'ltr';
            document.documentElement.lang = 'en';
            document.body.classList.remove('rtl');
        }
    };

    // Set initial document direction based on stored language
    useEffect(() => {
        if (language === 'ar') {
            document.documentElement.dir = 'rtl';
            document.documentElement.lang = 'ar';
            document.body.classList.add('rtl');
        } else {
            document.documentElement.dir = 'ltr';
            document.documentElement.lang = 'en';
            document.body.classList.remove('rtl');
        }
    }, []);

    return (
        <LanguageContext.Provider value={{ language, switchLanguage }}>
            {children}
        </LanguageContext.Provider>
    );
};

// Hook to use the language context
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};