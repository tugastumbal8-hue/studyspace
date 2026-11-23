import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Tasks = lazy(() => import('./pages/Tasks'))
const Schedule = lazy(() => import('./pages/Schedule'))
const Notes = lazy(() => import('./pages/Notes'))
const Progress = lazy(() => import('./pages/Progress'))
const Courses = lazy(() => import('./pages/Courses'))
const Settings = lazy(() => import('./pages/Settings'))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="tugas" element={<Tasks />} />
        <Route path="jadwal" element={<Schedule />} />
        <Route path="catatan" element={<Notes />} />
        <Route path="progres" element={<Progress />} />
        <Route path="matkul" element={<Courses />} />
        <Route path="pengaturan" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
