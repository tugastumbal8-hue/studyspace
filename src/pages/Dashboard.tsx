import { useState } from 'react'
import { Link } from 'react-router-dom'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, loadDemo } from '../lib/db'
import { byDeadline, fmt, toMinutes, todayIndex } from '../lib/dates'
import { cssVars, useNow, usePageTitle } from '../lib/hooks'
import { Empty, PageHead, Ring } from '../components/Bits'
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
            text="Tambahkan mata kuliah dulu, lalu catat tugas, jadwal, dan catatan di satu tempat. Datamu tersimpan di perangkat ini."
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
  const pct = tasks.length ? (doneCount / tasks.length) * 100 : 0
  const upcoming = [...open].sort(byDeadline).slice(0, 5)

  const mins = now.getHours() * 60 + now.getMinutes()
  const today = slots
    .filter((s) => s.day === todayIndex(now))
    .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
  const nextId = today.find((s) => toMinutes(s.start) > mins)?.id

  return (
    <div className="page">
      <PageHead
        title={greeting(now.getHours())}
        subtitle={fmt(now, 'EEEE, d MMMM yyyy')}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} />
            Tugas baru
          </button>
        }
      />

      <section className="stats" aria-label="Ringkasan">
        <div className="stat glass">
          <span className="stat-n">{open.length}</span>
          <span className="stat-l">Tugas aktif</span>
        </div>
        <div className="stat glass">
          <span className="stat-n">{week.length}</span>
          <span className="stat-l">Deadline 7 hari ke depan</span>
        </div>
        <div className="stat glass" data-tone={late.length ? 'late' : undefined}>
          <span className="stat-n">{late.length}</span>
          <span className="stat-l">Terlambat</span>
        </div>
        <div className="stat glass" data-tone={doneCount ? 'ok' : undefined}>
          <span className="stat-n">{doneCount}</span>
          <span className="stat-l">Selesai</span>
        </div>
      </section>

      <div className="dash">
        <div>
          <section className="card glass" aria-labelledby="dash-deadline">
            <div className="card-head">
              <h2 className="card-title" id="dash-deadline">
                Deadline terdekat
              </h2>
              <Link to="/tugas">Semua tugas</Link>
            </div>
            {upcoming.length === 0 ? (
              <p className="empty-inline">Semua tugas sudah selesai. Waktunya istirahat.</p>
            ) : (
              <ul className="list">
                {upcoming.map((t) => (
                  <TaskRow key={t.id} task={t} course={byId.get(t.courseId)} now={now} compact />
                ))}
              </ul>
            )}
          </section>
        </div>

        <div>
          <section className="card glass" aria-labelledby="dash-today">
            <div className="card-head">
              <h2 className="card-title" id="dash-today">
                Kelas hari ini
              </h2>
              <Link to="/jadwal">Jadwal</Link>
            </div>
            {today.length === 0 ? (
              <p className="empty-inline">Tidak ada kelas hari ini.</p>
            ) : (
              <ul className="list">
                {today.map((s) => {
                  const course = byId.get(s.courseId)
                  const ongoing = toMinutes(s.start) <= mins && mins < toMinutes(s.end)
                  const finished = toMinutes(s.end) <= mins
                  return (
                    <li key={s.id} className="row" style={{ opacity: finished ? 0.55 : 1 }}>
                      <div className={`slot${ongoing ? ' is-now' : ''}`} style={cssVars({ '--c': course?.color ?? '#888' })}>
                        <span className="slot-time">
                          {s.start} – {s.end}
                          {ongoing && <span className="pill">Berlangsung</span>}
                          {s.id === nextId && <span className="pill pill-soft">Berikutnya</span>}
                        </span>
                        <span className="slot-name">{course?.name ?? 'Mata kuliah dihapus'}</span>
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

          <section className="card glass" aria-labelledby="dash-progress">
            <h2 className="card-title" id="dash-progress" style={{ marginBottom: 16 }}>
              Progres tugas
            </h2>
            <div className="overall">
              <Ring value={pct} />
              <dl>
                <div>
                  <dt>Selesai</dt>
                  <dd>
                    {doneCount} <span className="muted">dari {tasks.length}</span>
                  </dd>
                </div>
                <Link to="/progres">Lihat detail</Link>
              </dl>
            </div>
          </section>
        </div>
      </div>

      <TaskDialog open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}
