'use client'

import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  getLookupValues,
  createLookupValue,
  deleteLookupValue,
  LookupValue,
} from '@/lib/lookups'

type Props = {
  listName: string
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
}

export default function EditableSelect({
  listName,
  value,
  onChange,
  placeholder = '— Select —',
}: Props) {
  const [options, setOptions] = useState<LookupValue[]>([])
  const [managing, setManaging] = useState(false)
  const [newValue, setNewValue] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    refresh()
  }, [listName])

  async function refresh() {
    setLoading(true)
    const values = await getLookupValues(listName)
    setOptions(values)
    setLoading(false)
  }

  async function handleAdd() {
    if (!newValue.trim()) return
    await createLookupValue(listName, newValue.trim())
    setNewValue('')
    await refresh()
  }

  async function handleRemove(id: string) {
    if (!confirm('Remove this option? Existing records using it are unaffected.')) return
    await deleteLookupValue(id)
    await refresh()
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={loading}
          className="flex-1 px-3 py-2 text-sm bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent focus:ring-2 focus:ring-border"
        >
          <option value="">{placeholder}</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.value}>
              {opt.value}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setManaging(!managing)}
          className="px-3 py-2 text-xs text-text-muted bg-surface border border-border-strong rounded-md hover:bg-surface-hover"
        >
          {managing ? 'Done' : 'Manage'}
        </button>
      </div>

      {managing && (
        <div className="mt-2 p-3 bg-surface-muted border border-border rounded-md space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAdd()
                }
              }}
              placeholder="Add new option..."
              className="flex-1 px-3 py-1.5 text-sm bg-surface border border-border-strong rounded-md"
            />
            <button
              type="button"
              onClick={handleAdd}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-accent-text bg-accent rounded-md hover:bg-accent-hover"
            >
              <Plus size={12} /> Add
            </button>
          </div>
          {options.length > 0 && (
            <ul className="space-y-1">
              {options.map((opt) => (
                <li
                  key={opt.id}
                  className="flex items-center justify-between text-sm px-2 py-1 bg-surface rounded border border-border"
                >
                  <span>{opt.value}</span>
                  <button
                    type="button"
                    onClick={() => handleRemove(opt.id)}
                    className="text-text-faint hover:text-danger"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}