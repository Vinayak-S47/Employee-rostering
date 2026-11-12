import React, { useState, useEffect } from 'react'
import { empAPI, deptAPI } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import EmployeeForm from './EmployeeForm'

const EmployeeList = () => {
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedRole, setSelectedRole] = useState('')

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)
  const [deactivatingId, setDeactivatingId] = useState(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const [empRes, deptRes] = await Promise.all([
        empAPI.getAll({ search, department: selectedDept, role: selectedRole, limit: 50 }),
        deptAPI.getAll({ limit: 100 })
      ])
      setEmployees(empRes.data?.data || [])
      setDepartments(deptRes.data?.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [search, selectedDept, selectedRole])

  const handleDeactivate = async () => {
    if (!deactivatingId) return
    try {
      await empAPI.deactivate(deactivatingId)
      setDeactivatingId(null)
      loadData()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to deactivate')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hospital Staff Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage personnel, qualifications, and department eligibility</p>
        </div>
        <button
          onClick={() => { setEditingEmployee(null); setIsFormOpen(true) }}
          className="btn-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Employee</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name, email, employee ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
          />
        </div>
        <div className="w-full md:w-48">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="form-select"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d._id} value={d._id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="w-full md:w-40">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="form-select"
          >
            <option value="">All Job Roles</option>
            <option value="Doctor">Doctor</option>
            <option value="Nurse">Nurse</option>
            <option value="Technician">Technician</option>
            <option value="Pharmacist">Pharmacist</option>
            <option value="Admin Staff">Admin Staff</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="p-12"><LoadingSpinner /></div>
        ) : employees.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>ID</th>
                  <th>Category / Title</th>
                  <th>Department</th>
                  <th>Access Role</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map(profile => {
                  const u = profile.user || {}
                  return (
                    <tr key={profile._id}>
                      <td>
                        <div className="font-semibold text-slate-900">{u.firstName} {u.lastName}</div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </td>
                      <td className="text-xs font-mono">{u.employeeId || profile.employeeNumber || '—'}</td>
                      <td>
                        <span className="font-medium text-slate-800">{profile.jobCategory}</span>
                        {profile.jobTitle && <span className="block text-xs text-slate-400">{profile.jobTitle}</span>}
                      </td>
                      <td>{profile.department?.name || '—'}</td>
                      <td>
                        <span className={`badge ${u.role === 'admin' ? 'badge-purple' : u.role === 'manager' ? 'badge-blue' : 'badge-gray'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${profile.employmentStatus === 'active' ? 'badge-green' : 'badge-red'}`}>
                          {profile.employmentStatus}
                        </span>
                      </td>
                      <td className="text-right space-x-2">
                        <button
                          onClick={() => { setEditingEmployee(profile); setIsFormOpen(true) }}
                          className="btn-ghost btn-sm text-primary-600"
                        >
                          Edit
                        </button>
                        {profile.employmentStatus === 'active' && (
                          <button
                            onClick={() => setDeactivatingId(profile._id)}
                            className="btn-ghost btn-sm text-red-600"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400">No staff members found matching criteria.</div>
        )}
      </div>

      {/* Employee Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingEmployee ? "Edit Employee Profile" : "Register New Staff Member"}
        size="lg"
      >
        <EmployeeForm
          employee={editingEmployee}
          departments={departments}
          onSuccess={() => { setIsFormOpen(false); loadData() }}
          onCancel={() => setIsFormOpen(false)}
        />
      </Modal>

      {/* Deactivate confirmation */}
      <ConfirmDialog
        isOpen={!!deactivatingId}
        onClose={() => setDeactivatingId(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Staff Member"
        message="Are you sure you want to deactivate this employee? They will no longer be considered for automated CP-SAT rostering."
        confirmText="Deactivate"
        variant="danger"
      />
    </div>
  )
}

export default EmployeeList
