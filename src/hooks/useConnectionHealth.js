import { useEffect, useRef } from 'react'
import { useServerStore } from '../store/serverStore'
import client from '../api/client'

export function useConnectionHealth() {
  const { serverDown, setServerDown } = useServerStore()
  const intervalRef = useRef(null)
  const retryTimeoutRef = useRef(null)

  const checkHealth = async () => {
    try {
      await client.get('/health', { timeout: 5000 })
      if (serverDown) {
        setServerDown(false)
        console.log('✅ Backend connection restored')
      }
    } catch (error) {
      if (!serverDown) {
        setServerDown(true)
        console.log('❌ Backend connection lost')
      }
    }
  }

  const startHealthCheck = () => {
    // Initial check
    checkHealth()
    
    // Regular health checks every 10 seconds
    intervalRef.current = setInterval(checkHealth, 10000)
  }

  const retryConnection = () => {
    if (serverDown) {
      checkHealth()
      // Retry every 3 seconds when server is down
      retryTimeoutRef.current = setTimeout(retryConnection, 3000)
    }
  }

  useEffect(() => {
    startHealthCheck()
    
    // Start retry loop if server is down
    if (serverDown) {
      retryConnection()
    }

    // Check connection when app regains focus
    const handleFocus = () => {
      if (serverDown) {
        checkHealth()
      }
    }
    
    window.addEventListener('focus', handleFocus)
    window.addEventListener('visibilitychange', () => {
      if (!document.hidden && serverDown) {
        checkHealth()
      }
    })

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
      window.removeEventListener('focus', handleFocus)
    }
  }, [serverDown])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current)
    }
  }, [])

  return { serverDown, checkHealth }
}