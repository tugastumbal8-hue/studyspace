import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Schedule from './pages/Schedule'
import Notes from './pages/Notes'
import Progress from './pages/Progress'
import Courses from './pages/Courses'
import Settings from './pages/Settings'

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
