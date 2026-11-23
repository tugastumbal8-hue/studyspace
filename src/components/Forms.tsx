import { useState, type FormEvent } from 'react'
import { addDays, format } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import {
  COURSE_COLORS,
  MEETING_COUNT,
  PRIORITY_LABEL,
  db,
  type ClassSlot,
  type Course,
  type Note,
  type Priority,
  type Task,
} from '../lib/db'
import { DAYS } from '../lib/dates'
import { cssVars } from '../lib/hooks'
import { Dialog } from './Dialog'

interface BaseProps {
  open: boolean
  onClose: () => void
}

function CourseSelect({
  id,
  courses,
  value,
  allowNone,
}: {
  id: string
  courses: Course[]
  value?: number
  allowNone?: boolean
}) {
  return (
    <select id={id} name="courseId" required defaultValue={value ?? courses[0]?.id ?? 0}>
      {allowNone && <option value={0}>Tanpa mata kuliah</option>}
      {courses.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  )
}

function NeedCourse({ onClose }: { onClose: () => void }) {
  return (
    <>
      <p className="muted">Tambahkan mata kuliah dulu, supaya tugas dan jadwal bisa dikelompokkan.</p>
      <div className="dialog-actions">
        <button type="button" className="btn" onClick={onClose}>
          Batal
        </button>
        <Link to="/matkul" className="btn btn-primary" onClick={onClose}>
          Tambah mata kuliah
        </Link>
      </div>
    </>
  )
}

export function TaskDialog({ open, onClose, task }: BaseProps & { task?: Task | null }) {
  const courses = useLiveQuery(() => db.courses.orderBy('name').toArray(), [])
  const defaultDeadline = task?.deadline ?? format(addDays(new Date(), 1), "yyyy-MM-dd'T'23:59")

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const data = {
      courseId: Number(f.get('courseId')),
      title: String(f.get('title')).trim(),
      deadline: String(f.get('deadline')),
      priority: f.get('priority') as Priority,
      // undefined = tanpa pertemuan (Dexie menghapus properti saat update)
      meeting: Number(f.get('meeting')) || undefined,
    }
    if (task) await db.tasks.update(task.id, data)
    else await db.tasks.add({ ...data, done: false, createdAt: Date.now() })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={task ? 'Ubah tugas' : 'Tugas baru'}>
      {courses && courses.length === 0 ? (
        <NeedCourse onClose={onClose} />
      ) : (
        <form className="form" onSubmit={(e) => void submit(e)}>
          <div className="field">
            <label htmlFor="t-title">Judul tugas</label>
            <input
              id="t-title"
              name="title"
              type="text"
              required
              maxLength={120}
              defaultValue={task?.title}
              placeholder="mis. Laporan praktikum ERD"
              data-autofocus
            />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="t-course">Mata kuliah</label>
              <CourseSelect id="t-course" courses={courses ?? []} value={task?.courseId} />
            </div>
            <div className="field">
              <label htmlFor="t-prio">Prioritas</label>
              <select id="t-prio" name="priority" defaultValue={task?.priority ?? 'mid'}>
                {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="t-meeting">Pertemuan</label>
              <select id="t-meeting" name="meeting" defaultValue={task?.meeting ?? 0}>
                <option value={0}>Tanpa pertemuan</option>
                {Array.from({ length: MEETING_COUNT }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    Pertemuan {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="t-deadline">Deadline</label>
              <input id="t-deadline" name="deadline" type="datetime-local" required defaultValue={defaultDeadline} />
            </div>
          </div>
          <div className="dialog-actions">
            <button type="button" className="btn" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              Simpan
            </button>
          </div>
        </form>
      )}
    </Dialog>
  )
}

export function SlotDialog({
  open,
  onClose,
  slot,
  onDelete,
}: BaseProps & { slot?: ClassSlot | null; onDelete?: (slot: ClassSlot) => void }) {
  const courses = useLiveQuery(() => db.courses.orderBy('name').toArray(), [])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const f = new FormData(form)
    const start = String(f.get('start'))
    const end = String(f.get('end'))
    const endInput = form.elements.namedItem('end') as HTMLInputElement
    if (end <= start) {
      endInput.setCustomValidity('Jam selesai harus setelah jam mulai.')
      endInput.reportValidity()
      return
    }
    const data = {
      courseId: Number(f.get('courseId')),
      day: Number(f.get('day')),
      start,
      end,
      room: String(f.get('room')).trim(),
    }
    if (slot) await db.slots.update(slot.id, data)
    else await db.slots.add(data)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={slot ? 'Ubah kelas' : 'Kelas baru'}>
      {courses && courses.length === 0 ? (
        <NeedCourse onClose={onClose} />
      ) : (
        <form className="form" onSubmit={(e) => void submit(e)}>
          <div className="field">
            <label htmlFor="s-course">Mata kuliah</label>
            <CourseSelect id="s-course" courses={courses ?? []} value={slot?.courseId} />
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="s-day">Hari</label>
              <select id="s-day" name="day" defaultValue={slot?.day ?? 0}>
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="s-room">Ruang</label>
              <input id="s-room" name="room" type="text" maxLength={40} defaultValue={slot?.room} placeholder="mis. Lab 2" />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor="s-start">Mulai</label>
              <input id="s-start" name="start" type="time" required defaultValue={slot?.start ?? '08:00'} />
            </div>
            <div className="field">
              <label htmlFor="s-end">Selesai</label>
              <input
                id="s-end"
                name="end"
                type="time"
                required
                defaultValue={slot?.end ?? '10:00'}
                onChange={(e) => e.currentTarget.setCustomValidity('')}
              />
            </div>
          </div>
          <div className="dialog-actions">
            {slot && (
              <button type="button" className="btn btn-danger spacer" onClick={() => onDelete?.(slot)}>
                Hapus
              </button>
            )}
            <button type="button" className="btn" onClick={onClose}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary">
              Simpan
            </button>
          </div>
        </form>
      )}
    </Dialog>
  )
}

export function NoteDialog({
  open,
  onClose,
  note,
  onDelete,
}: BaseProps & { note?: Note | null; onDelete?: (note: Note) => void }) {
  const courses = useLiveQuery(() => db.courses.orderBy('name').toArray(), [])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const data = {
      courseId: Number(f.get('courseId')),
      title: String(f.get('title')).trim(),
      body: String(f.get('body')),
      updatedAt: Date.now(),
    }
    if (note) await db.notes.update(note.id, data)
    else await db.notes.add(data)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={note ? 'Ubah catatan' : 'Catatan baru'} wide>
      <form className="form" onSubmit={(e) => void submit(e)}>
        <div className="field-row">
          <div className="field">
            <label htmlFor="n-title">Judul</label>
            <input
              id="n-title"
              name="title"
              type="text"
              required
              maxLength={120}
              defaultValue={note?.title}
              placeholder="mis. Rangkuman bab 4"
              data-autofocus
            />
          </div>
          <div className="field">
            <label htmlFor="n-course">Mata kuliah</label>
            <CourseSelect id="n-course" courses={courses ?? []} value={note?.courseId ?? 0} allowNone />
          </div>
        </div>
        <div className="field">
          <label htmlFor="n-body">Isi catatan</label>
          <textarea id="n-body" name="body" rows={10} defaultValue={note?.body} />
        </div>
        <div className="dialog-actions">
          {note && (
            <button type="button" className="btn btn-danger spacer" onClick={() => onDelete?.(note)}>
              Hapus
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="btn btn-primary">
            Simpan
          </button>
        </div>
      </form>
    </Dialog>
  )
}

export function CourseDialog({
  open,
  onClose,
  course,
  onDelete,
}: BaseProps & { course?: Course | null; onDelete?: (course: Course) => void }) {
  const [color, setColor] = useState<string>(course?.color ?? COURSE_COLORS[0].value)

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const data = {
      name: String(f.get('name')).trim(),
      lecturer: String(f.get('lecturer')).trim(),
      sks: Number(f.get('sks')),
      color,
    }
    if (course) await db.courses.update(course.id, data)
    else await db.courses.add(data)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={course ? 'Ubah mata kuliah' : 'Mata kuliah baru'}>
      <form className="form" onSubmit={(e) => void submit(e)}>
        <div className="field">
          <label htmlFor="c-name">Nama mata kuliah</label>
          <input
            id="c-name"
            name="name"
            type="text"
            required
            maxLength={80}
            defaultValue={course?.name}
            placeholder="mis. Basis Data"
            data-autofocus
          />
        </div>
        <div className="field">
          <label htmlFor="c-lecturer">Dosen</label>
          <input id="c-lecturer" name="lecturer" type="text" maxLength={80} defaultValue={course?.lecturer} />
        </div>
        <div className="field">
          <label htmlFor="c-sks">SKS</label>
          <input id="c-sks" name="sks" type="number" min={1} max={6} required defaultValue={course?.sks ?? 3} />
        </div>
        <fieldset className="field">
          <legend>Warna</legend>
          <div className="swatches" role="radiogroup" aria-label="Warna mata kuliah">
            {COURSE_COLORS.map((c) => (
              <input
                key={c.value}
                type="radio"
                name="color"
                value={c.value}
                aria-label={c.name}
                checked={color === c.value}
                onChange={() => setColor(c.value)}
                style={cssVars({ '--c': c.value })}
              />
            ))}
          </div>
        </fieldset>
        <div className="dialog-actions">
          {course && (
            <button type="button" className="btn btn-danger spacer" onClick={() => onDelete?.(course)}>
              Hapus
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="submit" className="btn btn-primary">
            Simpan
          </button>
        </div>
      </form>
    </Dialog>
  )
}