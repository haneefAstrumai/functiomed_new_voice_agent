import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

// ── Badge ─────────────────────────────────────────────────────
export function Badge({ children, variant = 'default' }) {
  const styles = {
    default: { background: 'rgba(0,212,255,0.1)', color: 'var(--cyan)', border: '1px solid rgba(0,212,255,0.25)' },
    success: { background: 'rgba(0,232,122,0.1)', color: 'var(--green)', border: '1px solid rgba(0,232,122,0.25)' },
    warning: { background: 'rgba(255,184,0,0.1)', color: 'var(--amber)', border: '1px solid rgba(255,184,0,0.25)' },
    danger:  { background: 'rgba(255,68,102,0.1)', color: 'var(--red)',   border: '1px solid rgba(255,68,102,0.25)' },
    neutral: { background: 'rgba(255,255,255,0.05)', color: 'var(--text-2)', border: '1px solid var(--border)' },
  }
  return (
    <span style={{
      ...styles[variant],
      padding: '2px 8px', borderRadius: '4px',
      fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 500,
      letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

// ── Button ────────────────────────────────────────────────────
export function Btn({ children, variant = 'primary', size = 'md', onClick, disabled, type = 'button', style }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    border: 'none', borderRadius: 'var(--radius)', cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font-body)', fontWeight: 500, transition: 'all 0.15s',
    opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap',
  }
  const sizes   = { sm: { padding: '5px 12px', fontSize: '12px' }, md: { padding: '8px 16px', fontSize: '13px' }, lg: { padding: '10px 20px', fontSize: '14px' } }
  const variants = {
    primary:   { background: 'var(--cyan)',              color: '#060a0f',        boxShadow: '0 0 20px rgba(0,212,255,0.2)' },
    secondary: { background: 'var(--bg-4)',              color: 'var(--text-1)',  border: '1px solid var(--border-bright)' },
    danger:    { background: 'rgba(255,68,102,0.15)',    color: 'var(--red)',     border: '1px solid rgba(255,68,102,0.3)' },
    ghost:     { background: 'transparent',              color: 'var(--text-2)', border: '1px solid transparent' },
    success:   { background: 'rgba(0,232,122,0.15)',     color: 'var(--green)',   border: '1px solid rgba(0,232,122,0.3)' },
    warning:   { background: 'rgba(255,184,0,0.15)',     color: 'var(--amber)',   border: '1px solid rgba(255,184,0,0.3)' },
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.filter = 'brightness(1.15)')}
      onMouseLeave={e => (e.currentTarget.style.filter = '')}
    >{children}</button>
  )
}

// ── Input ─────────────────────────────────────────────────────
export function Input({ label, value, onChange, placeholder, type = 'text', required, style, readOnly }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', ...style }}>
      {label && <label style={{ fontSize: '11px', color: 'var(--text-2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</label>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        required={required} readOnly={readOnly}
        style={{
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '8px 12px',
          color: 'var(--text-0)', fontFamily: 'var(--font-body)', fontSize: '13px',
          outline: 'none', transition: 'border-color 0.15s', width: '100%',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--cyan-dim)')}
        onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
      />
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────────
export function Textarea({ label, value, onChange, placeholder, rows = 3, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', ...style }}>
      {label && <label style={{ fontSize: '11px', color: 'var(--text-2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</label>}
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        style={{
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '8px 12px',
          color: 'var(--text-0)', fontFamily: 'var(--font-body)', fontSize: '13px',
          outline: 'none', transition: 'border-color 0.15s', resize: 'vertical', width: '100%',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--cyan-dim)')}
        onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
      />
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────
export function Select({ label, value, onChange, options, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', ...style }}>
      {label && <label style={{ fontSize: '11px', color: 'var(--text-2)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</label>}
      <select value={value} onChange={onChange}
        style={{
          background: 'var(--bg-2)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '8px 12px',
          color: 'var(--text-0)', fontFamily: 'var(--font-body)', fontSize: '13px',
          outline: 'none', width: '100%', cursor: 'pointer',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--cyan-dim)')}
        onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
      >
        {(options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────
export function Card({ children, style, onClick, hover }) {
  return (
    <div onClick={onClick} style={{
        background: 'var(--bg-2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '20px',
        transition: 'all 0.2s', cursor: onClick ? 'pointer' : 'default', ...style,
      }}
      onMouseEnter={hover ? e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.boxShadow = 'var(--shadow-glow)' } : undefined}
      onMouseLeave={hover ? e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' } : undefined}
    >{children}</div>
  )
}

// ── Modal — uses React Portal so it always renders at document.body ──
export function Modal({ open, onClose, title, children, width = 500 }) {
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        background: 'rgba(6,10,15,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99999, padding: '20px',
      }}
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#0f1929', border: '1px solid #2a4060',
        borderRadius: '10px', width: '100%', maxWidth: width,
        maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e3048', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '16px', color: '#e8f4ff' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#6a8da8', cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
        {/* Body */}
        <div style={{ padding: '24px', color: '#e8f4ff' }}>{children}</div>
      </div>
    </div>,
    document.body
  )
}

// ── Toast ─────────────────────────────────────────────────────
let toastId = 0
const listeners = new Set()
export function showToast(msg, type = 'success') {
  const id = ++toastId
  listeners.forEach(fn => fn({ id, msg, type }))
}

export function Toaster() {
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    const fn = (t) => {
      setToasts(prev => [...prev, t])
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 3000)
    }
    listeners.add(fn)
    return () => listeners.delete(fn)
  }, [])
  const colors = { success: 'var(--green)', error: 'var(--red)', info: 'var(--cyan)' }
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 999999 }}>
      {toasts.map(t => (
        <div key={t.id} className="fade-in" style={{
          background: '#152236', border: `1px solid ${colors[t.type] || colors.info}`,
          borderRadius: 'var(--radius)', padding: '10px 16px',
          fontFamily: 'var(--font-mono)', fontSize: '12px', color: colors[t.type] || colors.info,
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)', minWidth: '240px',
        }}>{t.msg}</div>
      ))}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 16 }) {
  return (
    <div style={{
      width: size, height: size,
      border: `2px solid var(--border)`, borderTopColor: 'var(--cyan)',
      borderRadius: '50%', animation: 'spin 0.7s linear infinite',
    }} />
  )
}

// ── Empty state ───────────────────────────────────────────────
export function Empty({ icon, text }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px', color: 'var(--text-3)', gap: '12px' }}>
      <span style={{ fontSize: '32px' }}>{icon}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{text}</span>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────
export function StatCard({ label, value, sub, accent = 'cyan' }) {
  const colors = { cyan: 'var(--cyan)', green: 'var(--green)', amber: 'var(--amber)', red: 'var(--red)' }
  return (
    <Card style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <span style={{ fontSize: '28px', fontFamily: 'var(--font-display)', fontWeight: 800, color: colors[accent] || colors.cyan, lineHeight: 1 }}>{value}</span>
      {sub && <span style={{ fontSize: '11px', color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{sub}</span>}
    </Card>
  )
}

// ── Table ─────────────────────────────────────────────────────
export function Table({ columns, rows, onRowClick }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {columns.map(col => (
              <th key={col.key} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500, whiteSpace: 'nowrap' }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} onClick={() => onRowClick?.(row)}
              style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s', cursor: onRowClick ? 'pointer' : 'default' }}
              onMouseEnter={e => onRowClick && (e.currentTarget.style.background = 'var(--bg-3)')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              {columns.map(col => (
                <td key={col.key} style={{ padding: '11px 12px', color: 'var(--text-1)', fontFamily: col.mono ? 'var(--font-mono)' : 'var(--font-body)', fontSize: col.mono ? '12px' : '13px', whiteSpace: col.nowrap ? 'nowrap' : undefined }}>
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Confirm dialog ────────────────────────────────────────────
export function Confirm({ open, onClose, onConfirm, title, message }) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={400}>
      <p style={{ color: '#a8c4dc', marginBottom: '24px', lineHeight: 1.7 }}>{message}</p>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn variant="danger" onClick={onConfirm}>Confirm</Btn>
      </div>
    </Modal>
  )
}

// ── Search input ──────────────────────────────────────────────
export function SearchInput({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <span style={{ position: 'absolute', left: '10px', color: 'var(--text-3)', fontSize: '14px' }}>⌕</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{
          background: 'var(--bg-3)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '7px 12px 7px 30px',
          color: 'var(--text-0)', fontSize: '13px', fontFamily: 'var(--font-body)',
          outline: 'none', width: '220px', transition: 'border-color 0.15s',
        }}
        onFocus={e => (e.target.style.borderColor = 'var(--cyan-dim)')}
        onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
      />
    </div>
  )
}