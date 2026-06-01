import axios from 'axios'

const client = axios.create({ baseURL: '/api' })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let queue: Array<(token: string) => void> = []

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    original._retry = true

    if (isRefreshing) {
      return new Promise((resolve) => {
        queue.push((token) => {
          original.headers.Authorization = `Bearer ${token}`
          resolve(client(original))
        })
      })
    }

    isRefreshing = true
    try {
      const refreshToken = localStorage.getItem('refreshToken')
      if (!refreshToken) throw new Error('no refresh token')
      const { data } = await axios.post('/api/auth/refresh', { refreshToken })
      const { accessToken, refreshToken: newRefresh } = data.data
      localStorage.setItem('accessToken', accessToken)
      localStorage.setItem('refreshToken', newRefresh)
      queue.forEach((cb) => cb(accessToken))
      queue = []
      original.headers.Authorization = `Bearer ${accessToken}`
      return client(original)
    } catch {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
      return Promise.reject(error)
    } finally {
      isRefreshing = false
    }
  },
)

export default client
