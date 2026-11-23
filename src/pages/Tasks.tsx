import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, MEETING_COUNT, PRIORITY_LABEL, type Priority, type Task } from '../lib/db'
import { byDeadline, isLate } from '../lib/dates'
import { useNow, usePageTitle } from '../lib/hooks'
import { Empty, PageHead } from '../components/Bits'
import { ConfirmDialog } from '../components/Dialog'
import { Icon } from '../components/Icon'
import { TaskRow } from '../components/TaskRow'
import { TaskDialog } from '../components/Forms'

type Status = 'aktif' | 'semua' | 'selesai' | 'terlambat'
type Sort = 'deadline' | 'prioritas' | 'pertemuan'

const PRIO_WEIGHT: Record<Priority, number> = { high: 0, mid: 1, low: 2 }

export default function Tasks() {
  usePageTitle('Tugas')
  const now = useNow()
  const tasks = useLiveQuery(() => db.tasks.toArray())
  const courses = useLiveQuery(() => db.courses.orderBy('name').toArray())

  const [status, setStatus] = useState<Status>('aktif')
  const [courseId, setCourseId] = useState(0)
  const [priority, setPriority] = useState<'all' | Priority>('all')
  const [meeting, setMeeting] = useState(0)
  const [sort, setSort] = useState<Sort>('deadline')
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [deleting, setDeleting] = useState<Task | null>(null)

  if (!tasks || !courses) return null

  const byId = new Map(courses.map((c) => [c.id, c]))
  const list = tasks
    .filter((t) => {
      if (status === 'aktif' && t.done) return false
      if (status === 'selesai' && !t.done) return false
      if (status === 'terlambat' && !isLate(t, now)) return false
      if (courseId && t.courseId !== courseId) return false
      if (priority !== 'all' && t.priority !== priority) return false
      if (meeting && t.meeting !== meeting) return false
      return true
    })
    .sort((a, b) => {
      if (sort === 'prioritas') return PRIO_WEIGHT[a.priority] - PRIO_WEIGHT[b.priority] || byDeadline(a, b)
      if (sort === 'pertemuan') return (a.meeting ?? 999) - (b.meeting ?? 999) || byDeadline(a, b)
      return byDeadline(a, b)
    })

  const filtering = status !== 'aktif' || courseId !== 0 || priority !== 'all' || meeting !== 0

  return (
    <div className="page">
      <PageHead
        title="Tugas"
        subtitle={`${list.length} tugas ditampilkan`}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} />
            Tugas baru
          </button>
        }
      />

      <section className="toolbar glass" aria-label="Filter tugas">
        <div className="field">
          <label htmlFor="f-status">Status</label>
          <select id="f-status" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            <option value="aktif">Aktif</option>
            <option value="terlambat">Terlambat</option>
            <option value="selesai">Selesai</option>
            <option value="semua">Semua</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-course">Mata kuliah</label>
          <select id="f-course" value={courseId} onChange={(e) => setCourseId(Number(e.target.value))}>
            <option value={0}>Semua</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-prio">Prioritas</label>
          <select id="f-prio" value={priority} onChange={(e) => setPriority(e.target.value as 'all' | Priority)}>
            <option value="all">Semua</option>
            {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-meeting">Pertemuan</label>
          <select id="f-meeting" value={meeting} onChange={(e) => setMeeting(Number(e.target.value))}>
            <option value={0}>Semua</option>
            {Array.from({ length: MEETING_COUNT }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                Pertemuan {n}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-sort">Urutkan</label>
          <select id="f-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="deadline">Deadline terdekat</option>
            <option value="prioritas">Prioritas</option>
            <option value="pertemuan">Pertemuan</option>
          </select>
        </div>
      </section>

      {list.length === 0 ? (
        <Empty
          title={filtering ? 'Tidak ada tugas yang cocok' : 'Belum ada tugas'}
          text={
            filtering
              ? 'Coba ubah filter di atas untuk melihat tugas lainnya.'
              : 'Catat tugas pertamamu beserta deadline-nya supaya tidak ada yang terlewat.'
          }
        >
          {!filtering && (
            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
              <Icon name="plus" size={18} />
              Tugas baru
            </button>
          )}
        </Empty>
      ) : (
        <section className="card glass" aria-label="Daftar tugas">
          <ul className="list">
            {list.map((t) => (
              <TaskRow key={t.id} task={t} course={byId.get(t.courseId)} now={now} onEdit={setEditing} onDelete={setDeleting} />
            ))}
          </ul>
        </section>
      )}

      <TaskDialog
        open={adding || editing !== null}
        task={editing}
        onClose={() => {
          setAdding(false)
          setEditing(null)
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Hapus tugas?"
        message={deleting ? `"${deleting.title}" akan dihapus permanen.` : ''}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await db.tasks.delete(deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}