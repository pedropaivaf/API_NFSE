// web/src/App.jsx
import { HashRouter as Router, Routes, Route } from 'react-router-dom' // MUDOU AQUI

import Login from './pages/Login';
import DashboardHome from './pages/DashboardHome';
import BuscarNota from './pages/BuscarNota';
import NfseList from './pages/NfseList';
import Settings from './pages/Settings';
import Users from './pages/Users';
import Companies from './pages/Companies';
import Layout from './components/Layout';

function App() {
  return (
    <Router> {/* O Router agora é o HashRouter */}
      <div className="min-h-screen bg-brand-50 text-slate-900 font-sans">
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Layout />}>
            <Route index element={<DashboardHome />} />
            <Route path="buscar-nota" element={<BuscarNota />} />
            <Route path="companies" element={<Companies />} />
            <Route path="nfs" element={<NfseList />} />
            <Route path="users" element={<Users />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </div>
    </Router>
  )
}

export default App 