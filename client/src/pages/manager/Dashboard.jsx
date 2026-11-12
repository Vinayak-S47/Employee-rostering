import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { analyticsAPI } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import useAuthStore from '../../store/authStore'

const ManagerDashboard = () => {
  const { user } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await analyticsAPI.getDashboard()
        setStats(data.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) return <LoadingSpinner fullPage />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Department Operations</h1>
          <p className="text-sm text-slate-500 mt-1">
            Managing: {user?.managedDepartments?.[0]?.name || user?.department?.name || 'Department'}
          </p>
        </div>
        <Link to="/roster/generate" className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Generate Department Roster</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <span className="text-sm font-medium text-slate-500">Upcoming Shifts</span>
          <div className="mt-2 text-3xl font-bold text-slate-900">{stats?.upcomingShifts || 0}</div>
          <p className="text-xs text-slate-400 mt-1">Scheduled for this period</p>
        </div>
        <div className="card p-5">
          <span className="text-sm font-medium text-slate-500">Pending Leave Requests</span>
          <div className="mt-2 text-3xl font-bold text-amber-600">{stats?.pendingLeave || 0}</div>
          <p className="text-xs text-slate-400 mt-1">Require review & sign-off</p>
        </div>
        <div className="card p-5">
          <span className="text-sm font-medium text-slate-500">Active Medical Personnel</span>
          <div className="mt-2 text-3xl font-bold text-primary-600">{stats?.activeEmployees || 0}</div>
          <p className="text-xs text-slate-400 mt-1">Available for scheduling</p>
        </div>
      </div>

      {/* Quick Links Banner */}
      <div className="card p-6 bg-primary-50/50 border-primary-100 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-slate-900">Automate Department Schedule with CP-SAT</h3>
          <p className="text-sm text-slate-600 mt-1">
            OR-Tools constraint programming checks minimum rest, prevents overlap, respects approved leave, and balances night/weekend duties fairly.
          </p>
        </div>
        <Link to="/roster/generate" className="btn-primary whitespace-nowrap">
          Launch Optimizer
        </Link>
      </div>
    </div>
  )
}

export default ManagerDashboard
