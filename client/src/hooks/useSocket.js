// src/hooks/useSocket.js
import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import useAuthStore from '../store/authStore'
import useNotificationStore from '../store/notificationStore'

let socketInstance = null

export const getSocket = () => socketInstance

const useSocket = () => {
  const { token, user } = useAuthStore()
  const addRealtime = useNotificationStore(s => s.addRealtime)
  const initialized = useRef(false)

  useEffect(() => {
    if (!token || !user || initialized.current) return
    initialized.current = true

    socketInstance = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    })

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected:', socketInstance.id)
    })

    socketInstance.on('notification', (data) => {
      addRealtime(data)
    })

    socketInstance.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message)
    })

    return () => {
      if (socketInstance) {
        socketInstance.disconnect()
        socketInstance = null
        initialized.current = false
      }
    }
  }, [token, user])

  return socketInstance
}

export default useSocket
