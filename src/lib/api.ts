import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pg_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Let the browser set multipart boundary for FormData uploads
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Request failed'
    if (error.response?.status === 401) {
      const path = window.location.pathname
      if (!path.startsWith('/login') && !path.startsWith('/register')) {
        localStorage.removeItem('pg_token')
        localStorage.removeItem('pg_user')
        if (!path.startsWith('/register')) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(new Error(message))
  }
)

export default api
