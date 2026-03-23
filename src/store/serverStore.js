import { create } from 'zustand'

export const useServerStore = create((set) => ({
  serverDown: false,
  setServerDown: (v) => set({ serverDown: v }),
}))
