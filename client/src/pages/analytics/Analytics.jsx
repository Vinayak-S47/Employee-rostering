import React, { useState, useEffect } from 'react'
import { analyticsAPI, rosterAPI } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts'

const Analytics = () => {
  const [rosters, setRosters] = useState([])
  const [selectedRosterId, setSelectedRosterId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    rosterAPI.getAll({ limit: 10 }).then(res => {
      const list = res.data?.data || []
      setRosters(list)
      if (list.length > 0) setSelectedRosterId(list[0]._id)
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (!selectedRosterId) {
      setLoading(false)
      return
    }
    const fetchWorkload = async () => {
      setLoading(true)
      try {
        const res = await analyticsAPI.getWorkload({ rosterId: selectedRosterId })
        setData(res.data?.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchWorkload()
  }, [selectedRosterId])

  const handleExportCSV = async () => {
    if (!selectedRosterId) return
    try {
      const response = await analyticsAPI.exportCSV(selectedRosterId)
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `roster_${selectedRosterId}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      alert('CSV Export failed')
    }
  }

  const chartData = (data?.report || []).map(r => ({
    name: `${r.employee?.firstName || ''} ${r.employee?.lastName || ''}`.trim() || 'Staff',
    hours: Number(r.totalHours?.toFixed(1) || 0),
    nights: r.nightShifts || 0,
    weekends: r.weekendShifts || 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workforce & Overtime Fairness Analytics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Mathematical fairness evaluation: workload balance, night shift & weekend distribution
          </p>
        </div>
        {selectedRosterId && (
          <button onClick={handleExportCSV} className="btn-secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export Roster CSV</span>
          </button>
        )}
      </div>

      {/* Roster Picker */}
      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-700">Evaluate Roster:</label>
          <select
            value={selectedRosterId}
            onChange={(e) => setSelectedRosterId(e.target.value)}
            className="form-select min-w-[280px]"
          >
            {rosters.map(r => (
              <option key={r._id} value={r._id}>{r.name} ({r.solverStatus})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Metrics Summary */}
      {data?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5">
            <span className="text-xs font-semibold text-slate-500 uppercase">Avg Scheduled Hours</span>
            <div className="mt-2 text-2xl font-bold text-slate-900">{data.summary.avgHoursPerEmployee}h</div>
            <p className="text-xs text-slate-400 mt-1">Per active employee</p>
          </div>
          <div className="card p-5">
            <span className="text-xs font-semibold text-slate-500 uppercase">Workload Variance</span>
            <div className="mt-2 text-2xl font-bold text-primary-600">{data.summary.workloadVariance}</div>
            <p className="text-xs text-slate-400 mt-1">Lower indicates fairer balance</p>
          </div>
          <div className="card p-5">
            <span className="text-xs font-semibold text-slate-500 uppercase">Night Shift Variance</span>
            <div className="mt-2 text-2xl font-bold text-purple-600">{data.summary.nightShiftVariance}</div>
            <p className="text-xs text-slate-400 mt-1">Undesirable shift dispersion</p>
          </div>
          <div className="card p-5">
            <span className="text-xs font-semibold text-slate-500 uppercase">Total Shift Assignments</span>
            <div className="mt-2 text-2xl font-bold text-emerald-600">{data.summary.totalAssignments}</div>
            <p className="text-xs text-slate-400 mt-1">Covered across {data.summary.employeeCount} staff</p>
          </div>
        </div>
      )}

      {/* Chart: Total Hours per Employee */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Total Scheduled Working Hours by Staff Member</h3>
        {loading ? (
          <div className="p-12"><LoadingSpinner /></div>
        ) : chartData.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} interval={0} angle={-25} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={12} unit="h" />
                <Tooltip />
                <Bar dataKey="hours" name="Total Hours" fill="#0891b2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">No shift hours recorded for this roster.</div>
        )}
      </div>

      {/* Chart: Night & Weekend Distribution */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Fairness: Night Shifts & Weekend Duties Distribution</h3>
        {loading ? (
          <div className="p-12"><LoadingSpinner /></div>
        ) : chartData.length > 0 ? (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} interval={0} angle={-25} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="nights" name="Night Shifts" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="weekends" name="Weekend Shifts" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">No night or weekend duties recorded for this roster.</div>
        )}
      </div>
    </div>
  )
}

export default Analytics
