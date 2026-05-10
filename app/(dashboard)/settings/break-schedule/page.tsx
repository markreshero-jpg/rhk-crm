'use client'

import { useEffect, useState } from 'react'
import { BreakSchedule, getBreakSchedules, updateBreakSchedule } from '@/lib/breakSchedules'

const DAY_LABELS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function BreakSchedulePage() {
  const [schedules, setSchedules] = useState<BreakSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    getBreakSchedules().then((data) => { setSchedules(data); setLoading(false) })
  }, [])

  async function handleUpdate(id: string, patch: Partial<BreakSchedule>) {
    setSaving(id)
    try {
      const updated = await updateBreakSchedule(id, patch)
      setSchedules((prev) => prev.map((s) => s.id === id ? updated : s))
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="p-10 max-w-2xl space-y-8">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-1">Settings / Workspace</p>
        <h2 className="text-3xl font-medium text-text tracking-tight">Break Schedule</h2>
        <p className="text-sm text-text-muted mt-2">
          Configure unpaid break windows per day. When a WO clock session spans a break window,
          the break duration is automatically deducted from logged hours.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-text-subtle">Loading…</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted border-b border-border">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-widest font-medium text-text-subtle">Day</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-widest font-medium text-text-subtle">Break Start</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-widest font-medium text-text-subtle">Break End</th>
                <th className="px-4 py-2.5 text-left text-[10px] uppercase tracking-widest font-medium text-text-subtle">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {schedules.map((s) => (
                <tr key={s.id} className={`${s.is_active ? '' : 'opacity-50'}`}>
                  <td className="px-4 py-3 font-medium text-text">{DAY_LABELS[s.day_of_week] ?? `Day ${s.day_of_week}`}</td>
                  <td className="px-4 py-2">
                    <input
                      type="time"
                      defaultValue={s.break_start}
                      disabled={!s.is_active || saving === s.id}
                      onBlur={(e) => { if (e.target.value !== s.break_start) handleUpdate(s.id, { break_start: e.target.value }) }}
                      className="px-2 py-1 text-sm bg-surface border border-border-strong rounded focus:outline-none focus:border-accent disabled:opacity-50"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="time"
                      defaultValue={s.break_end}
                      disabled={!s.is_active || saving === s.id}
                      onBlur={(e) => { if (e.target.value !== s.break_end) handleUpdate(s.id, { break_end: e.target.value }) }}
                      className="px-2 py-1 text-sm bg-surface border border-border-strong rounded focus:outline-none focus:border-accent disabled:opacity-50"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={s.is_active}
                      disabled={saving === s.id}
                      onChange={(e) => handleUpdate(s.id, { is_active: e.target.checked })}
                      className="accent-accent cursor-pointer"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-text-faint">
        Break times apply to the device&apos;s local timezone. Sessions that don&apos;t overlap a break window are unaffected.
      </p>
    </div>
  )
}
