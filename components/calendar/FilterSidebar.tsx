'use client'

import { useState } from 'react'
import { X, ChevronDown, Search } from 'lucide-react'
import type { Staff } from '@/lib/staff'
import type { CalendarFilters } from '@/lib/calendar'
import { TRADE_PALETTE, tradeTypeColour, fmtTradeType, TRADE_TYPES } from '@/lib/calendar'

function Section({
  label,
  count,
  children,
}: {
  label: string
  count?: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-b border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-hover transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest text-text-faint font-medium">{label}</span>
          {count != null && count > 0 && (
            <span className="text-[10px] bg-accent text-accent-text px-1.5 py-0.5 rounded-full font-medium leading-none">
              {count}
            </span>
          )}
        </div>
        <ChevronDown
          size={13}
          className={`text-text-faint transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
        />
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-4 pb-3 pt-1">
          {children}
        </div>
      </div>
    </div>
  )
}

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
  const hasFilters = filters.jobSearch.trim().length > 0 || filters.staffIds.length > 0 || filters.tradeTypes.length > 0

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
    onChange({ jobSearch: '', staffIds: [], tradeTypes: [] })
  }

  return (
    <div className="w-52 shrink-0 bg-surface border-r border-border flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Filters</p>
        <div className="flex items-center gap-2">
          {hasFilters && (
            <button onClick={clearAll} className="text-[10px] text-accent hover:underline">
              Clear
            </button>
          )}
          <button onClick={onClose} className="text-text-faint hover:text-text transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Job search */}
      <div className="px-4 py-3 border-b border-border">
        <div className="relative">
          <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint pointer-events-none" />
          <input
            type="text"
            value={filters.jobSearch}
            onChange={(e) => onChange({ ...filters, jobSearch: e.target.value })}
            placeholder="Job no. or client…"
            className="w-full pl-7 pr-2.5 py-1.5 text-xs bg-surface-muted border border-border rounded-md focus:outline-none focus:border-accent focus:bg-surface transition-colors placeholder:text-text-faint"
          />
          {filters.jobSearch && (
            <button
              onClick={() => onChange({ ...filters, jobSearch: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-faint hover:text-text"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* Staff */}
      <Section label="Staff" count={filters.staffIds.length}>
        <div className="space-y-2">
          {staff.length === 0 ? (
            <p className="text-xs text-text-faint italic">No staff found</p>
          ) : staff.map((s) => (
            <label key={s.id} className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.staffIds.includes(s.id)}
                onChange={() => toggleStaff(s.id)}
                className="rounded shrink-0"
              />
              {s.colour && (
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.colour }} />
              )}
              <span className="text-sm text-text-muted group-hover:text-text transition-colors truncate">
                {s.display_name}
              </span>
            </label>
          ))}
        </div>
      </Section>

      {/* Trade Type */}
      <Section label="Trade Type" count={filters.tradeTypes.length}>
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
      </Section>
    </div>
  )
}
