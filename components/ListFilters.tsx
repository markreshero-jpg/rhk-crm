'use client'

import { Search } from 'lucide-react'

export type FilterOption = {
  value: string
  label: string
}

export type FilterDef = {
  id: string
  label: string
  options: FilterOption[]
}

type Props = {
  searchQuery: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filters?: FilterDef[]
  filterValues?: Record<string, string>
  onFilterChange?: (filterId: string, value: string) => void
  resultCount?: number
  resultLabel?: string
}

export default function ListFilters({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  filterValues = {},
  onFilterChange,
  resultCount,
  resultLabel = 'results',
}: Props) {
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <div className="relative flex-1 min-w-[240px] max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-faint" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full pl-9 pr-3 py-1.5 text-sm bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent focus:ring-2 focus:ring-border"
        />
      </div>

      {filters.map((filter) => (
        <div key={filter.id} className="flex items-center gap-1.5">
          <label className="text-xs text-text-subtle">{filter.label}:</label>
          <select
            value={filterValues[filter.id] || ''}
            onChange={(e) => onFilterChange?.(filter.id, e.target.value)}
            className="px-2 py-1.5 text-sm bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent"
          >
            <option value="">All</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {typeof resultCount === 'number' && (
        <div className="ml-auto text-xs text-text-subtle">
          {resultCount} {resultLabel}
        </div>
      )}
    </div>
  )
}