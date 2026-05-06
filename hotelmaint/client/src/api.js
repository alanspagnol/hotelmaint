import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('hm_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('hm_token')
      localStorage.removeItem('hm_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
