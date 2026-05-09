'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, BookTemplate, ChevronRight } from 'lucide-react'

const sections = [
  {
    title: 'People',
    items: [
      { label: 'Staff', href: '/settings/staff', icon: Users },
    ],
  },
  {
    title: 'Workspace',
    items: [
      { label: 'Templates', href: '/settings/templates', icon: BookTemplate },
    ],
  },
]

export default function SettingsNav() {
  const pathname = usePathname() ?? ''

  return (
    <nav className="w-52 shrink-0 border-r border-border pt-8 pb-10 px-3 flex flex-col gap-6">
      {sections.map((section) => (
        <div key={section.title}>
          <p className="text-[10px] uppercase tracking-widest text-text-faint font-semibold px-3 mb-1">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive = pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors group ${
                      isActive
                        ? 'bg-accent text-accent-text font-medium'
                        : 'text-text-muted hover:bg-surface-hover hover:text-text'
                    }`}
                  >
                    <Icon size={14} className="shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight size={12} className="shrink-0 opacity-60" />}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}
