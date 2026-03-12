import { useState, useEffect } from 'react'
import { api } from '../../lib/api'
import { Table, Badge, Btn, Modal, Input, Textarea, Confirm, SearchInput, Spinner, Empty, showToast } from '../../components/ui'
import { PageHeader } from '../../components/admin/PageHeader'

export default function ServicesPage() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const res = await api.services.list()
      setServices(res.services || [])
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = services.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  )

  async function handleDelete() {
    if (!confirmDel) return
    try {
      await api.services.delete(confirmDel.id)
      showToast('Service deleted', 'success')
      setConfirmDel(null)
      load()
    } catch (e) {
      showToast(e.message, 'error')
      setConfirmDel(null)
    }
  }

  const cols = [
    { key: 'name', label: 'Name', render: v => <span style={{ fontWeight: 500, color: 'var(--text-0)' }}>{v}</span> },
    { key: 'description', label: 'Description', render: v => <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>{v || '—'}</span> },
    { key: 'duration_minutes', label: 'Duration', mono: true, render: v => `${v} min` },
    { key: 'active', label: 'Status', render: v => <Badge variant={v ? 'success' : 'neutral'}>{v ? 'Active' : 'Inactive'}</Badge> },
    { key: '_actions', label: '', render: (_, row) => (
      <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
        <Btn size="sm" variant="ghost" onClick={() => setEditModal(row)}>Edit</Btn>
        <Btn size="sm" variant="danger" onClick={() => setConfirmDel(row)}>Delete</Btn>
      </div>
    )},
  ]

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }} className="fade-in">
      <PageHeader
        title="Services"
        sub={`${filtered.length} services available`}
        actions={
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search services..." />
            <Btn onClick={() => setCreateModal(true)}>+ Add Service</Btn>
          </div>
        }
      />

      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Spinner size={24} /></div>
        ) : filtered.length === 0 ? (
          <Empty icon="◈" text="No services found" />
        ) : (
          <Table columns={cols} rows={filtered} />
        )}
      </div>

      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Add Service" width={440}>
        <ServiceForm onClose={() => setCreateModal(false)} onRefresh={load} />
      </Modal>

      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Edit — ${editModal?.name}`} width={440}>
        {editModal && <ServiceForm service={editModal} onClose={() => setEditModal(null)} onRefresh={load} />}
      </Modal>

      <Confirm
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDelete}
        title="Delete Service"
        message={`Delete "${confirmDel?.name}"? This cascades to doctor assignments and slots.`}
      />
    </div>
  )
}

function ServiceForm({ service, onClose, onRefresh }) {
  const [form, setForm] = useState({
    name: service?.name || '',
    description: service?.description || '',
    duration_minutes: service?.duration_minutes || 60,
    active: service?.active ?? 1,
  })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  async function save() {
    if (!form.name.trim()) return showToast('Name required', 'error')
    setSaving(true)
    try {
      if (service) {
        await api.services.update(service.id, { ...form, duration_minutes: Number(form.duration_minutes) })
        showToast('Service updated', 'success')
      } else {
        await api.services.create({ ...form, duration_minutes: Number(form.duration_minutes) })
        showToast('Service created', 'success')
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
      <Input label="Service Name" value={form.name} onChange={set('name')} placeholder="e.g. Osteopathy" required />
      <Textarea label="Description" value={form.description} onChange={set('description')} placeholder="Brief description..." rows={2} />
      <Input label="Duration (minutes)" type="number" value={form.duration_minutes} onChange={set('duration_minutes')} />
      {service && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <Btn variant={form.active ? 'success' : 'secondary'} size="sm" onClick={() => setForm(f => ({ ...f, active: 1 }))}>Active</Btn>
          <Btn variant={!form.active ? 'danger' : 'secondary'} size="sm" onClick={() => setForm(f => ({ ...f, active: 0 }))}>Inactive</Btn>
        </div>
      )}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? <Spinner size={12} /> : service ? 'Save' : 'Create'}</Btn>
      </div>
    </div>
  )
}