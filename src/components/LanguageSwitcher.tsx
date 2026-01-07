'use client';

import { useLanguage, type Language } from '@/context/LanguageContext';
import { Globe, Flag } from 'lucide-react';
import { useState } from 'react';

export function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const languages: { code: Language; label: string; flag: string }[] = [
        { code: 'es', label: 'Español', flag: '🇪🇸' },
        { code: 'eu', label: 'Euskera', flag: '🏴' },
        { code: 'en', label: 'English', flag: '🇬🇧' },
    ];

    const handleLanguageChange = (lang: Language) => {
        setLanguage(lang);
        setIsOpen(false);
    };

    const currentLang = languages.find(l => l.code === language);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 
                         text-slate-600 transition-all active:scale-95"
                title="Change language"
            >
                <span className="text-lg">{currentLang?.flag}</span>
                <span className="text-sm font-semibold hidden sm:inline">{language.toUpperCase()}</span>
            </button>

            {isOpen && (
                <>
                    <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setIsOpen(false)} 
                    />
                    <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-max">
                        {languages.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => handleLanguageChange(lang.code)}
                                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 active:bg-slate-100 
                                          transition-colors border-b border-slate-100 last:border-b-0 ${
                                    language === lang.code ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-slate-700'
                                }`}
                            >
                                <span className="text-lg">{lang.flag}</span>
                                <span>{lang.label}</span>
                                {language === lang.code && (
                                    <span className="ml-auto text-xs font-bold">✓</span>
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
