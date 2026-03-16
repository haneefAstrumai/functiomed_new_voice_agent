import { useState, useEffect, useMemo } from 'react'
import { api } from '../../lib/api'
import { Table, Badge, Btn, Modal, Input, Textarea, Confirm, SearchInput, Spinner, Empty, showToast, Select } from '../../components/ui'
import { PageHeader } from '../../components/admin/PageHeader'

export default function ServicesPage() {
  const [services, setServices]             = useState([])
  const [doctors, setDoctors]               = useState([])
  const [serviceDoctors, setServiceDoctors] = useState({})
  const [loading, setLoading]               = useState(true)

  // Filters
  const [search, setSearch]                 = useState('')
  const [filterDoctor, setFilterDoctor]     = useState('')
  const [filterDuration, setFilterDuration] = useState('')
  const [filterStatus, setFilterStatus]     = useState('')

  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal]     = useState(null)
  const [confirmDel, setConfirmDel]   = useState(null)

  async function load() {
    setLoading(true)
    try {
      const [sRes, dRes] = await Promise.all([api.services.list(), api.doctors.list()])
      const svcs = sRes.services || []
      const docs = dRes.doctors  || []
      setServices(svcs)
      setDoctors(docs)

      const map = {}
      await Promise.all(
        svcs.map(async svc => {
          try {
            const res = await api.doctors.listByService(svc.name)
            map[svc.id] = res.doctors || []
          } catch {
            map[svc.id] = []
          }
        })
      )
      setServiceDoctors(map)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ── Filter options ──────────────────────────────────────────
  const doctorOptions = useMemo(() => [
    { value: '', label: 'All Doctors' },
    ...doctors.map(d => ({ value: d.id, label: d.full_name })),
  ], [doctors])

  const statusOptions = [
    { value: '',  label: 'All Statuses' },
    { value: '1', label: 'Active' },
    { value: '0', label: 'Inactive' },
  ]

  // ── Filtered list ───────────────────────────────────────────
  const filtered = useMemo(() => {
    return services.filter(svc => {
      if (search && !svc.name.toLowerCase().includes(search.toLowerCase())) return false

      if (filterDoctor) {
        const assigned = serviceDoctors[svc.id] || []
        if (!assigned.some(d => d.id === filterDoctor)) return false
      }

      if (filterDuration !== '' && filterDuration !== null) {
        if (String(svc.duration_minutes) !== String(filterDuration)) return false
      }

      if (filterStatus !== '' && String(svc.active) !== filterStatus) return false

      return true
    })
  }, [services, serviceDoctors, search, filterDoctor, filterDuration, filterStatus])

  const hasFilters = search || filterDoctor || filterDuration !== '' || filterStatus

  function clearFilters() {
    setSearch('')
    setFilterDoctor('')
    setFilterDuration('')
    setFilterStatus('')
  }

  // ── Delete ──────────────────────────────────────────────────
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

  // ── Table columns ───────────────────────────────────────────
  const cols = [
    {
      key: 'name', label: 'Name',
      render: v => <span style={{ fontWeight: 500, color: 'var(--text-0)' }}>{v}</span>,
    },
    {
      key: 'description', label: 'Description',
      render: v => (
        <span style={{ color: 'var(--text-2)', fontSize: '12px' }}>
          {v ? (v.length > 60 ? v.slice(0, 60) + '…' : v) : '—'}
        </span>
      ),
    },
    {
      key: 'duration_minutes', label: 'Duration',
      render: v => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-1)' }}>
          {v} min
        </span>
      ),
    },
    {
      key: '_doctors', label: 'Doctors',
      render: (_, row) => {
        const docs = serviceDoctors[row.id] || []
        if (docs.length === 0) return <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>—</span>
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {docs.map(d => (
              <span key={d.id} style={{
                fontSize: '11px', padding: '2px 8px',
                background: 'rgba(0,255,204,0.08)',
                border: '1px solid rgba(0,255,204,0.2)',
                borderRadius: '4px', color: 'var(--teal)',
              }}>{d.full_name}</span>
            ))}
          </div>
        )
      },
    },
    {
      key: 'active', label: 'Status',
      render: v => <Badge variant={v ? 'success' : 'neutral'}>{v ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: '_actions', label: '',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
          <Btn size="sm" variant="ghost" onClick={() => setEditModal(row)}>Edit</Btn>
          <Btn size="sm" variant="danger" onClick={() => setConfirmDel(row)}>Delete</Btn>
        </div>
      ),
    },
  ]

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }} className="fade-in">
      <PageHeader
        title="Services"
        sub={`${filtered.length} of ${services.length} services`}
        actions={<Btn onClick={() => setCreateModal(true)}>+ Add Service</Btn>}
      />

      {/* ── Filter bar ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
        padding: '16px 20px',
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}>
        {/* Name search */}
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name..."
          style={{ minWidth: '180px', flex: '1' }}
        />

        {/* Doctor */}
        <Select
          value={filterDoctor}
          onChange={e => setFilterDoctor(e.target.value)}
          options={doctorOptions}
          style={{ minWidth: '160px' }}
        />

        {/* Duration — free text number input */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="number"
            min="1"
            value={filterDuration}
            onChange={e => setFilterDuration(e.target.value)}
            placeholder="Duration (min)"
            style={{
              height: '36px',
              padding: '0 36px 0 12px',
              background: 'var(--bg-3)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--text-0)',
              fontSize: '13px',
              fontFamily: 'var(--font-body)',
              width: '150px',
              outline: 'none',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--cyan-dim)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          {filterDuration !== '' && (
            <button
              onClick={() => setFilterDuration('')}
              style={{
                position: 'absolute', right: '8px',
                background: 'none', border: 'none',
                color: 'var(--text-3)', cursor: 'pointer',
                fontSize: '14px', lineHeight: 1, padding: 0,
              }}
            >×</button>
          )}
        </div>

        {/* Status */}
        <Select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          options={statusOptions}
          style={{ minWidth: '140px' }}
        />

        {/* Clear all */}
        {hasFilters && (
          <Btn variant="ghost" size="sm" onClick={clearFilters}>✕ Clear</Btn>
        )}
      </div>

      {/* ── Table ── */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Spinner size={24} /></div>
        ) : filtered.length === 0 ? (
          <Empty icon="◈" text={hasFilters ? 'No services match your filters' : 'No services found'} />
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


// ── Service Form ──────────────────────────────────────────────

function ServiceForm({ service, onClose, onRefresh }) {
  const [form, setForm] = useState({
    name:             service?.name             || '',
    description:      service?.description      || '',
    duration_minutes: service?.duration_minutes || 60,
    active:           service?.active           ?? 1,
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