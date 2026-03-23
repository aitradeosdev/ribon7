import client from './client'

export const getTrades = (params) => client.get('/trades', { params }).then(r => r.data)
export const getTradeById = (id) => client.get(`/trades/${id}`).then(r => r.data)
export const updateTags = (id, tags) => client.patch(`/trades/${id}/tags`, { tags }).then(r => r.data)
export const updateNotes = (id, notes) => client.patch(`/trades/${id}/notes`, { notes }).then(r => r.data)
export const getCalendar = (accountId, year, month) =>
  client.get(`/trades/calendar/${year}/${month}`, { params: { account_id: accountId } }).then(r => r.data)
