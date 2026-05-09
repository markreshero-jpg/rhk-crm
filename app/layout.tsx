import type { Metadata } from 'next'
import './globals.css'
import NumberInputInit from '@/components/NumberInputInit'

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased">
        <NumberInputInit />
        {children}
      </body>
    </html>
  )
}