"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

export type SiteSettings = Record<string, string>;

const SiteSettingsContext = createContext<SiteSettings>({});

export function SiteSettingsProvider({
  settings,
  children,
}: {
  settings: SiteSettings;
  children: ReactNode;
}) {
  const value = useMemo(() => settings, [settings]);
  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

/**
 * Read a site setting from the nearest provider.
 * Falls back to an optional default if the key isn't set.
 */
export function useSiteSetting(key: string, fallback = ""): string {
  const settings = useContext(SiteSettingsContext);
  return settings[key] ?? fallback;
}
