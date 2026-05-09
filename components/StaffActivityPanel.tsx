'use client'

import { useCallback, useEffect, useState } from 'react'
import { MapPin, RefreshCw } from 'lucide-react'
import { ClockEventWithStaff, getCurrentlyClockedIn, getClockHistory } from '@/lib/staffClock'
import { Staff, getActiveStaff } from '@/lib/staff'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function StaffActivityPanel() {
  const [currentlyIn, setCurrentlyIn] = useState<ClockEventWithStaff[]>([])
  const [history, setHistory] = useState<ClockEventWithStaff[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [filterFrom, setFilterFrom] = useState(todayIso())
  const [filterTo, setFilterTo] = useState(todayIso())
  const [filterStaff, setFilterStaff] = useState('')
  const [loading, setLoading] = useState(true)
  const [histLoading, setHistLoading] = useState(false)
  const [currentRefreshing, setCurrentRefreshing] = useState(false)

  const loadCurrent = useCallback(async (showSpinner = false) => {
    if (showSpinner) setCurrentRefreshing(true)
    try {
      setCurrentlyIn(await getCurrentlyClockedIn())
    } finally {
      if (showSpinner) setCurrentRefreshing(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    setHistLoading(true)
    try {
      const data = await getClockHistory({
        from: filterFrom || undefined,
        to: filterTo || undefined,
        staffId: filterStaff || undefined,
        limit: 200,
      })
      setHistory(data)
    } finally {
      setHistLoading(false)
    }
  }, [filterFrom, filterTo, filterStaff])

  useEffect(() => {
    async function init() {
      const [sl] = await Promise.all([getActiveStaff(), loadCurrent()])
      setStaffList(sl)
      setLoading(false)
    }
    init()
  }, [loadCurrent])

  useEffect(() => {
    if (!loading) loadHistory()
  }, [loading, loadHistory])

  if (loading) return <p className="text-text-subtle text-sm">Loading…</p>

  return (
    <div className="space-y-8">
      {/* Currently clocked in */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Currently Clocked In</h3>
          <button
            onClick={() => loadCurrent(true)}
            disabled={currentRefreshing}
            className="text-text-faint hover:text-text transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw size={13} className={currentRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {currentlyIn.length === 0 ? (
          <p className="text-text-faint text-sm italic">No staff currently clocked in.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentlyIn.map((evt) => {
              const colour = evt.staff?.colour || '#94a3b8'
              const name = evt.staff?.display_name || 'Unknown'
              const time = new Date(evt.created_at)
              const mapsHref = evt.latitude && evt.longitude
                ? `https://www.google.com/maps?q=${evt.latitude},${evt.longitude}`
                : null
              return (
                <div key={evt.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-surface">
                  <div
                    className="w-9 h-9 rounded-full shrink-0 border border-black/10"
                    style={{ backgroundColor: colour }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">{name}</p>
                    <p className="text-xs text-text-muted">
                      In since {time.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {mapsHref && (
                      <a
                        href={mapsHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-accent hover:underline mt-0.5"
                      >
                        <MapPin size={10} /> View location
                        {evt.accuracy_m && <span className="text-text-faint ml-0.5">(±{Math.round(Number(evt.accuracy_m))}m)</span>}
                      </a>
                    )}
                    {!mapsHref && (
                      <p className="text-[11px] text-text-faint mt-0.5">No location captured</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium mb-3">Clock History</h3>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <label className="block">
            <span className="block text-xs text-text-muted mb-1">From</span>
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="text-xs px-2 py-1.5 bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-text-muted mb-1">To</span>
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="text-xs px-2 py-1.5 bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-text-muted mb-1">Staff</span>
            <select
              value={filterStaff}
              onChange={(e) => setFilterStaff(e.target.value)}
              className="text-xs px-2 py-1.5 bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent"
            >
              <option value="">All staff</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.display_name}</option>
              ))}
            </select>
          </label>
          <button
            onClick={loadHistory}
            className="px-3 py-1.5 text-xs bg-accent text-accent-text rounded-md hover:bg-accent-hover transition-colors"
          >
            Apply
          </button>
        </div>

        {histLoading ? (
          <p className="text-text-subtle text-sm">Loading…</p>
        ) : history.length === 0 ? (
          <p className="text-text-faint text-sm italic">No events in this date range.</p>
        ) : (
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface">
                  {['Staff', 'Type', 'Date', 'Time', 'Location', 'Notes'].map((h) => (
                    <th key={h} className="py-2 px-3 text-left text-[10px] uppercase tracking-widest text-text-subtle font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((evt) => {
                  const t = new Date(evt.created_at)
                  const colour = evt.staff?.colour || '#94a3b8'
                  const name = evt.staff?.display_name || 'Unknown'
                  const mapsHref = evt.latitude && evt.longitude
                    ? `https://www.google.com/maps?q=${evt.latitude},${evt.longitude}`
                    : null
                  return (
                    <tr key={evt.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colour }} />
                          <span className="text-text">{name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                          evt.type === 'in'
                            ? 'bg-success-bg text-success border-success-border'
                            : 'bg-surface-muted text-text-muted border-border'
                        }`}>
                          {evt.type === 'in' ? 'Clock In' : 'Clock Out'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-text-muted whitespace-nowrap">
                        {t.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-2 px-3 text-text-muted whitespace-nowrap">
                        {t.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="py-2 px-3">
                        {mapsHref ? (
                          <a
                            href={mapsHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-accent hover:underline"
                          >
                            <MapPin size={10} /> View
                            {evt.accuracy_m && <span className="text-text-faint">(±{Math.round(Number(evt.accuracy_m))}m)</span>}
                          </a>
                        ) : (
                          <span className="text-text-faint">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-text-muted">{evt.notes || '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
