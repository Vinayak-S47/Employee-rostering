import React from 'react'
import { NavLink } from 'react-router-dom'
import useAuthStore from '../../store/authStore'

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { user, isAdmin, isManager } = useAuthStore()

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'Roster Calendar', path: '/roster', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    ...(isManager() ? [
      { label: 'Generate Roster', path: '/roster/generate', icon: 'M13 10V3L4 14h7v7l9-11h-7z' }
    ] : []),
    { label: 'Leave Requests', path: '/leave', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    ...(isManager() ? [
      { label: 'Employees', path: '/employees', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
      { label: 'Analytics', path: '/analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }
    ] : []),
  ]

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-200 flex flex-col transition-transform duration-200 ease-in-out
        lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand header */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-primary-500 flex items-center justify-center font-bold text-white shadow-md text-lg">
            H+
          </div>
          <div>
            <div className="font-bold text-base text-white tracking-wide">MediRoster</div>
            <div className="text-[11px] text-primary-400 font-medium">Workforce Optimizer</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
              `}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
              </svg>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User profile footer */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-semibold text-primary-300">
              {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-400 capitalize truncate">
                {user?.role} {user?.profile?.jobCategory ? `• ${user.profile.jobCategory}` : ''}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
