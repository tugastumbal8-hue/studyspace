import { createLocalStore } from './localStore'

export interface Semester {
  start: string
  end: string
}

export const semesterStore = createLocalStore<Semester>('studyspace.semester', { start: '', end: '' })
