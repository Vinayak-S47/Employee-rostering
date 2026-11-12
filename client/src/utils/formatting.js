// src/utils/formatting.js
import { format, parseISO, isValid } from 'date-fns'

export const formatDate = (date, fmt = 'dd MMM yyyy') => {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return isValid(d) ? format(d, fmt) : '—'
  } catch { return '—' }
}

export const formatDateTime = (date) => formatDate(date, 'dd MMM yyyy, HH:mm')

export const formatTime = (date) => {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return isValid(d) ? format(d, 'HH:mm') : '—'
  } catch { return '—' }
}

export const formatHours = (h) => {
  if (h === undefined || h === null) return '—'
  return `${Number(h).toFixed(1)}h`
}

export const SHIFT_COLORS = {
  morning: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-800', dot: 'bg-amber-400' },
  evening: { bg: 'bg-blue-50',  border: 'border-blue-300',  text: 'text-blue-800',  dot: 'bg-blue-400'  },
  night:   { bg: 'bg-purple-50',border: 'border-purple-300',text: 'text-purple-800',dot: 'bg-purple-400' },
  custom:  { bg: 'bg-teal-50',  border: 'border-teal-300',  text: 'text-teal-800',  dot: 'bg-teal-400'  },
}

export const STATUS_BADGES = {
  // Roster status
  draft:     'badge-yellow',
  published: 'badge-green',
  archived:  'badge-gray',
  // Leave status
  pending:   'badge-yellow',
  approved:  'badge-green',
  rejected:  'badge-red',
  cancelled: 'badge-gray',
  // Solver status
  OPTIMAL:   'badge-green',
  FEASIBLE:  'badge-blue',
  INFEASIBLE:'badge-red',
  UNKNOWN:   'badge-yellow',
  NOT_RUN:   'badge-gray',
}

export const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
