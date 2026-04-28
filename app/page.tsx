export const dynamic = 'force-dynamic'

import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')

  if (error) {
    return (
      <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
        <h1>Connection Error</h1>
        <pre style={{ background: '#fee', padding: '20px', borderRadius: '8px' }}>
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1>RHK CRM — Connection Test</h1>
      <p>Connected to Supabase successfully.</p>
      <h2>Clients ({clients?.length ?? 0})</h2>
      {clients && clients.length > 0 ? (
        <ul>
          {clients.map((c) => (
            <li key={c.id}>{c.name}</li>
          ))}
        </ul>
      ) : (
        <p>No clients yet — but the connection is working.</p>
      )}
    </div>
  )
}