import { useState } from 'react'
import { formatDistanceToNowStrict } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Note } from '../lib/db'
import { usePageTitle } from '../lib/hooks'
import { CourseChip, Empty, PageHead } from '../components/Bits'
import { ConfirmDialog } from '../components/Dialog'
import { Icon } from '../components/Icon'
import { NoteDialog } from '../components/Forms'

export default function Notes() {
  usePageTitle('Catatan')
  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray())
  const courses = useLiveQuery(() => db.courses.orderBy('name').toArray())
  const [query, setQuery] = useState('')
  const [courseId, setCourseId] = useState(-1)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Note | null>(null)
  const [deleting, setDeleting] = useState<Note | null>(null)

  if (!notes || !courses) return null

  const byId = new Map(courses.map((c) => [c.id, c]))
  const q = query.trim().toLowerCase()
  const list = notes.filter(
    (n) =>
      (courseId === -1 || n.courseId === courseId) &&
      (!q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)),
  )

  return (
    <div className="page">
      <PageHead
        title="Catatan"
        subtitle={`${notes.length} catatan tersimpan`}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={18} />
            Catatan baru
          </button>
        }
      />

      <section className="toolbar glass" aria-label="Cari catatan">
        <div className="field search">
          <label htmlFor="n-search">Cari</label>
          <input
            id="n-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Judul atau isi catatan"
          />
        </div>
        <div className="field">
          <label htmlFor="n-filter">Mata kuliah</label>
          <select id="n-filter" value={courseId} onChange={(e) => setCourseId(Number(e.target.value))}>
            <option value={-1}>Semua</option>
            <option value={0}>Umum</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {list.length === 0 ? (
        <Empty
          title={notes.length === 0 ? 'Belum ada catatan' : 'Tidak ada catatan yang cocok'}
          text={
            notes.length === 0
              ? 'Simpan rangkuman materi, pertanyaan untuk dosen, atau target belajarmu di sini.'
              : 'Coba kata kunci lain atau ganti filter mata kuliah.'
          }
        >
          {notes.length === 0 && (
            <button type="button" className="btn btn-primary" onClick={() => setAdding(true)}>
              <Icon name="plus" size={18} />
              Catatan baru
            </button>
          )}
        </Empty>
      ) : (
        <div className="cards">
          {list.map((n) => (
            <button key={n.id} type="button" className="note-card glass" onClick={() => setEditing(n)}>
              <h2>{n.title}</h2>
              <CourseChip course={byId.get(n.courseId)} />
              <p className="note-preview">{n.body || 'Catatan kosong'}</p>
              <span className="muted">
                Diubah {formatDistanceToNowStrict(n.updatedAt, { locale: idLocale, addSuffix: true })}
              </span>
            </button>
          ))}
        </div>
      )}

      <NoteDialog
        open={adding || editing !== null}
        note={editing}
        onClose={() => {
          setAdding(false)
          setEditing(null)
        }}
        onDelete={(n) => {
          setEditing(null)
          setDeleting(n)
        }}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Hapus catatan?"
        message={deleting ? `"${deleting.title}" akan dihapus permanen.` : ''}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) await db.notes.delete(deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}
