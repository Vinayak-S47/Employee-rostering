import React, { useState } from 'react'
import LoadingSpinner from './LoadingSpinner'

const DataTable = ({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = 'No data found.',
  pagination,
  onPageChange,
  keyExtractor = (row, i) => i,
}) => {
  const [sortKey, setSortKey] = useState(null)
  const [sortDir, setSortDir] = useState('asc')

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const av = a[sortKey] ?? ''
      const bv = b[sortKey] ?? ''
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  const skeletonRows = Array.from({ length: 5 })

  return (
    <div>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col.key)}
                  className={col.sortable ? 'cursor-pointer select-none hover:bg-slate-100' : ''}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="text-slate-400">
                        {sortKey === col.key
                          ? sortDir === 'asc' ? '↑' : '↓'
                          : '↕'}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? skeletonRows.map((_, i) => (
                  <tr key={i}>
                    {columns.map(col => (
                      <td key={col.key}>
                        <div className="h-4 bg-slate-200 rounded animate-pulse w-3/4" />
                      </td>
                    ))}
                  </tr>
                ))
              : sortedData.length === 0
              ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                          />
                        </svg>
                        <p className="text-sm">{emptyMessage}</p>
                      </div>
                    </td>
                  </tr>
                )
              : sortedData.map((row, i) => (
                  <tr key={keyExtractor(row, i)}>
                    {columns.map(col => (
                      <td key={col.key}>
                        {col.render ? col.render(row[col.key], row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.total > pagination.limit && (
        <div className="flex items-center justify-between mt-4 text-sm text-slate-600">
          <span>
            Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="btn-secondary btn-sm"
            >
              ← Prev
            </button>
            {Array.from({ length: Math.ceil(pagination.total / pagination.limit) }, (_, i) => i + 1)
              .filter(p => Math.abs(p - pagination.page) <= 2)
              .map(p => (
                <button
                  key={p}
                  onClick={() => onPageChange(p)}
                  className={`btn btn-sm ${p === pagination.page ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {p}
                </button>
              ))}
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
              className="btn-secondary btn-sm"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DataTable
