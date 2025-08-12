// src/components/Footer.tsx
import React from 'react';

export const Footer = () => {
  const footerLinks = [
    { href: "#credits", label: "Earn Credits" },
    { href: "#api", label: "API Docs" },
    { href: "#about", label: "About" },
    { href: "#terms", label: "Terms" },
    { href: "#privacy", label: "Privacy" }
  ];

  return (
    <footer className="bg-white border-t border-gray-200 py-8">
      <div className="max-w-6xl mx-auto px-5 text-center">
        <div className="flex justify-center gap-6 mb-4 flex-wrap">
          {footerLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-gray-600 hover:text-orange-500 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
        <p className="text-sm text-gray-500">
          Copyright © 2025 CantoneseScribe Ltd.
        </p>
      </div>
    </footer>
  );
};

export default Footer;