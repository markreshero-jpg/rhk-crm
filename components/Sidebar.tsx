'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, Users, Calendar, ClipboardCheck, Settings } from 'lucide-react'

const navItems = [
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/qc', label: 'Quality Control', icon: ClipboardCheck },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-accent text-accent-text flex flex-col h-screen">
      <div className="px-6 py-6 border-b border-accent-border">
        <h1 className="text-xl font-semibold tracking-tight">RHK</h1>
        <p className="text-xs text-accent-text-muted mt-0.5">Operations console</p>
      </div>

      <nav className="flex-1 px-3 py-4">
        <p className="px-3 text-[10px] uppercase tracking-widest text-accent-text-muted mb-2 font-medium">
          Workspace
        </p>

        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname?.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-accent-hover text-accent-text'
                  : 'text-accent-text-muted hover:bg-accent-hover/50 hover:text-accent-text'
              }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          )
        })}

        <p className="px-3 text-[10px] uppercase tracking-widest text-accent-text-muted mb-2 mt-6 font-medium">
          Account
        </p>
        <Link
          href="/settings"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-accent-text-muted hover:bg-accent-hover/50 hover:text-accent-text transition-colors"
        >
          <Settings size={16} />
          <span>Settings</span>
        </Link>
      </nav>

      <div className="px-4 py-4 border-t border-accent-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent-text-muted flex items-center justify-center text-accent text-sm font-semibold">
            R
          </div>
          <div className="text-xs">
            <p className="text-accent-text font-medium">You</p>
            <p className="text-accent-text-muted">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  )
}