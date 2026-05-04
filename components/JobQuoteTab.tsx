'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Plus, Copy, Trash2, ChevronRight, ListOrdered, FileDown } from 'lucide-react'
import {
  getIssuesByJobId,
  createIssue,
  duplicateIssue,
  deleteIssue,
  Issue,
} from '@/lib/issues'
import {
  getQuoteItemsByIssueId,
  createQuoteItem,
  updateQuoteItem,
  deleteQuoteItem,
  renumberQuoteItems,
  QuoteItem,
} from '@/lib/quoteItems'
import {
  getAllQuoteItemTemplates,
  importTemplateToIssue,
  QuoteItemTemplate,
} from '@/lib/quoteItemTemplates'

const statusStyles: Record<string, string> = {
  'Draft': 'bg-surface-muted text-text-muted border-border',
  'Sent': 'bg-info-bg text-info border-info-border',
  'Accepted': 'bg-success-bg text-success border-success-border',
  'Locked': 'bg-success-bg text-success border-success-border',
  'Superseded': 'bg-surface-muted text-text-faint border-border',
}

export default function JobQuoteTab({ jobId }: { jobId: string }) {
  const [issues, setIssues] = useState<Issue[]>([])
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null)
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  // Track which newly-created row should auto-focus its name field
  const [focusItemId, setFocusItemId] = useState<string | null>(null)

  const loadIssues = useCallback(async () => {
    const data = await getIssuesByJobId(jobId)
    setIssues(data)
    if (data.length > 0 && !selectedIssueId) {
      setSelectedIssueId(data[0].id)
    }
    setLoading(false)
  }, [jobId, selectedIssueId])

  const loadQuoteItems = useCallback(async (issueId: string) => {
    const data = await getQuoteItemsByIssueId(issueId)
    setQuoteItems(data)
  }, [])

  useEffect(() => {
    loadIssues()
  }, [loadIssues])

  useEffect(() => {
    if (selectedIssueId) {
      loadQuoteItems(selectedIssueId)
    } else {
      setQuoteItems([])
    }
  }, [selectedIssueId, loadQuoteItems])

  async function handleNewIssue() {
    setBusy(true)
    try {
      const newIssue = await createIssue({ job_id: jobId, status: 'Draft' })
      await loadIssues()
      setSelectedIssueId(newIssue.id)
    } finally {
      setBusy(false)
    }
  }

  async function handleDuplicateIssue() {
    if (!selectedIssueId) return
    setBusy(true)
    try {
      const newIssue = await duplicateIssue(selectedIssueId)
      await loadIssues()
      setSelectedIssueId(newIssue.id)
    } catch (err) {
      console.error(err)
      alert('Failed to duplicate issue')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteIssue(issueId: string) {
    if (!confirm('Delete this entire issue and all its items? This cannot be undone.')) return
    setBusy(true)
    try {
      await deleteIssue(issueId)
      if (selectedIssueId === issueId) {
        setSelectedIssueId(null)
      }
      await loadIssues()
    } finally {
      setBusy(false)
    }
  }

  async function handleAddQuoteItem() {
    if (!selectedIssueId) return
    const newItem = await createQuoteItem({
      issue_id: selectedIssueId,
      name: '',
      qty: 1,
    })
    setFocusItemId(newItem.id)
    await loadQuoteItems(selectedIssueId)
  }

  async function handleUpdateField(itemId: string, field: keyof QuoteItem, value: string | number) {
    await updateQuoteItem(itemId, { [field]: value })
    if (selectedIssueId) await loadQuoteItems(selectedIssueId)
  }

  async function handleDeleteQuoteItem(item: QuoteItem) {
    if (!confirm(`Delete "${item.name || 'this item'}"?`)) return
    await deleteQuoteItem(item.id)
    if (selectedIssueId) await loadQuoteItems(selectedIssueId)
  }

  async function handleRenumber() {
    if (!selectedIssueId) return
    setBusy(true)
    try {
      await renumberQuoteItems(selectedIssueId)
      await loadQuoteItems(selectedIssueId)
    } finally {
      setBusy(false)
    }
  }

  async function handleImportTemplate(templateId: string, name: string) {
    if (!selectedIssueId) return
    setBusy(true)
    try {
      await importTemplateToIssue(templateId, selectedIssueId, name)
      await loadQuoteItems(selectedIssueId)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <p className="text-text-subtle text-sm">Loading...</p>
  }

  return (
    <div className="flex gap-6 -m-2">
      {/* Left rail — Issue list */}
      <aside className="w-56 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
            Project Quotes
          </h3>
        </div>
        <div className="space-y-2 mb-4">
          <button
            type="button"
            onClick={handleNewIssue}
            disabled={busy}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-accent-text bg-accent rounded-md hover:bg-accent-hover disabled:opacity-50"
          >
            <Plus size={12} /> New Issue
          </button>
          <button
            type="button"
            onClick={handleDuplicateIssue}
            disabled={busy || !selectedIssueId}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-muted bg-surface border border-border-strong rounded-md hover:bg-surface-hover disabled:opacity-50"
          >
            <Copy size={12} /> Duplicate Issue
          </button>
        </div>

        <ul className="space-y-1">
          {issues.length === 0 ? (
            <li className="text-text-subtle text-xs italic px-2 py-3">
              No issues yet. Click &quot;New Issue&quot; to create one.
            </li>
          ) : (
            issues.map((issue) => {
              const isSelected = selectedIssueId === issue.id
              return (
                <li key={issue.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedIssueId(issue.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-accent text-accent-text'
                        : 'text-text hover:bg-surface-hover'
                    }`}
                  >
                    <span>Issue {issue.issue_number}</span>
                    <span
                      className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${
                        isSelected
                          ? 'bg-surface text-text border-border'
                          : statusStyles[issue.status] || ''
                      }`}
                    >
                      {issue.status}
                    </span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </aside>

      {/* Right panel — Quote Items */}
      <div className="flex-1 min-w-0">
        {selectedIssueId ? (
          <SelectedIssuePanel
            quoteItems={quoteItems}
            focusItemId={focusItemId}
            onClearFocus={() => setFocusItemId(null)}
            onAddItem={handleAddQuoteItem}
            onUpdateField={handleUpdateField}
            onDeleteItem={handleDeleteQuoteItem}
            onRenumber={handleRenumber}
            onDeleteIssue={() => selectedIssueId && handleDeleteIssue(selectedIssueId)}
            onImportTemplate={handleImportTemplate}
          />
        ) : (
          <div className="text-center py-12 text-text-subtle text-sm">
            Select an issue or create a new one to start adding quote items.
          </div>
        )}
      </div>
    </div>
  )
}

function SelectedIssuePanel({
  quoteItems,
  focusItemId,
  onClearFocus,
  onAddItem,
  onUpdateField,
  onDeleteItem,
  onRenumber,
  onDeleteIssue,
  onImportTemplate,
}: {
  quoteItems: QuoteItem[]
  focusItemId: string | null
  onClearFocus: () => void
  onAddItem: () => void
  onUpdateField: (id: string, field: keyof QuoteItem, value: string | number) => Promise<void>
  onDeleteItem: (item: QuoteItem) => void
  onRenumber: () => void
  onDeleteIssue: () => void
  onImportTemplate: (templateId: string, name: string) => Promise<void>
}) {
  const [showImportModal, setShowImportModal] = useState(false)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
          Quote Items
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAddItem}
            className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover transition-colors"
          >
            <Plus size={12} />
            <span>Add Quote Item</span>
          </button>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 text-xs text-text-muted bg-surface border border-border-strong px-3 py-1.5 rounded-md hover:bg-surface-hover transition-colors"
          >
            <FileDown size={12} />
            <span>Import Template</span>
          </button>
          <button
            type="button"
            onClick={onRenumber}
            disabled={quoteItems.length === 0}
            className="flex items-center gap-1.5 text-xs text-text-muted bg-surface border border-border-strong px-3 py-1.5 rounded-md hover:bg-surface-hover disabled:opacity-50 transition-colors"
            title="Resequence sort values to clean 1, 2, 3..."
          >
            <ListOrdered size={12} />
            <span>Renumber</span>
          </button>
          <button
            type="button"
            onClick={onDeleteIssue}
            className="flex items-center gap-1.5 text-xs text-danger bg-surface border border-border-strong px-3 py-1.5 rounded-md hover:bg-danger-bg transition-colors"
          >
            <Trash2 size={12} />
            <span>Delete Issue</span>
          </button>
        </div>
      </div>

      {showImportModal && (
        <ImportTemplateModal
          onImport={async (templateId, name) => {
            await onImportTemplate(templateId, name)
            setShowImportModal(false)
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {quoteItems.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-md">
          <p className="text-text-subtle text-sm">
            No quote items yet for this issue.
          </p>
          <button
            type="button"
            onClick={onAddItem}
            className="inline-flex items-center gap-2 mt-4 text-sm text-text underline hover:no-underline"
          >
            Add the first item
          </button>
        </div>
      ) : (
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-muted border-b border-border">
              <tr className="text-left text-[11px] uppercase tracking-wider text-text-subtle">
                <th className="px-4 py-2.5 font-medium w-20">Sort</th>
                <th className="px-4 py-2.5 font-medium">Item</th>
                <th className="px-4 py-2.5 font-medium w-24">Qty</th>
                <th className="px-4 py-2.5 font-medium w-8"></th>
                <th className="px-4 py-2.5 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {quoteItems.map((item) => (
                <QuoteItemRow
                  key={item.id}
                  item={item}
                  shouldFocus={focusItemId === item.id}
                  onFocused={onClearFocus}
                  onUpdateField={onUpdateField}
                  onDelete={() => onDeleteItem(item)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function QuoteItemRow({
  item,
  shouldFocus,
  onFocused,
  onUpdateField,
  onDelete,
}: {
  item: QuoteItem
  shouldFocus: boolean
  onFocused: () => void
  onUpdateField: (id: string, field: keyof QuoteItem, value: string | number) => Promise<void>
  onDelete: () => void
}) {
  const nameInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus the name field when this row is freshly created
  useEffect(() => {
    if (shouldFocus && nameInputRef.current) {
      nameInputRef.current.focus()
      onFocused()
    }
  }, [shouldFocus, onFocused])

  return (
    <tr className="hover:bg-surface-hover transition-colors group">
      <td className="px-4 py-1.5">
        <InlineNumberField
          value={item.sort}
          onSave={(v) => onUpdateField(item.id, 'sort', v)}
          className="font-mono text-text-faint"
        />
      </td>
      <td className="px-4 py-1.5">
        <InlineTextField
          ref={nameInputRef}
          value={item.name}
          onSave={(v) => onUpdateField(item.id, 'name', v)}
          placeholder="Item name (e.g. Kitchen)"
          className="font-medium text-text"
        />
      </td>
      <td className="px-4 py-1.5">
        <InlineNumberField
          value={item.qty}
          onSave={(v) => onUpdateField(item.id, 'qty', v)}
          className="text-text-muted"
        />
      </td>
      <td className="px-4 py-1.5">
        <Link
          href={`/quote-items/${item.id}`}
          className="text-text-faint hover:text-text"
          title="Open quote item details"
        >
          <ChevronRight size={16} />
        </Link>
      </td>
      <td className="px-4 py-1.5">
        <button
          type="button"
          onClick={onDelete}
          className="text-text-faint hover:text-danger"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}

// ----- Import Template Modal -----

function ImportTemplateModal({
  onImport,
  onClose,
}: {
  onImport: (templateId: string, name: string) => Promise<void>
  onClose: () => void
}) {
  const [templates, setTemplates] = useState<QuoteItemTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [importName, setImportName] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    getAllQuoteItemTemplates().then((data) => {
      setTemplates(data)
      setLoadingTemplates(false)
    })
  }, [])

  function handleSelect(t: QuoteItemTemplate) {
    setSelectedId(t.id)
    setImportName(t.name)
  }

  async function handleImport() {
    if (!selectedId || !importName.trim()) return
    setImporting(true)
    try {
      await onImport(selectedId, importName.trim())
    } finally {
      setImporting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-lg shadow-xl w-[480px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-medium text-text">Import Template</h3>
          <p className="text-xs text-text-subtle mt-0.5">
            Select a template to create a new quote item with its lines pre-filled.
          </p>
        </div>

        {/* Template list */}
        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {loadingTemplates ? (
            <p className="text-text-subtle text-sm p-4 text-center">Loading templates...</p>
          ) : templates.length === 0 ? (
            <p className="text-text-subtle text-sm p-4 text-center italic">
              No templates available. Create some in the Templates section.
            </p>
          ) : (
            <ul className="space-y-1">
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(t)}
                    className={`w-full text-left px-3 py-2.5 rounded-md transition-colors ${
                      selectedId === t.id
                        ? 'bg-accent text-accent-text'
                        : 'hover:bg-surface-hover text-text'
                    }`}
                  >
                    <div className="text-sm font-medium">{t.name}</div>
                    {(t.category || t.description) && (
                      <div
                        className={`text-xs mt-0.5 ${
                          selectedId === t.id ? 'text-accent-text/70' : 'text-text-subtle'
                        }`}
                      >
                        {t.category && <span>{t.category}</span>}
                        {t.category && t.description && ' — '}
                        {t.description && <span>{t.description}</span>}
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Rename field — only shown after selection */}
        {selectedId && (
          <div className="px-5 py-3 border-t border-border bg-surface-muted">
            <label className="text-xs text-text-subtle block mb-1">
              Name for this import
            </label>
            <input
              type="text"
              value={importName}
              onChange={(e) => setImportName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleImport()
                else if (e.key === 'Escape') onClose()
              }}
              autoFocus
              className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
            />
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-text-muted hover:text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!selectedId || !importName.trim() || importing}
            className="px-3 py-1.5 text-xs bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50"
          >
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ----- Inline editable field components -----

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

  useEffect(() => {
    setLocal(value)
  }, [value])

  function commit() {
    if (local !== value) {
      onSave(local)
    }
  }

  return (
    <input
      ref={ref}
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          setLocal(value)
          e.currentTarget.blur()
        }
      }}
      placeholder={placeholder}
      className={`w-full px-2 py-1 text-sm bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none ${className}`}
    />
  )
}

function InlineNumberField({
  value,
  onSave,
  className = '',
}: {
  value: number
  onSave: (value: number) => void
  className?: string
}) {
  const [local, setLocal] = useState(String(value))

  useEffect(() => {
    setLocal(String(value))
  }, [value])

  function commit() {
    const n = parseFloat(local)
    if (isNaN(n)) {
      setLocal(String(value)) // revert if invalid
      return
    }
    if (n !== value) {
      onSave(n)
    }
  }

  return (
    <input
      type="number"
      step="any"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur()
        } else if (e.key === 'Escape') {
          setLocal(String(value))
          e.currentTarget.blur()
        }
      }}
      className={`w-full px-2 py-1 text-sm bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none ${className}`}
    />
  )
}