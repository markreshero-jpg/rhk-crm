'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, ChevronRight, Trash2 } from 'lucide-react'
import {
  getAllQuoteItemTemplates,
  createQuoteItemTemplate,
  deleteQuoteItemTemplate,
  QuoteItemTemplate,
} from '@/lib/quoteItemTemplates'
import ListFilters from '@/components/ListFilters'

export default function QuoteItemTemplatesList() {
  const [templates, setTemplates] = useState<QuoteItemTemplate[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  async function load() {
    const data = await getAllQuoteItemTemplates()
    setTemplates(data)
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleNew() {
    const name = prompt('Template name:')
    if (!name?.trim()) return
    await createQuoteItemTemplate({ name: name.trim() })
    await load()
  }

  async function handleDelete(t: QuoteItemTemplate) {
    if (!confirm(`Delete template "${t.name}"? This cannot be undone.`)) return
    await deleteQuoteItemTemplate(t.id)
    await load()
  }

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    (t.category || '').toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] uppercase tracking-widest text-text-subtle font-medium">
          Bundles — multi-line templates
        </h3>
        <button
          type="button"
          onClick={handleNew}
          className="flex items-center gap-1.5 text-xs text-accent-text bg-accent px-3 py-1.5 rounded-md hover:bg-accent-hover"
        >
          <Plus size={12} /> New Template
        </button>
      </div>

      <ListFilters
        searchQuery={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search by name or category..."
        resultCount={filtered.length}
        resultLabel={filtered.length === 1 ? 'template' : 'templates'}
      />

      {loading ? (
        <p className="text-text-subtle text-sm p-6">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-border rounded-md">
          <p className="text-text-subtle text-sm">
            {query ? 'No templates match.' : 'No templates yet.'}
          </p>
          {!query && (
            <button
              onClick={handleNew}
              className="inline-flex items-center gap-2 mt-4 text-sm text-text underline hover:no-underline"
            >
              Create your first template
            </button>
          )}
        </div>
      ) : (
        <div className="border border-border rounded-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-muted border-b border-border">
              <tr className="text-left text-[11px] uppercase tracking-wider text-text-subtle">
                <th className="px-3 py-1.5 font-medium">Name</th>
                <th className="px-3 py-1.5 font-medium w-32">Category</th>
                <th className="px-3 py-1.5 font-medium">Description</th>
                <th className="px-3 py-1.5 font-medium w-8"></th>
                <th className="px-3 py-1.5 font-medium w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-surface-hover group">
                  <td className="px-3 py-1.5 text-sm font-medium text-text">
                    <Link href={`/templates/${t.id}`}>{t.name}</Link>
                  </td>
                  <td className="px-3 py-1.5 text-sm text-text-muted">{t.category || '—'}</td>
                  <td className="px-3 py-1.5 text-sm text-text-muted truncate">
                    {t.description || '—'}
                  </td>
                  <td className="px-3 py-1.5">
                    <Link href={`/templates/${t.id}`} className="text-text-faint hover:text-text">
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                  <td className="px-3 py-1.5">
                    <button
                      onClick={() => handleDelete(t)}
                      className="text-text-faint hover:text-danger"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}