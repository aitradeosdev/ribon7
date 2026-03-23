import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const getSystemTheme = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const applyTheme = (theme) => {
  const resolved = theme === 'system' ? getSystemTheme() : theme
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

export const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => { applyTheme(theme); set({ theme }) },
      toggle: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark'
        applyTheme(next)
        set({ theme: next })
      },
    }),
    { name: 'ribon7-theme', onRehydrateStorage: () => (state) => { if (state) applyTheme(state.theme) } }
  )
)
