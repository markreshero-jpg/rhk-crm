'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ClipboardList, CalendarDays, CheckSquare, Users, Timer, X, Calendar, ClipboardCheck } from 'lucide-react'
import { Staff } from '@/lib/staff'
import { ForemanWO, ForemanInstall, FieldScheduleEvent, StaffWOStatus, getForemanDashboardData } from '@/lib/foremanData'
import { clockOntoWO, clockOffWO, getActiveWOSession, WOSessionWithRelations } from '@/lib/woSessions'

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
  const router = useRouter()
  const [wos, setWos] = useState<ForemanWO[]>([])
  const [installs, setInstalls] = useState<ForemanInstall[]>([])
  const [myTasks, setMyTasks] = useState<FieldScheduleEvent[]>([])
  const [staffStatus, setStaffStatus] = useState<StaffWOStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSession, setActiveSession] = useState<WOSessionWithRelations | null>(null)
  const [selectedInstall, setSelectedInstall] = useState<ForemanInstall | null>(null)
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
      setStaffStatus(data.staffStatus)
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
      setClockError(null)
    } catch (e) {
      setClockError((e as Error).message || 'Failed to clock on. Please try again.')
    } finally {
      setClockingOn(false)
    }
  }

  async function handleClockOff() {
    setClockingOn(true)
    setClockError(null)
    try {
      await clockOffWO(staff.id)
      setActiveSession(null)
      setSelectedTask(null)
    } catch (e) {
      setClockError((e as Error).message || 'Failed to clock off. Please try again.')
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
        <>
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
              <div className="divide-y divide-border overflow-y-auto flex-1 max-h-[30rem]">
                {[...activeWOs, ...readyWOs, ...draftWOs].map((wo) => (
                  <div key={wo.id} className="px-4 py-2 hover:bg-surface-hover transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      {wo.work_order_number && (
                        <span className="text-sm font-semibold font-mono text-text shrink-0">{wo.work_order_number}</span>
                      )}
                      {wo.client_name && (
                        <span className="text-sm font-medium text-text truncate">{wo.client_name}</span>
                      )}
                      <span className={`ml-auto inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${woStatusStyles[wo.status] || 'bg-surface-muted text-text-muted border-border'}`}>
                        {wo.status}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted truncate">{wo.title || 'Untitled'}</p>
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

          {/* ── Installs · Next 14 Days ── */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <CalendarDays size={14} className="text-text-muted" />
                <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Installs · Next 14 Days</p>
              </div>
              <span className="text-xs text-text-faint">{installs.length}</span>
            </div>
            {installs.length === 0 ? (
              <p className="px-5 py-10 text-sm text-text-faint text-center italic flex-1">No installs scheduled</p>
            ) : (
              <div className="divide-y divide-border overflow-y-auto flex-1 max-h-[30rem]">
                {installs.map((evt) => (
                  <button key={evt.id} onClick={() => setSelectedInstall(evt)} className="w-full text-left px-4 py-2 hover:bg-surface-hover transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      {evt.job_number && (
                        <span className="text-sm font-semibold font-mono text-text shrink-0">{evt.job_number}</span>
                      )}
                      {evt.client_name && (
                        <span className="text-sm font-medium text-text truncate">{evt.client_name}</span>
                      )}
                      <span className="ml-auto text-[10px] text-text-muted shrink-0 whitespace-nowrap">
                        {fmtDate(evt.scheduled_date)}{evt.start_time && ` · ${fmtTime(evt.start_time)}`}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted truncate">{evt.title}</p>
                    {evt.staff_name && <p className="text-xs text-text-faint">{evt.staff_name}</p>}
                  </button>
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
              <div className="divide-y divide-border overflow-y-auto flex-1 max-h-[30rem]">
                {myTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="w-full text-left px-4 py-2 hover:bg-surface-hover transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {task.work_order?.work_order_number && (
                        <span className="text-sm font-semibold font-mono text-text shrink-0">{task.work_order.work_order_number}</span>
                      )}
                      {task.job?.client?.name && (
                        <span className="text-sm font-medium text-text truncate">{task.job.client.name}</span>
                      )}
                      <span className={`ml-auto inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${taskStatusStyles[task.status] || 'bg-surface-muted text-text-muted border-border'}`}>
                        {task.status}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted truncate">{task.title}</p>
                    <p className="text-xs text-text-faint">
                      {fmtDate(task.scheduled_date)}
                      {task.start_time && <span> · {fmtTime(task.start_time)}</span>}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ── Factory Staff Status ── */}
        {staffStatus.length > 0 && (
          <div className="mt-5 bg-surface border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-text-muted" />
                <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Factory Staff</p>
              </div>
              <span className="text-xs text-text-faint">{staffStatus.filter((s) => s.work_order_id).length} clocked on</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted">
                  <th className="text-left text-[10px] uppercase tracking-widest text-text-faint font-medium px-5 py-2">Name</th>
                  <th className="text-left text-[10px] uppercase tracking-widest text-text-faint font-medium px-5 py-2">Work Order</th>
                  <th className="text-left text-[10px] uppercase tracking-widest text-text-faint font-medium px-5 py-2">Job / Client</th>
                  <th className="text-left text-[10px] uppercase tracking-widest text-text-faint font-medium px-5 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {staffStatus.map((s) => (
                  <tr key={s.staff_id} className="hover:bg-surface-hover transition-colors">
                    <td className="px-5 py-2.5 font-medium text-text whitespace-nowrap">{s.staff_name}</td>
                    <td className="px-5 py-2.5 font-mono text-text-muted whitespace-nowrap">
                      {s.work_order_number || <span className="text-text-faint not-italic">—</span>}
                      {s.work_order_title && <span className="font-sans text-xs text-text-faint ml-2">{s.work_order_title}</span>}
                    </td>
                    <td className="px-5 py-2.5 text-text-muted">
                      {s.job_number && <span className="font-mono text-xs mr-1.5">{s.job_number}</span>}
                      {s.client_name || <span className="text-text-faint">—</span>}
                    </td>
                    <td className="px-5 py-2.5 whitespace-nowrap">
                      {s.work_order_id ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-success font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                          Clocked On
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-text-faint">
                          <span className="w-1.5 h-1.5 rounded-full bg-border inline-block" />
                          Not Clocked On
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        </>
      )}
      {/* ── Install modal ── */}
      {selectedInstall && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setSelectedInstall(null)}>
          <div className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="text-base font-semibold text-text">Install</h2>
              <button onClick={() => setSelectedInstall(null)} className="text-text-muted hover:text-text transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-1">
              {selectedInstall.job_number && (
                <p className="text-sm font-semibold font-mono text-text">{selectedInstall.job_number}</p>
              )}
              {selectedInstall.client_name && (
                <p className="text-sm font-medium text-text">{selectedInstall.client_name}</p>
              )}
              <p className="text-xs text-text-muted">{selectedInstall.title}</p>
              <p className="text-xs text-text-faint">
                {fmtDate(selectedInstall.scheduled_date)}
                {selectedInstall.start_time && ` · ${fmtTime(selectedInstall.start_time)}`}
                {selectedInstall.staff_name && ` · ${selectedInstall.staff_name}`}
              </p>
            </div>

            <div className="flex flex-col gap-2 px-6 py-4 border-t border-border">
              <button
                onClick={() => { router.push('/calendar'); setSelectedInstall(null) }}
                className="flex items-center gap-3 px-4 py-2.5 text-sm bg-surface border border-border rounded-md hover:bg-surface-hover text-text transition-colors"
              >
                <Calendar size={15} className="text-text-muted shrink-0" />
                View in Calendar
              </button>
              {selectedInstall.work_order_id ? (
                <button
                  onClick={() => { router.push(`/work-orders`); setSelectedInstall(null) }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm bg-surface border border-border rounded-md hover:bg-surface-hover text-text transition-colors"
                >
                  <ClipboardCheck size={15} className="text-text-muted shrink-0" />
                  View Work Order
                  {selectedInstall.work_order_number && (
                    <span className="ml-auto font-mono text-xs text-text-muted">{selectedInstall.work_order_number}</span>
                  )}
                </button>
              ) : selectedInstall.job_id ? (
                <button
                  onClick={() => { router.push(`/jobs/${selectedInstall.job_id}?tab=work-orders`); setSelectedInstall(null) }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm bg-surface border border-border rounded-md hover:bg-surface-hover text-text transition-colors"
                >
                  <ClipboardCheck size={15} className="text-text-muted shrink-0" />
                  View Job Work Orders
                </button>
              ) : null}
            </div>
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
              {selectedTask.work_order_id ? (() => {
                const alreadyOnThisWO = activeSession?.work_order_id === selectedTask.work_order_id
                const onDifferentWO = activeSession && !alreadyOnThisWO
                return (
                  <div className={`border rounded-lg px-4 py-3 ${alreadyOnThisWO ? 'bg-success-bg border-success-border' : 'bg-surface-muted border-border'}`}>
                    <p className="text-[10px] uppercase tracking-widest text-text-faint mb-1">Work Order</p>
                    <p className="text-sm font-medium text-text">
                      {selectedTask.work_order?.work_order_number && (
                        <span className="font-mono text-text-muted mr-2">{selectedTask.work_order.work_order_number}</span>
                      )}
                      {selectedTask.work_order?.title || 'Untitled'}
                    </p>
                    {alreadyOnThisWO && (
                      <p className="text-xs text-success font-medium mt-2">You are currently clocked onto this work order.</p>
                    )}
                    {onDifferentWO && (
                      <p className="text-xs text-warning mt-2">
                        Currently clocked onto {activeSession.work_order_number || 'another WO'} — clocking on here will switch you over.
                      </p>
                    )}
                  </div>
                )
              })() : (
                <div className="bg-surface-muted border border-border rounded-lg px-4 py-3">
                  <p className="text-sm text-text-muted">No work order linked to this task.</p>
                </div>
              )}
            </div>

            {clockError && <p className="px-6 pb-2 text-xs text-danger">{clockError}</p>}
            <div className="flex gap-3 px-6 py-4 border-t border-border">
              {selectedTask.work_order_id ? (
                activeSession?.work_order_id === selectedTask.work_order_id ? (
                  <button
                    onClick={handleClockOff}
                    disabled={clockingOn}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm bg-danger text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-colors"
                  >
                    <Timer size={14} />
                    {clockingOn ? 'Clocking off…' : 'Clock Off'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleClockOn(selectedTask.work_order_id!)}
                    disabled={clockingOn}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors"
                  >
                    <Timer size={14} />
                    {clockingOn ? 'Clocking on…' : 'Clock On'}
                  </button>
                )
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
