'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { applyTheme, useTheme, type ThemeMode } from '@/lib/theme';

const OPTIONS: Array<{ id: ThemeMode; label: string; Icon: typeof Sun }> = [
    { id: 'auto', label: 'Tema del sistema', Icon: Monitor },
    { id: 'light', label: 'Tema claro', Icon: Sun },
    { id: 'dark', label: 'Tema oscuro', Icon: Moon },
];

/** Interruptor de tres posiciones (sistema / claro / oscuro), como el selector de vista de Bide+. */
export function ThemeToggle() {
    const mode = useTheme();
    return (
        <div role="radiogroup" aria-label="Tema" className="inline-flex rounded-full p-1" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card)' }}>
            {OPTIONS.map(({ id, label, Icon }) => {
                const on = id === mode;
                return (
                    <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        aria-label={label}
                        onClick={() => applyTheme(id)}
                        className="bt-press grid h-9 w-9 place-items-center rounded-full"
                        style={{ background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--bg)' : 'var(--ink-2)', transition: 'background-color 160ms var(--ease-out), color 160ms var(--ease-out)' }}
                    >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={on ? 2 : 1.5} aria-hidden />
                    </button>
                );
            })}
        </div>
    );
}
