import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, loading, error, clearError } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const handleSubmit = async (e) => {
    e.preventDefault()
    clearError()
    const result = await login(email, password)
    if (result.success) {
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    }
  }

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail)
    setPassword('Hospital@2024')
    clearError()
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center font-bold text-white shadow-lg text-2xl">
            H+
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          MediRoster Hospital Scheduling
        </h2>
        <p className="mt-1 text-center text-sm text-slate-600">
          Constraint Programming & Overtime Fairness Optimizer
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-xl sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@hospital.com"
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 text-base"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo account helper pills */}
          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Fast Demo Accounts (click to fill):
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => fillDemo('admin@hospital.com')}
                className="text-left px-3 py-1.5 rounded border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
              >
                <span><strong className="text-slate-900">Admin:</strong> admin@hospital.com</span>
                <span className="badge badge-purple">Admin</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('s.chen@hospital.com')}
                className="text-left px-3 py-1.5 rounded border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
              >
                <span><strong className="text-slate-900">Manager:</strong> s.chen@hospital.com</span>
                <span className="badge badge-blue">Manager</span>
              </button>
              <button
                type="button"
                onClick={() => fillDemo('p.sharma@hospital.com')}
                className="text-left px-3 py-1.5 rounded border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between"
              >
                <span><strong className="text-slate-900">Doctor:</strong> p.sharma@hospital.com</span>
                <span className="badge badge-green">Employee</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center">Default Password: Hospital@2024</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
