import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type ClassSlot } from '../lib/db'
import { DAYS, toMinutes, todayIndex } from '../lib/dates'
import { cssVars, useNow, usePageTitle } from '../lib/hooks'
import { Empty, PageHead } from '../components/Bits'
import { ConfirmDialog } from '../components/Dialog'
import { Icon } from '../components/Icon'
import { SlotDialog } from '../components/Forms'

export default function Schedule() {
  usePageTitle('Jadwal')
  const now = useNow()
  const slots = useLiveQuery(() => db.slots.toArray())
  const courses = useLiveQuery(() => db.courses.toArray())
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ClassSlot | null>(null)
  const [deleting, setDeleting] = useState<ClassSlot | null>(null)

  if (!slots || !courses) return null

  const byId = new Map(courses.map((c) => [c.id, c]))
  const today = todayIndex(now)
  const mins = now.getHours() * 60 + now.getMinutes()

  return (
    <div className="page">
      <PageHead
        title="Jadwal kuliah"
        subtitle="Jadwal mingguan, kelas yang sedang berlangsung ditandai."
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} />
            Kelas baru
          </button>
        }
      />

      {slots.length === 0 ? (
        <Empty title="Jadwal masih kosong" text="Tambahkan kelas beserta hari, jam, dan ruangnya.">
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} />
            Kelas baru
          </button>
        </Empty>
      ) : (
        <div className="week">
          {DAYS.map((name, day) => {
            const daySlots = slots.filter((s) => s.day === day).sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
            return (
              <section key={name} className={`day glass${day === today ? ' is-today' : ''}`} aria-label={name}>
                <div className="day-head">
                  <h2>{name}</h2>
                  {day === today && <span className="pill">Hari ini</span>}
                </div>
                {daySlots.length === 0 ? (
                  <p className="muted">Tidak ada kelas</p>
                ) : (
                  daySlots.map((s) => {
                    const course = byId.get(s.courseId)
                    const ongoing = day === today && toMinutes(s.start) <= mins && mins < toMinutes(s.end)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        className={`slot${ongoing ? ' is-now' : ''}`}
                        style={cssVars({ '--c': course?.color ?? '#888' })}
                        onClick={() => setEditing(s)}
                        aria-label={`Ubah kelas ${course?.name ?? ''} ${s.start} sampai ${s.end}`}
                      >
                        <span className="slot-time">
                          {s.start} – {s.end}
                          {ongoing && <span className="pill">Berlangsung</span>}
                        </span>
                        <span className="slot-name">{course?.name ?? 'Mata kuliah dihapus'}</span>
                        {s.room && (
                          <span className="slot-meta">
                            <Icon name="pin" size={14} />
                            {s.room}
                          </span>
                        )}
                        {course?.lecturer && <span className="slot-meta">{course.lecturer}</span>}
                      </button>
                    )
                  })
                )}
              </section>
            )
          })}
        </div>
      )}

      <SlotDialog
        open={adding || editing !== null}
        slot={editing}
        onClose={() => {
          setAdding(false)
          setEditing(null)
        }}
        onDelete={(s) => {
          setEditing(null)
          setDeleting(s)
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Hapus kelas?"
        message="Kelas ini akan dihapus dari jadwal mingguan."
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await db.slots.delete(deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}
