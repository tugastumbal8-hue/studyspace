import { differenceInCalendarDays, format, formatDistanceToNowStrict, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

export const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
export const DAYS_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export function fmt(value: Date | string, pattern: string) {
  return format(typeof value === 'string' ? parseISO(value) : value, pattern, { locale: idLocale })
}

export const todayIndex = (d = new Date()) => (d.getDay() + 6) % 7

export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export type Tone = 'late' | 'soon' | 'ok' | 'done'

export function dueInfo(deadline: string, done: boolean, now = new Date()): { text: string; tone: Tone } {
  if (done) return { text: 'Selesai', tone: 'done' }
  const d = parseISO(deadline)
  if (d < now) {
    return { text: `Terlambat ${formatDistanceToNowStrict(d, { locale: idLocale })}`, tone: 'late' }
  }
  const days = differenceInCalendarDays(d, now)
  if (days === 0) return { text: `Hari ini, ${format(d, 'HH:mm')}`, tone: 'soon' }
  if (days === 1) return { text: `Besok, ${format(d, 'HH:mm')}`, tone: 'soon' }
  return { text: `${days} hari lagi`, tone: days <= 3 ? 'soon' : 'ok' }
}

export const isLate = (t: { deadline: string; done: boolean }, now = new Date()) =>
  !t.done && parseISO(t.deadline) < now

export const byDeadline = (a: { deadline: string }, b: { deadline: string }) =>
  a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0
