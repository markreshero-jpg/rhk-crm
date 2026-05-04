'use client'

import { useEffect, useState } from 'react'
import { LABOUR_TYPE_OPTIONS } from '@/lib/labourTypeOptions'

export default function LabourTypeInput({
  ref,
  value,
  onSave,
  placeholder = 'e.g. Cut & Edge',
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
    if (local !== value) onSave(local)
  }

  function selectOption(option: string) {
    setLocal(option)
    if (option !== value) onSave(option)
  }

  return (
    <div className="flex w-full items-center">
      <input
        ref={ref}
        type="text"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          else if (e.key === 'Escape') {
            setLocal(value)
            e.currentTarget.blur()
          }
        }}
        placeholder={placeholder}
        className={`min-w-0 flex-1 px-1.5 py-0.5 text-sm bg-transparent border border-transparent rounded-l focus:bg-surface focus:border-accent focus:outline-none ${className}`}
      />
      <select
        value=""
        onChange={(e) => {
          if (e.target.value) selectOption(e.target.value)
        }}
        className="w-8 self-stretch bg-transparent border border-transparent rounded-r text-text-muted focus:bg-surface focus:border-accent focus:outline-none"
        aria-label="Choose labour type"
        title="Choose labour type"
      >
        <option value=""></option>
        {LABOUR_TYPE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}
