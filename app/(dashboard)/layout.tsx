import DashboardShell from '@/components/DashboardShell'
import IdleTimeout from '@/components/IdleTimeout'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IdleTimeout />
      <DashboardShell>{children}</DashboardShell>
    </>
  )
}
