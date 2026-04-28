import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RHK CRM',
  description: 'Job and quality control management',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}