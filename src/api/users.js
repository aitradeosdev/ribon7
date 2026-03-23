import client from './client'

export const getMe = () => client.get('/users/me').then(r => r.data)
export const updateMe = (data) => client.patch('/users/me', data).then(r => r.data)
export const uploadAvatar = (formData) => client.post('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data)
export const getSettings = () => client.get('/users/settings').then(r => r.data)
export const updateSettings = (data) => client.patch('/users/settings', data).then(r => r.data)
export const getSessions = () => client.get('/auth/sessions').then(r => r.data)
export const revokeSession = (id) => client.delete(`/auth/sessions/${id}`).then(r => r.data)
export const getLoginHistory = () => client.get('/auth/login-history').then(r => r.data)
export const getAlerts = (accountId) => client.get('/alerts', { params: { account_id: accountId } }).then(r => r.data)
export const createAlert = (data) => client.post('/alerts', data).then(r => r.data)
export const updateAlert = (id, data) => client.patch(`/alerts/${id}`, data).then(r => r.data)
export const deleteAlert = (id) => client.delete(`/alerts/${id}`).then(r => r.data)
