'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Trash2, ListOrdered } from 'lucide-react'
import {
  WorkOrderSequence, WorkOrderSequenceStep,
  getWorkOrderSequences, createWorkOrderSequence, updateWorkOrderSequence, deleteWorkOrderSequence,
  getSequenceSteps, createSequenceStep, updateSequenceStep, deleteSequenceStep,
} from '@/lib/workOrderSequences'

export default function WorkOrderSequencesPage() {
  const [sequences, setSequences] = useState<WorkOrderSequence[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  const load = useCallback(async () => {
    const data = await getWorkOrderSequences()
    setSequences(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const selected = sequences.find((s) => s.id === selectedId) ?? null

  async function handleCreate() {
    const name = newName.trim()
    if (!name) return
    const created = await createWorkOrderSequence(name)
    setNewName('')
    setAdding(false)
    await load()
    setSelectedId(created.id)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this sequence? Work orders using it will lose their sequence assignment.')) return
    await deleteWorkOrderSequence(id)
    if (selectedId === id) setSelectedId(null)
    await load()
  }

  return (
    <div className="flex h-full">
      {/* Left sidebar */}
      <aside className="w-64 shrink-0 border-r border-border flex flex-col">
        <div className="px-4 pt-8 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Settings</p>
              <h2 className="text-base font-semibold text-text mt-0.5">WO Sequences</h2>
            </div>
            <button
              onClick={() => { setAdding(true); setSelectedId(null) }}
              className="flex items-center gap-1 text-xs text-accent-text bg-accent px-2.5 py-1.5 rounded-md hover:bg-accent-hover transition-colors shrink-0"
            >
              <Plus size={12} /> New
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {loading ? (
            <p className="text-xs text-text-subtle px-4 py-3">Loading…</p>
          ) : sequences.length === 0 && !adding ? (
            <p className="text-xs text-text-faint italic px-4 py-3">No sequences yet.</p>
          ) : (
            <ul>
              {sequences.map((s) => {
                const isActive = selectedId === s.id && !adding
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => { setSelectedId(s.id); setAdding(false) }}
                      className={`w-full text-left px-4 py-2 transition-colors border-l-2 ${
                        isActive ? 'bg-accent/10 border-accent' : 'border-transparent hover:bg-surface-hover'
                      }`}
                    >
                      <p className="text-sm text-text truncate">{s.name}</p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>

      {/* Right panel */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {adding ? (
          <div className="p-10 max-w-xl">
            <div className="mb-8">
              <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-1">Settings / WO Sequences</p>
              <h2 className="text-3xl font-medium text-text tracking-tight">New Sequence</h2>
            </div>
            <div className="space-y-4">
              <div>
                <span className="block text-xs font-medium text-text-muted mb-1">Sequence Name</span>
                <input
                  type="text"
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setAdding(false); setNewName('') } }}
                  placeholder="e.g. Manufacturing Standard"
                  className="w-full px-3 py-2 text-sm bg-surface border border-border-strong rounded-md focus:outline-none focus:border-accent focus:ring-2 focus:ring-border"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreate} disabled={!newName.trim()}
                  className="px-4 py-2 text-sm text-accent-text bg-accent rounded-md hover:bg-accent-hover disabled:opacity-50 transition-colors">
                  Create Sequence
                </button>
                <button onClick={() => { setAdding(false); setNewName('') }}
                  className="px-4 py-2 text-sm text-text-muted bg-surface border border-border-strong rounded-md hover:bg-surface-hover transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : selected ? (
          <SequenceDetail
            key={selected.id}
            sequence={selected}
            onRename={async (name) => { await updateWorkOrderSequence(selected.id, { name }); await load() }}
            onDelete={() => handleDelete(selected.id)}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-6">
            <ListOrdered size={32} className="text-text-faint mb-3" />
            <p className="text-text-subtle text-sm">Select a sequence or create a new one.</p>
          </div>
        )}
      </main>
    </div>
  )
}

// ── Sequence detail ───────────────────────────────────────────────────────────

function SequenceDetail({
  sequence,
  onRename,
  onDelete,
}: {
  sequence: WorkOrderSequence
  onRename: (name: string) => Promise<void>
  onDelete: () => void
}) {
  const [steps, setSteps] = useState<WorkOrderSequenceStep[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const newRef = useRef<HTMLInputElement>(null)

  const loadSteps = useCallback(async () => {
    const data = await getSequenceSteps(sequence.id)
    setSteps(data)
    setLoading(false)
  }, [sequence.id])

  useEffect(() => { loadSteps() }, [loadSteps])

  useEffect(() => {
    if (adding && newRef.current) newRef.current.focus()
  }, [adding, steps])

  async function handleAddStep() {
    const nextSort = steps.length > 0 ? Math.max(...steps.map((s) => s.sort)) + 1 : 1
    await createSequenceStep(sequence.id, '', nextSort)
    await loadSteps()
    setAdding(true)
  }

  async function handleUpdateStep(id: string, field: 'task_name' | 'sort', value: string | number) {
    await updateSequenceStep(id, { [field]: value })
    await loadSteps()
  }

  async function handleDeleteStep(id: string) {
    await deleteSequenceStep(id)
    await loadSteps()
  }

  return (
    <div className="p-10 max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-text-subtle mb-1">Settings / WO Sequences</p>
        <input
          type="text"
          defaultValue={sequence.name}
          onBlur={(e) => { if (e.target.value.trim() && e.target.value !== sequence.name) onRename(e.target.value.trim()) }}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          className="text-3xl font-medium text-text tracking-tight bg-transparent border-b border-transparent hover:border-border focus:border-accent focus:outline-none w-full pb-0.5"
        />
      </div>

      {/* Steps */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Task Order</p>
          <button onClick={handleAddStep}
            className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover transition-colors">
            <Plus size={12} /> Add Task
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-text-subtle">Loading…</p>
        ) : steps.length === 0 ? (
          <div className="border border-dashed border-border rounded-lg py-10 text-center">
            <p className="text-text-subtle text-sm mb-1">No tasks yet.</p>
            <p className="text-text-faint text-xs">Add tasks in the order they must be performed.</p>
          </div>
        ) : (
          <div className="border border-border rounded-md overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-muted">
                  <th className="py-1.5 px-3 text-left text-[10px] uppercase tracking-widest font-medium text-text-subtle w-16">Order</th>
                  <th className="py-1.5 px-3 text-left text-[10px] uppercase tracking-widest font-medium text-text-subtle">Task Name</th>
                  <th className="py-1.5 px-3 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {steps.map((step, i) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    position={i + 1}
                    inputRef={i === steps.length - 1 && adding ? newRef : undefined}
                    onUpdate={handleUpdateStep}
                    onDelete={() => handleDeleteStep(step.id)}
                    onAddNext={i === steps.length - 1 ? handleAddStep : undefined}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-xs text-text-faint">
          Task names must match the <strong className="font-medium text-text-subtle">Task</strong> column on work order schedule events exactly (case-insensitive).
        </p>
      </section>

      {/* Danger zone */}
      <div className="pt-4 border-t border-border">
        <button onClick={onDelete} className="text-sm text-danger hover:opacity-80 transition-opacity">
          Delete sequence
        </button>
      </div>
    </div>
  )
}

function StepRow({
  step,
  position,
  inputRef,
  onUpdate,
  onDelete,
  onAddNext,
}: {
  step: WorkOrderSequenceStep
  position: number
  inputRef?: React.RefObject<HTMLInputElement | null>
  onUpdate: (id: string, field: 'task_name' | 'sort', value: string | number) => Promise<void>
  onDelete: () => void
  onAddNext?: () => void
}) {
  const [localSort, setLocalSort] = useState(String(step.sort))
  useEffect(() => { setLocalSort(String(step.sort)) }, [step.sort])

  const cellCls = 'w-full px-1.5 py-1 text-sm bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none'

  return (
    <tr className="hover:bg-surface-hover group">
      <td className="px-1 py-0 w-16">
        <input
          type="number"
          value={localSort}
          onChange={(e) => setLocalSort(e.target.value)}
          onBlur={(e) => {
            const n = parseInt(e.target.value)
            if (!isNaN(n) && n !== step.sort) onUpdate(step.id, 'sort', n)
          }}
          className={cellCls + ' text-center font-mono text-text-faint'}
        />
      </td>
      <td className="px-1 py-0">
        <input
          ref={inputRef}
          type="text"
          defaultValue={step.task_name}
          onBlur={(e) => { if (e.target.value !== step.task_name) onUpdate(step.id, 'task_name', e.target.value) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && onAddNext) { e.currentTarget.blur(); onAddNext() }
            if (e.key === 'Escape') e.currentTarget.blur()
          }}
          placeholder="e.g. Cut"
          className={cellCls + ' font-medium text-text'}
        />
      </td>
      <td className="px-2 py-0 w-8 text-center">
        <button onClick={onDelete}
          className="text-text-faint hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity">
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  )
}
