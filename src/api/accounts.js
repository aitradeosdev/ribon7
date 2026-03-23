import client from './client'

export const getAccounts = () => client.get('/accounts').then(r => r.data)
export const createAccount = (data) => client.post('/accounts', data).then(r => r.data)
export const getAccountStatus = (id) => client.get(`/accounts/${id}/status`).then(r => r.data)
export const activateAccount = (id) => client.post(`/accounts/${id}/activate`).then(r => r.data)
export const deleteAccount = (id) => client.delete(`/accounts/${id}`).then(r => r.data)
export const getBrokers = () => client.get('/brokers').then(r => r.data)
export const getBrokerTerminals = (broker) => client.get(`/brokers/${broker}/terminals`).then(r => r.data)
