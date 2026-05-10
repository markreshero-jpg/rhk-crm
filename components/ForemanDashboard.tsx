'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ClipboardList, CalendarDays, CheckSquare, Users, Timer, X } from 'lucide-react'
import { Staff } from '@/lib/staff'
import { ForemanWO, ForemanInstall, FieldScheduleEvent, getForemanDashboardData } from '@/lib/foremanData'
import { clockOntoWO, getActiveWOSession, WOSessionWithRelations } from '@/lib/woSessions'

const woStatusStyles: Record<string, string> = {
  'Draft':       'bg-surface-muted text-text-muted border-border',
  'Ready':       'bg-info-bg text-info border-info-border',
  'In Progress': 'bg-warning-bg text-warning border-warning-border',
}

const taskStatusStyles: Record<string, string> = {
  'Scheduled':   'bg-info-bg text-info border-info-border',
  'In Progress': 'bg-warning-bg text-warning border-warning-border',
  'Unscheduled': 'bg-surface-muted text-text-muted border-border',
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  if (iso === today) return 'Today'
  if (iso === tomorrow.toISOString().slice(0, 10)) return 'Tomorrow'
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmtTime(t: string | null): string {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2, '0')}${ampm}`
}

export default function ForemanDashboard({ staff }: { staff: Staff }) {
  const [wos, setWos] = useState<ForemanWO[]>([])
  const [installs, setInstalls] = useState<ForemanInstall[]>([])
  const [myTasks, setMyTasks] = useState<FieldScheduleEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSession, setActiveSession] = useState<WOSessionWithRelations | null>(null)
  const [selectedTask, setSelectedTask] = useState<FieldScheduleEvent | null>(null)
  const [clockingOn, setClockingOn] = useState(false)
  const [clockError, setClockError] = useState<string | null>(null)

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const [data, session] = await Promise.all([
        getForemanDashboardData(staff.id),
        getActiveWOSession(staff.id),
      ])
      setWos(data.wos)
      setInstalls(data.installs)
      setMyTasks(data.myTasks)
      setActiveSession(session)
    } finally {
      setLoading(false)
    }
  }, [staff.id])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 30s
  useEffect(() => {
    const id = setInterval(() => load(true), 30_000)
    return () => clearInterval(id)
  }, [load])

  async function handleClockOn(workOrderId: string) {
    setClockingOn(true)
    setClockError(null)
    try {
      await clockOntoWO(staff.id, workOrderId)
      const session = await getActiveWOSession(staff.id)
      setActiveSession(session)
      setSelectedTask(null)
    } catch (e) {
      setClockError((e as Error).message || 'Failed to clock on. Please try again.')
    } finally {
      setClockingOn(false)
    }
  }

  const activeWOs = wos.filter((w) => w.status === 'In Progress')
  const readyWOs   = wos.filter((w) => w.status === 'Ready')
  const draftWOs   = wos.filter((w) => w.status === 'Draft')

  return (
    <div className="p-8 max-w-[1400px]">
      <div className="mb-7">
        <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-1">Production</p>
        <h2 className="text-3xl font-medium text-text tracking-tight">Overview</h2>
      </div>

      {loading ? (
        <p className="text-sm text-text-subtle">Loading…</p>
      ) : (
        <div className="grid grid-cols-3 gap-5">

          {/* ── Work Orders ── */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <ClipboardList size={14} className="text-text-muted" />
                <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Work Orders</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-faint">{wos.length} active</span>
                <Link href="/work-orders" className="text-xs text-text-muted hover:text-text transition-colors">View all</Link>
              </div>
            </div>
            {wos.length === 0 ? (
              <p className="px-5 py-10 text-sm text-text-faint text-center italic flex-1">No active work orders</p>
            ) : (
              <div className="divide-y divide-border overflow-y-auto flex-1 max-h-96">
                {[...activeWOs, ...readyWOs, ...draftWOs].map((wo) => (
                  <div key={wo.id} className="px-4 py-3 hover:bg-surface-hover transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${woStatusStyles[wo.status] || 'bg-surface-muted text-text-muted border-border'}`}>
                        {wo.status}
                      </span>
                      {wo.work_order_number && (
                        <span className="text-[10px] font-mono text-text-faint shrink-0">{wo.work_order_number}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-text truncate">{wo.title || 'Untitled'}</p>
                    <p className="text-xs text-text-muted truncate mt-0.5">
                      {wo.client_name && <span>{wo.client_name}</span>}
                      {wo.job_number && <span className="font-mono"> · {wo.job_number}</span>}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                      {wo.staff_on.length > 0 ? (
                        <>
                          <Users size={11} className="text-success shrink-0" />
                          <span className="text-xs text-success font-medium">{wo.staff_on.join(', ')}</span>
                        </>
                      ) : (
                        <span className="text-xs text-text-faint italic">No one clocked on</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Installs This Week ── */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <CalendarDays size={14} className="text-text-muted" />
                <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Installs This Week</p>
              </div>
              <span className="text-xs text-text-faint">{installs.length}</span>
            </div>
            {installs.length === 0 ? (
              <p className="px-5 py-10 text-sm text-text-faint text-center italic flex-1">No installs scheduled</p>
            ) : (
              <div className="divide-y divide-border overflow-y-auto flex-1 max-h-96">
                {installs.map((evt) => (
                  <div key={evt.id} className="px-4 py-3 hover:bg-surface-hover transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-sm font-medium text-text truncate">{evt.title}</p>
                    </div>
                    <p className="text-xs text-text-muted truncate">
                      {evt.client_name && <span>{evt.client_name}</span>}
                      {evt.job_number && <span className="font-mono"> · {evt.job_number}</span>}
                    </p>
                    <p className="text-xs text-text-subtle mt-1">
                      {fmtDate(evt.scheduled_date)}
                      {evt.start_time && <span> · {fmtTime(evt.start_time)}</span>}
                      {evt.staff_name && <span className="text-text-faint"> · {evt.staff_name}</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Tasks Assigned To Me ── */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <CheckSquare size={14} className="text-text-muted" />
                <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Tasks Assigned To Me</p>
              </div>
              <span className="text-xs text-text-faint">{myTasks.length}</span>
            </div>
            {myTasks.length === 0 ? (
              <p className="px-5 py-10 text-sm text-text-faint text-center italic flex-1">No tasks assigned</p>
            ) : (
              <div className="divide-y divide-border overflow-y-auto flex-1 max-h-96">
                {myTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${taskStatusStyles[task.status] || 'bg-surface-muted text-text-muted border-border'}`}>
                        {task.status}
                      </span>
                      {task.work_order_id && (
                        <span className="text-[10px] text-text-faint font-mono">{task.work_order?.work_order_number}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-text truncate">{task.title}</p>
                    <p className="text-xs text-text-muted truncate mt-0.5">
                      {task.job?.client?.name && <span>{task.job.client.name}</span>}
                      {task.job?.job_number && <span className="font-mono"> · {task.job.job_number}</span>}
                    </p>
                    <p className="text-xs text-text-subtle mt-1">
                      {fmtDate(task.scheduled_date)}
                      {task.start_time && <span> · {fmtTime(task.start_time)}</span>}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
      {/* ── Task clock-on modal ── */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => { setSelectedTask(null); setClockError(null) }}>
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-text">Clock On to Work Order</h2>
              <button onClick={() => { setSelectedTask(null); setClockError(null) }} className="text-text-muted hover:text-text transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Task details */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-text-faint mb-1">Task</p>
                <p className="text-sm font-medium text-text">{selectedTask.title}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  {selectedTask.job?.client?.name && <span>{selectedTask.job.client.name}</span>}
                  {selectedTask.job?.job_number && <span className="font-mono"> · {selectedTask.job.job_number}</span>}
                </p>
                <p className="text-xs text-text-subtle mt-0.5">
                  {fmtDate(selectedTask.scheduled_date)}
                  {selectedTask.start_time && <span> · {fmtTime(selectedTask.start_time)}</span>}
                </p>
              </div>

              {/* WO details or no WO warning */}
              {selectedTask.work_order_id ? (
                <div className="bg-surface-muted border border-border rounded-lg px-4 py-3">
                  <p className="text-[10px] uppercase tracking-widest text-text-faint mb-1">Work Order</p>
                  <p className="text-sm font-medium text-text">
                    {selectedTask.work_order?.work_order_number && (
                      <span className="font-mono text-text-muted mr-2">{selectedTask.work_order.work_order_number}</span>
                    )}
                    {selectedTask.work_order?.title || 'Untitled'}
                  </p>
                  {activeSession && (
                    <p className="text-xs text-warning mt-2">
                      Currently clocked onto {activeSession.work_order_number || 'another WO'} — clocking on here will switch you over.
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-surface-muted border border-border rounded-lg px-4 py-3">
                  <p className="text-sm text-text-muted">No work order linked to this task.</p>
                </div>
              )}
            </div>

            {clockError && <p className="px-6 pb-2 text-xs text-danger">{clockError}</p>}
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              {selectedTask.work_order_id ? (
                <button
                  onClick={() => handleClockOn(selectedTask.work_order_id!)}
                  disabled={clockingOn}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors"
                >
                  <Timer size={14} />
                  {clockingOn ? 'Clocking on…' : 'Clock On'}
                </button>
              ) : (
                <div className="flex-1" />
              )}
              <button
                onClick={() => { setSelectedTask(null); setClockError(null) }}
                className="px-4 py-2.5 text-sm text-text-muted hover:text-text border border-border rounded-md hover:bg-surface-hover transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
