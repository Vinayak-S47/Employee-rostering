import React, { useState, useEffect } from 'react'
import { leaveAPI } from '../../services/api'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import Modal from '../../components/ui/Modal'
import useAuthStore from '../../store/authStore'
import { formatDate } from '../../utils/formatting'

const LeaveManagement = () => {
  const { user, isManager } = useAuthStore()
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // New leave form
  const [leaveType, setLeaveType] = useState('annual')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadLeaves = async () => {
    setLoading(true)
    try {
      const { data } = await leaveAPI.getAll({ limit: 50 })
      setLeaves(data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeaves()
  }, [])

  const handleCreateLeave = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await leaveAPI.create({ leaveType, startDate, endDate, reason })
      setIsModalOpen(false)
      setReason('')
      loadLeaves()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit leave request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReview = async (id, status) => {
    const comment = prompt(`Enter review comments for ${status}:`) || ''
    try {
      await leaveAPI.review(id, { status, reviewComment: comment })
      loadLeaves()
    } catch (err) {
      alert(err.response?.data?.message || 'Review action failed')
    }
  }

  const handleCancel = async (id) => {
    if (!confirm('Cancel this pending leave request?')) return
    try {
      await leaveAPI.cancel(id)
      loadLeaves()
    } catch (err) {
      alert(err.response?.data?.message || 'Cancellation failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hospital Staff Leave Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Approved leaves are strictly respected as hard constraints by the CP-SAT optimizer
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Submit Leave Request</span>
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-12"><LoadingSpinner /></div>
        ) : leaves.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Dates</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l._id}>
                    <td>
                      <div className="font-semibold text-slate-900">{l.employee?.firstName} {l.employee?.lastName}</div>
                      <div className="text-xs text-slate-400">{l.employee?.email}</div>
                    </td>
                    <td className="capitalize font-medium text-slate-700">{l.leaveType}</td>
                    <td>
                      <span className="font-medium text-slate-900">{formatDate(l.startDate)}</span>
                      <span className="text-slate-400 mx-1">to</span>
                      <span className="font-medium text-slate-900">{formatDate(l.endDate)}</span>
                    </td>
                    <td className="text-xs text-slate-500 max-w-xs truncate">{l.reason || '—'}</td>
                    <td>
                      <span className={`badge ${l.status === 'approved' ? 'badge-green' : l.status === 'rejected' ? 'badge-red' : l.status === 'cancelled' ? 'badge-gray' : 'badge-yellow'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="text-right space-x-2">
                      {isManager() && l.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleReview(l._id, 'approved')}
                            className="btn-ghost btn-sm text-emerald-600 font-semibold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReview(l._id, 'rejected')}
                            className="btn-ghost btn-sm text-red-600 font-semibold"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {l.status === 'pending' && l.employee?._id === user?._id && (
                        <button
                          onClick={() => handleCancel(l._id)}
                          className="btn-ghost btn-sm text-slate-500"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400">No leave requests found.</div>
        )}
      </div>

      {/* Leave Request Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Submit Leave Request"
      >
        <form onSubmit={handleCreateLeave} className="space-y-4">
          <div>
            <label className="form-label">Leave Category</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="form-select"
            >
              <option value="annual">Annual Leave</option>
              <option value="sick">Medical / Sick Leave</option>
              <option value="emergency">Emergency Leave</option>
              <option value="maternity">Maternity Leave</option>
              <option value="paternity">Paternity Leave</option>
              <option value="study">Study / Exam Leave</option>
              <option value="unpaid">Unpaid Leave</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Start Date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">End Date *</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Reason / Justification</label>
            <textarea
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide reason for absence..."
              className="form-input"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default LeaveManagement
