import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAccountStore = create(
  persist(
    (set) => ({
      activeAccount: null,
      setActiveAccount: (account) => {
        // Disconnect active sockets before switching — imported lazily to avoid circular deps
        import('../ws/hubSocket.js').then(({ hubSocket }) => hubSocket.disconnect())
        import('../ws/tickSocket.js').then(({ tickSocket }) => tickSocket.disconnectAll())
        set({ activeAccount: account })
      },
    }),
    { name: 'ribon7-account', partialize: (s) => ({ activeAccount: s.activeAccount }) }
  )
)
