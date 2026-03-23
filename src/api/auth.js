import client from './client'

export const register = (data) => client.post('/auth/register', data).then(r => r.data)
export const login = (data) => client.post('/auth/login', data).then(r => r.data)
export const logout = () => client.post('/auth/logout').then(r => r.data)
export const refresh = (refresh_token) => client.post('/auth/refresh', { refresh_token }).then(r => r.data)
export const enable2FA = () => client.post('/auth/2fa/enable').then(r => r.data)
export const verify2FA = (code) => client.post('/auth/2fa/verify', { code }).then(r => r.data)
export const disable2FA = (code) => client.post('/auth/2fa/disable', { code }).then(r => r.data)
export const validate2FA = (data) => client.post('/auth/2fa/validate', data).then(r => r.data)
