'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Plus, Copy, Trash2, ChevronRight, ChevronDown, ListOrdered, FileText, ExternalLink } from 'lucide-react'
import {
  getIssuesByJobId,
  createIssue,
  duplicateIssue,
  deleteIssue,
  updateIssue,
  Issue,
} from '@/lib/issues'
import {
  getQuoteItemsWithTotals,
  createQuoteItem,
  updateQuoteItem,
  deleteQuoteItem,
  renumberQuoteItems,
  QuoteItem,
  QuoteItemWithTotal,
} from '@/lib/quoteItems'
import {
  getAllQuoteItemTemplates,
  importTemplateToIssue,
  QuoteItemTemplate,
} from '@/lib/quoteItemTemplates'
import {
  getAllTermsTemplates,
  TermsTemplate,
} from '@/lib/termsTemplates'

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
  const [quoteItems, setQuoteItems] = useState<QuoteItemWithTotal[]>([])
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
    const data = await getQuoteItemsWithTotals(issueId)
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

  async function handleUpdateIssueName(issueId: string, name: string) {
    await updateIssue(issueId, { name: name || null })
    await loadIssues()
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

  async function handleUpdateTerms(termsText: string) {
    if (!selectedIssueId) return
    await updateIssue(selectedIssueId, { terms_text: termsText || null })
    await loadIssues()
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
                  <div
                    onClick={() => setSelectedIssueId(issue.id)}
                    className={`w-full px-2 py-1.5 rounded-md text-sm transition-colors ${
                      isSelected
                        ? 'bg-accent text-accent-text'
                        : 'text-text hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className={`text-[10px] font-medium ${isSelected ? 'text-accent-text/70' : 'text-text-subtle'}`}>
                        Issue {issue.issue_number}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${
                          isSelected
                            ? 'bg-surface text-text border-border'
                            : statusStyles[issue.status] || ''
                        }`}
                      >
                        {issue.status}
                      </span>
                    </div>
                    <IssueNameField
                      issue={issue}
                      isSelected={isSelected}
                      onSave={(name) => handleUpdateIssueName(issue.id, name)}
                    />
                  </div>
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
            issue={issues.find((i) => i.id === selectedIssueId)!}
            quoteItems={quoteItems}
            focusItemId={focusItemId}
            onClearFocus={() => setFocusItemId(null)}
            onAddItem={handleAddQuoteItem}
            onUpdateField={handleUpdateField}
            onDeleteItem={handleDeleteQuoteItem}
            onRenumber={handleRenumber}
            onDeleteIssue={() => selectedIssueId && handleDeleteIssue(selectedIssueId)}
            onImportTemplate={handleImportTemplate}
            onUpdateTerms={handleUpdateTerms}
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
  issue,
  quoteItems,
  focusItemId,
  onClearFocus,
  onAddItem,
  onUpdateField,
  onDeleteItem,
  onRenumber,
  onDeleteIssue,
  onImportTemplate,
  onUpdateTerms,
}: {
  issue: Issue
  quoteItems: QuoteItemWithTotal[]
  focusItemId: string | null
  onClearFocus: () => void
  onAddItem: () => void
  onUpdateField: (id: string, field: keyof QuoteItem, value: string | number) => Promise<void>
  onDeleteItem: (item: QuoteItem) => void
  onRenumber: () => void
  onDeleteIssue: () => void
  onImportTemplate: (templateId: string, name: string) => Promise<void>
  onUpdateTerms: (text: string) => Promise<void>
}) {
  const [showImportModal, setShowImportModal] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(false)
  const reportsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!reportsOpen) return
    function handleClick(e: MouseEvent) {
      if (reportsRef.current && !reportsRef.current.contains(e.target as Node)) {
        setReportsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [reportsOpen])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
          Quote Items
        </h3>
        <div className="flex gap-2">
          <div ref={reportsRef} className="relative">
            <button
              type="button"
              onClick={() => setReportsOpen((o) => !o)}
              className="flex items-center gap-1.5 text-xs text-text-muted bg-surface border border-border-strong px-3 py-1.5 rounded-md hover:bg-surface-hover transition-colors"
            >
              <FileText size={12} />
              <span>Reports</span>
              <ChevronDown size={11} className={`transition-transform ${reportsOpen ? 'rotate-180' : ''}`} />
            </button>
            {reportsOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-surface border border-border-strong rounded-md shadow-lg z-20 py-1">
                <a
                  href={`/print/quote/${issue.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setReportsOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-text-muted hover:bg-surface-hover transition-colors"
                >
                  <ExternalLink size={11} />
                  Written Quote
                </a>
                <a
                  href={`/print/item-summary/${issue.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setReportsOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-text-muted hover:bg-surface-hover transition-colors"
                >
                  <ExternalLink size={11} />
                  Item Summary
                </a>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover transition-colors"
          >
            <Plus size={12} />
            <span>Add Quote Item</span>
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
          onCreateBlank={async () => {
            await onAddItem()
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
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 mt-4 text-sm text-text underline hover:no-underline"
          >
            Add the first item
          </button>
        </div>
      ) : (() => {
        const grandTotal   = quoteItems.reduce((s, i) => s + i.total_ex_gst, 0)
        const gst          = grandTotal * 0.1
        const totalIncGst  = grandTotal + gst
        const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-AU')

        return (
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-muted border-b border-border">
                <tr className="text-left text-[11px] uppercase tracking-wider text-text-subtle">
                  <th className="px-4 py-2.5 font-medium w-20">Sort</th>
                  <th className="px-4 py-2.5 font-medium">Item</th>
                  <th className="px-4 py-2.5 font-medium w-20">Qty</th>
                  <th className="px-4 py-2.5 font-medium w-36 text-right">Total (ex GST)</th>
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
              <tfoot className="bg-surface-muted border-t border-border-strong">
                <tr>
                  <td colSpan={3} className="px-4 py-2.5 text-xs text-text-subtle">Subtotal</td>
                  <td className="px-4 py-2.5 text-sm text-right font-medium text-text tabular-nums">{fmt(grandTotal)}</td>
                  <td colSpan={2} />
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-1.5 text-xs text-text-subtle">GST (10%)</td>
                  <td className="px-4 py-1.5 text-sm text-right text-text-muted tabular-nums">{fmt(gst)}</td>
                  <td colSpan={2} />
                </tr>
                <tr className="border-t border-border">
                  <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold text-text uppercase tracking-wide">Total inc GST</td>
                  <td className="px-4 py-2.5 text-base text-right font-semibold text-text tabular-nums">{fmt(totalIncGst)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )
      })()}

      {/* Terms & Conditions */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
            Terms &amp; Conditions
          </h3>
          <button
            type="button"
            onClick={() => setShowTermsModal(true)}
            className="flex items-center gap-1.5 text-xs text-text-muted bg-surface border border-border-strong px-3 py-1.5 rounded-md hover:bg-surface-hover transition-colors"
          >
            <FileText size={12} />
            <span>Import clauses</span>
          </button>
        </div>
        <TermsField
          value={issue.terms_text || ''}
          onSave={onUpdateTerms}
        />
      </div>

      {showTermsModal && (
        <TermsImportModal
          currentText={issue.terms_text || ''}
          onApply={async (text) => {
            await onUpdateTerms(text)
            setShowTermsModal(false)
          }}
          onClose={() => setShowTermsModal(false)}
        />
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
  item: QuoteItemWithTotal
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
      <td className="px-4 py-1.5 text-right">
        <span className="text-sm text-text tabular-nums pr-2">
          {item.total_ex_gst > 0
            ? '$' + Math.round(item.total_ex_gst).toLocaleString('en-AU')
            : <span className="text-text-faint">—</span>}
        </span>
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

// ----- Terms & Conditions field -----

function TermsField({ value, onSave }: { value: string; onSave: (v: string) => Promise<void> }) {
  const [local, setLocal] = useState(value)
  useEffect(() => { setLocal(value) }, [value])

  return (
    <textarea
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onSave(local) }}
      rows={8}
      placeholder="Type your terms and conditions here, or use 'Import clauses' to pull from your templates..."
      className="w-full px-4 py-3 text-sm text-text bg-surface border border-border-strong rounded-lg resize-y focus:outline-none focus:border-accent focus:ring-2 focus:ring-border placeholder:text-text-faint"
    />
  )
}

// ----- Terms Import Modal -----

function TermsImportModal({
  currentText,
  onApply,
  onClose,
}: {
  currentText: string
  onApply: (text: string) => Promise<void>
  onClose: () => void
}) {
  const [clauses, setClauses] = useState<TermsTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    getAllTermsTemplates().then((data) => {
      setClauses(data)
      // Pre-tick all clauses
      setSelected(new Set(data.map((c) => c.id)))
      setLoading(false)
    })
  }, [])

  function toggleClause(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleApply() {
    const ordered = clauses.filter((c) => selected.has(c.id))
    const text = ordered
      .map((c) => c.title)
      .join('\n')
    setApplying(true)
    try {
      await onApply(text)
    } finally {
      setApplying(false)
    }
  }

  const selectedCount = selected.size

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-lg shadow-xl w-[520px] max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-medium text-text">Import Terms &amp; Conditions</h3>
          <p className="text-xs text-text-subtle mt-0.5">
            All clauses are pre-selected. Untick any you don&apos;t need for this quote.
          </p>
          {currentText && (
            <p className="text-xs text-warning mt-1.5 bg-warning-bg border border-warning-border rounded px-2 py-1">
              This will replace any existing terms text on this issue.
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {loading ? (
            <p className="text-text-subtle text-sm p-4 text-center">Loading clauses...</p>
          ) : clauses.length === 0 ? (
            <p className="text-text-subtle text-sm p-4 text-center italic">
              No terms clauses found. Add some in Templates → Terms &amp; Conditions.
            </p>
          ) : (
            <ul className="space-y-2">
              {clauses.map((clause) => {
                const checked = selected.has(clause.id)
                return (
                  <li key={clause.id}>
                    <label
                      className={`flex gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                        checked ? 'bg-accent/5 border border-accent/20' : 'border border-border hover:bg-surface-hover'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleClause(clause.id)}
                        className="mt-0.5 shrink-0 accent-accent"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text">{clause.title || 'Untitled clause'}</p>
                        {clause.category && (
                          <p className="text-[10px] text-text-subtle">{clause.category}</p>
                        )}
                        {clause.body && (
                          <p className="text-xs text-text-muted mt-1 line-clamp-2">{clause.body}</p>
                        )}
                      </div>
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-2">
          <span className="text-xs text-text-subtle">
            {selectedCount} of {clauses.length} clause{clauses.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={selectedCount === 0 || applying || loading}
              className="px-3 py-1.5 text-xs bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-50"
            >
              {applying ? 'Applying...' : `Apply ${selectedCount > 0 ? selectedCount : ''} clause${selectedCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ----- Issue name inline editor -----

function IssueNameField({
  issue,
  isSelected,
  onSave,
}: {
  issue: Issue
  isSelected: boolean
  onSave: (name: string) => void
}) {
  const [local, setLocal] = useState(issue.name || '')
  useEffect(() => { setLocal(issue.name || '') }, [issue.name])

  function commit() {
    if (local !== (issue.name || '')) onSave(local)
  }

  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        else if (e.key === 'Escape') { setLocal(issue.name || ''); e.currentTarget.blur() }
      }}
      placeholder="Add a label..."
      className={`w-full text-sm bg-transparent border border-transparent rounded px-1 py-0.5 focus:outline-none focus:border-accent/50 focus:bg-black/10 placeholder:italic ${
        isSelected ? 'text-accent-text placeholder:text-accent-text/40' : 'text-text placeholder:text-text-faint'
      }`}
    />
  )
}

// ----- Import Template Modal -----

function ImportTemplateModal({
  onImport,
  onCreateBlank,
  onClose,
}: {
  onImport: (templateId: string, name: string) => Promise<void>
  onCreateBlank: () => Promise<void>
  onClose: () => void
}) {
  const [templates, setTemplates] = useState<QuoteItemTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [importName, setImportName] = useState('')
  const [importing, setImporting] = useState(false)
  const [creatingBlank, setCreatingBlank] = useState(false)

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
        <div className="px-5 py-3 border-t border-border flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={async () => {
              setCreatingBlank(true)
              try { await onCreateBlank() } finally { setCreatingBlank(false) }
            }}
            disabled={creatingBlank || importing}
            className="px-3 py-1.5 text-xs text-text-muted border border-border-strong rounded-md hover:bg-surface-hover disabled:opacity-50"
          >
            {creatingBlank ? 'Creating...' : 'Create blank'}
          </button>
          <div className="flex gap-2">
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