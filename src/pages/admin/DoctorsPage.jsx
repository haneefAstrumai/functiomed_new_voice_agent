import { useState, useEffect, useMemo } from 'react'
import { api } from '../../lib/api'
import { Table, Badge, Btn, Modal, Input, Textarea, Confirm, SearchInput, Spinner, Empty, showToast, Select } from '../../components/ui'
import { PageHeader } from '../../components/admin/PageHeader'

export default function DoctorsPage() {
  const [doctors, setDoctors]           = useState([])
  const [services, setServices]         = useState([])
  const [doctorServices, setDoctorServices] = useState({})
  const [loading, setLoading]           = useState(true)

  // Filters
  const [search, setSearch]             = useState('')
  const [filterDept, setFilterDept]     = useState('')
  const [filterService, setFilterService] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [createModal, setCreateModal]   = useState(false)
  const [editModal, setEditModal]       = useState(null)
  const [serviceModal, setServiceModal] = useState(null)
  const [confirmDel, setConfirmDel]     = useState(null)

  async function load() {
    setLoading(true)
    try {
      const [d, s] = await Promise.all([api.doctors.list(), api.services.list()])
      const docs = d.doctors || []
      setDoctors(docs)
      setServices(s.services || [])

      const svcMap = {}
      await Promise.all(
        docs.map(async doc => {
          try {
            const res = await api.doctors.getServices(doc.id)
            svcMap[doc.id] = res.services || []
          } catch {
            svcMap[doc.id] = []
          }
        })
      )
      setDoctorServices(svcMap)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ── Derived filter options ──────────────────────────────────
  const deptOptions = useMemo(() => {
    const depts = [...new Set(doctors.map(d => d.department).filter(Boolean))].sort()
    return [{ value: '', label: 'All Departments' }, ...depts.map(d => ({ value: d, label: d }))]
  }, [doctors])

  const serviceOptions = useMemo(() => {
    return [
      { value: '', label: 'All Services' },
      ...services.map(s => ({ value: s.id, label: s.name })),
    ]
  }, [services])

  const statusOptions = [
    { value: '',  label: 'All Statuses' },
    { value: '1', label: 'Active' },
    { value: '0', label: 'Inactive' },
  ]

  // ── Filtered list ───────────────────────────────────────────
  const filtered = useMemo(() => {
    return doctors.filter(doc => {
      // Name search
      if (search && !doc.full_name.toLowerCase().includes(search.toLowerCase())) return false

      // Department filter
      if (filterDept && doc.department !== filterDept) return false

      // Service filter
      if (filterService) {
        const assigned = doctorServices[doc.id] || []
        if (!assigned.some(s => s.id === filterService)) return false
      }

      // Status filter
      if (filterStatus !== '') {
        if (String(doc.active) !== filterStatus) return false
      }

      return true
    })
  }, [doctors, doctorServices, search, filterDept, filterService, filterStatus])

  const hasFilters = search || filterDept || filterService || filterStatus

  function clearFilters() {
    setSearch('')
    setFilterDept('')
    setFilterService('')
    setFilterStatus('')
  }

  // ── Delete ──────────────────────────────────────────────────
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

  // ── Table columns ───────────────────────────────────────────
  const cols = [
    {
      key: 'full_name', label: 'Name',
      render: (v, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{v}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{r.title}</div>
        </div>
      ),
    },
    {
      key: 'department', label: 'Department',
      render: v => <span style={{ fontSize: '12px', color: 'var(--text-1)' }}>{v || '—'}</span>,
    },
    {
      key: '_services', label: 'Services',
      render: (_, row) => {
        const svcs = doctorServices[row.id] || []
        if (svcs.length === 0) return <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>—</span>
        return (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {svcs.map(s => (
              <span key={s.id} style={{
                fontSize: '11px', padding: '2px 8px',
                background: 'rgba(0,212,255,0.08)',
                border: '1px solid rgba(0,212,255,0.2)',
                borderRadius: '4px', color: 'var(--cyan)',
              }}>{s.name}</span>
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
          <Btn size="sm" variant="ghost" onClick={() => setServiceModal(row)}>Services</Btn>
          <Btn size="sm" variant="ghost" onClick={() => setEditModal(row)}>Edit</Btn>
          <Btn size="sm" variant="danger" onClick={() => setConfirmDel(row)}>Delete</Btn>
        </div>
      ),
    },
  ]

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }} className="fade-in">
      <PageHeader
        title="Doctors"
        sub={`${filtered.length} of ${doctors.length} practitioners`}
        actions={
          <Btn onClick={() => setCreateModal(true)}>+ Add Doctor</Btn>
        }
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

        {/* Department */}
        <Select
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          options={deptOptions}
          style={{ minWidth: '160px' }}
        />

        {/* Service */}
        <Select
          value={filterService}
          onChange={e => setFilterService(e.target.value)}
          options={serviceOptions}
          style={{ minWidth: '160px' }}
        />

        {/* Status */}
        <Select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          options={statusOptions}
          style={{ minWidth: '140px' }}
        />

        {/* Clear button */}
        {hasFilters && (
          <Btn variant="ghost" size="sm" onClick={clearFilters}>
            ✕ Clear
          </Btn>
        )}
      </div>

      {/* ── Table ── */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Spinner size={24} /></div>
        ) : filtered.length === 0 ? (
          <Empty
            icon="⊕"
            text={hasFilters ? 'No doctors match your filters' : 'No doctors found'}
          />
        ) : (
          <Table columns={cols} rows={filtered} />
        )}
      </div>

      {/* Modals */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Add Doctor" width={500}>
        <DoctorForm allServices={services} onClose={() => setCreateModal(false)} onRefresh={load} />
      </Modal>

      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Edit — ${editModal?.full_name}`} width={480}>
        {editModal && <DoctorForm doctor={editModal} onClose={() => setEditModal(null)} onRefresh={load} />}
      </Modal>

      <Modal open={!!serviceModal} onClose={() => setServiceModal(null)} title={`Services — ${serviceModal?.full_name}`} width={480}>
        {serviceModal && (
          <DoctorServicesManager
            doctor={serviceModal}
            allServices={services}
            onClose={() => setServiceModal(null)}
            onRefresh={load}
          />
        )}
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


// ── Doctor Form ───────────────────────────────────────────────

function DoctorForm({ doctor, allServices = [], onClose, onRefresh }) {
  const isEdit = !!doctor

  const [form, setForm] = useState({
    full_name:  doctor?.full_name  || '',
    title:      doctor?.title      || '',
    department: doctor?.department || '',
    bio:        doctor?.bio        || '',
    active:     doctor?.active     ?? 1,
  })
  const [selectedServices, setSelectedServices] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const set = k => e => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    setErrors(err => ({ ...err, [k]: null }))
  }

  function toggleService(id) {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  function validate() {
    const e = {}
    if (!form.full_name.trim())  e.full_name  = 'Full name is required'
    if (!form.title.trim())      e.title      = 'Title is required'
    if (!form.department.trim()) e.department = 'Department is required'
    if (!form.bio.trim())        e.bio        = 'Bio is required'
    return e
  }

  async function save() {
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setSaving(true)
    try {
      if (isEdit) {
        await api.doctors.update(doctor.id, form)
        showToast('Doctor updated', 'success')
      } else {
        const res = await api.doctors.create(form)
        const newId = res.doctor?.id
        if (newId) {
          await Promise.all(selectedServices.map(svcId => api.doctors.assignService(newId, svcId)))
        }
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Input label="Full Name *" value={form.full_name} onChange={set('full_name')} placeholder="Asad Khan" />
        {errors.full_name && <span style={{ color: 'var(--red)', fontSize: '11px' }}>{errors.full_name}</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Input label="Title *" value={form.title} onChange={set('title')} placeholder="Dr. / MSc / Prof." />
        {errors.title && <span style={{ color: 'var(--red)', fontSize: '11px' }}>{errors.title}</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Input label="Department *" value={form.department} onChange={set('department')} placeholder="e.g. Cardiology, General Medicine" />
        {errors.department && <span style={{ color: 'var(--red)', fontSize: '11px' }}>{errors.department}</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <Textarea label="Bio *" value={form.bio} onChange={set('bio')} placeholder="Short professional bio..." rows={3} />
        {errors.bio && <span style={{ color: 'var(--red)', fontSize: '11px' }}>{errors.bio}</span>}
      </div>

      {!isEdit && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Services{' '}
            <span style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)', textTransform: 'none', letterSpacing: 0 }}>
              (optional — can be assigned later)
            </span>
          </div>
          {allServices.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: '12px' }}>No services available. You can assign services later.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {allServices.map(s => {
                const selected = selectedServices.includes(s.id)
                return (
                  <button key={s.id} onClick={() => toggleService(s.id)} style={{
                    padding: '6px 14px',
                    background: selected ? 'rgba(0,212,255,0.12)' : 'var(--bg-3)',
                    border: `1px solid ${selected ? 'var(--cyan)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    color: selected ? 'var(--cyan)' : 'var(--text-2)',
                    fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s',
                    fontFamily: 'var(--font-body)',
                  }}>
                    {selected ? '✓ ' : ''}{s.name}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {isEdit && (
        <div style={{ display: 'flex', gap: '10px' }}>
          <Btn variant={form.active ? 'success' : 'secondary'} size="sm" onClick={() => setForm(f => ({ ...f, active: 1 }))}>Active</Btn>
          <Btn variant={!form.active ? 'danger' : 'secondary'} size="sm" onClick={() => setForm(f => ({ ...f, active: 0 }))}>Inactive</Btn>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? <Spinner size={12} /> : isEdit ? 'Save' : 'Create'}</Btn>
      </div>
    </div>
  )
}


// ── Service assignment manager ────────────────────────────────

function DoctorServicesManager({ doctor, allServices, onClose, onRefresh }) {
  const [assigned, setAssigned] = useState([])
  const [loading, setLoading]   = useState(true)

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
      load(); onRefresh()
    } catch (e) { showToast(e.message, 'error') }
  }

  async function remove(svcId) {
    try {
      await api.doctors.removeService(doctor.id, svcId)
      showToast('Service removed', 'success')
      load(); onRefresh()
    } catch (e) { showToast(e.message, 'error') }
  }

  const assignedIds = new Set(assigned.map(s => s.id))
  const available   = allServices.filter(s => !assignedIds.has(s.id))

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
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
                background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)',
                borderRadius: 'var(--radius)',
              }}>
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