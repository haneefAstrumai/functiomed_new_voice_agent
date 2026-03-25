import { useState, useEffect, useMemo } from 'react'
import { api } from '../../lib/api'
import { Table, Badge, Btn, Modal, Confirm, SearchInput, Spinner, Empty, showToast, Select, Input } from '../../components/ui'
import { PageHeader } from '../../components/admin/PageHeader'

export default function SlotsPage() {
  const [slots, setSlots]       = useState([])
  const [doctors, setDoctors]   = useState([])
  const [services, setServices] = useState([])
  const [doctorServices, setDoctorServices] = useState({})
  const [serviceDoctors, setServiceDoctors] = useState({})
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [bulkDeleting, setBulkDeleting]     = useState(false)
  const [confirmBulkDel, setConfirmBulkDel] = useState(false)

  const [filters, setFilters] = useState({
    doctor_id: '', service_id: '', available_only: false,
    date_from: '', date_to: '', time_from: '', time_to: '',
  })
  const [search, setSearch] = useState('')

  const [addModal, setAddModal] = useState(false)
  const [addTab, setAddTab]     = useState('recurring') // 'single' | 'recurring'
  const [editModal, setEditModal]     = useState(null)
  const [confirmDel, setConfirmDel]   = useState(null)

  async function load() {
    setLoading(true)
    setSelected(new Set())
    try {
      const [sl, d, s] = await Promise.all([
        api.slots.list({
          doctor_id:      filters.doctor_id      || undefined,
          service_id:     filters.service_id     || undefined,
          available_only: filters.available_only || undefined,
          date_from:      filters.date_from      || undefined,
          date_to:        filters.date_to        || undefined,
          time_from:      filters.time_from      || undefined,
          time_to:        filters.time_to        || undefined,
        }),
        api.doctors.list(),
        api.services.list(),
      ])
      const docs = d.doctors  || []
      const svcs = s.services || []
      setSlots(sl.slots || [])
      setDoctors(docs)
      setServices(svcs)

      const dsMap = {}; const sdMap = {}
      await Promise.all(docs.map(async doc => {
        try {
          const res = await api.doctors.getServices(doc.id)
          const ids = (res.services || []).map(s => s.id)
          dsMap[doc.id] = ids
          ids.forEach(sid => { if (!sdMap[sid]) sdMap[sid] = []; sdMap[sid].push(doc.id) })
        } catch { dsMap[doc.id] = [] }
      }))
      setDoctorServices(dsMap)
      setServiceDoctors(sdMap)
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

  const hasFilters = filters.doctor_id || filters.service_id || filters.available_only
    || filters.date_from || filters.date_to || filters.time_from || filters.time_to || search

  function clearFilters() {
    setSearch('')
    setFilters({ doctor_id: '', service_id: '', available_only: false, date_from: '', date_to: '', time_from: '', time_to: '' })
  }

  function setFilter(key, value) { setFilters(f => ({ ...f, [key]: value })) }

  // ── Selection ───────────────────────────────────────────────
  const allFilteredIds = filtered.map(s => s.id)
  const allSelected    = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id))
  const someSelected   = allFilteredIds.some(id => selected.has(id))

  function toggleAll() {
    if (allSelected) {
      setSelected(prev => { const n = new Set(prev); allFilteredIds.forEach(id => n.delete(id)); return n })
    } else {
      setSelected(prev => new Set([...prev, ...allFilteredIds]))
    }
  }

  function toggleOne(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ── Bulk delete ─────────────────────────────────────────────
  async function handleBulkDelete() {
    setBulkDeleting(true)
    try {
      let deleted = 0
      for (const id of selected) {
        await api.slots.delete(id)
        deleted++
      }
      showToast(`${deleted} slot${deleted !== 1 ? 's' : ''} deleted`, 'success')
      setConfirmBulkDel(false)
      load()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setBulkDeleting(false)
    }
  }

  // ── Single delete ───────────────────────────────────────────
  async function handleDelete() {
    if (!confirmDel) return
    try {
      await api.slots.delete(confirmDel.id)
      showToast('Slot deleted', 'success')
      setConfirmDel(null)
      load()
    } catch (e) {
      showToast(e.message, 'error')
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

  const docOptions = [{ value: '', label: 'All Doctors' },  ...doctors.map(d => ({ value: d.id, label: d.full_name }))]
  const svcOptions = [{ value: '', label: 'All Services' }, ...services.map(s => ({ value: s.id, label: s.name }))]

  const cols = [
    {
      key: '_select',
      label: (
        <input
          type="checkbox"
          checked={allSelected}
          ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
          onChange={toggleAll}
          style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--cyan)' }}
          title="Select all visible"
        />
      ),
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selected.has(row.id)}
          onChange={() => toggleOne(row.id)}
          onClick={e => e.stopPropagation()}
          style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: 'var(--cyan)' }}
        />
      ),
    },
    { key: 'slot_date',    label: 'Date',    mono: true, nowrap: true, render: v => <span style={{ color: 'var(--text-0)' }}>{v}</span> },
    { key: 'slot_time',    label: 'Time',    mono: true, nowrap: true, render: v => <span style={{ color: 'var(--cyan)' }}>{v}</span> },
    { key: 'doctor_name',  label: 'Doctor' },
    { key: 'service_name', label: 'Service' },
    { key: 'available',    label: 'Status',  render: v => <Badge variant={v ? 'success' : 'neutral'}>{v ? 'Open' : 'Booked'}</Badge> },
    { key: 'id',           label: 'ID',      mono: true, render: v => <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{String(v).slice(0, 8)}…</span> },
    {
      key: '_actions', label: '',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
          <Btn size="sm" variant={row.available ? 'warning' : 'success'} onClick={() => toggleAvailability(row)}>
            {row.available ? 'Close' : 'Open'}
          </Btn>
          <Btn size="sm" variant="ghost" onClick={() => setEditModal(row)}>Edit</Btn>
          <Btn size="sm" variant="danger" onClick={() => setConfirmDel(row)}>Delete</Btn>
        </div>
      ),
    },
  ]

  const timeInputStyle = {
    height: '36px', padding: '0 10px',
    background: 'var(--bg-3)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius)', color: 'var(--text-0)',
    fontSize: '13px', fontFamily: 'var(--font-mono)', outline: 'none',
  }

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }} className="fade-in">
      <PageHeader
        title="Slots"
        sub={`${filtered.length} of ${slots.length} appointment slots`}
        actions={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Btn onClick={() => { setAddTab('recurring'); setAddModal(true) }}>+ Add Slot</Btn>
          </div>
        }
      />

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 20px',
          background: 'rgba(255,68,102,0.08)',
          border: '1px solid rgba(255,68,102,0.3)',
          borderRadius: 'var(--radius-lg)',
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-1)', fontFamily: 'var(--font-mono)' }}>
            {selected.size} slot{selected.size !== 1 ? 's' : ''} selected
          </span>
          <Btn variant="danger" size="sm" onClick={() => setConfirmBulkDel(true)}>
            🗑 Delete Selected
          </Btn>
          <Btn variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Deselect All
          </Btn>
        </div>
      )}

      {/* ── Filter bar ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center',
        padding: '16px 20px',
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
      }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search doctor, service..." style={{ minWidth: '180px', flex: '1' }} />
        <Select value={filters.doctor_id}  onChange={e => setFilter('doctor_id', e.target.value)}  options={docOptions} style={{ minWidth: '150px' }} />
        <Select value={filters.service_id} onChange={e => setFilter('service_id', e.target.value)} options={svcOptions} style={{ minWidth: '150px' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>DATE</span>
          <input type="date" value={filters.date_from} onChange={e => setFilter('date_from', e.target.value)}
            style={{ ...timeInputStyle, width: '140px' }}
            onFocus={e => e.target.style.borderColor = 'var(--cyan-dim)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>→</span>
          <input type="date" value={filters.date_to} onChange={e => setFilter('date_to', e.target.value)}
            style={{ ...timeInputStyle, width: '140px' }}
            onFocus={e => e.target.style.borderColor = 'var(--cyan-dim)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>TIME</span>
          <input type="time" value={filters.time_from} onChange={e => setFilter('time_from', e.target.value)}
            style={{ ...timeInputStyle, width: '120px' }}
            onFocus={e => e.target.style.borderColor = 'var(--cyan-dim)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
          <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>→</span>
          <input type="time" value={filters.time_to} onChange={e => setFilter('time_to', e.target.value)}
            style={{ ...timeInputStyle, width: '120px' }}
            onFocus={e => e.target.style.borderColor = 'var(--cyan-dim)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </div>

        <Btn variant={filters.available_only ? 'primary' : 'secondary'} size="sm"
          onClick={() => setFilter('available_only', !filters.available_only)}>
          {filters.available_only ? '✓ Available Only' : 'Available Only'}
        </Btn>

        {hasFilters && <Btn variant="ghost" size="sm" onClick={clearFilters}>✕ Clear</Btn>}
      </div>

      {/* ── Table ── */}
      <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}><Spinner size={24} /></div>
        ) : filtered.length === 0 ? (
          <Empty icon="⊡" text={hasFilters ? 'No slots match your filters' : 'No slots found'} />
        ) : (
          <Table columns={cols} rows={filtered} />
        )}
      </div>

      {/* Modals */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Slot" width={540}>
        {doctors.length === 0 || services.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--amber)', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
            ⚠ You need at least one doctor and one service before adding slots.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Btn
                size="sm"
                variant={addTab === 'single' ? 'primary' : 'secondary'}
                onClick={() => setAddTab('single')}
              >
                Single
              </Btn>
              <Btn
                size="sm"
                variant={addTab === 'recurring' ? 'primary' : 'secondary'}
                onClick={() => setAddTab('recurring')}
              >
                Weekly/Monthly
              </Btn>
            </div>

            {addTab === 'single' ? (
              <SlotForm key="single" doctors={doctors} services={services}
                doctorServices={doctorServices} serviceDoctors={serviceDoctors}
                onClose={() => setAddModal(false)} onRefresh={load} />
            ) : (
              <BulkSlotForm key="recurring" doctors={doctors} services={services}
                doctorServices={doctorServices} serviceDoctors={serviceDoctors}
                onClose={() => setAddModal(false)} onRefresh={load} />
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit Slot" width={460}>
        {editModal && (
          <SlotForm key={editModal.id} slot={editModal} doctors={doctors} services={services}
            doctorServices={doctorServices} serviceDoctors={serviceDoctors}
            onClose={() => setEditModal(null)} onRefresh={load} />
        )}
      </Modal>

      <Confirm
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        onConfirm={handleDelete}
        title="Delete Slot"
        message={confirmDel ? `Delete slot on ${confirmDel.slot_date} at ${confirmDel.slot_time} for ${confirmDel.doctor_name}?` : ''}
      />

      <Confirm
        open={confirmBulkDel}
        onClose={() => setConfirmBulkDel(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Slots"
        message={`Permanently delete ${selected.size} selected slot${selected.size !== 1 ? 's' : ''}? This cannot be undone.`}
      />
    </div>
  )
}


// ── Single Slot Form ──────────────────────────────────────────

function SlotForm({ slot, doctors, services, doctorServices, serviceDoctors, onClose, onRefresh }) {
  const [form, setForm] = useState({
    doctor_id:  slot?.doctor_id  || '',
    service_id: slot?.service_id || '',
    slot_date:  slot?.slot_date  || '',
    slot_time:  slot?.slot_time  || '09:00',
    available:  slot?.available  ?? 1,
  })
  const [saving, setSaving] = useState(false)

  const availableServices = useMemo(() => {
    if (!form.doctor_id) return services
    const allowed = new Set(doctorServices[form.doctor_id] || [])
    return services.filter(s => allowed.has(s.id))
  }, [form.doctor_id, services, doctorServices])

  const availableDoctors = useMemo(() => {
    if (!form.service_id) return doctors
    const allowed = new Set(serviceDoctors[form.service_id] || [])
    return doctors.filter(d => allowed.has(d.id))
  }, [form.service_id, doctors, serviceDoctors])

  function handleDoctorChange(e) {
    const doctorId = e.target.value
    const allowed  = new Set(doctorServices[doctorId] || [])
    setForm(f => ({ ...f, doctor_id: doctorId, service_id: allowed.has(f.service_id) ? f.service_id : '' }))
  }

  function handleServiceChange(e) {
    const serviceId = e.target.value
    const allowed   = new Set(serviceDoctors[serviceId] || [])
    setForm(f => ({ ...f, service_id: serviceId, doctor_id: allowed.has(f.doctor_id) ? f.doctor_id : '' }))
  }

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
          doctor_id: form.doctor_id, service_id: form.service_id,
          slot_date: form.slot_date, slot_time: form.slot_time,
        })
        showToast('Slot created', 'success')
      }
      onRefresh(); onClose()
    } catch (e) {
      // Show the duplicate error clearly
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Select label="Doctor" value={form.doctor_id} onChange={handleDoctorChange}
        options={[{ value: '', label: 'Select Doctor' },
          ...availableDoctors.map(d => ({ value: d.id, label: d.full_name }))]} />
      <Select label="Service" value={form.service_id} onChange={handleServiceChange}
        options={[{ value: '', label: 'Select Service' },
          ...availableServices.map(s => ({ value: s.id, label: s.name }))]} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Input label="Date" type="date" value={form.slot_date} onChange={e => setForm(f => ({ ...f, slot_date: e.target.value }))} />
        <Input label="Time" type="time" value={form.slot_time} onChange={e => setForm(f => ({ ...f, slot_time: e.target.value }))} />
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
        <Btn onClick={save} disabled={saving}>{saving ? <Spinner size={12} /> : slot ? 'Save Changes' : 'Create Slot'}</Btn>
      </div>
    </div>
  )
}


// ── Bulk Slot Form ────────────────────────────────────────────

function BulkSlotForm({ doctors, services, doctorServices, serviceDoctors, onClose, onRefresh }) {
  const [form, setForm] = useState({
    doctor_id: '', service_id: '', start_date: '', end_date: '',
    times: ['09:00'], days: [1, 2, 3, 4, 5], mode: 'weekly', monthly_days: [1],
  })
  const [preview, setPreview]   = useState([])
  const [saving, setSaving]     = useState(false)
  const [newTime, setNewTime]   = useState('10:00')
  const [saveResult, setSaveResult] = useState(null) // { created, skipped }

  const availableServices = useMemo(() => {
    if (!form.doctor_id) return services
    const allowed = new Set(doctorServices[form.doctor_id] || [])
    return services.filter(s => allowed.has(s.id))
  }, [form.doctor_id, services, doctorServices])

  const availableDoctors = useMemo(() => {
    if (!form.service_id) return doctors
    const allowed = new Set(serviceDoctors[form.service_id] || [])
    return doctors.filter(d => allowed.has(d.id))
  }, [form.service_id, doctors, serviceDoctors])

  function handleDoctorChange(e) {
    const doctorId = e.target.value
    const allowed  = new Set(doctorServices[doctorId] || [])
    setForm(f => ({ ...f, doctor_id: doctorId, service_id: allowed.has(f.service_id) ? f.service_id : '' }))
  }

  function handleServiceChange(e) {
    const serviceId = e.target.value
    const allowed   = new Set(serviceDoctors[serviceId] || [])
    setForm(f => ({ ...f, service_id: serviceId, doctor_id: allowed.has(f.doctor_id) ? f.doctor_id : '' }))
  }

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  function toggleDay(d)      { setForm(f => ({ ...f, days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d].sort() })) }
  function toggleMonthDay(d) { setForm(f => ({ ...f, monthly_days: f.monthly_days.includes(d) ? f.monthly_days.filter(x => x !== d) : [...f.monthly_days, d].sort((a,b)=>a-b) })) }
  function addTime()         { if (!newTime || form.times.includes(newTime)) return; setForm(f => ({ ...f, times: [...f.times, newTime].sort() })) }
  function removeTime(t)     { setForm(f => ({ ...f, times: f.times.filter(x => x !== t) })) }

  function generateSlots() {
    if (!form.start_date || !form.end_date || form.times.length === 0) return []
    if (form.mode === 'weekly' && form.days.length === 0) return []
    if (form.mode === 'monthly' && form.monthly_days.length === 0) return []
    const slots = []; const start = new Date(form.start_date); const end = new Date(form.end_date); const cursor = new Date(start)
    while (cursor <= end) {
      const include = form.mode === 'weekly' ? form.days.includes(cursor.getDay()) : form.monthly_days.includes(cursor.getDate())
      if (include) { for (const time of form.times) { slots.push({ date: cursor.toISOString().split('T')[0], time }) } }
      cursor.setDate(cursor.getDate() + 1)
    }
    return slots
  }

  useEffect(() => { setPreview(generateSlots()) }, [form.start_date, form.end_date, form.times, form.days, form.monthly_days, form.mode])

  async function save() {
    if (!form.doctor_id)         return showToast('Select a doctor', 'error')
    if (!form.service_id)        return showToast('Select a service', 'error')
    if (!form.start_date)        return showToast('Start date required', 'error')
    if (!form.end_date)          return showToast('End date required', 'error')
    if (form.times.length === 0) return showToast('Add at least one time', 'error')
    if (preview.length === 0)    return showToast('No slots in this range', 'error')
    if (preview.length > 200)    return showToast(`Too many slots (${preview.length}). Max 200.`, 'error')

    setSaving(true)
    let created = 0; let skipped = 0
    try {
      for (const s of preview) {
        try {
          await api.slots.create({
            doctor_id: form.doctor_id, service_id: form.service_id,
            slot_date: s.date, slot_time: s.time,
          })
          created++
        } catch {
          // duplicate — skip silently
          skipped++
        }
      }
      const msg = skipped > 0
        ? `${created} slots created, ${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped`
        : `${created} slots created`
      showToast(msg, 'success')
      onRefresh(); onClose()
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const lbl = txt => (
    <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>{txt}</div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Select label="Doctor" value={form.doctor_id} onChange={handleDoctorChange}
          options={[{ value: '', label: 'Select Doctor' }, ...availableDoctors.map(d => ({ value: d.id, label: d.full_name }))]} />
        <Select label="Service" value={form.service_id} onChange={handleServiceChange}
          options={[{ value: '', label: 'Select Service' }, ...availableServices.map(s => ({ value: s.id, label: s.name }))]} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <Input label="Start Date" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
        <Input label="End Date"   type="date" value={form.end_date}   onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
      </div>
      <div>
        {lbl('Recurrence Mode')}
        <div style={{ display: 'flex', gap: '8px' }}>
          {['weekly', 'monthly'].map(m => (
            <Btn key={m} size="sm" variant={form.mode === m ? 'primary' : 'secondary'} onClick={() => setForm(f => ({ ...f, mode: m }))}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </Btn>
          ))}
        </div>
      </div>
      {form.mode === 'weekly' && (
        <div>
          {lbl('Days of Week')}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {DAY_NAMES.map((name, idx) => (
              <button key={idx} onClick={() => toggleDay(idx)} style={{ padding: '5px 12px', borderRadius: 'var(--radius)', border: `1px solid ${form.days.includes(idx) ? 'var(--cyan)' : 'var(--border)'}`, background: form.days.includes(idx) ? 'rgba(0,212,255,0.12)' : 'var(--bg-3)', color: form.days.includes(idx) ? 'var(--cyan)' : 'var(--text-2)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}>{name}</button>
            ))}
          </div>
        </div>
      )}
      {form.mode === 'monthly' && (
        <div>
          {lbl('Days of Month')}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
              <button key={d} onClick={() => toggleMonthDay(d)} style={{ width: '36px', height: '32px', borderRadius: 'var(--radius)', border: `1px solid ${form.monthly_days.includes(d) ? 'var(--cyan)' : 'var(--border)'}`, background: form.monthly_days.includes(d) ? 'rgba(0,212,255,0.12)' : 'var(--bg-3)', color: form.monthly_days.includes(d) ? 'var(--cyan)' : 'var(--text-2)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font-mono)', transition: 'all 0.15s' }}>{d}</button>
            ))}
          </div>
        </div>
      )}
      <div>
        {lbl('Time Slots')}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
          <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} style={{ height: '34px', padding: '0 10px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-0)', fontSize: '13px', fontFamily: 'var(--font-mono)', outline: 'none' }} />
          <Btn size="sm" variant="secondary" onClick={addTime}>+ Add</Btn>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {form.times.map(t => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.2)', borderRadius: 'var(--radius)' }}>
              <span style={{ fontSize: '12px', color: 'var(--cyan)', fontFamily: 'var(--font-mono)' }}>{t}</span>
              <button onClick={() => removeTime(t)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
            </div>
          ))}
        </div>
      </div>
      {preview.length > 0 && (
        <div style={{ padding: '12px 14px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '12px' }}>
          <span style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)' }}>✓ {preview.length} slot{preview.length !== 1 ? 's' : ''} will be attempted — duplicates will be skipped automatically</span>
          <div style={{ marginTop: '6px', color: 'var(--text-3)', fontSize: '11px' }}>
            {preview.slice(0, 5).map((s, i) => <span key={i} style={{ marginRight: '12px' }}>{s.date} {s.time}</span>)}
            {preview.length > 5 && <span>+{preview.length - 5} more…</span>}
          </div>
        </div>
      )}
      {preview.length > 200 && <div style={{ color: 'var(--red)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>⚠ Too many slots ({preview.length}). Max 200.</div>}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save} disabled={saving || preview.length === 0 || preview.length > 200}>
          {saving ? <Spinner size={12} /> : `Create ${preview.length} Slots`}
        </Btn>
      </div>
    </div>
  )
}