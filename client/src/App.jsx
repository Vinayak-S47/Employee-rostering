import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'

import AppLayout from './layouts/AppLayout'
import ProtectedRoute from './routes/ProtectedRoute'

// Pages
import Login from './pages/auth/Login'
import AdminDashboard from './pages/admin/Dashboard'
import ManagerDashboard from './pages/manager/Dashboard'
import EmployeeDashboard from './pages/employee/Dashboard'
import EmployeeList from './pages/admin/EmployeeList'
import RosterCalendar from './pages/roster/RosterCalendar'
import GenerateRoster from './pages/roster/GenerateRoster'
import LeaveManagement from './pages/leave/LeaveManagement'
import Analytics from './pages/analytics/Analytics'

const DashboardDispatcher = () => {
  const { user } = useAuthStore()
  if (user?.role === 'admin') return <AdminDashboard />
  if (user?.role === 'manager') return <ManagerDashboard />
  return <EmployeeDashboard />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public login */}
        <Route path="/login" element={<Login />} />

        {/* Protected App shell */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardDispatcher />} />
          <Route path="/roster" element={<RosterCalendar />} />
          <Route
            path="/roster/generate"
            element={
              <ProtectedRoute roles={['admin', 'manager']}>
                <GenerateRoster />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute roles={['admin', 'manager']}>
                <EmployeeList />
              </ProtectedRoute>
            }
          />
          <Route path="/leave" element={<LeaveManagement />} />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute roles={['admin', 'manager']}>
                <Analytics />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
