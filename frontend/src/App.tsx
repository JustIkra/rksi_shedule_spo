import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import EventsPage from './pages/EventsPage'
import AdminPage from './pages/AdminPage'
import PublicViewPage from './pages/PublicViewPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/view" element={<PublicViewPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/login" element={<Navigate to="/events" replace />} />
        <Route path="/admin/panel" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/view" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
