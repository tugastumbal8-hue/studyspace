import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Course } from '../lib/db'
import { cssVars, usePageTitle } from '../lib/hooks'
import { Empty, PageHead } from '../components/Bits'
import { ConfirmDialog } from '../components/Dialog'
import { Icon } from '../components/Icon'
import { CourseDialog } from '../components/Forms'

export default function Courses() {
  usePageTitle('Mata kuliah')
  const courses = useLiveQuery(() => db.courses.orderBy('name').toArray())
  const tasks = useLiveQuery(() => db.tasks.toArray())
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)
  const [deleting, setDeleting] = useState<Course | null>(null)

  if (!courses || !tasks) return null

  const totalSks = courses.reduce((sum, c) => sum + c.sks, 0)

  async function removeCourse(course: Course) {
    await db.transaction('rw', db.courses, db.tasks, db.slots, db.notes, async () => {
      await db.tasks.where('courseId').equals(course.id).delete()
      await db.slots.where('courseId').equals(course.id).delete()
      await db.notes.where('courseId').equals(course.id).modify({ courseId: 0 })
      await db.courses.delete(course.id)
    })
  }

  return (
    <div className="page">
      <PageHead
        title="Mata kuliah"
        subtitle={`${courses.length} mata kuliah · ${totalSks} SKS semester ini`}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} />
            Mata kuliah baru
          </button>
        }
      />

      {courses.length === 0 ? (
        <Empty title="Belum ada mata kuliah" text="Mulai dari sini: semua tugas, jadwal, dan catatan dikelompokkan per mata kuliah.">
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} />
            Mata kuliah baru
          </button>
        </Empty>
      ) : (
        <div className="cards">
          {courses.map((c) => {
            const mine = tasks.filter((t) => t.courseId === c.id)
            const done = mine.filter((t) => t.done).length
            return (
              <button
                key={c.id}
                type="button"
                className="course-card glass"
                style={cssVars({ '--c': c.color })}
                onClick={() => setEditing(c)}
              >
                <h2>{c.name}</h2>
                <p className="muted">{c.lecturer || 'Dosen belum diisi'}</p>
                <div className="course-stats">
                  <span>{c.sks} SKS</span>
                  <span>
                    {done}/{mine.length} tugas selesai
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <CourseDialog
        key={editing?.id ?? 'new'}
        open={adding || editing !== null}
        course={editing}
        onClose={() => {
          setAdding(false)
          setEditing(null)
        }}
        onDelete={(c) => {
          setEditing(null)
          setDeleting(c)
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Hapus mata kuliah?"
        message={
          deleting
            ? `"${deleting.name}" dihapus bersama semua tugas dan jadwalnya. Catatannya dipindah ke Umum.`
            : ''
        }
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await removeCourse(deleting)
          setDeleting(null)
        }}
      />
    </div>
  )
}
