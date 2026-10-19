'use client';

import { createContext, useContext, type ReactNode } from 'react';

/** The store's logo URL (from the dashboard settings), for image fallbacks. */
const StoreLogoContext = createContext<string | null>(null);

export function StoreLogoProvider({
    logoUrl,
    children,
}: {
    logoUrl: string | null;
    children: ReactNode;
}) {
    return (
        <StoreLogoContext.Provider value={logoUrl}>
            {children}
        </StoreLogoContext.Provider>
    );
}

export function useStoreLogo(): string | null {
    return useContext(StoreLogoContext);
}
