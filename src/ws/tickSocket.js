class TickSocket {
  constructor() {
    this._sockets = {}       // symbol → WebSocket
    this._listeners = {}     // symbol → Set of fns
    this._tokens = {}        // symbol → { token, accountId }
  }

  connect(symbol, token, accountId) {
    if (this._sockets[symbol]) return
    this._tokens[symbol] = { token, accountId }
    this._open(symbol)
  }

  _open(symbol) {
    const { token, accountId } = this._tokens[symbol] || {}
    if (!token || !accountId) return
    const url = `${import.meta.env.VITE_WS_BASE_URL}/ticks/${symbol}?token=${token}&account_id=${accountId}`
    const ws = new WebSocket(url)
    this._sockets[symbol] = ws

    ws.onopen = () => {}

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        this._listeners[symbol]?.forEach((fn) => fn(data))
      } catch {}
    }

    ws.onclose = () => {
      delete this._sockets[symbol]
      // Reconnect after 3s if still registered
      if (this._tokens[symbol]) setTimeout(() => this._open(symbol), 3000)
    }

    ws.onerror = () => ws.close()
  }

  disconnect(symbol) {
    delete this._tokens[symbol]
    if (this._sockets[symbol]) { this._sockets[symbol].onclose = null; this._sockets[symbol].close(); delete this._sockets[symbol] }
    delete this._listeners[symbol]
  }

  disconnectAll() {
    Object.keys(this._tokens).forEach((s) => this.disconnect(s))
  }

  send(symbol, data) {
    const ws = this._sockets[symbol]
    if (ws?.readyState === WebSocket.OPEN) { ws.send(JSON.stringify(data)); return true }
    return false
  }

  onMessage(symbol, fn) {
    if (!this._listeners[symbol]) this._listeners[symbol] = new Set()
    this._listeners[symbol].add(fn)
    return () => this._listeners[symbol]?.delete(fn)
  }
}

export const tickSocket = new TickSocket()
