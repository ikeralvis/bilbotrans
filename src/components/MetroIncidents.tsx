'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, AlertCircle, Info, X, ChevronDown, ChevronUp, Construction } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface Incident {
    title: string;
    description: string;
    resume: string;
    observation: string;
    createdAt: string;
    isInIssuesBar: boolean;
    resoluteAt: string | null;
    line: string[];
    station: { code: string | null };
    exit: string | null;
    type: string;
    direction: string | null;
}

interface IncidentsData {
    serviceIssues: Incident[];
    installationIssues: Incident[];
}

export function MetroIncidents() {
    const { language } = useLanguage();
    const [incidents, setIncidents] = useState<IncidentsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const fetchIncidents = async () => {
            try {
                const response = await fetch(`/api/metro/incidents?lang=${language}`);
                if (!response.ok) throw new Error('Failed to fetch');
                const data = await response.json();
                setIncidents(data);
            } catch (err) {
                setError('Error loading incidents');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchIncidents();
        // Refresh every 5 minutes
        const interval = setInterval(fetchIncidents, 300000);
        return () => clearInterval(interval);
    }, [language]);

    if (isLoading || error || dismissed) return null;
    
    const totalIssues = (incidents?.serviceIssues?.length || 0) + (incidents?.installationIssues?.length || 0);
    
    if (totalIssues === 0) return null;

    const hasServiceIssues = (incidents?.serviceIssues?.length || 0) > 0;

    return (
        <div className={`rounded-xl overflow-hidden transition-all duration-300 ${
            hasServiceIssues 
                ? 'bg-red-50 border border-red-200' 
                : 'bg-amber-50 border border-amber-200'
        }`}>
            {/* Header - Always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full p-3 flex items-center justify-between text-left"
            >
                <div className="flex items-center gap-3">
                    {hasServiceIssues ? (
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4 text-red-600" />
                        </div>
                    ) : (
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                            <Construction className="w-4 h-4 text-amber-600" />
                        </div>
                    )}
                    <div>
                        <h3 className={`text-sm font-semibold ${hasServiceIssues ? 'text-red-800' : 'text-amber-800'}`}>
                            {hasServiceIssues ? 'Avisos de servicio' : 'Avisos de instalaciones'}
                        </h3>
                        <p className={`text-xs ${hasServiceIssues ? 'text-red-600' : 'text-amber-600'}`}>
                            {totalIssues} {totalIssues === 1 ? 'aviso activo' : 'avisos activos'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setDismissed(true);
                        }}
                        className={`p-1 rounded-full hover:bg-white/50 ${hasServiceIssues ? 'text-red-400 hover:text-red-600' : 'text-amber-400 hover:text-amber-600'}`}
                    >
                        <X className="w-4 h-4" />
                    </button>
                    {isExpanded ? (
                        <ChevronUp className={`w-4 h-4 ${hasServiceIssues ? 'text-red-500' : 'text-amber-500'}`} />
                    ) : (
                        <ChevronDown className={`w-4 h-4 ${hasServiceIssues ? 'text-red-500' : 'text-amber-500'}`} />
                    )}
                </div>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-3 pb-3 space-y-2 animate-fadeIn">
                    {/* Service Issues */}
                    {incidents?.serviceIssues?.map((issue, idx) => (
                        <div key={`service-${idx}`} className="p-2.5 rounded-lg bg-white border border-red-100">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{issue.title}</p>
                                    <p className="text-xs text-slate-600 mt-1">{issue.resume || issue.description}</p>
                                    {issue.line && issue.line.length > 0 && (
                                        <div className="flex gap-1 mt-2">
                                            {issue.line.map((l) => (
                                                <span key={l} className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold">
                                                    {l}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Installation Issues */}
                    {incidents?.installationIssues?.map((issue, idx) => (
                        <div key={`install-${idx}`} className="p-2.5 rounded-lg bg-white border border-amber-100">
                            <div className="flex items-start gap-2">
                                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-semibold text-slate-900">{issue.title}</p>
                                    <p className="text-xs text-slate-600 mt-1">{issue.resume || issue.description}</p>
                                    {issue.station?.code && (
                                        <span className="inline-block mt-2 px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-medium">
                                            📍 Estación: {issue.station.code}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
