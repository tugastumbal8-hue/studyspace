import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, exportData, importData, loadDemo, resetData } from '../lib/db'
import { usePageTitle } from '../lib/hooks'
import { useStore } from '../lib/localStore'
import { semesterStore } from '../lib/semester'
import { themeStore, type Theme } from '../lib/theme'
import {
  checkAndNotifyTasks,
  getNotificationPermission,
  isNotificationSupported,
  notificationStore,
  requestNotificationPermission,
  sendTestNotification,
} from '../lib/notifications'
import { PageHead } from '../components/Bits'
import { ConfirmDialog } from '../components/Dialog'
import { Icon } from '../components/Icon'

type Pending = { kind: 'demo' } | { kind: 'reset' } | { kind: 'import'; text: string } | null

const THEMES: { value: Theme; label: string }[] = [
  { value: 'auto', label: 'Otomatis' },
  { value: 'light', label: 'Terang' },
  { value: 'dark', label: 'Gelap' },
]

export default function Settings() {
  usePageTitle('Pengaturan')
  const theme = useStore(themeStore)
  const sem = useStore(semesterStore)
  const notif = useStore(notificationStore)
  const notifSupported = isNotificationSupported()
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Pending>(null)
  const [status, setStatus] = useState<{ text: string; error?: boolean }>({ text: '' })
  const total = useLiveQuery(async () => (await db.courses.count()) + (await db.tasks.count()) + (await db.notes.count()))

  async function toggleNotif() {
    if (!notifSupported) {
      setStatus({ text: 'Peramban tidak mendukung notifikasi web.', error: true })
      return
    }

    if (!notif.enabled) {
      const permission = getNotificationPermission()
      if (permission === 'denied') {
        setStatus({
          text: 'Izin notifikasi diblokir di peramban. Buka ikon gembok di bilah alamat peramban untuk mengizinkan.',
          error: true,
        })
        return
      }
      const granted = await requestNotificationPermission()
      if (granted) {
        notificationStore.set({ ...notif, enabled: true })
        setStatus({ text: 'Pengingat tugas aktif (1–2 kali sehari).' })
        void checkAndNotifyTasks()
      } else {
        setStatus({ text: 'Izin notifikasi tidak diberikan.', error: true })
      }
    } else {
      notificationStore.set({ ...notif, enabled: false })
      setStatus({ text: 'Pengingat tugas dinonaktifkan.' })
    }
  }

  async function testNotif() {
    const ok = await sendTestNotification()
    if (ok) {
      setStatus({ text: 'Notifikasi tes berhasil dikirim ke perangkat!' })
    } else {
      setStatus({ text: 'Gagal mengirim notifikasi tes. Pastikan izin notifikasi diizinkan.', error: true })
    }
  }

  async function download() {
    const blob = new Blob([await exportData()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `studyspace-${format(new Date(), 'yyyyMMdd')}.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatus({ text: 'Cadangan berhasil diunduh.' })
  }

  async function chooseFile(file: File | undefined) {
    if (!file) return
    const text = await file.text()
    try {
      JSON.parse(text)
    } catch {
      setStatus({ text: 'Berkas bukan JSON yang valid.', error: true })
      return
    }
    setPending({ kind: 'import', text })
  }

  async function confirm() {
    const p = pending
    setPending(null)
    if (!p) return
    try {
      if (p.kind === 'demo') {
        await loadDemo()
        setStatus({ text: 'Data contoh dimuat.' })
      } else if (p.kind === 'reset') {
        await resetData()
        setStatus({ text: 'Semua data dihapus.' })
      } else {
        await importData(p.text)
        setStatus({ text: 'Cadangan berhasil dipulihkan.' })
      }
    } catch (err) {
      setStatus({ text: err instanceof Error ? err.message : 'Terjadi kesalahan.', error: true })
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const copy = {
    demo: { title: 'Muat data contoh?', message: 'Data yang ada sekarang akan diganti dengan data contoh.', label: 'Muat' },
    reset: { title: 'Hapus semua data?', message: 'Semua mata kuliah, tugas, jadwal, dan catatan dihapus permanen. Unduh cadangan dulu jika perlu.', label: 'Hapus semua' },
    import: { title: 'Pulihkan dari cadangan?', message: 'Data yang ada sekarang akan diganti dengan isi berkas cadangan.', label: 'Pulihkan' },
  }
  const active = pending ? copy[pending.kind] : copy.demo

  return (
    <div className="page">
      <PageHead title="Pengaturan" />

      <div className="settings-grid">
        <section className="card glass" aria-labelledby="st-look">
          <h2 className="card-title" id="st-look">
            Tampilan
          </h2>
          <div className="setting">
            <div>
              <strong>Tema</strong>
              <p>Otomatis mengikuti pengaturan perangkatmu.</p>
            </div>
            <div className="segmented" role="radiogroup" aria-label="Tema">
              {THEMES.map((t) => (
                <label key={t.value}>
                  <input
                    type="radio"
                    name="theme"
                    value={t.value}
                    checked={theme === t.value}
                    onChange={() => themeStore.set(t.value)}
                  />
                  <span>{t.label}</span>
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="card glass" aria-labelledby="st-sem">
          <h2 className="card-title" id="st-sem">
            Semester
          </h2>
          <div className="setting">
            <div>
              <strong>Tanggal semester</strong>
              <p>Dipakai untuk menampilkan minggu keberapa kamu sekarang di halaman Progres.</p>
            </div>
            <div className="setting-controls">
              <div className="field">
                <label htmlFor="sem-start">Mulai</label>
                <input
                  id="sem-start"
                  type="date"
                  value={sem.start}
                  onChange={(e) => semesterStore.set({ ...sem, start: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="sem-end">Selesai</label>
                <input
                  id="sem-end"
                  type="date"
                  value={sem.end}
                  onChange={(e) => semesterStore.set({ ...sem, end: e.target.value })}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="card glass" aria-labelledby="st-notif">
          <h2 className="card-title" id="st-notif">
            Notifikasi
          </h2>
          <div className="setting">
            <div>
              <strong>Pengingat tugas</strong>
              <p>
                Kirim notifikasi ke perangkat 1–2 kali sehari saat ada tugas yang mendekati deadline atau belum
                selesai, agar kamu tidak terlewat tanpa merasa terganggu.
              </p>
            </div>
            <div className="setting-controls">
              <button
                type="button"
                className={`btn ${notif.enabled ? 'btn-primary' : ''}`}
                onClick={() => void toggleNotif()}
              >
                <Icon name="bell" size={18} />
                {notif.enabled ? 'Aktif' : 'Nonaktif'}
              </button>
              {notif.enabled && (
                <button
                  type="button"
                  className="btn"
                  onClick={() => void testNotif()}
                >
                  Tes notifikasi
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="card glass" aria-labelledby="st-data">
          <h2 className="card-title" id="st-data">
            Data
          </h2>
          <div className="setting">
            <div>
              <strong>Cadangan</strong>
              <p>
                Datamu tersimpan di browser perangkat ini. Unduh cadangan berkala supaya aman kalau data browser
                dihapus.
              </p>
            </div>
            <div className="setting-controls">
              <button type="button" className="btn" onClick={() => void download()}>
                <Icon name="download" size={18} />
                Unduh
              </button>
              <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
                <Icon name="upload" size={18} />
                Pulihkan
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="sr-only"
                tabIndex={-1}
                aria-label="Pilih berkas cadangan"
                onChange={(e) => void chooseFile(e.target.files?.[0])}
              />
            </div>
          </div>
          <div className="setting">
            <div>
              <strong>Data contoh</strong>
              <p>Isi dengan mata kuliah, tugas, dan jadwal contoh untuk mencoba semua fitur.</p>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => (total ? setPending({ kind: 'demo' }) : void loadDemo().then(() => setStatus({ text: 'Data contoh dimuat.' })))}
            >
              Muat data contoh
            </button>
          </div>
          <div className="setting">
            <div>
              <strong>Hapus semua data</strong>
              <p>Mengosongkan seluruh isi StudySpace di perangkat ini.</p>
            </div>
            <button type="button" className="btn btn-danger" onClick={() => setPending({ kind: 'reset' })}>
              <Icon name="trash" size={18} />
              Hapus semua
            </button>
          </div>
          <p className="status" role="status" data-error={status.error ? 'true' : undefined}>
            {status.text}
          </p>
        </section>
      </div>

      <ConfirmDialog
        open={pending !== null}
        title={active.title}
        message={active.message}
        confirmLabel={active.label}
        onClose={() => setPending(null)}
        onConfirm={confirm}
      />
    </div>
  )
}
