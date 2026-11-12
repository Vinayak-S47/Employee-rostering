import React from 'react'

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
}

const LoadingSpinner = ({ size = 'md', className = '' }) => {
  return (
    <div
      className={`animate-spin rounded-full border-slate-300 border-t-primary-600 ${sizeMap[size]} ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

export const FullPageLoader = ({ message }) => (
  <div className="fixed inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50">
    <LoadingSpinner size="lg" />
    {message && <p className="mt-4 text-sm text-slate-600">{message}</p>}
  </div>
)

export default LoadingSpinner
