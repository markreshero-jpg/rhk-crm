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
    <aside className="w-60 bg-stone-900 text-stone-100 flex flex-col h-screen">
      <div className="px-6 py-6 border-b border-stone-800">
        <h1 className="text-xl font-semibold tracking-tight">RHK</h1>
        <p className="text-xs text-stone-400 mt-0.5">Operations console</p>
      </div>

      <nav className="flex-1 px-3 py-4">
        <p className="px-3 text-[10px] uppercase tracking-widest text-stone-500 mb-2 font-medium">
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
                  ? 'bg-stone-800 text-white'
                  : 'text-stone-300 hover:bg-stone-800/50'
              }`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          )
        })}

        <p className="px-3 text-[10px] uppercase tracking-widest text-stone-500 mb-2 mt-6 font-medium">
          Account
        </p>
        <Link
          href="/settings"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-stone-300 hover:bg-stone-800/50 transition-colors"
        >
          <Settings size={16} />
          <span>Settings</span>
        </Link>
      </nav>

      <div className="px-4 py-4 border-t border-stone-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-stone-900 text-sm font-semibold">
            R
          </div>
          <div className="text-xs">
            <p className="text-stone-200 font-medium">You</p>
            <p className="text-stone-500">Administrator</p>
          </div>
        </div>
      </div>
    </aside>
  )
}