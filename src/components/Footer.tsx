interface Props { papersCount: number }

export default function Footer({ papersCount }: Props) {
  return (
    <footer className="border-t border-slate-800 mt-16 py-8">
      <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <div>
          {papersCount} papers · Space Resource Technologies · Auto-updated weekly via Semantic Scholar
        </div>
        <a
          href="https://github.com/canduki21/SRT-DATABASE/actions"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-300 transition-colors"
        >
          View workflow runs →
        </a>
      </div>
    </footer>
  )
}
