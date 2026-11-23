import { Link } from 'react-router-dom'
import { addDays, differenceInCalendarDays, isSameDay, parseISO, startOfDay } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { DAYS_SHORT, byDeadline, fmt, isLate, todayIndex } from '../lib/dates'
import { cssVars, useNow, usePageTitle } from '../lib/hooks'
import { useStore } from '../lib/localStore'
import { semesterStore } from '../lib/semester'
import { Empty, PageHead, Ring } from '../components/Bits'

export default function Progress() {
  usePageTitle('Progres')
  const now = useNow()
  const courses = useLiveQuery(() => db.courses.orderBy('name').toArray())
  const tasks = useLiveQuery(() => db.tasks.toArray())
  const sem = useStore(semesterStore)

  if (!courses || !tasks) return null

  if (courses.length === 0) {
    return (
      <div className="page">
        <PageHead title="Progres semester" />
        <Empty title="Belum ada data" text="Progres dihitung dari tugas per mata kuliah. Tambahkan mata kuliah dan tugas dulu.">
          <Link to="/matkul" className="btn btn-primary">
            Tambah mata kuliah
          </Link>
        </Empty>
      </div>
    )
  }

  const open = tasks.filter((t) => !t.done)
  const doneCount = tasks.length - open.length
  const pct = tasks.length ? (doneCount / tasks.length) * 100 : 0
  const lateCount = tasks.filter((t) => isLate(t, now)).length

  const rows = courses.map((c) => {
    const mine = tasks.filter((t) => t.courseId === c.id)
    const done = mine.filter((t) => t.done).length
    return {
      course: c,
      total: mine.length,
      done,
      late: mine.filter((t) => isLate(t, now)).length,
      pct: mine.length ? (done / mine.length) * 100 : 0,
      next: mine.filter((t) => !t.done).sort(byDeadline)[0],
    }
  })

  const days = Array.from({ length: 7 }, (_, i) => addDays(startOfDay(now), i))
  const counts = days.map((d) => open.filter((t) => isSameDay(parseISO(t.deadline), d)).length)
  const max = Math.max(1, ...counts)

  const hasSemester = sem.start && sem.end && sem.end > sem.start
  let semPct = 0
  let semWeek = 0
  let semWeeks = 0
  if (hasSemester) {
    const total = differenceInCalendarDays(parseISO(sem.end), parseISO(sem.start))
    const elapsed = Math.max(0, Math.min(total, differenceInCalendarDays(now, parseISO(sem.start))))
    semPct = (elapsed / total) * 100
    semWeek = Math.floor(elapsed / 7) + 1
    semWeeks = Math.ceil(total / 7)
  }

  return (
    <div className="page">
      <PageHead title="Progres semester" subtitle="Dihitung dari tugas yang sudah selesai." />

      <div className="progress-grid">
        <section className="card glass" aria-labelledby="pg-overall">
          <h2 className="card-title" id="pg-overall" style={{ marginBottom: 16 }}>
            Keseluruhan
          </h2>
          <div className="overall">
            <Ring value={pct} size={112} />
            <dl>
              <div>
                <dt>Selesai</dt>
                <dd>
                  {doneCount} <span className="muted">/ {tasks.length}</span>
                </dd>
              </div>
              <div>
                <dt>Terlambat</dt>
                <dd style={{ color: lateCount ? 'var(--danger)' : undefined }}>{lateCount}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="card glass" aria-labelledby="pg-sem">
          <h2 className="card-title" id="pg-sem" style={{ marginBottom: 16 }}>
            Waktu semester
          </h2>
          {hasSemester ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <p>
                <strong style={{ fontFamily: 'var(--font-display)', fontSize: 28 }}>Minggu {semWeek}</strong>{' '}
                <span className="muted">dari {semWeeks}</span>
              </p>
              <div className="bar" role="img" aria-label={`${Math.round(semPct)} persen semester berlalu`}>
                <i style={cssVars({ '--w': `${semPct}%`, '--c': 'var(--accent)' })} />
              </div>
              <p className="muted">
                {fmt(sem.start, 'd MMM')} – {fmt(sem.end, 'd MMM yyyy')}
              </p>
            </div>
          ) : (
            <p className="muted">
              Atur tanggal mulai dan akhir semester di <Link to="/pengaturan">Pengaturan</Link> untuk melihat posisimu.
            </p>
          )}
        </section>

        <section className="card glass" aria-labelledby="pg-load">
          <h2 className="card-title" id="pg-load" style={{ marginBottom: 16 }}>
            Deadline 7 hari ke depan
          </h2>
          <ul className="workload">
            {days.map((d, i) => (
              <li key={d.toISOString()} className={i === 0 ? 'is-today' : undefined}>
                <span>{counts[i]}</span>
                <span className="wl-track">
                  <span className="wl-bar" style={cssVars({ '--h': `${(counts[i] / max) * 100}%` })} />
                </span>
                <span>{DAYS_SHORT[todayIndex(d)]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card glass" aria-labelledby="pg-course">
        <h2 className="card-title" id="pg-course" style={{ marginBottom: 8 }}>
          Per mata kuliah
        </h2>
        {rows.map(({ course, total, done, late, pct: p, next }) => (
          <div key={course.id} className="course-progress">
            <div className="course-progress-head">
              <span className="chip" style={cssVars({ '--c': course.color })}>
                <i />
                <span>{course.name}</span>
              </span>
              <strong>{Math.round(p)}%</strong>
            </div>
            <div className="bar" role="img" aria-label={`${course.name}: ${done} dari ${total} tugas selesai`}>
              <i style={cssVars({ '--w': `${p}%`, '--c': course.color })} />
            </div>
            <p className="muted">
              {total === 0 ? 'Belum ada tugas' : `${done} dari ${total} tugas selesai`}
              {late > 0 && <span style={{ color: 'var(--danger)', fontWeight: 600 }}> · {late} terlambat</span>}
              {next && ` · berikutnya: ${next.title}`}
            </p>
          </div>
        ))}
      </section>
    </div>
  )
}
