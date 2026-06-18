export default function Header() {
  return (
    <header style={{ background: 'var(--color-bg-dim)', borderBottom: '1px solid var(--color-border)' }}>
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: '1.4rem', letterSpacing: '0.03em' }}>
          SPACE RESOURCE TECHNOLOGIES
        </div>
        <div style={{ color: 'var(--color-accent)', fontSize: '0.85rem', letterSpacing: '0.15em', fontWeight: 600, textTransform: 'uppercase' }}>
          Research Publication Database
        </div>
      </div>
    </header>
  )
}
