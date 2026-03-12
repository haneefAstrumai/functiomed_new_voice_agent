import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Table, Badge, Btn, Modal, Confirm, SearchInput, Spinner, Empty, showToast, Select, Input } from '../../components/ui'
import { PageHeader } from '../../components/admin/PageHeader'

export default function SlotsPage() {
  const [slots, setSlots] = useState([])
  const [doctors, setDoctors] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ doctor_id: '', service_id: '', available_only: false })
  const [search, setSearch] = useState('')
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [sl, d, s] = await Promise.all([
        api.slots.list({
          doctor_id:      filters.doctor_id      || undefined,
          service_id:     filters.service_id     || undefined,
          available_only: filters.available_only || undefined,
        }),
        api.doctors.list(),
        api.services.list(),
      ])
      setSlots(sl.slots || [])
      setDoctors(d.doctors || [])
      setServices(s.services || [])
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filters])

  const filtered = slots.filter(s =>
    !search ||
    s.doctor_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.service_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.slot_date?.includes(search)
  )

  async function handleDelete() {
    if (!confirmDel) return
    setDeleting(true)
    try {
      await api.slots.delete(confirmDel.id)
      showToast('Slot deleted', 'success')
      setConfirmDel(null)
      load()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  async function toggleAvailability(slot) {
    try {
      await api.slots.update(slot.id, { available: slot.available ? 0 : 1 })
      showToast(`Slot ${slot.available ? 'closed' : 'reopened'}`, 'success')
      load()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  const docOptions = [{ value: '', label: 'All Doctors' }, ...doctors.map(d => ({ value: d.id, label: d.full_name }))]
  const svcOptions = [{ value: '', label: 'All Services' }, ...services.map(s => ({ value: s.id, label: s.name }))]

  const cols = [
    { key: 'slot_date',    label: 'Date',    mono: true, nowrap: true, render: v => <span style={{ color: 'var(--text-0)' }}>{v}</span> },
    { key: 'slot_time',    label: 'Time',    mono: true, nowrap: true, render: v => <span style={{ color: 'var(--cyan)' }}>{v}</span> },
    { key: 'doctor_name',  label: 'Doctor' },
    { key: 'service_name', label: 'Service' },
    { key: 'available',    label: 'Status',  render: v => <Badge variant={v ? 'success' : 'neutral'}>{v ? 'Open' : 'Booked'}</Badge> },
    { key: 'id',           label: 'ID',      mono: true, render: v => <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{String(v).slice(0, 8)}…</span> },
    {
      key: '_actions', label: '',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
          <Btn size="sm" variant={row.available ? 'warning' : 'success'} onClick={() => toggleAvailability(row)}>
            {row.available ? 'Close' : 'Open'}
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => setEditModal(row)}>Edit</Btn>
          <Btn size="sm" variant="danger" onClick={() => setConfirmDel(row)}>Delete</Btn>
        </div>
      ),
    },
  ]

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }} className="fade-in">
      <PageHeader
        title="Slots"
        sub={`${filtered.length} appointment slots`}
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search slots..." />
            <Select value={filters.doctor_id} onChange={e => setFilters(f => ({ ...f, doctor_id: e.target.value }))} options={docOptions} style={{ minWidth: '160px' }} />
            <Select value={filters.service_id} onChange={e => setFilters(f => ({ ...f, service_id: e.target.value }))} options={svcOptions} style={{ minWidth: '160px' }} />
            <Btn
              variant={filters.available_only ? 'primary' : 'secondary'}
              onClick={() => setFilters(f => ({ ...f, available_only: !f.available_only }))}
            >
              {filters.available_only ? '✓ Available Only' : 'Available Only'}
            </Btn>
            <Btn onClick={() => setCreateModal(true)}>+ Add Slot</Btn>
          </div>
        }
      />

      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Spinner size={24} /></div>
        ) : filtered.length === 0 ? (
          <Empty icon="⊡" text="No slots found" />
        ) : (
          <Table columns={cols} rows={filtered} />
        )}
      </div>

      {/* Add Slot Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Add Slot" width={440}>
        {doctors.length === 0 || services.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
            ⚠ You need at least one doctor and one service before adding slots.
          </div>
        ) : (
          <SlotForm
            key="create"
            doctors={doctors}
            services={services}
            onClose={() => setCreateModal(false)}
            onRefresh={load}
          />
        )}
      </Modal>

      {/* Edit Slot Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Slot" width={440}>
        {editModal && (
          <SlotForm
            key={editModal.id}
            slot={editModal}
            doctors={doctors}
            services={services}
            onClose={() => setEditModal(null)}
            onRefresh={load}
          />
        )}
      </Modal>

      {/* Delete Confirm — uses Portal-based Confirm so it escapes DOM clipping */}
      <Confirm
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDelete}
        title="Delete Slot"
        message={
          confirmDel
            ? `Delete slot on ${confirmDel.slot_date} at ${confirmDel.slot_time} for ${confirmDel.doctor_name}?`
            : ''
        }
      />
    </div>
  )
}

function SlotForm({ slot, doctors, services, onClose, onRefresh }) {
  const [form, setForm] = useState({
    doctor_id:  slot?.doctor_id  || doctors[0]?.id  || '',
    service_id: slot?.service_id || services[0]?.id || '',
    slot_date:  slot?.slot_date  || '',
    slot_time:  slot?.slot_time  || '09:00',
    available:  slot?.available  ?? 1,
  })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function save() {
    if (!form.doctor_id)  return showToast('Please select a doctor', 'error')
    if (!form.service_id) return showToast('Please select a service', 'error')
    if (!form.slot_date)  return showToast('Date is required', 'error')
    if (!form.slot_time)  return showToast('Time is required', 'error')
    setSaving(true)
    try {
      if (slot) {
        await api.slots.update(slot.id, form)
        showToast('Slot updated', 'success')
      } else {
        await api.slots.create({
          doctor_id:  form.doctor_id,
          service_id: form.service_id,
          slot_date:  form.slot_date,
          slot_time:  form.slot_time,
        })
        showToast('Slot created', 'success')
      }
      onRefresh()
      onClose()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Select label="Doctor"  value={form.doctor_id}  onChange={set('doctor_id')}  options={doctors.map(d => ({ value: d.id, label: d.full_name }))} />
      <Select label="Service" value={form.service_id} onChange={set('service_id')} options={services.map(s => ({ value: s.id, label: s.name }))} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Input label="Date" type="date" value={form.slot_date} onChange={set('slot_date')} />
        <Input label="Time" type="time" value={form.slot_time} onChange={set('slot_time')} />
      </div>
      {slot && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Availability</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Btn variant={form.available ? 'success' : 'secondary'} size="sm" onClick={() => setForm(f => ({ ...f, available: 1 }))}>✓ Open</Btn>
            <Btn variant={!form.available ? 'warning' : 'secondary'} size="sm" onClick={() => setForm(f => ({ ...f, available: 0 }))}>✗ Closed</Btn>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>
          {saving ? <Spinner size={12} /> : slot ? 'Save Changes' : 'Create Slot'}
        </Btn>
      </div>
    </div>
  )
}