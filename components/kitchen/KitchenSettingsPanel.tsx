'use client'

import { useEffect, useState } from 'react'
import { getKitchenSettings, updateKitchenSetting, KitchenSetting } from '@/lib/kitchenSettings'

const CATEGORIES = [
  { key: 'dimensions', label: 'Dimensions' },
  { key: 'board',      label: 'Board' },
  { key: 'hardware',   label: 'Hardware' },
  { key: 'labour',     label: 'Labour' },
]

const KEY_LABELS: Record<string, string> = {
  base_height_mm:        'Base height (mm)',
  base_depth_mm:         'Base depth (mm)',
  tall_height_mm:        'Tall height (mm)',
  tall_depth_mm:         'Tall depth (mm)',
  wall_height_mm:        'Wall height (mm)',
  wall_depth_mm:         'Wall depth (mm)',
  toekick_height_mm:     'Toekick height (mm)',
  board_thickness_mm:    'Board thickness (mm)',
  sheet_width_mm:        'Sheet width (mm)',
  sheet_height_mm:       'Sheet height (mm)',
  board_waste_factor:    'Waste factor',
  hinge_threshold_2:     'Hinge ×2 threshold (mm)',
  hinge_threshold_3:     'Hinge ×3 threshold (mm)',
  hinge_threshold_4:     'Hinge ×4 threshold (mm)',
  hinge_threshold_5:     'Hinge ×5 threshold (mm)',
  labour_rate_make:      'Make rate ($/hr)',
  labour_rate_install:   'Install rate ($/hr)',
  labour_markup_percent: 'Labour markup (%)',
}

export default function KitchenSettingsPanel() {
  const [settings, setSettings] = useState<KitchenSetting[]>([])
  const [dirty, setDirty] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [savedKey, setSavedKey] = useState<string | null>(null)

  useEffect(() => {
    getKitchenSettings().then(setSettings)
  }, [])

  function handleChange(key: string, value: string) {
    setDirty((d) => ({ ...d, [key]: value }))
  }

  async function handleSave(key: string) {
    const value = dirty[key]
    if (value === undefined) return
    setSaving(true)
    try {
      await updateKitchenSetting(key, value)
      setSettings((s) => s.map((r) => (r.key === key ? { ...r, value } : r)))
      setDirty((d) => { const n = { ...d }; delete n[key]; return n })
      setSavedKey(key)
      setTimeout(() => setSavedKey(null), 1500)
    } finally {
      setSaving(false)
    }
  }

  function getValue(key: string) {
    return dirty[key] ?? settings.find((s) => s.key === key)?.value ?? ''
  }

  return (
    <div className="space-y-8">
      {CATEGORIES.map((cat) => {
        const rows = settings.filter((s) => s.category === cat.key)
        if (rows.length === 0) return null
        return (
          <div key={cat.key}>
            <h4 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium mb-3">{cat.label}</h4>
            <div className="border border-border rounded-md overflow-hidden">
              <table className="w-full">
                <tbody className="divide-y divide-border">
                  {rows.map((row) => {
                    const isDirty = dirty[row.key] !== undefined
                    return (
                      <tr key={row.key} className="hover:bg-surface-hover">
                        <td className="px-3 py-2 text-sm text-text w-64">
                          {KEY_LABELS[row.key] ?? row.key}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={getValue(row.key)}
                              onChange={(e) => handleChange(row.key, e.target.value)}
                              onFocus={(e) => e.target.select()}
                              step="any"
                              className="w-32 px-2 py-1 text-sm bg-surface border border-border rounded focus:outline-none focus:border-accent text-text"
                              style={{ MozAppearance: 'textfield' } as React.CSSProperties}
                            />
                            {isDirty && (
                              <button
                                onClick={() => handleSave(row.key)}
                                disabled={saving}
                                className="px-2.5 py-1 text-xs bg-accent text-accent-text rounded hover:bg-accent-hover disabled:opacity-50"
                              >
                                Save
                              </button>
                            )}
                            {savedKey === row.key && (
                              <span className="text-xs text-green-600">Saved</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
