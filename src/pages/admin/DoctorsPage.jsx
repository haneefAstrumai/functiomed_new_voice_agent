import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Table, Badge, Btn, Modal, Input, Textarea, Confirm, SearchInput, Spinner, Empty, showToast, Card } from '../../components/ui'
import { PageHeader } from '../../components/admin/PageHeader'

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [serviceModal, setServiceModal] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const [d, s] = await Promise.all([api.doctors.list(), api.services.list()])
      setDoctors(d.doctors || [])
      setServices(s.services || [])
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = doctors.filter(d =>
    !search || d.full_name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete() {
    if (!confirmDel) return
    try {
      await api.doctors.delete(confirmDel.id)
      showToast('Doctor deleted', 'success')
      setConfirmDel(null)
      load()
    } catch (e) {
      showToast(e.message, 'error')
      setConfirmDel(null)
    }
  }

  const cols = [
    { key: 'full_name', label: 'Name', render: (v, r) => (
      <div>
        <div style={{ fontWeight: 500 }}>{v}</div>
        <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{r.title}</div>
      </div>
    )},
    { key: 'bio', label: 'Bio', render: v => <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>{v ? (v.length > 60 ? v.slice(0, 60) + '…' : v) : '—'}</span> },
    { key: 'active', label: 'Status', render: v => <Badge variant={v ? 'success' : 'neutral'}>{v ? 'Active' : 'Inactive'}</Badge> },
    { key: '_actions', label: '', render: (_, row) => (
      <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
        <Btn size="sm" variant="ghost" onClick={() => setServiceModal(row)}>Services</Btn>
        <Btn size="sm" variant="ghost" onClick={() => setEditModal(row)}>Edit</Btn>
        <Btn size="sm" variant="danger" onClick={() => setConfirmDel(row)}>Delete</Btn>
      </div>
    )},
  ]

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }} className="fade-in">
      <PageHeader
        title="Doctors"
        sub={`${filtered.length} practitioners`}
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search doctors..." />
            <Btn onClick={() => setCreateModal(true)}>+ Add Doctor</Btn>
          </div>
        }
      />

      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Spinner size={24} /></div>
        ) : filtered.length === 0 ? (
          <Empty icon="⊕" text="No doctors found" />
        ) : (
          <Table columns={cols} rows={filtered} />
        )}
      </div>

      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Add Doctor" width={460}>
        <DoctorForm onClose={() => setCreateModal(false)} onRefresh={load} />
      </Modal>

      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Edit — ${editModal?.full_name}`} width={460}>
        {editModal && <DoctorForm doctor={editModal} onClose={() => setEditModal(null)} onRefresh={load} />}
      </Modal>

      <Modal open={!!serviceModal} onClose={() => setServiceModal(null)} title={`Services — ${serviceModal?.full_name}`} width={480}>
        {serviceModal && <DoctorServicesManager doctor={serviceModal} allServices={services} onClose={() => setServiceModal(null)} />}
      </Modal>

      <Confirm
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDelete}
        title="Delete Doctor"
        message={`Delete ${confirmDel?.full_name}? This will also remove their slots and service assignments.`}
      />
    </div>
  )
}

function DoctorForm({ doctor, onClose, onRefresh }) {
  const [form, setForm] = useState({
    full_name: doctor?.full_name || '',
    title: doctor?.title || '',
    bio: doctor?.bio || '',
    active: doctor?.active ?? 1,
  })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function save() {
    if (!form.full_name.trim()) return showToast('Name required', 'error')
    setSaving(true)
    try {
      if (doctor) {
        await api.doctors.update(doctor.id, form)
        showToast('Doctor updated', 'success')
      } else {
        await api.doctors.create(form)
        showToast('Doctor created', 'success')
      }
      onRefresh(); onClose()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <Input label="Full Name" value={form.full_name} onChange={set('full_name')} placeholder="Dr. Jane Smith" required />
      <Input label="Title" value={form.title} onChange={set('title')} placeholder="Dr. / MSc / Prof." />
      <Textarea label="Bio" value={form.bio} onChange={set('bio')} placeholder="Short professional bio..." rows={3} />
      {doctor && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <Btn variant={form.active ? 'success' : 'secondary'} size="sm" onClick={() => setForm(f => ({ ...f, active: 1 }))}>Active</Btn>
          <Btn variant={!form.active ? 'danger' : 'secondary'} size="sm" onClick={() => setForm(f => ({ ...f, active: 0 }))}>Inactive</Btn>
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? <Spinner size={12} /> : doctor ? 'Save' : 'Create'}</Btn>
      </div>
    </div>
  )
}

function DoctorServicesManager({ doctor, allServices, onClose }) {
  const [assigned, setAssigned] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await api.doctors.getServices(doctor.id)
      setAssigned(res.services || [])
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function assign(svcId) {
    try {
      await api.doctors.assignService(doctor.id, svcId)
      showToast('Service assigned', 'success')
      load()
    } catch (e) { showToast(e.message, 'error') }
  }

  async function remove(svcId) {
    try {
      await api.doctors.removeService(doctor.id, svcId)
      showToast('Service removed', 'success')
      load()
    } catch (e) { showToast(e.message, 'error') }
  }

  const assignedIds = new Set(assigned.map(s => s.id))
  const available = allServices.filter(s => !assignedIds.has(s.id))

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}><Spinner /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
          Assigned ({assigned.length})
        </div>
        {assigned.length === 0 ? (
          <p style={{ color: 'var(--text-3)', fontSize: '12px' }}>No services assigned</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {assigned.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 'var(--radius)' }}>
                <span style={{ fontSize: '12px', color: 'var(--cyan)' }}>{s.name}</span>
                <button onClick={() => remove(s.id)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {available.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
            Add Service
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {available.map(s => (
              <button key={s.id} onClick={() => assign(s.id)} style={{
                padding: '6px 12px', background: 'var(--bg-3)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', color: 'var(--text-2)', fontSize: '12px',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.target.style.borderColor = 'var(--cyan-dim)'; e.target.style.color = 'var(--cyan)' }}
              onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.color = 'var(--text-2)' }}
              >+ {s.name}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Btn variant="secondary" onClick={onClose}>Done</Btn>
      </div>
    </div>
  )
}