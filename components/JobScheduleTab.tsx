'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Calendar } from 'lucide-react'
import {
  JobScheduleEventWithRelations,
  SCHEDULE_STATUSES,
  ScheduleEventStatus,
  createScheduleEvent,
  deleteScheduleEvent,
  getScheduleEventsByJobId,
  updateScheduleEvent,
} from '@/lib/jobSchedule'
import { Staff, getActiveStaff } from '@/lib/staff'

const statusStyles: Record<string, string> = {
  'Unscheduled': 'bg-surface-muted text-text-muted border-border',
  'Scheduled':   'bg-info-bg text-info border-info-border',
  'In Progress': 'bg-warning-bg text-warning border-warning-border',
  'Completed':   'bg-success-bg text-success border-success-border',
  'Cancelled':   'bg-surface-muted text-text-faint border-border',
}

export default function JobScheduleTab({ jobId }: { jobId: string }) {
  const [events, setEvents] = useState<JobScheduleEventWithRelations[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const [evts, staffList] = await Promise.all([
      getScheduleEventsByJobId(jobId),
      getActiveStaff(),
    ])
    setEvents(evts)
    setStaff(staffList)
    setLoading(false)
  }, [jobId])

  useEffect(() => { load() }, [load])

  async function handleAdd() {
    setBusy(true)
    try {
      await createScheduleEvent({ job_id: jobId, title: '', status: 'Unscheduled', sort: events.length })
      await load()
    } finally { setBusy(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this schedule event?')) return
    await deleteScheduleEvent(id)
    await load()
  }

  async function handleUpdate(id: string, patch: Parameters<typeof updateScheduleEvent>[1]) {
    await updateScheduleEvent(id, patch)
    await load()
  }

  if (loading) return <p className="text-text-subtle text-sm">Loading...</p>

  const unscheduled = events.filter((e) => !e.scheduled_date)
  const scheduled   = events.filter((e) => !!e.scheduled_date)

  // Group scheduled events by date
  const byDate = new Map<string, JobScheduleEventWithRelations[]>()
  for (const e of scheduled) {
    const d = e.scheduled_date!
    if (!byDate.has(d)) byDate.set(d, [])
    byDate.get(d)!.push(e)
  }
  const sortedDates = [...byDate.keys()].sort()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Schedule</h3>
        <button
          type="button"
          onClick={handleAdd}
          disabled={busy}
          className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors"
        >
          <Plus size={12} /> Add Event
        </button>
      </div>

      {events.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg py-16 text-center">
          <Calendar size={24} className="mx-auto text-text-faint mb-3" />
          <p className="text-text-subtle text-sm mb-1">No schedule events yet.</p>
          <p className="text-text-faint text-xs">Send a quote to a work order to import labour, or add events manually.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Unscheduled */}
          {unscheduled.length > 0 && (
            <section>
              <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium mb-2">Unscheduled</p>
              <div className="border border-border rounded-md overflow-hidden">
                <EventTable
                  events={unscheduled}
                  staff={staff}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              </div>
            </section>
          )}

          {/* Scheduled by date */}
          {sortedDates.map((date) => (
            <section key={date}>
              <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium mb-2">
                {formatDate(date)}
              </p>
              <div className="border border-border rounded-md overflow-hidden">
                <EventTable
                  events={byDate.get(date)!}
                  staff={staff}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Event Table ───────────────────────────────────────────────────────────────

function EventTable({
  events,
  staff,
  onUpdate,
  onDelete,
}: {
  events: JobScheduleEventWithRelations[]
  staff: Staff[]
  onUpdate: (id: string, patch: Parameters<typeof updateScheduleEvent>[1]) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-border bg-surface">
            <Th>Item Name</Th>
            <Th>Task</Th>
            <Th>Date</Th>
            <Th>Staff</Th>
            <Th right>Est. Hrs</Th>
            <Th right>Actual Hrs</Th>
            <Th>Status</Th>
            <Th>Notes</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              staff={staff}
              onUpdate={(patch) => onUpdate(event.id, patch)}
              onDelete={() => onDelete(event.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Event Row ─────────────────────────────────────────────────────────────────

function EventRow({
  event,
  staff,
  onUpdate,
  onDelete,
}: {
  event: JobScheduleEventWithRelations
  staff: Staff[]
  onUpdate: (patch: Parameters<typeof updateScheduleEvent>[1]) => void
  onDelete: () => void
}) {
  const blurText = (field: string) =>
    (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onUpdate({ [field]: e.target.value || null })

  const blurNum = (field: string) =>
    (e: React.FocusEvent<HTMLInputElement>) =>
      onUpdate({ [field]: parseFloat(e.target.value) || null })

  return (
    <tr className="border-b border-border group hover:bg-surface-hover">
      {/* Task */}
      <td className="px-1 py-1 min-w-[160px]">
        <input
          type="text"
          defaultValue={event.title || ''}
          onBlur={blurText('title')}
          placeholder="Task description"
          className={cellCls}
        />
      </td>

      {/* Trade */}
      <td className="px-1 py-1 min-w-[100px]">
        <input
          type="text"
          defaultValue={event.trade_type || ''}
          onBlur={blurText('trade_type')}
          placeholder="e.g. Carpenter"
          className={cellCls}
        />
      </td>

      {/* Date */}
      <td className="px-1 py-1 w-32">
        <input
          type="date"
          defaultValue={event.scheduled_date || ''}
          onBlur={(e) => {
            const date = e.target.value || null
            const patch: Parameters<typeof updateScheduleEvent>[1] = { scheduled_date: date }
            if (date && event.status === 'Unscheduled') patch.status = 'Scheduled'
            onUpdate(patch)
          }}
          className={cellCls}
        />
      </td>

      {/* Staff */}
      <td className="px-1 py-1 min-w-[130px]">
        <select
          defaultValue={event.staff_id || ''}
          onChange={(e) => onUpdate({ staff_id: e.target.value || null })}
          className={cellCls}
        >
          <option value="">— Unassigned —</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>{s.display_name}</option>
          ))}
        </select>
      </td>

      {/* Est. hours */}
      <td className="px-1 py-1 w-20">
        <input
          type="number"
          defaultValue={event.estimated_hours ?? ''}
          onBlur={blurNum('estimated_hours')}
          min={0}
          step={0.5}
          placeholder="—"
          className={cellCls + ' text-right'}
        />
      </td>

      {/* Actual hours */}
      <td className="px-1 py-1 w-20">
        <input
          type="number"
          defaultValue={event.actual_hours ?? ''}
          onBlur={blurNum('actual_hours')}
          min={0}
          step={0.5}
          placeholder="—"
          className={cellCls + ' text-right'}
        />
      </td>

      {/* Status */}
      <td className="px-1 py-1 w-32">
        <select
          value={event.status}
          onChange={(e) => onUpdate({ status: e.target.value as ScheduleEventStatus })}
          className={`w-full text-[11px] rounded px-1.5 py-1 border font-medium focus:outline-none focus:border-accent ${statusStyles[event.status] || ''}`}
        >
          {SCHEDULE_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </td>

      {/* Notes */}
      <td className="px-1 py-1 min-w-[140px]">
        <input
          type="text"
          defaultValue={event.notes || ''}
          onBlur={blurText('notes')}
          placeholder="Notes"
          className={cellCls}
        />
      </td>

      {/* Delete */}
      <td className="px-2 py-1 w-8 text-center">
        <button
          type="button"
          onClick={onDelete}
          className="text-text-faint hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th className={`py-1.5 px-2 text-[10px] uppercase tracking-widest font-medium text-text-subtle whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
      {children}
    </th>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

const cellCls = 'w-full px-1.5 py-1 text-xs bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none'
