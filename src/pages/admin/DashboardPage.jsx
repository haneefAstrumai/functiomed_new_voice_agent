import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'
import { api } from '../../lib/api'
import { StatCard, Card, Badge, Spinner } from '../../components/ui'
import { PageHeader } from '../../components/admin/PageHeader'

function useData() {
  const [data, setData] = useState({ bookings: [], services: [], doctors: [], slots: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.bookings.list().catch(() => ({ bookings: [] })),
      api.services.list().catch(() => ({ services: [] })),
      api.doctors.list().catch(() => ({ doctors: [] })),
      api.slots.list().catch(() => ({ slots: [] })),
    ]).then(([b, s, d, sl]) => {
      setData({
        bookings: b.bookings || [],
        services: s.services || [],
        doctors: d.doctors || [],
        slots: sl.slots || [],
      })
    }).finally(() => setLoading(false))
  }, [])

  return { data, loading }
}

const CHART_COLORS = ['#00d4ff', '#00ffcc', '#ffb800', '#ff4466', '#7c3aed']

export default function DashboardPage() {
  const { data, loading } = useData()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <Spinner size={32} />
    </div>
  )

  const { bookings, services, doctors, slots } = data
  const confirmed = bookings.filter(b => b.status === 'confirmed').length
  const cancelled = bookings.filter(b => b.status === 'cancelled').length
  const available = slots.filter(s => s.available).length

  // Bookings by doctor
  const byDoctor = doctors.map(d => ({
    name: d.full_name.replace('Dr. ', '').split(' ')[0],
    bookings: bookings.filter(b => b.doctor_name === d.full_name).length,
  })).filter(d => d.bookings > 0)

  // Bookings by service
  const byService = services.map(s => ({
    name: s.name.length > 12 ? s.name.slice(0, 12) + '…' : s.name,
    bookings: bookings.filter(b => b.service_name === s.name).length,
  })).filter(s => s.bookings > 0)

  // Status pie
  const statusData = [
    { name: 'Confirmed', value: confirmed },
    { name: 'Cancelled', value: cancelled },
  ].filter(d => d.value > 0)

  // Bookings by date (last 14 days)
  const dateMap = {}
  bookings.forEach(b => {
    const d = (b.booked_at || '').slice(0, 10)
    if (d) dateMap[d] = (dateMap[d] || 0) + 1
  })
  const timelineData = Object.entries(dateMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([date, count]) => ({ date: date.slice(5), count }))

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div style={{ background: 'var(--bg-3)', border: '1px solid var(--border-bright)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-2)', marginBottom: '4px' }}>{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: p.color }}>{p.value}</div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px' }} className="fade-in">
      <PageHeader title="Dashboard" sub="Clinic overview and analytics" />

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        <StatCard label="Total Bookings" value={bookings.length} sub="All time" accent="cyan" />
        <StatCard label="Confirmed" value={confirmed} sub={`${bookings.length ? Math.round(confirmed/bookings.length*100) : 0}% success rate`} accent="green" />
        <StatCard label="Available Slots" value={available} sub={`of ${slots.length} total`} accent="amber" />
        <StatCard label="Active Doctors" value={doctors.filter(d => d.active).length} sub={`${services.length} services`} accent="cyan" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Bookings over time */}
        <Card style={{ padding: '20px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Booking Activity</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '20px' }}>Recent booking timeline</p>
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={timelineData}>
                <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={customTooltip} />
                <Line type="monotone" dataKey="count" stroke="var(--cyan)" strokeWidth={2} dot={{ fill: 'var(--cyan)', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
              No booking data yet
            </div>
          )}
        </Card>

        {/* Bookings by doctor */}
        <Card style={{ padding: '20px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>By Doctor</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '20px' }}>Bookings per practitioner</p>
          {byDoctor.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byDoctor} barSize={28}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} width={24} />
                <Tooltip content={customTooltip} />
                <Bar dataKey="bookings" fill="var(--teal)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
              No bookings yet
            </div>
          )}
        </Card>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* By service */}
        <Card style={{ padding: '20px' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>By Service</h3>
          <p style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: '20px' }}>Bookings per service</p>
          {byService.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={byService} barSize={22} layout="vertical">
                <XAxis type="number" tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-2)', fontSize: 10, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={customTooltip} />
                <Bar dataKey="bookings" fill="var(--amber)" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>No bookings yet</div>
          )}
        </Card>

        {/* Status + Recent */}
        <Card style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Recent Bookings</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>Last 5 appointments</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bookings.slice(0, 5).map((b, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-3)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>{b.patient_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{b.service_name} · {b.doctor_name?.replace('Dr. ', '')}</div>
                </div>
                <Badge variant={b.status === 'confirmed' ? 'success' : b.status === 'cancelled' ? 'danger' : 'neutral'}>
                  {b.status}
                </Badge>
              </div>
            ))}
            {bookings.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: '12px', padding: '24px' }}>No bookings yet</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
