interface Props { papersCount: number }

export default function Footer({ papersCount }: Props) {
  return (
    <footer style={{ borderTop: '1px solid var(--color-border)', marginTop: '4rem' }}>
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="text-xs" style={{ color: 'var(--color-muted)' }}>
          <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{papersCount}</span> publications ·{' '}
          <a href="https://spaceresourcetech.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
            spaceresourcetech.com
          </a>{' '}
          · Auto-updated weekly via Semantic Scholar
        </div>
      </div>
    </footer>
  )
}
