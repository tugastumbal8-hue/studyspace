import type { ReactNode } from 'react'
import { cssVars } from '../lib/hooks'
import type { Course } from '../lib/db'

export function CourseChip({ course }: { course?: Course }) {
  return (
    <span className="chip" style={cssVars({ '--c': course?.color ?? 'var(--ink-mute)' })}>
      <i />
      <span>{course?.name ?? 'Umum'}</span>
    </span>
  )
}

export function PageHead({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export function Empty({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="empty glass">
      <h2>{title}</h2>
      <p>{text}</p>
      {children && <div className="empty-actions">{children}</div>}
    </div>
  )
}

export function Ring({ value, size = 120, stroke = 12 }: { value: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${Math.round(pct)} persen selesai`}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        <circle
          className="ring-bar"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="ring-value">{Math.round(pct)}%</span>
    </div>
  )
}
