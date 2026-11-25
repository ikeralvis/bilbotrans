'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { applyTheme, useTheme, type ThemeMode } from '@/lib/theme';

const NEXT: Record<ThemeMode, ThemeMode> = { auto: 'light', light: 'dark', dark: 'auto' };
const LABEL: Record<ThemeMode, string> = { auto: 'del sistema', light: 'claro', dark: 'oscuro' };
const ICON = { auto: Monitor, light: Sun, dark: Moon } as const;

/** Botón de tema: muestra el actual y, al pulsarlo, pasa al siguiente (sistema → claro → oscuro). */
export function ThemeToggle() {
    const mode = useTheme();
    const Icon = ICON[mode];
    return (
        <button
            type="button"
            onClick={() => applyTheme(NEXT[mode])}
            aria-label={`Tema ${LABEL[mode]}. Cambiar a tema ${LABEL[NEXT[mode]]}`}
            title={`Tema ${LABEL[mode]}`}
            className="bt-press grid h-11 w-11 shrink-0 place-items-center rounded-full"
            style={{ color: 'var(--ink)', boxShadow: 'inset 0 0 0 1px var(--hairline)' }}
        >
            <Icon key={mode} className="bt-theme-icon h-5 w-5" strokeWidth={1.75} aria-hidden />
        </button>
    );
}
