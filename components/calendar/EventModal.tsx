'use client'

import { X, Clock, User, Briefcase, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import type { CalendarEvent } from '@/lib/calendar'
import { eventColour, fmtTime } from '@/lib/calendar'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

const STATUS_STYLES: Record<string, string> = {
  'Unscheduled': 'bg-surface-muted text-text-muted border-border',
  'Scheduled':   'bg-info-bg text-info border-info-border',
  'In Progress': 'bg-warning-bg text-warning border-warning-border',
  'Completed':   'bg-success-bg text-success border-success-border',
  'Cancelled':   'bg-surface-muted text-text-faint border-border',
}

export default function EventModal({ event, onClose }: { event: CalendarEvent; onClose: () => void }) {
  const colour = eventColour(event)

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Colour accent bar */}
        <div className="h-1 rounded-t-xl" style={{ backgroundColor: colour }} />

        <div className="flex items-start justify-between px-6 py-4 border-b border-border gap-4">
          <div>
            <h2 className="text-base font-semibold text-text">{event.title}</h2>
            {event.trade_type && (
              <p className="text-xs text-text-muted capitalize mt-0.5">{event.trade_type}</p>
            )}
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text transition-colors shrink-0 mt-0.5">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          {/* Status */}
          <div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[event.status] ?? 'bg-surface-muted text-text-muted border-border'}`}>
              {event.status}
            </span>
          </div>

          {/* Date + time */}
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Clock size={13} className="shrink-0 text-text-faint" />
            <span>{fmtDate(event.scheduled_date)}</span>
            {event.start_time && <span>· {fmtTime(event.start_time)}</span>}
            {event.estimated_hours && (
              <span className="text-text-faint">· {event.estimated_hours}h</span>
            )}
          </div>

          {/* Staff */}
          {event.staff_name && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <User size={13} className="shrink-0 text-text-faint" />
              <span>{event.staff_name}</span>
            </div>
          )}

          {/* Job */}
          {event.job_id && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Briefcase size={13} className="shrink-0 text-text-faint" />
              <span>
                {event.job_number && (
                  <span className="font-mono font-semibold text-text mr-1">{event.job_number}</span>
                )}
                {event.client_name && <span>{event.client_name}</span>}
                {event.job_title && !event.client_name && <span>{event.job_title}</span>}
              </span>
            </div>
          )}

          {/* Work Order */}
          {event.work_order_number && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <ClipboardList size={13} className="shrink-0 text-text-faint" />
              <span className="font-mono">{event.work_order_number}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-border">
          {event.job_id && (
            <Link
              href={`/jobs/${event.job_id}?tab=schedule`}
              onClick={onClose}
              className="flex-1 text-center py-2 text-sm bg-surface border border-border rounded-md hover:bg-surface-hover transition-colors text-text-muted"
            >
              View Job Schedule
            </Link>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-text-muted hover:text-text border border-border rounded-md hover:bg-surface-hover transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
