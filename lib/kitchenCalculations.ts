import { CabinetLibraryEntry } from './kitchenCabinetLibrary'
import { KitchenSettingsMap } from './kitchenSettings'
import { KitchenQuoteCabinet } from './kitchenQuoteCabinets'
import { ComponentType } from './kitchenCabinetComponents'

// ─── Code parser ─────────────────────────────────────────────────────────────

export type ParsedCabinetCode = {
  prefix: string       // e.g. 'B2', 'T2D'
  widthMm: number
  modifiers: string[]
  innerDrawerCount: number
}

export function parseCabinetCode(code: string): ParsedCabinetCode | null {
  // Format: PREFIX-WIDTH[-MODIFIER...]
  // e.g.   B2-600, T2D-800-4i, W2-900
  const parts = code.trim().toUpperCase().split('-')
  if (parts.length < 2) return null

  const prefix = parts[0]
  const widthMm = parseInt(parts[1], 10)
  if (!prefix || isNaN(widthMm)) return null

  const modifiers = parts.slice(2).map((m) => m.toLowerCase())

  let innerDrawerCount = 0
  for (const mod of modifiers) {
    const match = mod.match(/^(\d+)i$/)
    if (match) innerDrawerCount = parseInt(match[1], 10)
  }

  return { prefix, widthMm, modifiers, innerDrawerCount }
}

// ─── Hinge count ─────────────────────────────────────────────────────────────

export function hingesPerDoor(heightMm: number, settings: KitchenSettingsMap): number {
  if (heightMm < settings.hinge_threshold_2) return 2
  if (heightMm < settings.hinge_threshold_3) return 3
  if (heightMm < settings.hinge_threshold_4) return 4
  if (heightMm < settings.hinge_threshold_5) return 5
  return 6
}

// ─── Board area calculations ──────────────────────────────────────────────────

type BoardCalc = { carcaseSqm: number; doorSqm: number }

export function calcBoardSqm(
  cabinet: Pick<KitchenQuoteCabinet, 'width_mm' | 'height_mm' | 'depth_mm'>,
  library: CabinetLibraryEntry,
  settings: KitchenSettingsMap
): BoardCalc {
  const w = cabinet.width_mm / 1000
  const h = cabinet.height_mm / 1000
  const d = cabinet.depth_mm / 1000
  const wasteFactor = settings.board_waste_factor ?? 1.10

  // Carcase parts
  const sides = 2 * (h * d)
  const topBottom = 2 * (w * d)
  const backPanel = h * w
  const middleShelf = library.has_middle_shelf ? w * d : 0

  const rawCarcase = sides + topBottom + backPanel + middleShelf
  const carcaseSqm = rawCarcase * wasteFactor

  // Door fronts — each leaf = full height × (width / door_count)
  const doorCount = library.door_count || 0
  let doorSqm = 0
  if (doorCount > 0) {
    const leafWidth = w / doorCount
    doorSqm = doorCount * (leafWidth * h) * wasteFactor
  }

  return { carcaseSqm, doorSqm }
}

// ─── Full component resolution ────────────────────────────────────────────────

export type ResolvedComponent = {
  kitchen_quote_cabinet_id: string
  supplier_item_id: string | null
  supplier_id: string | null
  component_type: ComponentType
  item: string | null
  description: string | null
  item_code: string | null
  qty: number
  unit: 'ea' | 'sqm' | 'lm' | 'hrs'
  unit_cost: number
  markup_percent: number
}

export type CabinetTotals = {
  carcaseSqm: number
  doorSqm: number
  hingeCount: number
  runnerPairCount: number
  handleCount: number
  labourMakeHrs: number
  labourInstallHrs: number
}

export function resolveComponents(
  cabinet: KitchenQuoteCabinet,
  library: CabinetLibraryEntry,
  settings: KitchenSettingsMap,
  labourMarkup: number = 0
): { components: ResolvedComponent[]; totals: CabinetTotals } {
  const components: ResolvedComponent[] = []
  const { carcaseSqm, doorSqm } = calcBoardSqm(cabinet, library, settings)

  const doorCount = cabinet.door_count_override ?? library.door_count
  const drawerCount = cabinet.drawer_count_override ?? library.drawer_count
  const innerDrawerCount = cabinet.inner_drawer_count_override ?? library.inner_drawer_count

  // Hinge count
  const hpc = library.hinge_override_count ?? hingesPerDoor(cabinet.height_mm, settings)
  const hingeCount = doorCount * hpc
  const hingePlateCount = hingeCount

  // Runner pairs (external drawers + inner drawers)
  const runnerPairCount = drawerCount + innerDrawerCount

  // Handles (one per door leaf + one per external drawer)
  const handleCount = doorCount + drawerCount

  const labourMakeHrs = library.labour_make_hrs
  const labourInstallHrs = library.labour_install_hrs

  // Carcase board
  if (carcaseSqm > 0) {
    components.push({
      kitchen_quote_cabinet_id: cabinet.id,
      supplier_item_id: library.carcase_board_supplier_item_id,
      supplier_id: null,
      component_type: 'carcase_board',
      item: 'Carcase Board',
      description: `${library.board_thickness_mm}mm whiteboard — ${library.name}`,
      item_code: null,
      qty: Math.round(carcaseSqm * 100) / 100,
      unit: 'sqm',
      unit_cost: 0,
      markup_percent: 0,
    })
  }

  // Door board
  if (doorSqm > 0) {
    components.push({
      kitchen_quote_cabinet_id: cabinet.id,
      supplier_item_id: library.door_board_supplier_item_id,
      supplier_id: null,
      component_type: 'door_board',
      item: 'Door Board',
      description: `Door fronts — ${library.name}`,
      item_code: null,
      qty: Math.round(doorSqm * 100) / 100,
      unit: 'sqm',
      unit_cost: 0,
      markup_percent: 0,
    })
  }

  // Hinges
  if (hingeCount > 0) {
    components.push({
      kitchen_quote_cabinet_id: cabinet.id,
      supplier_item_id: library.hinge_supplier_item_id,
      supplier_id: null,
      component_type: 'hinge',
      item: 'Hinge',
      description: `Blum Inserta soft close — ${hingeCount} per cabinet`,
      item_code: null,
      qty: hingeCount,
      unit: 'ea',
      unit_cost: 0,
      markup_percent: 0,
    })
  }

  // Hinge plates
  if (hingePlateCount > 0) {
    components.push({
      kitchen_quote_cabinet_id: cabinet.id,
      supplier_item_id: library.hinge_plate_supplier_item_id,
      supplier_id: null,
      component_type: 'hinge_plate',
      item: 'Hinge Plate',
      description: `Blum expando dowel plate — ${hingePlateCount} per cabinet`,
      item_code: null,
      qty: hingePlateCount,
      unit: 'ea',
      unit_cost: 0,
      markup_percent: 0,
    })
  }

  // Runners
  if (runnerPairCount > 0) {
    components.push({
      kitchen_quote_cabinet_id: cabinet.id,
      supplier_item_id: library.runner_supplier_item_id,
      supplier_id: null,
      component_type: 'runner',
      item: 'Drawer Runner',
      description: `Nikpol Dragon Pro undermount — ${runnerPairCount} pairs`,
      item_code: null,
      qty: runnerPairCount,
      unit: 'ea',
      unit_cost: 0,
      markup_percent: 0,
    })
  }

  // Handles
  if (handleCount > 0) {
    components.push({
      kitchen_quote_cabinet_id: cabinet.id,
      supplier_item_id: library.handle_supplier_item_id,
      supplier_id: null,
      component_type: 'handle',
      item: 'Handle',
      description: `Handle — ${handleCount} per cabinet`,
      item_code: null,
      qty: handleCount,
      unit: 'ea',
      unit_cost: 0,
      markup_percent: 0,
    })
  }

  // Toekick (linear metres)
  if (library.has_toekick) {
    components.push({
      kitchen_quote_cabinet_id: cabinet.id,
      supplier_item_id: library.toekick_supplier_item_id,
      supplier_id: null,
      component_type: 'toekick',
      item: 'Toekick',
      description: `${library.toekick_height_mm}mm toekick — ${cabinet.width_mm}mm wide`,
      item_code: null,
      qty: Math.round((cabinet.width_mm / 1000) * 100) / 100,
      unit: 'lm',
      unit_cost: 0,
      markup_percent: 0,
    })
  }

  // Labour make
  if (labourMakeHrs > 0) {
    components.push({
      kitchen_quote_cabinet_id: cabinet.id,
      supplier_item_id: null,
      supplier_id: null,
      component_type: 'labour_make',
      item: 'Labour — Make',
      description: `Factory manufacture — ${library.name}`,
      item_code: null,
      qty: labourMakeHrs,
      unit: 'hrs',
      unit_cost: settings.labour_rate_make ?? 65,
      markup_percent: labourMarkup,
    })
  }

  // Labour install
  if (labourInstallHrs > 0) {
    components.push({
      kitchen_quote_cabinet_id: cabinet.id,
      supplier_item_id: null,
      supplier_id: null,
      component_type: 'labour_install',
      item: 'Labour — Install',
      description: `On-site installation — ${library.name}`,
      item_code: null,
      qty: labourInstallHrs,
      unit: 'hrs',
      unit_cost: settings.labour_rate_install ?? 85,
      markup_percent: labourMarkup,
    })
  }

  // Multiply everything by qty
  const qty = cabinet.qty ?? 1
  const finalComponents = components.map((c) => ({ ...c, qty: c.qty * qty }))

  return {
    components: finalComponents,
    totals: {
      carcaseSqm: carcaseSqm * qty,
      doorSqm: doorSqm * qty,
      hingeCount: hingeCount * qty,
      runnerPairCount: runnerPairCount * qty,
      handleCount: handleCount * qty,
      labourMakeHrs: labourMakeHrs * qty,
      labourInstallHrs: labourInstallHrs * qty,
    },
  }
}
