'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

type Tab = {
  id: string
  label: string
  count?: number
}

type TabsProps = {
  tabs: Tab[]
  activeTab: string
  paramName?: string
  children: React.ReactNode
}

export default function Tabs({
  tabs,
  activeTab,
  paramName = 'tab',
  children,
}: TabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setTab = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tabId === tabs[0].id) {
      params.delete(paramName)
    } else {
      params.set(paramName, tabId)
    }
    const queryString = params.toString()
    router.replace(`${pathname}${queryString ? '?' + queryString : ''}`)
  }

  return (
    <div>
      {/* Tab buttons sitting on top of the panel */}
      <div className="flex items-end gap-1 px-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTab(tab.id)}
              className={`relative px-4 py-2.5 text-sm rounded-t-md border transition-colors ${
                isActive
                  ? 'bg-surface border-border border-b-surface text-text font-medium z-10 -mb-px'
                  : 'bg-surface-muted border-transparent text-text-muted hover:text-text hover:bg-surface-hover'
              }`}
            >
              {tab.label}
              {typeof tab.count === 'number' && (
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded text-[11px] ${
                    isActive
                      ? 'bg-surface-muted text-text-muted'
                      : 'bg-surface text-text-faint'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* The bordered panel containing tab content */}
      <div className="bg-surface border border-border rounded-lg rounded-tl-none p-6">
        {children}
      </div>
    </div>
  )
}