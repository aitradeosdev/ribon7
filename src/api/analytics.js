import client from './client'

const p = (accountId, extra = {}) => ({ account_id: accountId, ...extra })

export const getSummary = (accountId, params) => client.get('/analytics/summary', { params: p(accountId, params) }).then(r => r.data)
export const getEquityCurve = (accountId, params) => client.get('/analytics/equity-curve', { params: p(accountId, params) }).then(r => r.data)
export const getDrawdown = (accountId, params) => client.get('/analytics/drawdown', { params: p(accountId, params) }).then(r => r.data)
export const getBySymbol = (accountId, params) => client.get('/analytics/by-symbol', { params: p(accountId, params) }).then(r => r.data)
export const getByWeekday = (accountId, params) => client.get('/analytics/by-weekday', { params: p(accountId, params) }).then(r => r.data)
export const getBySession = (accountId, params) => client.get('/analytics/by-session', { params: p(accountId, params) }).then(r => r.data)
