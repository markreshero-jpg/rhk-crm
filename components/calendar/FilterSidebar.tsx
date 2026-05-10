'use client'

import { X } from 'lucide-react'
import type { Staff } from '@/lib/staff'
import type { CalendarFilters } from '@/lib/calendar'
import { TRADE_TYPES, TRADE_PALETTE } from '@/lib/calendar'

export default function FilterSidebar({
  staff,
  filters,
  onChange,
  onClose,
}: {
  staff: Staff[]
  filters: CalendarFilters
  onChange: (f: CalendarFilters) => void
  onClose: () => void
}) {
  const hasFilters = filters.staffIds.length > 0 || filters.tradeTypes.length > 0

  function toggleStaff(id: string) {
    const next = filters.staffIds.includes(id)
      ? filters.staffIds.filter((s) => s !== id)
      : [...filters.staffIds, id]
    onChange({ ...filters, staffIds: next })
  }

  function toggleTrade(t: string) {
    const next = filters.tradeTypes.includes(t)
      ? filters.tradeTypes.filter((x) => x !== t)
      : [...filters.tradeTypes, t]
    onChange({ ...filters, tradeTypes: next })
  }

  function clearAll() {
    onChange({ staffIds: [], tradeTypes: [] })
  }


  return (
    <div className="w-52 shrink-0 bg-surface border-r border-border flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Filters</p>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button
              onClick={clearAll}
              className="text-[10px] text-accent hover:underline"
            >
              Clear
            </button>
          )}
          <button onClick={onClose} className="text-text-faint hover:text-text transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Staff */}
      <div className="px-4 py-3 border-b border-border">
        <p className="text-[10px] uppercase tracking-widest text-text-faint font-medium mb-2.5">Staff</p>
        <div className="space-y-2">
          {staff.map((s) => (
            <label key={s.id} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.staffIds.includes(s.id)}
                onChange={() => toggleStaff(s.id)}
                className="rounded shrink-0"
              />
              {s.colour && (
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: s.colour }}
                />
              )}
              <span className="text-sm text-text-muted group-hover:text-text transition-colors truncate">
                {s.display_name}
              </span>
            </label>
          ))}
          {staff.length === 0 && (
            <p className="text-xs text-text-faint italic">No staff found</p>
          )}
        </div>
      </div>

      {/* Trade Type */}
      <div className="px-4 py-3">
        <p className="text-[10px] uppercase tracking-widest text-text-faint font-medium mb-2.5">Trade Type</p>
        <div className="space-y-2">
          {TRADE_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.tradeTypes.includes(t)}
                onChange={() => toggleTrade(t)}
                className="rounded shrink-0"
              />
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: TRADE_PALETTE[t] ?? '#6b7280' }}
              />
              <span className="text-sm text-text-muted group-hover:text-text transition-colors capitalize">
                {t}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
