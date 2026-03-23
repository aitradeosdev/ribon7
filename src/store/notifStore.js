import { create } from 'zustand'

export const useNotifStore = create((set) => ({
  notifications: [],
  addNotification: (notif) =>
    set((s) => ({ notifications: [...s.notifications, { id: Date.now(), timestamp: new Date().toISOString(), ...notif }] })),
  removeNotification: (id) =>
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
  clearAll: () => set({ notifications: [] }),
}))
