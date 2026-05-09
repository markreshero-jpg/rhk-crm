import SettingsNav from '@/components/SettingsNav'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full">
      {/* Left settings nav */}
      <SettingsNav />

      {/* Page content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
