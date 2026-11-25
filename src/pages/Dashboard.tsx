import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addDays, differenceInCalendarDays, isSameDay, parseISO, startOfDay } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, loadDemo } from '../lib/db'
import { DAYS_SHORT, byDeadline, fmt, toMinutes, todayIndex } from '../lib/dates'
import { useNow, usePageTitle } from '../lib/hooks'
import { Empty } from '../components/Bits'
import { Icon } from '../components/Icon'
import { TaskRow } from '../components/TaskRow'
import { TaskDialog } from '../components/Forms'

function greeting(hour: number) {
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

export default function Dashboard() {
  usePageTitle('Beranda')
  const now = useNow()
  const courses = useLiveQuery(() => db.courses.toArray())
  const tasks = useLiveQuery(() => db.tasks.toArray())
  const slots = useLiveQuery(() => db.slots.toArray())
  const [adding, setAdding] = useState(false)

  if (!courses || !tasks || !slots) return null

  if (courses.length === 0 && tasks.length === 0) {
    return (
      <div className="page">
        <div className="onboard">
          <Empty
            title="Mulai atur semestermu"
            text="Tambahkan mata kuliah pertamamu, lalu catat tugas, jadwal kuliah, dan progres dalam satu dashboard."
          >
            <Link to="/matkul" className="btn btn-primary">
              <Icon name="plus" size={18} />
              Tambah mata kuliah
            </Link>
            <button type="button" className="btn" onClick={() => void loadDemo()}>
              Muat data contoh
            </button>
          </Empty>
        </div>
      </div>
    )
  }

  const byId = new Map(courses.map((c) => [c.id, c]))
  const open = tasks.filter((t) => !t.done)
  const late = open.filter((t) => parseISO(t.deadline) < now)
  const week = open.filter((t) => {
    const d = parseISO(t.deadline)
    return d >= now && differenceInCalendarDays(d, now) <= 7
  })
  const doneCount = tasks.length - open.length
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0
  const upcoming = [...open].sort(byDeadline).slice(0, 5)
  const firstUpcoming = upcoming[0]

  const mins = now.getHours() * 60 + now.getMinutes()
  const today = slots
    .filter((s) => s.day === todayIndex(now))
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
  const nextSlot = today.find((s) => toMinutes(s.start) > mins) || today[0]
  const nextId = nextSlot?.id

  // Nilai turunan read-only: data 7 hari ke depan untuk grafik
  const days7 = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(now), i))
  const counts7 = days7.map((d) => open.filter((t) => isSameDay(parseISO(t.deadline), d)).length)
  const max7 = Math.max(1, ...counts7)

  // Koordinat SVG line chart
  const svgWidth = 320
  const svgHeight = 90
  const points = counts7.map((cnt, i) => {
    const x = 20 + i * ((svgWidth - 40) / 6)
    const y = svgHeight - 16 - (cnt / max7) * 55
    return { x, y, count: cnt }
  })
  const mainCurvePath = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = points[i - 1]
    const cx1 = prev.x + (p.x - prev.x) / 2
    const cy1 = prev.y
    const cx2 = prev.x + (p.x - prev.x) / 2
    const cy2 = p.y
    return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p.x} ${p.y}`
  }, '')
  const areaPath = `${mainCurvePath} L ${points[points.length - 1].x} ${svgHeight} L ${points[0].x} ${svgHeight} Z`

  // Ring circumference
  const rRing = 28
  const cRing = 2 * Math.PI * rRing
  const ringOffset = cRing * (1 - pct / 100)

  let heroSummary = 'Semua tugas telah diselesaikan. Waktunya istirahat atau meninjau materi kuliah.'
  if (late.length > 0) {
    heroSummary = `Perhatian: Ada ${late.length} tugas yang telah melewati deadline. Selesaikan segera agar tidak menumpuk.`
  } else if (week.length > 0) {
    heroSummary = `Kamu memiliki ${open.length} tugas aktif, dengan ${week.length} deadline penting dalam 7 hari ke depan.`
  } else if (open.length > 0) {
    heroSummary = `Ada ${open.length} tugas yang sedang berjalan dengan batas waktu yang masih aman.`
  }

  return (
    <div className="page">
      {/* 1. HERO CARD BERSIH: Tanpa elemen melayang absolute */}
      <section className="hero-card" aria-label="Ringkasan utama">
        <div className="hero-body">
          <span className="hero-badge">
            <Icon name="calendar" size={14} />
            {fmt(now, 'EEEE, d MMMM yyyy')}
          </span>
          <h1 className="hero-title">{greeting(now.getHours())}</h1>
          <p className="hero-desc">{heroSummary}</p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
              <Icon name="plus" size={16} />
              Tugas baru
            </button>
            <Link to="/tugas" className="btn">
              Lihat semua tugas →
            </Link>
          </div>
        </div>

        {/* Informasi Ringkas Dalam Alur Kartu Biasa (Flow-based) */}
        <div className="hero-flow-info">
          <div className="hero-progress-row">
            <div className="hero-ring-mini" aria-hidden="true">
              <svg viewBox="0 0 64 64">
                <circle cx="32" cy="32" r={rRing} fill="none" stroke="var(--tint)" strokeWidth="6" />
                <circle
                  cx="32"
                  cy="32"
                  r={rRing}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="6"
                  strokeDasharray={cRing}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                />
              </svg>
              <span className="hero-ring-pct">{pct}%</span>
            </div>
            <div className="hero-summary-pills">
              <div className="hero-pill-item">
                <Icon name="clock" size={15} />
                <span>
                  Deadline terdekat: <strong>{firstUpcoming ? firstUpcoming.title : 'Semua tuntas'}</strong>
                </span>
              </div>
              <div className="hero-pill-item">
                <Icon name="calendar" size={15} />
                <span>
                  Kelas berikutnya:{' '}
                  <strong>{nextSlot ? byId.get(nextSlot.courseId)?.name || 'Kuliah' : 'Hari ini bebas'}</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATISTIK: Masing-masing dalam kartu kaca sendiri (4 Kartu) */}
      <section className="stats-grid" aria-label="Ringkasan statistik">
        <div className="stat-card">
          <span className="stat-l">Tugas aktif</span>
          <span className="stat-n">{open.length}</span>
        </div>

        <div className="stat-card">
          <span className="stat-l">7 Hari ke depan</span>
          <span className="stat-n">{week.length}</span>
        </div>

        <div className="stat-card" data-tone={late.length ? 'late' : undefined}>
          <span className="stat-l">Terlambat</span>
          <span className="stat-n">{late.length}</span>
        </div>

        <div className="stat-card" data-tone={doneCount ? 'ok' : undefined}>
          <span className="stat-l">Selesai</span>
          <span className="stat-n">{doneCount}</span>
        </div>
      </section>

      {/* 3. GRID UTAMA BERANDA: Kaca netral kontras tinggi */}
      <div className="dash-grid">
        {/* Kolom Kiri: Chart & Deadline Terdekat */}
        <div className="dash-left-col">
          {/* Chart Deadline Minggu Ini */}
          <section className="card" aria-labelledby="dash-chart">
            <div className="card-head">
              <div>
                <h2 className="card-title" id="dash-chart">
                  Deadline minggu ini
                </h2>
                <p className="muted">Distribusi tugas jatuh tempo dalam 7 hari ke depan</p>
              </div>
            </div>

            {week.length === 0 ? (
              <p className="chart-empty-msg">Belum ada deadline 7 hari ke depan.</p>
            ) : (
              <div className="chart-container">
                <div className="chart-svg-wrap">
                  <svg className="chart-svg" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
                    <line x1="20" y1="15" x2={svgWidth - 20} y2="15" className="chart-grid-line" />
                    <line x1="20" y1="45" x2={svgWidth - 20} y2="45" className="chart-grid-line" />
                    <line x1="20" y1="75" x2={svgWidth - 20} y2="75" className="chart-grid-line" />

                    <path d={areaPath} className="chart-area" />
                    <path d={mainCurvePath} className="chart-curve-main" />

                    <circle cx={points[0].x} cy={points[0].y} r="4.5" className="chart-point-active" />
                  </svg>
                </div>

                <div className="chart-labels-row">
                  {days7.map((d, i) => (
                    <span key={d.toISOString()} className={i === 0 ? 'chart-label-today' : undefined}>
                      {DAYS_SHORT[todayIndex(d)]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Daftar Deadline Terdekat */}
          <section className="card" aria-labelledby="dash-deadline">
            <div className="card-head">
              <h2 className="card-title" id="dash-deadline">
                Deadline terdekat
              </h2>
              <Link to="/tugas">Semua tugas →</Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="empty-inline">Semua tugas sudah selesai. Waktunya istirahat sejenak.</p>
            ) : (
              <ul className="list">
                {upcoming.map((t) => (
                  <TaskRow key={t.id} task={t} course={byId.get(t.courseId)} now={now} compact />
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Kolom Kanan: Kelas Hari Ini (Kaca Netral) & Progres */}
        <div className="dash-right-col">
          {/* Kelas Hari Ini: Kaca Netral Kontras Tinggi */}
          <section className="card" aria-labelledby="dash-today">
            <div className="card-head">
              <h2 className="card-title" id="dash-today">
                Kelas hari ini
              </h2>
              <Link to="/jadwal">Jadwal →</Link>
            </div>
            {today.length === 0 ? (
              <p className="empty-inline">Tidak ada jadwal kuliah untuk hari ini.</p>
            ) : (
              <ul className="list">
                {today.map((s) => {
                  const course = byId.get(s.courseId)
                  const ongoing = toMinutes(s.start) <= mins && mins < toMinutes(s.end)
                  return (
                    <li key={s.id} className="row">
                      <div className={`slot${ongoing ? ' is-now' : ''}`}>
                        <span className="slot-time">
                          {s.start} – {s.end}
                          {ongoing && <span className="pill">Berlangsung</span>}
                          {s.id === nextId && !ongoing && <span className="pill pill-soft">Berikutnya</span>}
                        </span>
                        <span className="slot-name">{course?.name ?? 'Mata kuliah'}</span>
                        {s.room && (
                          <span className="slot-meta">
                            <Icon name="pin" size={14} />
                            {s.room}
                          </span>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Progres Tugas */}
          <section className="card" aria-labelledby="dash-progress">
            <div className="card-head">
              <h2 className="card-title" id="dash-progress">
                Progres semester
              </h2>
              <Link to="/progres">Detail →</Link>
            </div>
            <div className="overall">
              <div className="ring" style={{ width: 90, height: 90 }}>
                <svg viewBox="0 0 90 90">
                  <circle cx="45" cy="45" r="36" fill="none" stroke="var(--tint)" strokeWidth="8" />
                  <circle
                    cx="45"
                    cy="45"
                    r="36"
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 36}
                    strokeDashoffset={2 * Math.PI * 36 * (1 - pct / 100)}
                    strokeLinecap="round"
                    transform="rotate(-90 45 45)"
                  />
                </svg>
                <span className="ring-value" style={{ fontSize: 20 }}>
                  {pct}%
                </span>
              </div>
              <dl>
                <div>
                  <dt>Tugas terselesaikan</dt>
                  <dd>
                    {doneCount} <span className="muted">/ {tasks.length}</span>
                  </dd>
                </div>
                <div>
                  <dt>Sisa tugas aktif</dt>
                  <dd style={{ fontSize: 16 }}>{open.length} tugas</dd>
                </div>
              </dl>
            </div>
          </section>
        </div>
      </div>

      <TaskDialog open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}
