import { useEffect, useState, useCallback } from 'react'
import { tickSocket } from '../ws/tickSocket'
import { useAuthStore } from '../store/authStore'
import { useAccountStore } from '../store/accountStore'

export function useTickSocket(symbol) {
  const token = useAuthStore((s) => s.accessToken)
  const account = useAccountStore((s) => s.activeAccount)
  const [tick, setTick] = useState({ bid: null, ask: null, spread: null, dailyChangePct: null, lastUpdated: null })

  useEffect(() => {
    if (!token || !account?.id || !symbol) return
    tickSocket.connect(symbol, token, account.id)
    const unsub = tickSocket.onMessage(symbol, (data) => {
      if (data.type === 'tick') {
        setTick({
          bid: data.bid,
          ask: data.ask,
          spread: data.spread,
          dailyChangePct: data.daily_change_pct,
          lastUpdated: data.time,
        })
      }
    })
    return () => unsub()
  }, [token, account?.id, symbol])

  const send = useCallback((data) => tickSocket.send(symbol, data), [symbol])
  return { ...tick, send }
}
