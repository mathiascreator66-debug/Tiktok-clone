"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  applyThemeClass,
  normalizeTheme,
  persistTheme,
  readStoredTheme,
  type ThemeMode,
} from "@/lib/theme";

type Ctx = {
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
};

const ThemeCtx = createContext<Ctx>({
  theme: "light",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeCtx);
}

export default function ThemeProvider({
  initialTheme = "light",
  children,
}: {
  initialTheme?: ThemeMode;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemeMode>(normalizeTheme(initialTheme));

  useEffect(() => {
    const stored = readStoredTheme();
    if (stored) {
      setThemeState(stored);
      applyThemeClass(stored);
    } else {
      applyThemeClass(theme);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = (t: ThemeMode) => {
    const next = normalizeTheme(t);
    setThemeState(next);
    persistTheme(next);
    // Best-effort sync to account
    fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ theme: next }),
    }).catch(() => {});
  };

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
