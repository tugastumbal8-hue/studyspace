import { differenceInCalendarDays, parseISO } from 'date-fns'
import { db } from './db'
import { createLocalStore } from './localStore'

export interface NotificationState {
  enabled: boolean
  lastNotifiedDate: string // Format: 'YYYY-MM-DD'
  sentCountToday: number // Maksimal 2 kali sehari
  lastSentTimestamp: number // epoch ms untuk memberi jeda antar notifikasi
}

const defaultState: NotificationState = {
  enabled: false,
  lastNotifiedDate: '',
  sentCountToday: 0,
  lastSentTimestamp: 0,
}

export const notificationStore = createLocalStore<NotificationState>('studyspace.notifications', defaultState)

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false
  try {
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  } catch {
    return false
  }
}

export async function sendLocalNotification(title: string, body: string, tag = 'studyspace-task') {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return

  const options: NotificationOptions = {
    body,
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag,
  }

  // Coba tampilkan lewat ServiceWorkerRegistration jika ada
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready
      if (reg && 'showNotification' in reg) {
        await reg.showNotification(title, options)
        return
      }
    } catch {
      // Fallback ke window Notification biasa
    }
  }

  try {
    new Notification(title, options)
  } catch {
    // Abaikan jika browser membatasi constructor Notification
  }
}

/**
 * Pengecekan tugas dengan batas 1-2 kali sehari agar tidak mengganggu:
 * - Maksimal 2 kali per hari kalender
 * - Jeda minimal 6 jam antar notifikasi pertama dan kedua
 */
export async function checkAndNotifyTasks(force = false): Promise<boolean> {
  const state = notificationStore.get()
  if (!state.enabled && !force) return false
  if (getNotificationPermission() !== 'granted') return false

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10) // 'YYYY-MM-DD'

  // Hitung berapa kali sudah terkirim hari ini
  const sentToday = state.lastNotifiedDate === todayStr ? state.sentCountToday : 0

  if (!force) {
    // 1. Jika sudah 2 kali terkirim hari ini, lewati
    if (sentToday >= 2) return false

    // 2. Jika sudah pernah terkirim 1 kali hari ini, beri jeda minimal 6 jam (21.600.000 ms)
    if (sentToday === 1 && Date.now() - state.lastSentTimestamp < 6 * 60 * 60 * 1000) {
      return false
    }
  }

  // Query tugas yang belum selesai dari database Dexie
  const tasks = await db.tasks.toArray()
  const courses = await db.courses.toArray()
  const courseMap = new Map(courses.map((c) => [c.id, c.name]))

  const openTasks = tasks.filter((t) => !t.done)
  if (openTasks.length === 0) {
    // Semua tugas sudah selesai, tidak perlu mengirim pengingat
    return false
  }

  // Prioritas 1: Ada tugas yang sudah melewati deadline (terlambat)
  const lateTasks = openTasks.filter((t) => parseISO(t.deadline) < now)
  if (lateTasks.length > 0) {
    const firstLate = lateTasks[0]
    const courseName = courseMap.get(firstLate.courseId) || 'Mata Kuliah'
    const title = '⚠️ Tugas Terlambat di StudySpace'
    const body =
      lateTasks.length === 1
        ? `Tugas "${firstLate.title}" (${courseName}) telah melewati batas waktu. Segera selesaikan!`
        : `Ada ${lateTasks.length} tugas yang telah melewati deadline. Selesaikan segera agar tidak menumpuk!`

    await sendLocalNotification(title, body, 'studyspace-late')
    notificationStore.set({
      ...state,
      lastNotifiedDate: todayStr,
      sentCountToday: sentToday + 1,
      lastSentTimestamp: Date.now(),
    })
    return true
  }

  // Prioritas 2: Ada tugas mendekati deadline (hari ini atau besok)
  const urgentTasks = openTasks
    .filter((t) => {
      const d = parseISO(t.deadline)
      const diff = differenceInCalendarDays(d, now)
      return d >= now && diff <= 1
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline))

  if (urgentTasks.length > 0) {
    const firstUrgent = urgentTasks[0]
    const courseName = courseMap.get(firstUrgent.courseId) || 'Mata Kuliah'
    const diff = differenceInCalendarDays(parseISO(firstUrgent.deadline), now)
    const timeDesc = diff === 0 ? 'hari ini' : 'besok'
    const title = '🔔 Pengingat Deadline Tugas'
    const body = `"${firstUrgent.title}" (${courseName}) jatuh tempo ${timeDesc}. Jangan lupa dikerjakan ya!`

    await sendLocalNotification(title, body, 'studyspace-urgent')
    notificationStore.set({
      ...state,
      lastNotifiedDate: todayStr,
      sentCountToday: sentToday + 1,
      lastSentTimestamp: Date.now(),
    })
    return true
  }

  // Prioritas 3: Pengingat tugas harian (hanya jika slot pagi dan belum pernah kirim hari ini)
  if (sentToday === 0 && openTasks.length > 0) {
    const title = '📋 Rencana Belajar Hari Ini'
    const body = `Kamu memiliki ${openTasks.length} tugas aktif di StudySpace. Waktu yang tepat untuk mencicilnya!`

    await sendLocalNotification(title, body, 'studyspace-daily')
    notificationStore.set({
      ...state,
      lastNotifiedDate: todayStr,
      sentCountToday: 1,
      lastSentTimestamp: Date.now(),
    })
    return true
  }

  return false
}

export async function sendTestNotification(): Promise<boolean> {
  const supported = isNotificationSupported()
  if (!supported) return false

  let permission = getNotificationPermission()
  if (permission !== 'granted') {
    const granted = await requestNotificationPermission()
    if (!granted) return false
    permission = 'granted'
  }

  await sendLocalNotification(
    '🔔 Tes Notifikasi StudySpace',
    'Pengingat tugas berhasil aktif! Notifikasi akan dikirim 1–2 kali sehari saat ada tugas yang perlu diselesaikan.',
    'studyspace-test'
  )
  return true
}
