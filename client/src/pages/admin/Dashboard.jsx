import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { analyticsAPI } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { formatDate } from '../../utils/formatting'

const AdminDashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await analyticsAPI.getDashboard()
        setStats(data.data)
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard metrics')
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) return <LoadingSpinner fullPage />

  if (error) {
    return (
      <div className="card p-6 bg-red-50 text-red-700 border-red-200">
        <h3 className="font-semibold text-lg">Error loading dashboard</h3>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  const statCards = [
    { label: 'Active Staff', value: stats?.activeEmployees || 0, sub: `of ${stats?.totalEmployees || 0} registered`, color: 'text-primary-600', bg: 'bg-primary-50' },
    { label: 'Departments', value: stats?.totalDepartments || 0, sub: 'Active medical units', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Leaves', value: stats?.pendingLeave || 0, sub: 'Awaiting manager approval', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Upcoming Shifts', value: stats?.upcomingShifts || 0, sub: 'Scheduled duties', color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hospital Administration Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time workforce deployment & CP-SAT solver status</p>
        </div>
        <Link to="/roster/generate" className="btn-primary">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Run Roster Optimizer</span>
        </Link>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{card.label}</span>
              <span className={`w-8 h-8 rounded-lg ${card.bg} ${card.color} flex items-center justify-center font-bold text-sm`}>
                #
              </span>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-bold text-slate-900">{card.value}</span>
              <p className="text-xs text-slate-400 mt-1">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Optimization Jobs */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Recent CP-SAT Optimization Jobs</h2>
            <Link to="/roster/generate" className="text-xs font-medium text-primary-600 hover:text-primary-700">
              New Run →
            </Link>
          </div>
          <div className="card-body p-0">
            {stats?.recentJobs?.length > 0 ? (
              <div className="table-container border-0 rounded-none">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Department</th>
                      <th>Time</th>
                      <th>Initiator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentJobs.map((job) => (
                      <tr key={job._id}>
                        <td>
                          <span className={`badge ${job.solverStatus === 'OPTIMAL' || job.solverStatus === 'FEASIBLE' ? 'badge-green' : job.solverStatus === 'INFEASIBLE' ? 'badge-red' : 'badge-yellow'}`}>
                            {job.solverStatus || job.status}
                          </span>
                        </td>
                        <td>{job.department?.name || 'All Units'}</td>
                        <td className="text-xs">{job.executionTimeMs ? `${job.executionTimeMs}ms` : '—'}</td>
                        <td className="text-xs">{job.initiatedBy?.firstName} {job.initiatedBy?.lastName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-slate-400">
                No optimization jobs logged yet. Generate your first roster to view CP-SAT logs.
              </div>
            )}
          </div>
        </div>

        {/* Active Rosters */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Active Published Rosters</h2>
            <Link to="/roster" className="text-xs font-medium text-primary-600 hover:text-primary-700">
              View Calendar →
            </Link>
          </div>
          <div className="card-body p-0">
            {stats?.publishedRosters?.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {stats.publishedRosters.map((roster) => (
                  <div key={roster._id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">{roster.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatDate(roster.startDate)} – {formatDate(roster.endDate)}
                      </p>
                    </div>
                    <span className="badge badge-green">Published</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-slate-400">
                No active published rosters right now.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
