'use client'

import { useEffect, useState, useRef, Fragment } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2, RefreshCw, ArrowRight } from 'lucide-react'
import {
  getKitchenSettingsMap,
  KitchenSettingsMap,
} from '@/lib/kitchenSettings'
import {
  getActiveCabinetLibraryEntries,
  getCabinetLibraryEntryByPrefix,
  CabinetLibraryEntry,
} from '@/lib/kitchenCabinetLibrary'
import {
  getKitchenQuoteCabinets,
  createKitchenQuoteCabinet,
  updateKitchenQuoteCabinet,
  deleteKitchenQuoteCabinet,
  KitchenQuoteCabinet,
} from '@/lib/kitchenQuoteCabinets'
import {
  deleteComponentsByQuoteCabinetId,
  insertComponents,
  KitchenCabinetComponent,
  getComponentsByQuoteCabinetId,
} from '@/lib/kitchenCabinetComponents'
import {
  parseCabinetCode,
  resolveComponents,
  ResolvedComponent,
} from '@/lib/kitchenCalculations'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/format'
import { createQuoteItemLine } from '@/lib/quoteItemLines'
import { createLabour } from '@/lib/quoteItemLabour'

// ─── KitchenQuoteBuilder ───────────────────────────────────────────────────────

export default function KitchenQuoteBuilder({ quoteItemId }: { quoteItemId: string }) {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<KitchenSettingsMap>({})
  const [library, setLibrary] = useState<CabinetLibraryEntry[]>([])
  const [cabinets, setCabinets] = useState<KitchenQuoteCabinet[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [pushMode, setPushMode] = useState<'append' | 'replace'>('append')
  const [showPushOptions, setShowPushOptions] = useState(false)
  const [components, setComponents] = useState<Record<string, KitchenCabinetComponent[]>>({})
  const [expandedCabinet, setExpandedCabinet] = useState<string | null>(null)

  // New cabinet input state
  const [newCode, setNewCode] = useState('')
  const [newQty, setNewQty] = useState(1)
  const [newLabel, setNewLabel] = useState('')
  const [newError, setNewError] = useState<string | null>(null)
  const codeInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    const [s, lib, cabs] = await Promise.all([
      getKitchenSettingsMap(),
      getActiveCabinetLibraryEntries(),
      getKitchenQuoteCabinets(quoteItemId),
    ])
    setSettings(s)
    setLibrary(lib)
    setCabinets(cabs)
    setLoading(false)
  }

  useEffect(() => {
    if (open) load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, quoteItemId])

  // ── Add cabinet ─────────────────────────────────────────────────────────────

  async function handleAddCabinet() {
    const code = newCode.trim().toUpperCase()
    if (!code) return

    const parsed = parseCabinetCode(code)
    if (!parsed) { setNewError('Invalid cabinet code format. Use e.g. B2-600'); return }

    // Find matching library entry
    const libraryEntry = library.find((e) => e.code_prefix === parsed.prefix)
    if (!libraryEntry) { setNewError(`No cabinet type found for prefix "${parsed.prefix}"`); return }

    const height = libraryEntry.default_height_mm ?? (
      libraryEntry.cabinet_type === 'base' ? settings.base_height_mm :
      libraryEntry.cabinet_type === 'tall' ? settings.tall_height_mm :
      settings.wall_height_mm
    ) ?? 720
    const depth = libraryEntry.default_depth_mm ?? (
      libraryEntry.cabinet_type === 'base' ? settings.base_depth_mm :
      libraryEntry.cabinet_type === 'tall' ? settings.tall_depth_mm :
      settings.wall_depth_mm
    ) ?? 560

    const maxSort = cabinets.length > 0 ? Math.max(...cabinets.map((c) => c.sort)) : 0

    await createKitchenQuoteCabinet({
      quote_item_id: quoteItemId,
      cabinet_library_id: libraryEntry.id,
      cabinet_code: code,
      label: newLabel.trim() || null,
      sort: maxSort + 1,
      width_mm: parsed.widthMm,
      height_mm: height,
      depth_mm: depth,
      qty: newQty,
      door_count_override: null,
      drawer_count_override: null,
      inner_drawer_count_override: parsed.innerDrawerCount > 0 ? parsed.innerDrawerCount : null,
      board_thickness_override: null,
      is_directional_grain_override: null,
      carcase_sqm: null,
      door_sqm: null,
      hinge_count: null,
      runner_pair_count: null,
      handle_count: null,
      labour_make_hrs: null,
      labour_install_hrs: null,
    })

    setNewCode('')
    setNewLabel('')
    setNewQty(1)
    setNewError(null)
    codeInputRef.current?.focus()
    await load()
  }

  // ── Delete cabinet ───────────────────────────────────────────────────────────

  async function handleDeleteCabinet(id: string) {
    if (!confirm('Remove this cabinet from the estimate?')) return
    await deleteKitchenQuoteCabinet(id)
    await load()
  }

  // ── Generate components ──────────────────────────────────────────────────────

  async function handleGenerate() {
    if (cabinets.length === 0) return
    setGenerating(true)
    try {
      const labourMarkup = settings.labour_markup_percent ?? 0
      for (const cab of cabinets) {
        const libEntry = library.find((e) => e.id === cab.cabinet_library_id)
        if (!libEntry) continue

        const { components: resolved, totals } = resolveComponents(cab, libEntry, settings, labourMarkup)

        // Delete old components, insert new
        await deleteComponentsByQuoteCabinetId(cab.id)
        await insertComponents(resolved)

        // Update computed totals on the cabinet row
        await updateKitchenQuoteCabinet(cab.id, {
          carcase_sqm: totals.carcaseSqm,
          door_sqm: totals.doorSqm,
          hinge_count: totals.hingeCount,
          runner_pair_count: totals.runnerPairCount,
          handle_count: totals.handleCount,
          labour_make_hrs: totals.labourMakeHrs,
          labour_install_hrs: totals.labourInstallHrs,
        })
      }
      await load()
      // Load components for all cabinets
      const compMap: Record<string, KitchenCabinetComponent[]> = {}
      for (const cab of cabinets) {
        compMap[cab.id] = await getComponentsByQuoteCabinetId(cab.id)
      }
      setComponents(compMap)
    } finally {
      setGenerating(false)
    }
  }

  // ── Push to quote ────────────────────────────────────────────────────────────

  async function handlePushToQuote(mode: 'append' | 'replace') {
    setPushing(true)
    setShowPushOptions(false)
    try {
      if (mode === 'replace') {
        // Delete existing lines and labour for this quote item
        await supabase.from('quote_item_lines').delete().eq('quote_item_id', quoteItemId)
        await supabase.from('quote_item_labour').delete().eq('quote_item_id', quoteItemId)
      }

      // Get existing max sort for append
      let sortOffset = 0
      if (mode === 'append') {
        const { data: existingLines } = await supabase
          .from('quote_item_lines')
          .select('sort')
          .eq('quote_item_id', quoteItemId)
          .order('sort', { ascending: false })
          .limit(1)
        sortOffset = existingLines?.[0]?.sort ?? 0
      }

      // Collect all components across all cabinets
      const allComponents: KitchenCabinetComponent[] = []
      for (const cab of cabinets) {
        const comps = await getComponentsByQuoteCabinetId(cab.id)
        allComponents.push(...comps)
      }

      // Aggregate by component_type + supplier_item_id for materials
      const materialMap = new Map<string, { comp: KitchenCabinetComponent; qty: number }>()
      const labourMakeComps: KitchenCabinetComponent[] = []
      const labourInstallComps: KitchenCabinetComponent[] = []

      for (const comp of allComponents) {
        if (comp.component_type === 'labour_make') {
          labourMakeComps.push(comp)
          continue
        }
        if (comp.component_type === 'labour_install') {
          labourInstallComps.push(comp)
          continue
        }
        const key = `${comp.component_type}::${comp.supplier_item_id ?? comp.item}`
        const existing = materialMap.get(key)
        if (existing) {
          materialMap.set(key, { comp: existing.comp, qty: existing.qty + comp.qty })
        } else {
          materialMap.set(key, { comp, qty: comp.qty })
        }
      }

      let sort = sortOffset + 1

      // Insert material lines
      for (const { comp, qty } of materialMap.values()) {
        await createQuoteItemLine({
          quote_item_id: quoteItemId,
          sort,
          item: comp.item,
          description: comp.description,
          supplier_id: comp.supplier_id,
          item_code: comp.item_code,
          price: comp.unit_cost,
          qty,
          markup_percent: comp.markup_percent,
          is_allowance: false,
        })
        sort++
      }

      // Insert labour
      let labourSort = 1
      if (mode === 'append') {
        const { data: existingLabour } = await supabase
          .from('quote_item_labour')
          .select('sort')
          .eq('quote_item_id', quoteItemId)
          .order('sort', { ascending: false })
          .limit(1)
        labourSort = (existingLabour?.[0]?.sort ?? 0) + 1
      }

      const totalMakeHrs = labourMakeComps.reduce((s, c) => s + c.qty, 0)
      const totalInstallHrs = labourInstallComps.reduce((s, c) => s + c.qty, 0)
      const makeRate = labourMakeComps[0]?.unit_cost ?? settings.labour_rate_make ?? 65
      const installRate = labourInstallComps[0]?.unit_cost ?? settings.labour_rate_install ?? 85
      const makeMarkup = labourMakeComps[0]?.markup_percent ?? settings.labour_markup_percent ?? 0
      const installMarkup = labourInstallComps[0]?.markup_percent ?? settings.labour_markup_percent ?? 0

      if (totalMakeHrs > 0) {
        await createLabour({
          quote_item_id: quoteItemId,
          sort: labourSort,
          type: 'Cabinet Make',
          price: makeRate,
          qty: Math.round(totalMakeHrs * 100) / 100,
          markup_percent: makeMarkup,
        })
        labourSort++
      }
      if (totalInstallHrs > 0) {
        await createLabour({
          quote_item_id: quoteItemId,
          sort: labourSort,
          type: 'Cabinet Install',
          price: installRate,
          qty: Math.round(totalInstallHrs * 100) / 100,
          markup_percent: installMarkup,
        })
      }

      alert(`Kitchen components pushed to quote (${mode}).`)
    } finally {
      setPushing(false)
    }
  }

  // ── Summary calculations ─────────────────────────────────────────────────────

  const totalCarcaseSqm = cabinets.reduce((s, c) => s + (c.carcase_sqm ?? 0), 0)
  const totalDoorSqm = cabinets.reduce((s, c) => s + (c.door_sqm ?? 0), 0)
  const totalHinges = cabinets.reduce((s, c) => s + (c.hinge_count ?? 0), 0)
  const totalRunners = cabinets.reduce((s, c) => s + (c.runner_pair_count ?? 0), 0)
  const totalHandles = cabinets.reduce((s, c) => s + (c.handle_count ?? 0), 0)
  const totalMakeHrs = cabinets.reduce((s, c) => s + (c.labour_make_hrs ?? 0), 0)
  const totalInstallHrs = cabinets.reduce((s, c) => s + (c.labour_install_hrs ?? 0), 0)
  const hasComputedTotals = cabinets.some((c) => c.carcase_sqm !== null)

  return (
    <section className="mt-8">
      {/* ── KITCHEN ESTIMATOR — remove this section + import to disable ── */}
      <div className="border border-border rounded-md overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-surface-muted hover:bg-surface-hover transition-colors text-left"
        >
          <div>
            <span className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">Kitchen Cabinet Estimator</span>
            {hasComputedTotals && (
              <span className="ml-3 text-xs text-text-muted">
                {cabinets.length} cabinet{cabinets.length !== 1 ? 's' : ''} · {totalCarcaseSqm.toFixed(2)} sqm carcase
              </span>
            )}
          </div>
          {open ? <ChevronUp size={15} className="text-text-faint" /> : <ChevronDown size={15} className="text-text-faint" />}
        </button>

        {open && (
          <div className="p-4 space-y-5">
            {loading ? (
              <p className="text-text-subtle text-sm">Loading…</p>
            ) : (
              <>
                {/* ── Add cabinet row ── */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium mb-2">Add Cabinet</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] text-text-subtle">Code</label>
                      <input
                        ref={codeInputRef}
                        type="text"
                        value={newCode}
                        onChange={(e) => { setNewCode(e.target.value.toUpperCase()); setNewError(null) }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddCabinet() }}
                        placeholder="e.g. B2-600"
                        className="px-2 py-1 text-xs bg-surface border border-border rounded focus:outline-none focus:border-accent text-text font-mono w-28"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] text-text-subtle">Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={newQty}
                        onChange={(e) => setNewQty(parseInt(e.target.value) || 1)}
                        onFocus={(e) => e.target.select()}
                        className="px-2 py-1 text-xs bg-surface border border-border rounded focus:outline-none focus:border-accent text-text text-right w-16"
                        style={{ MozAppearance: 'textfield' } as React.CSSProperties}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] text-text-subtle">Label (optional)</label>
                      <input
                        type="text"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddCabinet() }}
                        placeholder="e.g. Pantry Left"
                        className="px-2 py-1 text-xs bg-surface border border-border rounded focus:outline-none focus:border-accent text-text w-36"
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] text-text-subtle">&nbsp;</label>
                      <button
                        onClick={handleAddCabinet}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs bg-accent text-accent-text rounded hover:bg-accent-hover"
                      >
                        <Plus size={12} /> Add
                      </button>
                    </div>
                  </div>
                  {newError && <p className="mt-1.5 text-xs text-red-500">{newError}</p>}
                </div>

                {/* ── Cabinet list ── */}
                {cabinets.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium mb-2">Cabinets</p>
                    <div className="border border-border rounded-md overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-surface-muted border-b border-border">
                          <tr className="text-left text-[10px] uppercase tracking-wider text-text-subtle">
                            <th className="px-2 py-1 font-medium">#</th>
                            <th className="px-2 py-1 font-medium">Code</th>
                            <th className="px-2 py-1 font-medium">Label</th>
                            <th className="px-2 py-1 font-medium text-right">W</th>
                            <th className="px-2 py-1 font-medium text-right">H</th>
                            <th className="px-2 py-1 font-medium text-right">D</th>
                            <th className="px-2 py-1 font-medium text-right">Qty</th>
                            {hasComputedTotals && <>
                              <th className="px-2 py-1 font-medium text-right">Carcase sqm</th>
                              <th className="px-2 py-1 font-medium text-right">Door sqm</th>
                              <th className="px-2 py-1 font-medium text-right">Hinges</th>
                              <th className="px-2 py-1 font-medium text-right">Runners</th>
                              <th className="px-2 py-1 font-medium text-right">Handles</th>
                              <th className="px-2 py-1 font-medium text-right">Make hrs</th>
                              <th className="px-2 py-1 font-medium text-right">Install hrs</th>
                            </>}
                            <th className="px-2 py-1 font-medium w-8"></th>
                            <th className="px-2 py-1 font-medium w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {cabinets.map((cab) => (
                            <Fragment key={cab.id}>
                              <tr className="hover:bg-surface-hover group text-xs">
                                <td className="px-2 py-1 text-text-faint font-mono">{cab.sort}</td>
                                <td className="px-2 py-1 font-mono font-medium text-text">{cab.cabinet_code}</td>
                                <td className="px-2 py-1 text-text-muted">{cab.label || '—'}</td>
                                <td className="px-2 py-1 text-right text-text-muted">{cab.width_mm}</td>
                                <td className="px-2 py-1 text-right text-text-muted">{cab.height_mm}</td>
                                <td className="px-2 py-1 text-right text-text-muted">{cab.depth_mm}</td>
                                <td className="px-2 py-1 text-right text-text">{cab.qty}</td>
                                {hasComputedTotals && <>
                                  <td className="px-2 py-1 text-right text-text-muted">{cab.carcase_sqm?.toFixed(2) ?? '—'}</td>
                                  <td className="px-2 py-1 text-right text-text-muted">{cab.door_sqm?.toFixed(2) ?? '—'}</td>
                                  <td className="px-2 py-1 text-right text-text-muted">{cab.hinge_count ?? '—'}</td>
                                  <td className="px-2 py-1 text-right text-text-muted">{cab.runner_pair_count ?? '—'}</td>
                                  <td className="px-2 py-1 text-right text-text-muted">{cab.handle_count ?? '—'}</td>
                                  <td className="px-2 py-1 text-right text-text-muted">{cab.labour_make_hrs?.toFixed(2) ?? '—'}</td>
                                  <td className="px-2 py-1 text-right text-text-muted">{cab.labour_install_hrs?.toFixed(2) ?? '—'}</td>
                                </>}
                                <td className="px-1 py-1">
                                  <button
                                    onClick={() => setExpandedCabinet(expandedCabinet === cab.id ? null : cab.id)}
                                    className="text-text-faint hover:text-text"
                                    title="View components"
                                  >
                                    {expandedCabinet === cab.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  </button>
                                </td>
                                <td className="px-1 py-1">
                                  <button onClick={() => handleDeleteCabinet(cab.id)} className="text-text-faint hover:text-danger" title="Remove">
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                              {expandedCabinet === cab.id && (
                                <tr>
                                  <td colSpan={hasComputedTotals ? 16 : 9} className="p-0">
                                    <ComponentsSubTable cabinetId={cab.id} />
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── Summary ── */}
                {hasComputedTotals && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-text-subtle font-medium mb-2">Summary</p>
                    <div className="flex items-stretch gap-0 border border-border rounded-md overflow-hidden bg-surface-muted">
                      <SummaryCol label="Carcase" value={`${totalCarcaseSqm.toFixed(2)} sqm`} />
                      <SummaryCol label="Door Board" value={`${totalDoorSqm.toFixed(2)} sqm`} />
                      <SummaryCol label="Hinges" value={`${totalHinges} ea`} />
                      <SummaryCol label="Runners" value={`${totalRunners} pr`} />
                      <SummaryCol label="Handles" value={`${totalHandles} ea`} />
                      <SummaryCol label="Make hrs" value={`${totalMakeHrs.toFixed(2)} hrs`} />
                      <SummaryCol label="Install hrs" value={`${totalInstallHrs.toFixed(2)} hrs`} />
                    </div>
                  </div>
                )}

                {/* ── Actions ── */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={handleGenerate}
                    disabled={generating || cabinets.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-surface border border-border-strong text-text-muted rounded hover:bg-surface-hover disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={generating ? 'animate-spin' : ''} />
                    {generating ? 'Generating…' : 'Generate Components'}
                  </button>

                  <div className="relative">
                    <button
                      onClick={() => setShowPushOptions((v) => !v)}
                      disabled={pushing || !hasComputedTotals}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent text-accent-text rounded hover:bg-accent-hover disabled:opacity-50"
                    >
                      <ArrowRight size={12} />
                      {pushing ? 'Pushing…' : 'Push to Quote'}
                    </button>
                    {showPushOptions && (
                      <div className="absolute bottom-full left-0 mb-1 bg-surface border border-border rounded shadow-lg overflow-hidden min-w-[180px] z-20">
                        <button
                          onClick={() => handlePushToQuote('append')}
                          className="w-full text-left px-3 py-2 text-xs text-text hover:bg-surface-hover"
                        >
                          <div className="font-medium">Append to quote</div>
                          <div className="text-text-subtle mt-0.5">Add below existing lines</div>
                        </button>
                        <div className="h-px bg-border" />
                        <button
                          onClick={() => handlePushToQuote('replace')}
                          className="w-full text-left px-3 py-2 text-xs text-text hover:bg-surface-hover"
                        >
                          <div className="font-medium text-red-500">Replace quote</div>
                          <div className="text-text-subtle mt-0.5">Delete existing lines first</div>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {/* ── END KITCHEN ESTIMATOR ── */}
    </section>
  )
}

function SummaryCol({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 px-3 py-2.5 border-r border-border last:border-0">
      <div className="text-[10px] uppercase tracking-wider text-text-subtle mb-0.5">{label}</div>
      <div className="text-xs font-medium text-text">{value}</div>
    </div>
  )
}

function ComponentsSubTable({ cabinetId }: { cabinetId: string }) {
  const [comps, setComps] = useState<KitchenCabinetComponent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getComponentsByQuoteCabinetId(cabinetId).then((data) => {
      setComps(data)
      setLoading(false)
    })
  }, [cabinetId])

  if (loading) return <div className="px-4 py-2 text-xs text-text-subtle">Loading components…</div>
  if (comps.length === 0) return <div className="px-4 py-2 text-xs text-text-subtle italic">No components generated yet. Click "Generate Components" first.</div>

  return (
    <div className="bg-surface-muted border-t border-b border-border">
      <table className="w-full">
        <thead className="border-b border-border">
          <tr className="text-left text-[10px] uppercase tracking-wider text-text-subtle">
            <th className="px-4 py-1 font-medium w-32">Type</th>
            <th className="px-4 py-1 font-medium">Item</th>
            <th className="px-4 py-1 font-medium">Description</th>
            <th className="px-4 py-1 font-medium text-right w-16">Qty</th>
            <th className="px-4 py-1 font-medium w-12">Unit</th>
            <th className="px-4 py-1 font-medium text-right w-24">Unit Cost</th>
            <th className="px-4 py-1 font-medium text-right w-24">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {comps.map((c) => (
            <tr key={c.id} className="text-xs">
              <td className="px-4 py-1 text-text-faint capitalize">{c.component_type.replace('_', ' ')}</td>
              <td className="px-4 py-1 text-text">{c.item || '—'}</td>
              <td className="px-4 py-1 text-text-muted">{c.description || '—'}</td>
              <td className="px-4 py-1 text-right text-text-muted">{c.qty}</td>
              <td className="px-4 py-1 text-text-faint">{c.unit}</td>
              <td className="px-4 py-1 text-right text-text-muted">{c.unit_cost > 0 ? formatCurrency(c.unit_cost) : '—'}</td>
              <td className="px-4 py-1 text-right text-text">{c.total_cost > 0 ? formatCurrency(c.total_cost) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
