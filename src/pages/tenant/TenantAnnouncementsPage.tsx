import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { Badge, Card, EmptyState } from '../../components/ui'

export default function TenantAnnouncementsPage() {
  const [items, setItems] = useState<any[]>([])

  useEffect(() => {
    api
      .get('/announcements')
      .then((r) => setItems(r.data.data || []))
      .catch((e) => toast.error(e.message))
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Announcements</h1>
      {!items.length ? (
        <EmptyState title="No announcements" />
      ) : (
        items.map((a) => (
          <Card key={a._id}>
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-display text-xl">{a.title}</h2>
              <Badge tone="accent">{a.category.replaceAll('_', ' ')}</Badge>
            </div>
            <p className="mt-2 text-sm text-text-secondary">{a.body}</p>
            <p className="mt-2 text-xs text-neutral">
              {new Date(a.publishedAt).toLocaleString('en-IN')}
            </p>
          </Card>
        ))
      )}
    </div>
  )
}
