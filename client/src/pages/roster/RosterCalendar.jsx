import React, { useState, useEffect } from 'react'
import { rosterAPI, deptAPI } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { formatDate, formatTime, SHIFT_COLORS, STATUS_BADGES } from '../../utils/formatting'

const RosterCalendar = () => {
  const [rosters, setRosters] = useState([])
  const [selectedRosterId, setSelectedRosterId] = useState('')
  const [rosterData, setRosterData] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [departments, setDepartments] = useState([])
  const [selectedDept, setSelectedDept] = useState('')
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const [rRes, dRes] = await Promise.all([
          rosterAPI.getAll({ limit: 20 }),
          deptAPI.getAll({ limit: 100 })
        ])
        const rList = rRes.data?.data || []
        setRosters(rList)
        setDepartments(dRes.data?.data || [])
        if (rList.length > 0) {
          setSelectedRosterId(rList[0]._id)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!selectedRosterId) return
    const fetchRoster = async () => {
      setLoading(true)
      try {
        const { data } = await rosterAPI.getById(selectedRosterId)
        setRosterData(data.data.roster)
        setAssignments(data.data.assignments || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchRoster()
  }, [selectedRosterId])

  const handlePublish = async () => {
    if (!selectedRosterId) return
    setPublishing(true)
    try {
      const { data } = await rosterAPI.publish(selectedRosterId)
      setRosterData(data.data)
      alert('Roster published successfully! Affected staff notified.')
    } catch (err) {
      alert(err.response?.data?.message || 'Publishing failed')
    } finally {
      setPublishing(false)
    }
  }

  // Filter assignments
  const filteredAssignments = selectedDept
    ? assignments.filter(a => a.department?._id === selectedDept || a.department === selectedDept)
    : assignments

  // Group assignments by date
  const groupedByDate = {}
  filteredAssignments.forEach(a => {
    const dStr = a.date ? a.date.split('T')[0] : 'undated'
    if (!groupedByDate[dStr]) groupedByDate[dStr] = []
    groupedByDate[dStr].push(a)
  })

  const dates = Object.keys(groupedByDate).sort()

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hospital Staff Roster Calendar</h1>
          <p className="text-sm text-slate-500 mt-1">
            Visual shift schedule with constraint compliance & fairness monitoring
          </p>
        </div>
        {rosterData?.status === 'draft' && (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="btn-primary"
          >
            {publishing ? 'Publishing...' : 'Publish Roster'}
          </button>
        )}
      </div>

      {/* Selector & Filter Controls */}
      <div className="card p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Select Roster</label>
            <select
              value={selectedRosterId}
              onChange={(e) => setSelectedRosterId(e.target.value)}
              className="form-select min-w-[240px]"
            >
              {rosters.map(r => (
                <option key={r._id} value={r._id}>
                  {r.name} ({formatDate(r.startDate)} – {formatDate(r.endDate)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Filter Department</label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="form-select min-w-[180px]"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>
          </div>
        </div>

        {rosterData && (
          <div className="flex items-center gap-3 text-sm">
            <div>
              <span className="text-slate-500">Status: </span>
              <span className={`badge ${STATUS_BADGES[rosterData.status] || 'badge-gray'}`}>
                {rosterData.status}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Solver: </span>
              <span className={`badge ${STATUS_BADGES[rosterData.solverStatus] || 'badge-blue'}`}>
                {rosterData.solverStatus}
              </span>
            </div>
            <div className="text-xs text-slate-400">
              {filteredAssignments.length} shifts
            </div>
          </div>
        )}
      </div>

      {/* Roster Grid View */}
      {loading ? (
        <div className="card p-12"><LoadingSpinner /></div>
      ) : dates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {dates.map(dateKey => {
            const dayAssignments = groupedByDate[dateKey]
            return (
              <div key={dateKey} className="card flex flex-col">
                <div className="card-header bg-slate-50/70 py-3 flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-800">{formatDate(dateKey)}</span>
                  <span className="badge badge-gray text-[11px]">{dayAssignments.length} duties</span>
                </div>
                <div className="p-3 space-y-2 flex-1">
                  {dayAssignments.map(a => {
                    const style = SHIFT_COLORS[a.shiftType] || SHIFT_COLORS.morning
                    const empName = a.employee?.firstName ? `${a.employee.firstName} ${a.employee.lastName}` : 'Assigned Staff'
                    return (
                      <div
                        key={a._id}
                        className={`p-2.5 rounded-lg border text-xs ${style.bg} ${style.border} ${style.text} space-y-1 shadow-xs`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span>{empName}</span>
                          <span className="text-[10px] uppercase font-bold opacity-75">{a.shiftType}</span>
                        </div>
                        <div className="text-[11px] opacity-90 flex items-center justify-between">
                          <span>{formatTime(a.startDatetime)} – {formatTime(a.endDatetime)}</span>
                          <span>{a.department?.name || 'Unit'}</span>
                        </div>
                        {(a.isNightShift || a.isWeekendShift) && (
                          <div className="flex gap-1 pt-0.5">
                            {a.isNightShift && <span className="badge bg-purple-200 text-purple-900 text-[9px] px-1.5 py-0">Night</span>}
                            {a.isWeekendShift && <span className="badge bg-blue-200 text-blue-900 text-[9px] px-1.5 py-0">Weekend</span>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="card p-12 text-center text-slate-400">
          <p className="text-base font-medium">No shift assignments to display.</p>
          <p className="text-xs mt-1">Select a different roster or run the optimizer to generate a schedule.</p>
        </div>
      )}
    </div>
  )
}

export default RosterCalendar
