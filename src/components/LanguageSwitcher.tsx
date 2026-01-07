'use client';

import { useLanguage, type Language } from '@/context/LanguageContext';
import { Check } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';

export function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);

    const languages: { code: Language; label: string; flag: string }[] = [
        { code: 'es', label: 'Español', flag: '/flags/es.svg' },
        { code: 'eu', label: 'Euskera', flag: '/flags/eu.svg' },
        { code: 'en', label: 'English', flag: '/flags/en.svg' },
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
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/20 backdrop-blur border border-white/20 
                         hover:bg-white/30 text-white transition-all active:scale-95"
                title="Change language"
            >
                <Image 
                    src={currentLang?.flag || '/flags/es.svg'} 
                    alt={currentLang?.label || 'Language'} 
                    width={20} 
                    height={14} 
                    className="rounded-sm object-cover"
                />
                <span className="text-xs font-semibold">{language.toUpperCase()}</span>
            </button>

            {isOpen && (
                <>
                    <button
                        type="button"
                        className="fixed inset-0 z-40 cursor-default bg-transparent"
                        onClick={() => setIsOpen(false)}
                        onKeyDown={(e) => e.key === 'Escape' && setIsOpen(false)}
                        aria-label="Close dropdown"
                    />
                    <div className="absolute top-full right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-50 min-w-36 overflow-hidden">
                        {languages.map(lang => (
                            <button
                                key={lang.code}
                                onClick={() => handleLanguageChange(lang.code)}
                                className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 active:bg-slate-100 
                                          transition-colors ${
                                    language === lang.code ? 'bg-blue-50' : ''
                                }`}
                            >
                                <Image 
                                    src={lang.flag} 
                                    alt={lang.label} 
                                    width={20} 
                                    height={14} 
                                    className="rounded-sm object-cover"
                                />
                                <span className={`text-sm ${language === lang.code ? 'font-semibold text-blue-600' : 'text-slate-700'}`}>
                                    {lang.label}
                                </span>
                                {language === lang.code && (
                                    <Check className="w-4 h-4 ml-auto text-blue-600" />
                                )}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
