import React from 'react'
import Modal from './Modal'

const variantConfig = {
  danger: {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmClass: 'btn-danger',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
        />
      </svg>
    ),
  },
  warning: {
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    confirmClass: 'btn bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-400',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 9v3.75m0 3.75h.008v.008H12V16.5zm9.303-3.376c.866 1.5-.217 3.374-1.948 3.374H4.645c-1.73 0-2.813-1.874-1.948-3.374L10.05 3.378c.866-1.5 3.032-1.5 3.898 0l5.355 9.246z"
        />
      </svg>
    ),
  },
  info: {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    confirmClass: 'btn-primary',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
        />
      </svg>
    ),
  },
}

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  variant = 'danger',
  loading = false,
}) => {
  const cfg = variantConfig[variant] || variantConfig.danger

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="sm">
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className={`flex items-center justify-center h-12 w-12 rounded-full ${cfg.iconBg} ${cfg.iconColor}`}>
          {cfg.icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{message}</p>
        </div>
      </div>
      <div className="flex justify-center gap-3 mt-6">
        <button onClick={onClose} disabled={loading} className="btn-secondary">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`btn ${cfg.confirmClass}`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Processing...
            </span>
          ) : confirmText}
        </button>
      </div>
    </Modal>
  )
}

export default ConfirmDialog
