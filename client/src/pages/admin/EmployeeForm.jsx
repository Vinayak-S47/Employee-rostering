import React, { useState, useEffect } from 'react'
import { empAPI, deptAPI } from '../../services/api'

const EmployeeForm = ({ employee, departments = [], onSuccess, onCancel }) => {
  const isEdit = !!employee
  const u = employee?.user || {}

  const [deptList, setDeptList] = useState(departments || [])
  const [loadingDepts, setLoadingDepts] = useState(false)
  const [deptError, setDeptError] = useState(null)

  const [formData, setFormData] = useState({
    firstName: u.firstName || '',
    lastName: u.lastName || '',
    email: u.email || '',
    password: '',
    role: u.role || 'employee',
    employeeId: u.employeeId || '',
    jobCategory: employee?.jobCategory || 'Nurse',
    jobTitle: employee?.jobTitle || '',
    department: employee?.department?._id || employee?.department || (departments[0]?._id) || '',
    contractedHoursPerWeek: employee?.contractedHoursPerWeek ?? 40,
    maxHoursPerWeek: employee?.maxHoursPerWeek ?? 48,
    minRestHoursBetweenShifts: employee?.minRestHoursBetweenShifts ?? 11,
    skills: (employee?.skills || []).join(', '),
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch departments if not provided or empty
  const fetchDepartments = async () => {
    setLoadingDepts(true)
    setDeptError(null)
    try {
      const res = await deptAPI.getAll({ limit: 100 })
      const list = res.data?.data || []
      setDeptList(list)
      if (!formData.department && list.length > 0) {
        setFormData(prev => ({ ...prev, department: list[0]._id }))
      }
    } catch (err) {
      setDeptError(err.response?.data?.message || 'Failed to load department list')
    } finally {
      setLoadingDepts(false)
    }
  }

  useEffect(() => {
    if (departments && departments.length > 0) {
      setDeptList(departments)
      if (!formData.department) {
        setFormData(prev => ({ ...prev, department: departments[0]._id }))
      }
    } else {
      fetchDepartments()
    }
  }, [departments])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!formData.department) {
      setError('Primary Department is required. Please select a department.')
      return
    }

    setLoading(true)

    const payload = {
      ...formData,
      skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
    }
    if (isEdit && !payload.password) delete payload.password

    try {
      if (isEdit) {
        await empAPI.update(employee._id, payload)
      } else {
        await empAPI.create(payload)
      }
      onSuccess()
    } catch (err) {
      const msg = err.response?.data?.errors?.map(e => e.message).join(', ') || err.response?.data?.message || 'Failed to save staff profile'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {deptError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-center justify-between">
          <span>{deptError}</span>
          <button type="button" onClick={fetchDepartments} className="text-xs font-semibold underline ml-2">
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">First Name *</label>
          <input
            type="text"
            required
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="form-input"
            placeholder="e.g. John"
          />
        </div>
        <div>
          <label className="form-label">Last Name *</label>
          <input
            type="text"
            required
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="form-input"
            placeholder="e.g. Doe"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="form-label">Email Address *</label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="form-input"
            placeholder="doctor@hospital.com"
          />
        </div>
        <div>
          <label className="form-label">Employee ID</label>
          <input
            type="text"
            placeholder="EMP021"
            value={formData.employeeId}
            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            className="form-input"
          />
        </div>
      </div>

      {!isEdit && (
        <div>
          <label className="form-label">Initial Password *</label>
          <input
            type="password"
            required
            placeholder="Hospital@2024"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="form-input"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Job Category *</label>
          <select
            value={formData.jobCategory}
            onChange={(e) => setFormData({ ...formData, jobCategory: e.target.value })}
            className="form-select"
          >
            <option value="Doctor">Doctor</option>
            <option value="Nurse">Nurse</option>
            <option value="Technician">Technician</option>
            <option value="Pharmacist">Pharmacist</option>
            <option value="Admin Staff">Admin Staff</option>
          </select>
        </div>
        <div>
          <label className="form-label">Primary Department *</label>
          <select
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            className="form-select"
            required
            disabled={loadingDepts}
          >
            {loadingDepts ? (
              <option value="" disabled>Loading departments...</option>
            ) : deptList.length === 0 ? (
              <option value="" disabled>No departments available</option>
            ) : (
              <>
                <option value="">-- Select Department --</option>
                {deptList.map(d => (
                  <option key={d._id} value={d._id}>
                    {d.name} {d.code ? `(${d.code})` : ''}
                  </option>
                ))}
              </>
            )}
          </select>
          {loadingDepts && (
            <span className="text-[11px] text-slate-400 mt-1 block">Fetching active departments...</span>
          )}
        </div>
        <div>
          <label className="form-label">System Access Role *</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="form-select"
          >
            <option value="employee">Hospital Employee</option>
            <option value="manager">Department Manager</option>
            <option value="admin">Administrator</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="form-label">Contract Hours / Wk</label>
          <input
            type="number"
            value={formData.contractedHoursPerWeek}
            onChange={(e) => setFormData({ ...formData, contractedHoursPerWeek: Number(e.target.value) })}
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Max Hours / Wk (Cap)</label>
          <input
            type="number"
            value={formData.maxHoursPerWeek}
            onChange={(e) => setFormData({ ...formData, maxHoursPerWeek: Number(e.target.value) })}
            className="form-input"
          />
        </div>
        <div>
          <label className="form-label">Min Rest Hours (Gap)</label>
          <input
            type="number"
            value={formData.minRestHoursBetweenShifts}
            onChange={(e) => setFormData({ ...formData, minRestHoursBetweenShifts: Number(e.target.value) })}
            className="form-input"
          />
        </div>
      </div>

      <div>
        <label className="form-label">Skills & Qualifications (comma-separated)</label>
        <input
          type="text"
          placeholder="triage, IV_therapy, ICU_care, ventilator_management"
          value={formData.skills}
          onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
          className="form-input"
        />
        <p className="text-xs text-slate-400 mt-1">CP-SAT solver matches these against shift qualifications.</p>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={loading || loadingDepts} className="btn-primary">
          {loading ? 'Saving...' : isEdit ? 'Update Profile' : 'Create Staff Member'}
        </button>
      </div>
    </form>
  )
}

export default EmployeeForm
