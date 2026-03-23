import { useThemeStore } from '../store/themeStore'

export function useTheme() {
  const { theme, setTheme, toggle } = useThemeStore()
  return { theme, isDark: theme === 'dark', toggle, setTheme }
}
