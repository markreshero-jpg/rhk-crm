'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Briefcase, Users, Calendar, BookTemplate, Settings, Truck, LayoutDashboard, ShoppingCart, ClipboardList, Sun, Moon, LogOut } from 'lucide-react'
import { useTheme } from '@/lib/useTheme'
import { createClient } from '@/lib/supabase-browser'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/work-orders', label: 'Work Orders', icon: ClipboardList },
  { href: '/purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
  { href: '/calendar', label: 'Calendar', icon: Calendar },
  { href: '/templates', label: 'Templates', icon: BookTemplate },
  { href: '/suppliers', label: 'Suppliers', icon: Truck },
]

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-60 bg-accent text-accent-text flex flex-col h-screen">
      <div className="px-6 py-6 border-b border-accent-border">
        <h1 className="text-xl font-semibold tracking-tight">RHK</h1>
        <p className="text-xs text-accent-text-muted mt-0.5">Operations console</p>
        {process.env.NODE_ENV === 'development' && (
          <span className="inline-block mt-1.5 text-[10px] font-semibold tracking-widest uppercase text-red-400">
            Development
          </span>
        )}
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
              onClick={onClose}
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
          onClick={onClose}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-accent-text-muted hover:bg-accent-hover/50 hover:text-accent-text transition-colors"
        >
          <Settings size={16} />
          <span>Settings</span>
        </Link>
      </nav>

      <div className="px-3 pb-2">
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent-hover/50 transition-colors"
          aria-label="Toggle theme"
        >
          {isDark
            ? <Moon size={14} className="text-accent-text-muted shrink-0" />
            : <Sun size={14} className="text-accent-text-muted shrink-0" />}
          <span className="text-xs text-accent-text-muted flex-1 text-left">
            {isDark ? 'Dark' : 'Light'}
          </span>
          <div className={`relative w-8 h-4 rounded-full transition-colors duration-200 ${isDark ? 'bg-accent-hover' : 'bg-accent-text-muted/30'}`}>
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-accent-text transition-transform duration-200 ${isDark ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
        </button>
      </div>

      <div className="px-4 py-4 border-t border-accent-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent-text-muted flex items-center justify-center text-accent text-sm font-semibold">
            R
          </div>
          <div className="text-xs flex-1 min-w-0">
            <p className="text-accent-text font-medium">You</p>
            <p className="text-accent-text-muted">Administrator</p>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign out"
            className="text-accent-text-muted hover:text-accent-text transition-colors p-1 rounded"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}