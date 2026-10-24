import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../lib/api'
import { Button, Card, PageHeader, Select } from '../../components/ui'

const reports = [
  { key: 'occupancy', label: 'Occupancy report' },
  { key: 'revenue', label: 'Property-wise revenue' },
  { key: 'outstanding-rent', label: 'Outstanding rent' },
  { key: 'tickets', label: 'Maintenance tickets' },
  { key: 'registrations', label: 'Registrations' },
  { key: 'checkins', label: 'Check-in / check-out' },
]

export default function ReportsPage() {
  const [selected, setSelected] = useState('occupancy')
  const [rows, setRows] = useState<any[]>([])

  async function run(format?: 'csv') {
    try {
      if (format === 'csv') {
        const res = await api.get(`/reports/${selected}`, {
          params: { format: 'csv' },
          responseType: 'blob',
        })
        const url = URL.createObjectURL(res.data)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selected}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('CSV downloaded')
        return
      }
      const { data } = await api.get(`/reports/${selected}`)
      setRows(data.data || [])
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const columns = rows[0] ? Object.keys(rows[0]) : []

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Date-aware operational exports for finance and occupancy"
        actions={
          <>
            <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="min-w-56">
              {reports.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </Select>
            <Button variant="secondary" onClick={() => run()}>Run</Button>
            <Button onClick={() => run('csv')}>Export CSV</Button>
          </>
        }
      />

      <Card>
        {!rows.length ? (
          <p className="text-sm text-text-secondary">Run a report to preview results here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-neutral">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="px-3 py-2">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-border last:border-0">
                    {columns.map((c) => (
                      <td key={c} className="px-3 py-2">
                        {row[c] instanceof Date || (typeof row[c] === 'string' && row[c].includes('T'))
                          ? String(row[c]).slice(0, 10)
                          : String(row[c] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
