import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import PatientDetail from './pages/PatientDetail'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<Signup />} />
        <Route path="/login"   element={<Login />} />
        
         <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/patients/:id" element={<PatientDetail />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App