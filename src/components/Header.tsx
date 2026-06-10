export default function Header() {
  return (
    <header style={{ background: 'var(--color-bg-dim)', borderBottom: '1px solid var(--color-border)' }}>
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src="https://spaceresourcetech.com/cdn/shop/files/SRT_Abbreviation_and_Logo_100x.png"
            alt="Space Resource Technologies"
            className="h-16 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          <div>
            <div style={{ color: 'var(--color-text)', fontWeight: 700, fontSize: '1.4rem', letterSpacing: '0.03em' }}>
              SPACE RESOURCE TECHNOLOGIES
            </div>
            <div style={{ color: 'var(--color-accent)', fontSize: '0.85rem', letterSpacing: '0.15em', fontWeight: 600, textTransform: 'uppercase' }}>
              Research Publication Database
            </div>
          </div>
        </div>

        <a
          href="https://spaceresourcetech.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--color-muted)', fontSize: '0.8rem', letterSpacing: '0.05em' }}
          className="hover:text-white transition-colors hidden sm:block"
        >
          spaceresourcetech.com
        </a>
      </div>
    </header>
  )
}
