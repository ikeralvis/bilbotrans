'use client';

import { ReactNode } from 'react';
import { LanguageProvider } from '@/context/LanguageContext';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { GeolocationProvider } from '@/context/GeolocationContext';
import { PWAClient } from '@/components/shared/PWAClient';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <FavoritesProvider>
        <GeolocationProvider>
          <PWAClient />
          {children}
        </GeolocationProvider>
      </FavoritesProvider>
    </LanguageProvider>
  );
}
