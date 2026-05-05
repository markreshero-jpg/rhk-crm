'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  getAllTermsTemplates,
  createTermsTemplate,
  updateTermsTemplate,
  deleteTermsTemplate,
  TermsTemplate,
} from '@/lib/termsTemplates'

export default function TermsTemplatesList() {
  const [clauses, setClauses] = useState<TermsTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [focusId, setFocusId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const data = await getAllTermsTemplates()
    setClauses(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleNew() {
    const next = clauses.length > 0 ? Math.max(...clauses.map((c) => c.sort)) + 1 : 1
    const created = await createTermsTemplate({ sort: next, title: '', body: '', category: null })
    setFocusId(created.id)
    await load()
  }

  async function handleUpdate(id: string, field: keyof TermsTemplate, value: string | number) {
    await updateTermsTemplate(id, { [field]: value })
    await load()
  }

  async function handleDelete(clause: TermsTemplate) {
    if (!confirm(`Delete "${clause.title || 'this clause'}"? This cannot be undone.`)) return
    await deleteTermsTemplate(clause.id)
    await load()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
            Terms &amp; Conditions Library
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Each clause can be selectively imported into any quote.
          </p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover"
        >
          <Plus size={12} /> New Clause
        </button>
      </div>

      {loading ? (
        <p className="text-text-subtle text-sm p-6">Loading...</p>
      ) : clauses.length === 0 ? (
        <div className="border border-dashed border-border rounded-lg p-12 text-center">
          <p className="text-text-subtle text-sm">No clauses yet.</p>
          <button
            onClick={handleNew}
            className="mt-3 text-sm text-text underline hover:no-underline"
          >
            Add the first clause
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {clauses.map((clause) => (
            <ClauseCard
              key={clause.id}
              clause={clause}
              shouldFocus={focusId === clause.id}
              onFocused={() => setFocusId(null)}
              onUpdate={handleUpdate}
              onDelete={() => handleDelete(clause)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ClauseCard({
  clause,
  shouldFocus,
  onFocused,
  onUpdate,
  onDelete,
}: {
  clause: TermsTemplate
  shouldFocus: boolean
  onFocused: () => void
  onUpdate: (id: string, field: keyof TermsTemplate, value: string | number) => Promise<void>
  onDelete: () => void
}) {
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (shouldFocus && titleRef.current) {
      titleRef.current.focus()
      onFocused()
    }
  }, [shouldFocus, onFocused])

  return (
    <div className="bg-surface border border-border rounded-md">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <span className="text-[11px] font-mono text-text-faint w-6 shrink-0">{clause.sort}</span>
        <div className="flex-1 min-w-0">
          <InlineTextField
            ref={titleRef}
            value={clause.title}
            onSave={(v) => onUpdate(clause.id, 'title', v)}
            placeholder="Clause title (e.g. Payment Terms)"
            className="font-medium text-text text-sm"
          />
        </div>
        <button
          onClick={onDelete}
          className="text-text-faint hover:text-danger transition-colors shrink-0"
          title="Delete clause"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

// Inline text field (reused from other templates)
const InlineTextField = function InlineTextField({
  ref,
  value,
  onSave,
  placeholder,
  className = '',
}: {
  ref?: React.RefObject<HTMLInputElement | null>
  value: string
  onSave: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const [local, setLocal] = useState(value)
  useEffect(() => { setLocal(value) }, [value])
  function commit() { if (local !== value) onSave(local) }
  return (
    <input
      ref={ref}
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        else if (e.key === 'Escape') { setLocal(value); e.currentTarget.blur() }
      }}
      placeholder={placeholder}
      className={`w-full px-2 py-0.5 bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none ${className}`}
    />
  )
}
