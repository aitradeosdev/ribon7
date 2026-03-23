import client from './client'

export const searchSymbols = (q, accountId) =>
  client.get('/symbols/search', { params: { q, account_id: accountId } }).then(r => r.data)
export const getSymbolInfo = (symbol, accountId) =>
  client.get(`/symbols/${symbol}/info`, { params: { account_id: accountId } }).then(r => r.data)
export const getSymbolCandles = (symbol, accountId, timeframe, from_ts, to_ts) =>
  client.get(`/symbols/${symbol}/candles`, { params: { account_id: accountId, timeframe, from_ts, to_ts } }).then(r => r.data)
export const getWatchlist = (accountId) =>
  client.get('/symbols/watchlist', { params: { account_id: accountId } }).then(r => r.data)
export const addToWatchlist = (accountId, symbol) =>
  client.post('/symbols/watchlist', { account_id: accountId, symbol }).then(r => r.data)
export const removeFromWatchlist = (id) =>
  client.delete(`/symbols/watchlist/${id}`).then(r => r.data)
