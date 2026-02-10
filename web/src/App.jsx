
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import Login from './pages/Login';
import DashboardHome from './pages/DashboardHome';
import Companies from './pages/Companies';
import NfseList from './pages/NfseList';
import Settings from './pages/Settings';
import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-brand-50 text-slate-900 font-sans">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<DashboardHome />} />
            <Route path="companies" element={<Companies />} />
            <Route path="nfs" element={<NfseList />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </div>
    </Router>
  )
}

export default App
