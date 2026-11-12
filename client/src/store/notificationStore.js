// src/store/notificationStore.js
import { create } from 'zustand'
import { notifAPI } from '../services/api'

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount:   0,
  loading:       false,

  fetchNotifications: async (unreadOnly = false) => {
    set({ loading: true })
    try {
      const { data } = await notifAPI.getAll({ unreadOnly: String(unreadOnly), limit: 30 })
      const unread = data.data.filter(n => !n.isRead).length
      set({ notifications: data.data, unreadCount: unread, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  markRead: async (id) => {
    await notifAPI.markRead(id)
    set(s => ({
      notifications: s.notifications.map(n => n._id === id ? { ...n, isRead: true } : n),
      unreadCount:   Math.max(0, s.unreadCount - 1),
    }))
  },

  markAllRead: async () => {
    await notifAPI.markAllRead()
    set(s => ({
      notifications: s.notifications.map(n => ({ ...n, isRead: true })),
      unreadCount:   0,
    }))
  },

  addRealtime: (notif) => {
    set(s => ({
      notifications: [notif, ...s.notifications].slice(0, 50),
      unreadCount:   s.unreadCount + 1,
    }))
  },
}))

export default useNotificationStore
