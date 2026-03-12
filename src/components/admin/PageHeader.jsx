export function PageHeader({ title, sub, actions }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4px' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '24px', letterSpacing: '-0.02em', lineHeight: 1 }}>{title}</h1>
        {sub && <p style={{ color: 'var(--text-2)', fontSize: '12px', fontFamily: 'var(--font-mono)', marginTop: '6px' }}>{sub}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>{actions}</div>}
    </div>
  )
}
