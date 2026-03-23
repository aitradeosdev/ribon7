import axios from 'axios'
import { useServerStore } from '../store/serverStore'

const client = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL })

client.interceptors.request.use((config) => {
  const { accessToken } = JSON.parse(localStorage.getItem('ribon7-auth') || '{}')?.state || {}
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

let _refreshing = null

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true
      if (!_refreshing) {
        const { refreshToken } = JSON.parse(localStorage.getItem('ribon7-auth') || '{}')?.state || {}
        _refreshing = client.post('/auth/refresh', { refresh_token: refreshToken })
          .then((r) => {
            const stored = JSON.parse(localStorage.getItem('ribon7-auth') || '{}')
            if (stored.state) {
              stored.state.accessToken = r.data.access_token
              stored.state.refreshToken = r.data.refresh_token
              localStorage.setItem('ribon7-auth', JSON.stringify(stored))
            }
            _refreshing = null
            return r.data.access_token
          })
          .catch(() => {
            _refreshing = null
            const stored = JSON.parse(localStorage.getItem('ribon7-auth') || '{}')
            stored.state = { ...stored.state, accessToken: null, refreshToken: null, user: null }
            localStorage.setItem('ribon7-auth', JSON.stringify(stored))
            window.location.href = '/login'
          })
      }
      const newToken = await _refreshing
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return client(original)
      }
    }
    // Network error or 5xx → server down
    if (!err.response || err.response.status >= 500) {
      useServerStore.getState().setServerDown(true)
    } else {
      useServerStore.getState().setServerDown(false)
    }
    return Promise.reject(err)
  }
)

export default client
