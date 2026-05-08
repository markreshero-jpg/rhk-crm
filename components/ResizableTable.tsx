'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type ColDef = {
  key: string
  label?: React.ReactNode
  defaultWidth: number
  minWidth?: number
  right?: boolean
  center?: boolean
  noResize?: boolean
}

type Props = {
  storageKey: string
  columns: ColDef[]
  children: React.ReactNode
  className?: string
}

function loadWidths(storageKey: string, columns: ColDef[]): number[] {
  try {
    const saved = localStorage.getItem(`col-widths:${storageKey}`)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length === columns.length) return parsed
    }
  } catch {}
  return columns.map((c) => c.defaultWidth)
}

export default function ResizableTable({ storageKey, columns, children, className }: Props) {
  const [widths, setWidths] = useState<number[]>(() => columns.map((c) => c.defaultWidth))
  const [mounted, setMounted] = useState(false)
  const [draggingCol, setDraggingCol] = useState<number | null>(null)
  const widthsRef = useRef(widths)
  widthsRef.current = widths

  useEffect(() => {
    setWidths(loadWidths(storageKey, columns))
    setMounted(true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  useEffect(() => {
    if (!mounted) return
    try { localStorage.setItem(`col-widths:${storageKey}`, JSON.stringify(widths)) } catch {}
  }, [widths, storageKey, mounted])

  const handleMouseDown = useCallback((colIndex: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = widthsRef.current[colIndex]
    const min = columns[colIndex].minWidth ?? 48
    setDraggingCol(colIndex)

    const onMove = (e: MouseEvent) => {
      const next = Math.max(min, startWidth + (e.clientX - startX))
      setWidths((prev) => { const w = [...prev]; w[colIndex] = next; return w })
    }

    const onUp = () => {
      setDraggingCol(null)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [columns])

  const resetWidths = useCallback(() => {
    const defaults = columns.map((c) => c.defaultWidth)
    setWidths(defaults)
    try { localStorage.removeItem(`col-widths:${storageKey}`) } catch {}
  }, [columns, storageKey])

  return (
    <div className="relative">
      {/* Reset button — appears on header hover */}
      {mounted && (
        <button
          type="button"
          onClick={resetWidths}
          title="Reset column widths"
          className="absolute top-1.5 right-2 z-10 text-[10px] text-text-faint hover:text-text-subtle transition-colors opacity-0 hover:opacity-100 group-hover/table:opacity-100 px-1.5 py-0.5 rounded hover:bg-surface-hover"
        >
          Reset cols
        </button>
      )}
      <div className="overflow-x-auto group/table">
        <table
          className={`border-collapse ${className ?? ''}`}
          style={{ tableLayout: 'fixed', width: widths.reduce((a, b) => a + b, 0) }}
        >
          <colgroup>
            {widths.map((w, i) => <col key={columns[i].key} style={{ width: w }} />)}
          </colgroup>
          <thead className="bg-surface-muted border-b border-border">
            <tr className="text-left text-[11px] uppercase tracking-wider text-text-subtle">
              {columns.map((col, i) => (
                <th
                  key={col.key}
                  className={`relative select-none px-3 py-2 font-medium overflow-hidden ${col.right ? 'text-right' : col.center ? 'text-center' : ''}`}
                >
                  <span className="block truncate">{col.label}</span>
                  {!col.noResize && (
                    <div
                      onMouseDown={handleMouseDown(i)}
                      className={`absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize transition-colors ${draggingCol === i ? 'bg-accent/50' : 'hover:bg-accent/30'}`}
                    />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          {children}
        </table>
      </div>
    </div>
  )
}
