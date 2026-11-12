import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { rosterAPI, leaveAPI } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import useAuthStore from '../../store/authStore'
import { formatDate, formatTime, SHIFT_COLORS } from '../../utils/formatting'

const EmployeeDashboard = () => {
  const { user } = useAuthStore()
  const [shifts, setShifts] = useState([])
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchEmployeeData = async () => {
      try {
        const [shiftRes, leaveRes] = await Promise.all([
          rosterAPI.getAll({ status: 'published', limit: 1 }).catch(() => ({ data: { data: [] } })),
          leaveAPI.getAll({ limit: 5 }).catch(() => ({ data: { data: [] } }))
        ])

        if (shiftRes.data?.data?.[0]?._id) {
          const assignRes = await rosterAPI.getAssignments(shiftRes.data.data[0]._id, { employee: user._id })
          setShifts(assignRes.data?.data || [])
        }
        setLeaves(leaveRes.data?.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchEmployeeData()
  }, [user?._id])

  if (loading) return <LoadingSpinner fullPage />

  const nextShift = shifts.find(s => new Date(s.startDatetime) >= new Date()) || shifts[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.firstName}!</h1>
        <p className="text-sm text-slate-500 mt-1">
          {user?.profile?.jobTitle || user?.profile?.jobCategory} • {user?.department?.name || 'Hospital Staff'}
        </p>
      </div>

      {/* Prominent Next Shift Card */}
      <div className="card p-6 bg-gradient-to-r from-primary-900 to-slate-900 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-primary-300">Your Next Assignment</span>
            {nextShift ? (
              <div className="mt-2">
                <h2 className="text-2xl font-bold">{nextShift.shiftTemplate?.name || nextShift.shiftType}</h2>
                <p className="text-primary-100 text-sm mt-1">
                  {formatDate(nextShift.date)} • {formatTime(nextShift.startDatetime)} – {formatTime(nextShift.endDatetime)}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="badge bg-primary-800 text-primary-200 border border-primary-700">
                    {nextShift.department?.name || 'Department'}
                  </span>
                  {nextShift.isNightShift && (
                    <span className="badge bg-purple-900 text-purple-200">Night Shift</span>
                  )}
                  {nextShift.isWeekendShift && (
                    <span className="badge bg-blue-900 text-blue-200">Weekend Duty</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-slate-300 text-sm">No upcoming shifts scheduled in the active roster.</p>
            )}
          </div>
          <Link to="/roster" className="btn btn-secondary self-start sm:self-auto bg-white/10 text-white border-white/20 hover:bg-white/20">
            View Full Calendar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assigned shifts */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Recent & Upcoming Duties</h3>
            <Link to="/roster" className="text-xs text-primary-600 hover:text-primary-700 font-medium">Calendar →</Link>
          </div>
          <div className="card-body p-0">
            {shifts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {shifts.slice(0, 5).map(s => {
                  const style = SHIFT_COLORS[s.shiftType] || SHIFT_COLORS.morning
                  return (
                    <div key={s._id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{formatDate(s.date)}</p>
                        <p className="text-xs text-slate-500">{formatTime(s.startDatetime)} – {formatTime(s.endDatetime)}</p>
                      </div>
                      <span className={`badge ${style.bg} ${style.text} border ${style.border}`}>
                        {s.shiftTemplate?.name || s.shiftType}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-slate-400">No shifts assigned.</div>
            )}
          </div>
        </div>

        {/* Leave Requests */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Your Leave Requests</h3>
            <Link to="/leave" className="text-xs text-primary-600 hover:text-primary-700 font-medium">Request Leave →</Link>
          </div>
          <div className="card-body p-0">
            {leaves.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {leaves.slice(0, 5).map(l => (
                  <div key={l._id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 capitalize">{l.leaveType} Leave</p>
                      <p className="text-xs text-slate-500">{formatDate(l.startDate)} – {formatDate(l.endDate)}</p>
                    </div>
                    <span className={`badge ${l.status === 'approved' ? 'badge-green' : l.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>
                      {l.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-slate-400">No leave requests submitted.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmployeeDashboard
