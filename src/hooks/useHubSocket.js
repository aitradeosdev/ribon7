import { useEffect, useRef, useState } from 'react'
import { hubSocket } from '../ws/hubSocket'
import { useAuthStore } from '../store/authStore'
import { useAccountStore } from '../store/accountStore'
import { useNotifStore } from '../store/notifStore'
import { useWsConnectionStore } from '../store/wsConnectionStore'

export function useHubSocket() {
  const token = useAuthStore((s) => s.accessToken)
  const account = useAccountStore((s) => s.activeAccount)
  const addNotification = useNotifStore((s) => s.addNotification)
  const setConnectionStatus = useWsConnectionStore((s) => s.setConnectionStatus)

  const [summary, setSummary] = useState(null)
  const [positions, setPositions] = useState([])
  const [orders, setOrders] = useState([])
  const connectedRef = useRef(false)

  useEffect(() => {
    if (!token || !account?.id) return

    if (!connectedRef.current) {
      hubSocket.connect(token, account.id)
      connectedRef.current = true
    }

    const unsub = hubSocket.onMessage((data) => {
      const { event, type } = data
      const key = event || type

      if (key === 'account_summary') setSummary(data.data)
      else if (key === 'positions_update') setPositions(data.data ?? [])
      else if (key === 'orders_update') setOrders(data.data ?? [])
      else if (key === 'position_opened') addNotification({ type: 'info', title: 'Position opened', message: `${data.data?.symbol} ${data.data?.type}` })
      else if (key === 'position_closed') addNotification({ type: 'warn', title: 'Position closed', message: `Ticket #${data.data?.ticket}` })
      else if (key === 'alert_triggered') addNotification({ type: 'warn', title: 'Alert triggered', message: data.data?.message || JSON.stringify(data.data) })
      else if (key === 'connection_status') setConnectionStatus(data.status)
    })

    return () => {
      unsub()
      hubSocket.disconnect()
      connectedRef.current = false
    }
  }, [token, account?.id])

  return { summary, positions, orders }
}
