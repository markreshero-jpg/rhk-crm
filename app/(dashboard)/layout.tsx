import Sidebar from '@/components/Sidebar'
import IdleTimeout from '@/components/IdleTimeout'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-app-bg">
      <IdleTimeout />
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}