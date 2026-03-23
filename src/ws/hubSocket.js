class HubSocket {
  constructor() {
    this._ws = null
    this._listeners = new Set()
    this._token = null
    this._accountId = null
    this._retries = 0
    this._maxRetries = 5
    this._intentionalClose = false
  }

  connect(token, accountId) {
    this._token = token
    this._accountId = accountId
    this._intentionalClose = false
    this._retries = 0
    this._open()
  }

  _open() {
    if (this._ws) { this._ws.onclose = null; this._ws.close() }
    const url = `${import.meta.env.VITE_WS_BASE_URL}/hub?token=${this._token}&account_id=${this._accountId}`
    this._ws = new WebSocket(url)

    this._ws.onopen = () => {
      this._retries = 0
      this._dispatch({ type: 'connection_status', status: 'connected' })
    }

    this._ws.onmessage = (e) => {
      try { this._dispatch(JSON.parse(e.data)) } catch {}
    }

    this._ws.onclose = () => {
      this._ws = null
      if (this._intentionalClose) return
      if (this._retries < this._maxRetries) {
        this._retries++
        this._dispatch({ type: 'connection_status', status: 'reconnecting' })
        setTimeout(() => this._open(), Math.min(1000 * this._retries, 10000))
      } else {
        this._dispatch({ type: 'connection_status', status: 'disconnected' })
      }
    }

    this._ws.onerror = () => this._ws?.close()
  }

  _dispatch(data) {
    this._listeners.forEach((fn) => fn(data))
  }

  disconnect() {
    this._intentionalClose = true
    this._token = null
    this._accountId = null
    if (this._ws) { this._ws.onclose = null; this._ws.close(); this._ws = null }
  }

  send(data) {
    if (this._ws?.readyState === WebSocket.OPEN) this._ws.send(JSON.stringify(data))
  }

  onMessage(fn) { this._listeners.add(fn); return () => this._listeners.delete(fn) }

  get connected() { return this._ws?.readyState === WebSocket.OPEN }
}

export const hubSocket = new HubSocket()
