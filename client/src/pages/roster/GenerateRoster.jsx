import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { rosterAPI, deptAPI } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'

const GenerateRoster = () => {
  const navigate = useNavigate()
  const [departments, setDepartments] = useState([])
  const [departmentId, setDepartmentId] = useState('')

  // Default date horizon: next 7 days
  const today = new Date().toISOString().split('T')[0]
  const nextWeek = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]

  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(nextWeek)
  const [timeLimit, setTimeLimit] = useState(30)
  const [name, setName] = useState('')

  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    deptAPI.getAll({ limit: 100 }).then(res => {
      setDepartments(res.data?.data || [])
    }).catch(console.error)
  }, [])

  const handleGenerate = async (e) => {
    e.preventDefault()
    setRunning(true)
    setError(null)
    setResult(null)

    const payload = {
      departmentId: departmentId || undefined,
      startDate,
      endDate,
      timeLimitSeconds: Number(timeLimit),
      name: name || `Roster ${startDate} – ${endDate}`,
    }

    try {
      const res = await rosterAPI.generate(payload)
      setResult(res.data)
    } catch (err) {
      const errData = err.response?.data
      setError({
        message: errData?.message || 'Optimization failed or returned infeasible',
        errors: errData?.errors || null
      })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Automated Roster Generator</h1>
        <p className="text-sm text-slate-500 mt-1">
          Constraint-programming engine powered by Google OR-Tools CP-SAT
        </p>
      </div>

      {/* Configuration Form */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">
          Optimization Parameters
        </h2>

        <form onSubmit={handleGenerate} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Roster Name (optional)</label>
              <input
                type="text"
                placeholder="e.g. ED Weekly Roster - Nov W1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Scope / Department</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="form-select"
              >
                <option value="">Hospital-Wide (All Units)</option>
                {departments.map(d => (
                  <option key={d._id} value={d._id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Horizon Start Date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Horizon End Date</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Solver Timeout (seconds)</label>
              <input
                type="number"
                min="5"
                max="300"
                value={timeLimit}
                onChange={(e) => setTimeLimit(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {/* Hard Constraints Info Pill */}
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <span className="font-semibold text-slate-800">Hard Constraints Automatically Enforced:</span>
            <ul className="list-disc list-inside space-y-0.5 text-slate-500">
              <li>Shift staffing coverage by role & required qualifications</li>
              <li>No overlapping shift assignments for any personnel</li>
              <li>Strict minimum rest periods between consecutive duties (11h default)</li>
              <li>Zero assignments during approved employee leave periods</li>
              <li>Contracted weekly maximum working hour limits respected</li>
            </ul>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={running}
              className="btn-primary py-2.5 px-6 text-sm"
            >
              {running ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>CP-SAT Solver Running...</span>
                </div>
              ) : (
                'Run Optimization Engine'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Result Section */}
      {result && (
        <div className="card p-6 border-emerald-200 bg-emerald-50/20">
          <div className="flex items-center justify-between pb-4 border-b border-emerald-100">
            <div>
              <span className="badge badge-green text-xs font-bold uppercase tracking-wider">
                {result.data?.solverStatus || 'SOLVED'}
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Roster Generated Successfully!</h3>
            </div>
            <button
              onClick={() => navigate('/roster')}
              className="btn-primary"
            >
              View Roster in Calendar →
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-center">
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Total Assigned</span>
              <span className="text-xl font-bold text-slate-900">{result.data?.assignmentCount || 0}</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Solver Time</span>
              <span className="text-xl font-bold text-slate-900">{result.data?.metrics?.executionTimeMs || 0} ms</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Night Shift Variance</span>
              <span className="text-xl font-bold text-purple-600">
                {result.data?.metrics?.fairness?.nightShiftVariance ?? '0.00'}
              </span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Weekend Variance</span>
              <span className="text-xl font-bold text-blue-600">
                {result.data?.metrics?.fairness?.weekendShiftVariance ?? '0.00'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Infeasible / Error Diagnostics */}
      {error && (
        <div className="card p-6 border-red-200 bg-red-50/20 space-y-4">
          <div className="flex items-center gap-2 text-red-700 font-bold">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error.message}</span>
          </div>

          {error.errors?.diagnostics && (
            <div className="bg-white p-4 rounded-lg border border-red-200 text-xs text-slate-700 space-y-2">
              <p className="font-semibold text-slate-900">Root Cause Diagnostics from CP-SAT:</p>
              {error.errors.diagnostics.infeasibleReasons?.map((r, i) => (
                <p key={i} className="text-red-600">• {r}</p>
              ))}
              {error.errors.diagnostics.suggestions?.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-100">
                  <p className="font-semibold text-slate-800">Recommended Remediation:</p>
                  <ul className="list-disc list-inside text-slate-600 mt-1 space-y-0.5">
                    {error.errors.diagnostics.suggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default GenerateRoster
