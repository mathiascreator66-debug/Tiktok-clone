export type ThemeMode = "light" | "dark";

export const THEME_COOKIE = "afrivoix_theme";
export const THEME_KEY = "afrivoix_theme";

export function normalizeTheme(raw: unknown): ThemeMode {
  return raw === "dark" ? "dark" : "light";
}

export function applyThemeClass(theme: ThemeMode) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
}

export function readStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    const ls = localStorage.getItem(THEME_KEY);
    if (ls === "light" || ls === "dark") return ls;
  } catch {
    /* */
  }
  const m = document.cookie.match(/(?:^|; )afrivoix_theme=(light|dark)/);
  if (m) return m[1] as ThemeMode;
  return null;
}

export function persistTheme(theme: ThemeMode) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* */
  }
  const maxAge = 365 * 24 * 60 * 60;
  document.cookie = `${THEME_COOKIE}=${theme}; path=/; max-age=${maxAge}; samesite=lax`;
  applyThemeClass(theme);
}
