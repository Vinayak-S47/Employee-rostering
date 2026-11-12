// src/store/authStore.js
import { create } from 'zustand'
import { authAPI } from '../services/api'

const useAuthStore = create((set, get) => ({
  user:    JSON.parse(localStorage.getItem('user') || 'null'),
  token:   localStorage.getItem('token') || null,
  loading: false,
  error:   null,

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { data } = await authAPI.login({ email, password })
      const { token, user } = data.data
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      set({ token, user, loading: false })
      return { success: true }
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed'
      set({ loading: false, error: message })
      return { success: false, error: message }
    }
  },

  logout: async () => {
    try { await authAPI.logout() } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    set({ user: null, token: null })
  },

  refreshUser: async () => {
    try {
      const { data } = await authAPI.getMe()
      const user = data.data.user
      localStorage.setItem('user', JSON.stringify(user))
      set({ user })
    } catch {}
  },

  clearError: () => set({ error: null }),

  isAdmin:   () => get().user?.role === 'admin',
  isManager: () => get().user?.role === 'manager' || get().user?.role === 'admin',
}))

export default useAuthStore
