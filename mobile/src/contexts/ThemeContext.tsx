/**
 * Theme context - system/light/dark mode with MMKV persistence
 * Pattern from HangsFree app
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  useColorScheme as useSystemColorScheme,
  Appearance,
} from "react-native";
import { MMKV } from "react-native-mmkv";

export type ThemeMode = "system" | "light" | "dark";
export type ColorScheme = "light" | "dark";

interface ThemeContextValue {
  themeMode: ThemeMode;
  colorScheme: ColorScheme;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_STORAGE_KEY = "beta_rocks_theme_mode";
const storage = new MMKV();

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const isMounted = useRef(false);

  useEffect(() => {
    const saved = storage.getString(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      setThemeModeState(saved);
    }
  }, []);

  useEffect(() => {
    if (isMounted.current) {
      storage.set(THEME_STORAGE_KEY, themeMode);
    } else {
      isMounted.current = true;
    }

    // Sync with system appearance API
    if (themeMode === "system") {
      Appearance.setColorScheme(null);
    } else {
      Appearance.setColorScheme(themeMode);
    }
  }, [themeMode]);

  const colorScheme: ColorScheme =
    themeMode === "system"
      ? systemColorScheme === "dark"
        ? "dark"
        : "light"
      : themeMode;

  function setThemeMode(mode: ThemeMode) {
    setThemeModeState(mode);
  }

  return (
    <ThemeContext.Provider value={{ themeMode, colorScheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
