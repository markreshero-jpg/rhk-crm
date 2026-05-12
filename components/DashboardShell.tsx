'use client'

import { useEffect, useState } from 'react'
import { Menu, ChevronRight } from 'lucide-react'
import Sidebar from './Sidebar'
import { createClient } from '@/lib/supabase-browser'
import { getStaffByUserId } from '@/lib/staff'

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [isField, setIsField] = useState(false)
  const [staffRole, setStaffRole] = useState<string | null>(null)
  const [roleLoaded, setRoleLoaded] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    async function checkRole() {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const staff = await getStaffByUserId(session.user.id)
        if (staff?.dashboard_role === 'field') setIsField(true)
        setStaffRole(staff?.dashboard_role ?? null)
      }
      setRoleLoaded(true)
    }
    checkRole()
  }, [])

  // Don't flash the sidebar while loading role
  if (!roleLoaded) {
    return (
      <div className="flex h-screen bg-app-bg items-center justify-center">
        <span className="text-text-faint text-sm">Loading…</span>
      </div>
    )
  }

  // Field staff — full-width, no sidebar
  if (isField) {
    return (
      <div className="min-h-screen bg-app-bg">
        {children}
      </div>
    )
  }

  // Office / admin — normal shell with sidebar
  return (
    <div className="flex h-screen bg-app-bg">
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 transition-all duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${open ? 'translate-x-0' : '-translate-x-full'}
        ${sidebarCollapsed ? 'lg:w-0 lg:overflow-hidden' : ''}
      `}>
        <Sidebar onClose={() => setOpen(false)} role={staffRole} onCollapse={() => setSidebarCollapsed(true)} />
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden relative">
        {/* Expand tab — desktop only, visible when sidebar is collapsed */}
        {sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="hidden lg:flex absolute left-0 top-3 z-20 items-center justify-center w-6 h-8 bg-accent text-accent-text-muted hover:text-accent-text rounded-r-md transition-colors"
            aria-label="Expand sidebar"
          >
            <ChevronRight size={14} />
          </button>
        )}

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-surface shrink-0">
          <button
            onClick={() => setOpen(true)}
            className="text-text-muted hover:text-text transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm font-semibold text-text">RHK</span>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {children}
        </div>
      </main>
    </div>
  )
}
