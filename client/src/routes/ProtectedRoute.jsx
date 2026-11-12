import { Navigate, useLocation } from 'react-router-dom'
import useAuthStore from '../store/authStore'

const ProtectedRoute = ({ children, roles }) => {
  const { user, token } = useAuthStore()
  const location = useLocation()

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return children
}

export default ProtectedRoute
