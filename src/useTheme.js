// Light / dark mode. The user picks System, Light or Dark in Settings; System follows the phone.
// The choice is kept on this phone only (AsyncStorage), like photos.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors } from './theme';

export const THEME_MODES = ['system', 'light', 'dark'];
const STORAGE_KEY = 'themeMode';

const ThemeContext = createContext({ mode: 'system', setMode: () => {}, scheme: 'light', colors: lightColors });

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => THEME_MODES.includes(saved) && setModeState(saved))
      .catch(() => {});
  }, []);

  const setMode = useCallback((next) => {
    setModeState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const scheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const value = useMemo(
    () => ({ mode, setMode, scheme, colors: scheme === 'dark' ? darkColors : lightColors }),
    [mode, setMode, scheme]
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// → { mode: 'system' | 'light' | 'dark', setMode, scheme: 'light' | 'dark', colors }
export const useTheme = () => useContext(ThemeContext);

// Styles built from the active palette, rebuilt only when the theme changes.
// Pass a factory defined outside the component: const makeStyles = (colors) => StyleSheet.create({...})
export function useStyles(makeStyles) {
  const { colors } = useTheme();
  return useMemo(() => makeStyles(colors), [colors, makeStyles]);
}
