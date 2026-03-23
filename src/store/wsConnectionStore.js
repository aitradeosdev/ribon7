import { create } from 'zustand'

export const useWsConnectionStore = create((set) => ({
  connectionStatus: 'connected', // 'connected' | 'reconnecting' | 'disconnected'
  setConnectionStatus: (status) => set({ connectionStatus: status }),
}))
