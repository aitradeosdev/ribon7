import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      login: (user, tokens) => set({ user, accessToken: tokens.access_token, refreshToken: tokens.refresh_token }),
      logout: () => set({ user: null, accessToken: null, refreshToken: null }),
      setUser: (user) => set({ user }),
      setTokens: (tokens) => set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token }),
    }),
    { name: 'ribon7-auth', partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user }) }
  )
)
