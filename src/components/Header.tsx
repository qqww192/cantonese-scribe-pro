// src/components/Header.tsx
import React from 'react';

import { useState } from 'react';

export const Header = () => {
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  
  const languages = [
    { code: 'en', label: 'English' },
    { code: 'zh-Hant', label: '繁體中文' },
    { code: 'ja', label: '日本語' }
  ];
  
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);

  return (
    <header className="bg-white border-b border-gray-200 py-3 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <img 
              src="/src/assets/logo.png" 
              alt="CantoneseScribe Logo" 
              className="w-8 h-8 object-contain"
            />
            <div className="text-lg font-medium text-gray-900 uppercase tracking-wide">
              CANTONESE SCRIBE
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex items-center gap-8">
            <a 
              href="/" 
              className="text-sm text-orange-600 hover:text-orange-700 transition-colors font-medium"
            >
              Home
            </a>
            <a 
              href="/pricing" 
              className="text-sm text-orange-600 hover:text-orange-700 transition-colors font-medium"
            >
              Pricing
            </a>
            <a 
              href="/auth" 
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors font-medium"
            >
              Login/Register
            </a>
            
            {/* Language Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-700 transition-colors font-medium"
              >
                {selectedLanguage.label}
                <svg 
                  className={`w-4 h-4 text-orange-600 transition-transform ${isLanguageDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Dropdown Menu */}
              {isLanguageDropdownOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  {languages.map((language) => (
                    <button
                      key={language.code}
                      onClick={() => {
                        setSelectedLanguage(language);
                        setIsLanguageDropdownOpen(false);
                      }}
                      className={`block w-full text-left px-3 py-2 text-sm hover:bg-orange-50 transition-colors ${
                        selectedLanguage.code === language.code 
                          ? 'text-orange-600 bg-orange-50' 
                          : 'text-gray-700'
                      }`}
                    >
                      {language.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;