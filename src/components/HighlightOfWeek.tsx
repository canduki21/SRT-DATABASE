import { useMemo } from 'react';
import type { Paper } from '../types';

interface Props {
  papers: Paper[];
}

const CATEGORY_COLORS: Record<string, string> = {
  lunar:   '#3b82f6',
  martian: '#ef4444',
  asteroid:'#f97316',
  multi:   '#8b5cf6',
  general: '#6b7280',
};

export default function HighlightOfWeek({ papers }: Props) {
  const paper = useMemo(() => {
    if (!papers.length) return null;
    // Same paper all week, rotates every 7 days automatically
    const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    return papers[weekNum % papers.length];
  }, [papers]);

  if (!paper) return null;

  const color = CATEGORY_COLORS[paper.category] ?? CATEGORY_COLORS.general;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a2535 0%, #001219 100%)',
      border: `1px solid ${color}55`,
      borderRadius: '12px',
      padding: '24px 28px',
      marginBottom: '28px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Top accent bar */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '3px',
        background: `linear-gradient(90deg, ${color}, ${color}44)`,
      }} />

      {/* Label */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '7px',
        marginBottom: '14px',
      }}>
        <span style={{ fontSize: '16px' }}>⭐</span>
        <span style={{
          color: color,
          fontWeight: 700,
          fontSize: '11px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}>
          Paper of the Week
        </span>
      </div>

      {/* Title */}
      <h2 style={{
        color: '#e8edf2',
        fontSize: '17px',
        fontWeight: 700,
        lineHeight: 1.45,
        margin: '0 0 10px',
      }}>
        <a
          href={paper.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = color; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#e8edf2'; }}
        >
          {paper.title ?? 'Untitled'}
        </a>
      </h2>

      {/* Authors + year */}
      <p style={{ color: '#7a9bb5', fontSize: '13px', margin: '0 0 16px' }}>
        {paper.authors ?? 'Unknown authors'}
        {paper.year ? ` · ${paper.year}` : ''}
      </p>

      {/* Badges + link */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        <span style={{
          background: `${color}22`,
          color: color,
          border: `1px solid ${color}44`,
          borderRadius: '999px',
          padding: '3px 11px',
          fontSize: '12px',
          fontWeight: 600,
          textTransform: 'capitalize',
        }}>
          {paper.category}
        </span>

        {paper.simulants?.map(s => (
          <span key={s} style={{
            background: '#112233',
            color: '#7a9bb5',
            border: '1px solid #1e3a4f',
            borderRadius: '999px',
            padding: '3px 11px',
            fontSize: '12px',
          }}>
            {s}
          </span>
        ))}

        <a
          href={paper.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginLeft: 'auto',
            color: color,
            fontSize: '13px',
            fontWeight: 700,
            textDecoration: 'none',
            letterSpacing: '0.02em',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.75'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1'; }}
        >
          Read paper →
        </a>
      </div>
    </div>
  );
}
