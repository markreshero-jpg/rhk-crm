'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  LineStatusOption,
  getAllLineStatusOptions,
  createLineStatusOption,
  updateLineStatusOption,
  deleteLineStatusOption,
} from '@/lib/lineStatuses'
import { stageBadgeStyles } from '@/lib/stageStyles'

type StageGroup = { stage: string; rows: LineStatusOption[] }

function groupByStage(options: LineStatusOption[]): StageGroup[] {
  const order: string[] = []
  const map = new Map<string, LineStatusOption[]>()
  for (const opt of options) {
    if (!map.has(opt.stage)) { map.set(opt.stage, []); order.push(opt.stage) }
    map.get(opt.stage)!.push(opt)
  }
  return order.map((stage) => ({ stage, rows: map.get(stage)! }))
}

// ── New status form ───────────────────────────────────────────────────────────

function AddStatusRow({
  existingStages,
  nextSort,
  onAdd,
  onCancel,
}: {
  existingStages: string[]
  nextSort: number
  onAdd: (stage: string, status: string, sort: number) => Promise<void>
  onCancel: () => void
}) {
  const [stage, setStage] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState(nextSort)
  const [busy, setBusy] = useState(false)

  async function handleSave() {
    const s = stage.trim()
    const st = status.trim()
    if (!s || !st) return
    setBusy(true)
    try { await onAdd(s, st, sort) } finally { setBusy(false) }
  }

  return (
    <tr className="bg-info-bg border-t border-info-border">
      <td className="px-3 py-2">
        <input
          type="number"
          value={sort}
          onChange={(e) => setSort(parseInt(e.target.value) || 0)}
          className={cellCls + ' w-16 text-right'}
        />
      </td>
      <td className="px-3 py-2">
        <input
          list="stage-options"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          placeholder="Stage name…"
          className={cellCls}
          autoFocus
        />
        <datalist id="stage-options">
          {existingStages.map((s) => <option key={s} value={s} />)}
        </datalist>
      </td>
      <td className="px-3 py-2">
        <input
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          placeholder="Status name…"
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); else if (e.key === 'Escape') onCancel() }}
          className={cellCls}
        />
      </td>
      <td className="px-3 py-2 text-center">
        <input type="checkbox" checked disabled className="accent-accent opacity-40" />
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={busy || !stage.trim() || !status.trim()}
            className="text-xs px-2.5 py-1 bg-accent text-accent-text rounded-md hover:bg-accent-hover disabled:opacity-40"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button type="button" onClick={onCancel} className="text-xs text-text-muted hover:text-text">
            Cancel
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Status row ────────────────────────────────────────────────────────────────

function StatusRow({
  row,
  existingStages,
  onUpdate,
  onDelete,
}: {
  row: LineStatusOption
  existingStages: string[]
  onUpdate: (id: string, patch: Partial<LineStatusOption>) => Promise<void>
  onDelete: (row: LineStatusOption) => void
}) {
  const [stage, setStage] = useState(row.stage)
  const [status, setStatus] = useState(row.status)
  const [sort, setSort] = useState(row.sort)

  useEffect(() => { setStage(row.stage); setStatus(row.status); setSort(row.sort) }, [row])

  function commitStage() { if (stage.trim() && stage !== row.stage) onUpdate(row.id, { stage: stage.trim() }) }
  function commitStatus() { if (status.trim() && status !== row.status) onUpdate(row.id, { status: status.trim() }) }
  function commitSort() { if (sort !== row.sort) onUpdate(row.id, { sort }) }

  return (
    <tr className="border-t border-border hover:bg-surface-hover group">
      <td className="px-3 py-1.5 w-20">
        <input
          type="number"
          value={sort}
          onChange={(e) => setSort(parseInt(e.target.value) || 0)}
          onBlur={commitSort}
          className={cellCls + ' text-right'}
        />
      </td>
      <td className="px-3 py-1.5 min-w-[140px]">
        <input
          list="stage-options"
          value={stage}
          onChange={(e) => setStage(e.target.value)}
          onBlur={commitStage}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          className={cellCls}
        />
        <datalist id="stage-options">
          {existingStages.map((s) => <option key={s} value={s} />)}
        </datalist>
      </td>
      <td className="px-3 py-1.5 min-w-[200px]">
        <input
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          onBlur={commitStatus}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          className={cellCls}
        />
      </td>
      <td className="px-3 py-1.5 text-center w-20">
        <input
          type="checkbox"
          checked={row.is_active}
          onChange={(e) => onUpdate(row.id, { is_active: e.target.checked })}
          className="accent-accent"
        />
      </td>
      <td className="px-3 py-1.5 w-10 text-center">
        <button
          type="button"
          onClick={() => onDelete(row)}
          className="text-text-faint hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  )
}

// ── Main list ─────────────────────────────────────────────────────────────────

export default function LineStatusesList() {
  const [options, setOptions] = useState<LineStatusOption[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    const data = await getAllLineStatusOptions()
    setOptions(data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd(stage: string, status: string, sort: number) {
    await createLineStatusOption({ stage, status, sort, is_active: true })
    setShowAdd(false)
    await load()
  }

  async function handleUpdate(id: string, patch: Partial<LineStatusOption>) {
    await updateLineStatusOption(id, patch)
    await load()
  }

  async function handleDelete(row: LineStatusOption) {
    if (!confirm(`Delete "${row.status}" from ${row.stage}? This cannot be undone.`)) return
    await deleteLineStatusOption(row.id)
    await load()
  }

  const groups = groupByStage(options)
  const existingStages = groups.map((g) => g.stage)
  const nextSort = options.length > 0 ? Math.max(...options.map((o) => o.sort)) + 10 : 10

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
            Work Order Item Statuses
          </h3>
          <p className="text-xs text-text-muted mt-0.5">
            Stages and statuses available on each work order item.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover"
        >
          <Plus size={12} /> Add Status
        </button>
      </div>

      {loading ? (
        <p className="text-text-subtle text-sm p-6">Loading...</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-surface-muted border-b border-border">
                <th className={thCls + ' text-right w-20'}>Sort</th>
                <th className={thCls + ' min-w-[140px]'}>Stage</th>
                <th className={thCls + ' min-w-[200px]'}>Status</th>
                <th className={thCls + ' text-center w-20'}>Active</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <>
                  {/* Stage header row */}
                  <tr key={`hdr-${group.stage}`} className="bg-surface border-t-2 border-border-strong">
                    <td colSpan={5} className="px-3 py-1.5">
                      <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${stageBadgeStyles[group.stage] || 'bg-surface-muted text-text-muted'}`}>
                        {group.stage}
                      </span>
                      <span className="text-xs text-text-faint ml-2">{group.rows.length} status{group.rows.length !== 1 ? 'es' : ''}</span>
                    </td>
                  </tr>

                  {/* Status rows */}
                  {group.rows.map((row) => (
                    <StatusRow
                      key={row.id}
                      row={row}
                      existingStages={existingStages}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
                </>
              ))}

              {/* Add row */}
              {showAdd && (
                <AddStatusRow
                  existingStages={existingStages}
                  nextSort={nextSort}
                  onAdd={handleAdd}
                  onCancel={() => setShowAdd(false)}
                />
              )}
            </tbody>
          </table>

          {options.length === 0 && !showAdd && (
            <div className="py-12 text-center">
              <p className="text-text-subtle text-sm">No statuses yet.</p>
              <button onClick={() => setShowAdd(true)} className="mt-2 text-sm text-text underline hover:no-underline">
                Add the first status
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const thCls = 'px-3 py-2 text-left text-[10px] uppercase tracking-widest font-medium text-text-subtle'
const cellCls = 'w-full px-1.5 py-1 text-xs bg-transparent border border-transparent rounded focus:bg-surface focus:border-accent focus:outline-none text-text'
