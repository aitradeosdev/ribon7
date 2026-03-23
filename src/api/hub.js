import client from './client'

export const getPositions = () => client.get('/hub/positions').then(r => r.data)
export const closePosition = (ticket) => client.post(`/hub/positions/${ticket}/close`).then(r => r.data)
export const modifyPosition = (ticket, data) => client.patch(`/hub/positions/${ticket}/modify`, data).then(r => r.data)
export const getOrders = () => client.get('/hub/orders').then(r => r.data)
export const placeOrder = (data) => client.post('/hub/orders', data).then(r => r.data)
export const cancelOrder = (ticket) => client.delete(`/hub/orders/${ticket}`).then(r => r.data)
