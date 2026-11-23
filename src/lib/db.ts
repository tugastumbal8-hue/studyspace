import Dexie, { type EntityTable } from 'dexie'
import { format } from 'date-fns'

export type Priority = 'low' | 'mid' | 'high'

export interface Course {
  id: number
  name: string
  lecturer: string
  sks: number
  color: string
}

export interface Task {
  id: number
  courseId: number
  title: string
  deadline: string
  priority: Priority
  done: boolean
  createdAt: number
  /** Pertemuan ke-berapa (1..MEETING_COUNT). Opsional, tugas lama tidak punya. */
  meeting?: number
}

export interface ClassSlot {
  id: number
  courseId: number
  day: number
  start: string
  end: string
  room: string
}

export interface Note {
  id: number
  courseId: number
  title: string
  body: string
  updatedAt: number
}

export interface Backup {
  app: 'studyspace'
  version: 1
  exportedAt: string
  courses: Course[]
  tasks: Task[]
  slots: ClassSlot[]
  notes: Note[]
}

/** Jumlah pertemuan per semester (termasuk UTS/UAS). Ubah di sini kalau berbeda. */
export const MEETING_COUNT = 25


export const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Rendah',
  mid: 'Sedang',
  high: 'Tinggi',
}

export const COURSE_COLORS = [
  { value: '#4f6bed', name: 'Biru' },
  { value: '#14a89c', name: 'Tosca' },
  { value: '#3fae5b', name: 'Hijau' },
  { value: '#e0a21b', name: 'Kuning' },
  { value: '#ee7b30', name: 'Oranye' },
  { value: '#e0485a', name: 'Merah' },
  { value: '#d1559b', name: 'Merah muda' },
  { value: '#8b5cf6', name: 'Ungu' },
] as const

class StudyDB extends Dexie {
  courses!: EntityTable<Course, 'id'>
  tasks!: EntityTable<Task, 'id'>
  slots!: EntityTable<ClassSlot, 'id'>
  notes!: EntityTable<Note, 'id'>

  constructor() {
    super('studyspace')
    this.version(1).stores({
      courses: '++id, name',
      tasks: '++id, courseId, deadline, done',
      slots: '++id, courseId, day',
      notes: '++id, courseId, updatedAt',
    })
  }
}

export const db = new StudyDB()

async function replaceAll(data: Pick<Backup, 'courses' | 'tasks' | 'slots' | 'notes'>) {
  await db.transaction('rw', db.courses, db.tasks, db.slots, db.notes, async () => {
    await Promise.all([db.courses.clear(), db.tasks.clear(), db.slots.clear(), db.notes.clear()])
    await db.courses.bulkAdd(data.courses)
    await db.tasks.bulkAdd(data.tasks)
    await db.slots.bulkAdd(data.slots)
    await db.notes.bulkAdd(data.notes)
  })
}

export async function exportData(): Promise<string> {
  const backup: Backup = {
    app: 'studyspace',
    version: 1,
    exportedAt: new Date().toISOString(),
    courses: await db.courses.toArray(),
    tasks: await db.tasks.toArray(),
    slots: await db.slots.toArray(),
    notes: await db.notes.toArray(),
  }
  return JSON.stringify(backup, null, 2)
}

export async function importData(text: string) {
  let raw: Partial<Backup>
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('Berkas bukan JSON yang valid.')
  }
  const ok =
    raw &&
    raw.app === 'studyspace' &&
    Array.isArray(raw.courses) &&
    Array.isArray(raw.tasks) &&
    Array.isArray(raw.slots) &&
    Array.isArray(raw.notes) &&
    raw.courses.every((c) => typeof c.id === 'number' && typeof c.name === 'string') &&
    raw.tasks.every((t) => typeof t.id === 'number' && typeof t.title === 'string' && typeof t.deadline === 'string')
  if (!ok) throw new Error('Berkas bukan cadangan StudySpace yang valid.')
  await replaceAll(raw as Backup)
}

export async function resetData() {
  await replaceAll({ courses: [], tasks: [], slots: [], notes: [] })
}

export async function loadDemo() {
  const now = new Date()
  const at = (days: number, h: number, m = 0) =>
    format(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, h, m), "yyyy-MM-dd'T'HH:mm")
  const stamp = Date.now()

  const courses: Course[] = [
    { id: 1, name: 'Basis Data', lecturer: 'Dr. Rina Kartika, M.Kom.', sks: 3, color: '#4f6bed' },
    { id: 2, name: 'Pemrograman Web', lecturer: 'Budi Santoso, M.T.', sks: 3, color: '#14a89c' },
    { id: 3, name: 'Jaringan Komputer', lecturer: 'Ir. Hendra Wijaya, M.Kom.', sks: 3, color: '#e0a21b' },
    { id: 4, name: 'Rekayasa Perangkat Lunak', lecturer: 'Siti Nurhaliza, M.Kom.', sks: 3, color: '#d1559b' },
    { id: 5, name: 'Kecerdasan Buatan', lecturer: 'Dr. Agus Prasetyo, M.Si.', sks: 2, color: '#ee7b30' },
  ]

  const t = (
    id: number,
    courseId: number,
    title: string,
    deadline: string,
    priority: Priority,
    done = false,
  ): Task => ({ id, courseId, title, deadline, priority, done, createdAt: stamp - id * 3_600_000 })

  const tasks: Task[] = [
    t(1, 1, 'Normalisasi tabel sampai 3NF', at(-1, 23, 59), 'high'),
    t(2, 1, 'ERD sistem perpustakaan', at(2, 17), 'high'),
    t(3, 1, 'Latihan query JOIN dan subquery', at(6, 23, 59), 'mid'),
    t(4, 1, 'Resume bab indexing dan transaksi', at(-6, 20), 'low', true),
    t(5, 2, 'Landing page responsif dengan CSS Grid', at(1, 23, 59), 'high'),
    t(6, 2, 'Form validasi dan fetch API', at(5, 12), 'mid'),
    t(7, 2, 'Setup repository Git kelompok', at(-8, 18), 'low', true),
    t(8, 3, 'Subnetting VLSM: 8 soal latihan', at(3, 9), 'mid'),
    t(9, 3, 'Laporan praktikum Packet Tracer', at(8, 23, 59), 'mid'),
    t(10, 4, 'Dokumen SRS versi 1', at(4, 16), 'high'),
    t(11, 4, 'Use case diagram aplikasi absensi', at(-3, 10), 'mid', true),
    t(12, 5, 'Ringkasan jurnal algoritma A*', at(7, 23, 59), 'low'),
    t(13, 5, 'Implementasi BFS dan DFS di Python', at(10, 23, 59), 'mid'),
  ]

  const s = (id: number, courseId: number, day: number, start: string, end: string, room: string): ClassSlot => ({
    id,
    courseId,
    day,
    start,
    end,
    room,
  })

  const slots: ClassSlot[] = [
    s(1, 1, 0, '08:00', '10:30', 'Lab 2'),
    s(2, 2, 0, '13:00', '15:30', 'Lab 1'),
    s(3, 3, 1, '09:00', '11:30', 'R. 4.02'),
    s(4, 4, 2, '08:00', '10:30', 'R. 3.11'),
    s(5, 5, 2, '13:00', '14:40', 'R. 3.05'),
    s(6, 2, 3, '10:00', '12:30', 'Lab 1'),
    s(7, 3, 3, '14:00', '16:30', 'Lab Jaringan'),
    s(8, 1, 4, '09:00', '11:30', 'Lab 2'),
    s(9, 4, 4, '13:00', '15:30', 'R. 3.11'),
  ]

  const notes: Note[] = [
    {
      id: 1,
      courseId: 1,
      title: 'Aturan normalisasi',
      body: '1NF: setiap kolom atomik, tidak ada grup berulang.\n2NF: 1NF + tidak ada ketergantungan parsial pada sebagian primary key.\n3NF: 2NF + tidak ada ketergantungan transitif antar atribut non-key.\n\nTanyakan ke Bu Rina: kapan denormalisasi dibenarkan untuk laporan?',
      updatedAt: stamp - 86_400_000,
    },
    {
      id: 2,
      courseId: 2,
      title: 'Cheat sheet CSS Grid',
      body: 'grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)) cocok untuk kartu responsif tanpa media query.\nGunakan gap, bukan margin, antar item.\nContainer query untuk komponen yang layoutnya bergantung lebar induk.',
      updatedAt: stamp - 3_600_000 * 5,
    },
    {
      id: 3,
      courseId: 0,
      title: 'Target semester ini',
      body: 'IPK minimal 3.5.\nSelesaikan semua tugas minimal H-1 deadline.\nBelajar UAS dari dua minggu sebelumnya.',
      updatedAt: stamp - 86_400_000 * 4,
    },
  ]

  await replaceAll({ courses, tasks, slots, notes })
}