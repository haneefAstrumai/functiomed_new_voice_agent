import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Table, Badge, Btn, Modal, Input, Select, Confirm, SearchInput, Spinner, Empty, showToast } from '../../components/ui'
import { PageHeader } from '../../components/admin/PageHeader'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'no_show', label: 'No Show' },
]

function statusBadge(s) {
  if (s === 'confirmed') return <Badge variant="success">Confirmed</Badge>
  if (s === 'cancelled') return <Badge variant="danger">Cancelled</Badge>
  if (s === 'no_show')   return <Badge variant="warning">No Show</Badge>
  return <Badge variant="neutral">{s}</Badge>
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [editModal, setEditModal] = useState(null)
  const [detailModal, setDetailModal] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const res = await api.bookings.list(statusFilter || undefined)
      setBookings(res.bookings || [])
    } catch (e) {
      showToast(`Load failed: ${e.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter])

  const filtered = bookings.filter(b =>
    !search ||
    b.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.confirmation_number?.toLowerCase().includes(search.toLowerCase()) ||
    b.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.service_name?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCancel(booking) {
    try {
      await api.bookings.cancel(booking.id)
      showToast('Booking cancelled', 'success')
      load()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  async function handleDelete() {
    if (!confirmDel) return
    try {
      await api.bookings.delete(confirmDel.id)
      showToast('Booking deleted', 'success')
      setConfirmDel(null)
      load()
    } catch (e) {
      showToast(e.message, 'error')
      setConfirmDel(null)
    }
  }

  const cols = [
    { key: 'id', label: 'ID', mono: true, nowrap: true },
    { key: 'confirmation_number', label: 'Confirmation', mono: true, nowrap: true, render: v => <span style={{ color: 'var(--cyan)', letterSpacing: '0.05em' }}>{v}</span> },
    { key: 'patient_name', label: 'Patient' },
    { key: 'service_name', label: 'Service' },
    { key: 'doctor_name', label: 'Doctor', render: v => v?.replace('Dr. ', 'Dr.\u00a0') },
    { key: 'slot_date', label: 'Date', mono: true, nowrap: true, render: v => v || '—' },
    { key: 'slot_time', label: 'Time', mono: true, nowrap: true, render: v => v || '—' },
    { key: 'status', label: 'Status', render: v => statusBadge(v) },
    { key: 'booked_at', label: 'Booked', mono: true, nowrap: true, render: v => v ? v.slice(0, 16) : '—' },
    { key: '_actions', label: '', render: (_, row) => (
      <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
        <Btn size="sm" variant="ghost" onClick={() => setEditModal(row)}>Edit</Btn>
        {row.status === 'confirmed' && (
          <Btn size="sm" variant="warning" onClick={() => handleCancel(row)}>Cancel</Btn>
        )}
        <Btn size="sm" variant="danger" onClick={() => setConfirmDel(row)}>Delete</Btn>
      </div>
    )},
  ]

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }} className="fade-in">
      <PageHeader
        title="Bookings"
        sub={`${filtered.length} records${statusFilter ? ` · ${statusFilter}` : ''}`}
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search patient, doctor..." />
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              options={STATUS_OPTIONS}
              style={{ minWidth: '160px' }}
            />
            <Btn variant="secondary" onClick={load}>↻ Refresh</Btn>
          </div>
        }
      />

      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Spinner size={24} /></div>
        ) : filtered.length === 0 ? (
          <Empty icon="⊞" text="No bookings found" />
        ) : (
          <Table columns={cols} rows={filtered} onRowClick={row => setDetailModal(row)} />
        )}
      </div>

      {/* Detail Modal */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={`Booking #${detailModal?.id}`} width={520}>
        {detailModal && <BookingDetail booking={detailModal} onClose={() => setDetailModal(null)} onRefresh={load} />}
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Edit Booking #${editModal?.id}`} width={460}>
        {editModal && <EditForm booking={editModal} onClose={() => setEditModal(null)} onRefresh={load} />}
      </Modal>

      {/* Delete confirm */}
      <Confirm
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDelete}
        title="Delete Booking"
        message={`Permanently delete booking #${confirmDel?.id} for ${confirmDel?.patient_name}? This cannot be undone.`}
      />
    </div>
  )
}

function BookingDetail({ booking: b, onClose, onRefresh }) {
  const rows = [
    ['ID', b.id], ['Confirmation', b.confirmation_number],
    ['Status', b.status], ['Patient', b.patient_name],
    ['Service', b.service_name], ['Doctor', b.doctor_name],
    ['Date', b.slot_date || '—'], ['Time', b.slot_time || '—'],
    ['Language', b.language], ['Booked At', b.booked_at],
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {rows.map(([label, val]) => (
        <div key={label} style={{ display: 'flex', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
          <span style={{ width: '120px', minWidth: '120px', fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em', paddingTop: '1px' }}>{label}</span>
          <span style={{ fontSize: '13px', color: 'var(--text-0)', fontFamily: label === 'Confirmation' ? 'var(--font-mono)' : undefined }}>{val}</span>
        </div>
      ))}
      {b.session_summary && (
        <div style={{ marginTop: '8px', padding: '12px', background: 'var(--bg-3)', borderRadius: 'var(--radius)', fontSize: '12px', color: 'var(--text-2)', fontFamily: 'var(--font-mono)', lineHeight: 1.7 }}>
          {b.session_summary}
        </div>
      )}
    </div>
  )
}

function EditForm({ booking, onClose, onRefresh }) {
  const [form, setForm] = useState({
    status: booking.status || 'confirmed',
    patient_name: booking.patient_name || '',
    slot_date: booking.slot_date || '',
    slot_time: booking.slot_time || '',
    language: booking.language || 'en',
    session_summary: booking.session_summary || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function save() {
    setSaving(true)
    try {
      await api.bookings.update(booking.id, form)
      showToast('Booking updated', 'success')
      onRefresh(); onClose()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Select label="Status" value={form.status} onChange={set('status')}
        options={[{ value: 'confirmed', label: 'Confirmed' }, { value: 'cancelled', label: 'Cancelled' }, { value: 'no_show', label: 'No Show' }]} />
      <Input label="Patient Name" value={form.patient_name} onChange={set('patient_name')} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Input label="Slot Date" value={form.slot_date} onChange={set('slot_date')} placeholder="YYYY-MM-DD" />
        <Input label="Slot Time" value={form.slot_time} onChange={set('slot_time')} placeholder="HH:MM" />
      </div>
      <Select label="Language" value={form.language} onChange={set('language')}
        options={[{ value: 'en', label: 'English' }, { value: 'de', label: 'German' }]} />
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? <Spinner size={12} /> : 'Save Changes'}</Btn>
      </div>
    </div>
  )
}