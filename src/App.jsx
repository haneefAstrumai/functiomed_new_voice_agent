import { Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom'
import { Toaster } from './components/ui'
import ChatPage from './pages/ChatPage'
import DashboardPage from './pages/admin/DashboardPage'
import BookingsPage from './pages/admin/BookingsPage'
import DoctorsPage from './pages/admin/DoctorsPage'
import ServicesPage from './pages/admin/ServicesPage'
import SlotsPage from './pages/admin/SlotsPage'
import PdfsPage from './pages/admin/PdfsPage'
// 
const NAV = [
  { to: '/chat', icon: '◉', label: 'Voice Agent' },
]

const ADMIN_NAV = [
  { to: '/admin', icon: '▦', label: 'Dashboard', end: true },
  { to: '/admin/bookings', icon: '⊞', label: 'Bookings' },
  { to: '/admin/doctors', icon: '⊕', label: 'Doctors' },
  { to: '/admin/services', icon: '◈', label: 'Services' },
  { to: '/admin/slots', icon: '⊡', label: 'Slots' },
  { to: '/admin/pdfs', icon: '⊟', label: 'Documents' },
]

export default function App() {
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  const isChat = location.pathname.startsWith('/chat')

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar isAdmin={isAdmin} />
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/bookings" element={<BookingsPage />} />
          <Route path="/admin/doctors" element={<DoctorsPage />} />
          <Route path="/admin/services" element={<ServicesPage />} />
          <Route path="/admin/slots" element={<SlotsPage />} />
          <Route path="/admin/pdfs" element={<PdfsPage />} />
        </Routes>
      </main>
      <Toaster />
    </div>
  )
}

function Sidebar({ isAdmin }) {
  return (
    <aside style={{
      width: '220px', minWidth: '220px',
      background: 'var(--bg-1)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: '0',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Scanline effect */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.015) 2px, rgba(0,212,255,0.015) 4px)',
        zIndex: 0,
      }} />

      {/* Logo */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid var(--border)',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2px' }}>
          <div style={{
            width: '28px', height: '28px', background: 'var(--cyan)',
            borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 800, color: '#060a0f', fontFamily: 'var(--font-display)',
          }}>F</div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '16px', color: 'var(--text-0)' }}>
            Functiomed
          </span>
        </div>
        <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)', letterSpacing: '0.12em', textTransform: 'uppercase', paddingLeft: '38px' }}>
          Medical Platform
        </span>
      </div>

      <nav style={{ flex: 1, padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative', zIndex: 1 }}>

        {/* Chat section */}
        <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '8px 10px 6px' }}>
          Agent
        </div>
        {NAV.map(item => (
          <SidebarLink key={item.to} {...item} />
        ))}

        <div style={{ height: '1px', background: 'var(--border)', margin: '12px 0' }} />

        {/* Admin section */}
        <div style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)', letterSpacing: '0.15em', textTransform: 'uppercase', padding: '8px 10px 6px' }}>
          Admin
        </div>
        {ADMIN_NAV.map(item => (
          <SidebarLink key={item.to} {...item} />
        ))}
      </nav>

      {/* System status */}
      <div style={{
        padding: '14px 20px', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '8px',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: 'var(--green)', boxShadow: '0 0 6px var(--green)',
          animation: 'pulse 2s ease-in-out infinite',
        }} />
        <span style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)' }}>
          System Online
        </span>
      </div>
    </aside>
  )
}

function SidebarLink({ to, icon, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '8px 10px', borderRadius: 'var(--radius)',
        textDecoration: 'none', transition: 'all 0.15s',
        background: isActive ? 'rgba(0,212,255,0.08)' : 'transparent',
        color: isActive ? 'var(--cyan)' : 'var(--text-2)',
        borderLeft: isActive ? '2px solid var(--cyan)' : '2px solid transparent',
        fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: isActive ? 500 : 400,
      })}
      onMouseEnter={e => {
        if (!e.currentTarget.style.color.includes('255')) {
          e.currentTarget.style.color = 'var(--text-0)'
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        }
      }}
      onMouseLeave={e => {
        if (!e.currentTarget.style.color.includes('255')) {
          e.currentTarget.style.color = 'var(--text-2)'
          e.currentTarget.style.background = ''
        }
      }}
    >
      <span style={{ fontSize: '14px', width: '18px', textAlign: 'center' }}>{icon}</span>
      {label}
    </NavLink>
  )
}