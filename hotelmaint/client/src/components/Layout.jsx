import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import api from '../api'

const NAV = [
  { path: '/dashboard', label: 'Dashboard', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )},
  { path: '/os', label: 'OS', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
      <rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h4"/>
    </svg>
  )},
  { path: '/preventiva', label: 'Preventiva', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M10 16l2 2 4-4"/>
    </svg>
  )},
  { path: '/estoque', label: 'Estoque', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
    </svg>
  )},
  { path: '/relatorios', label: 'Relatórios', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <path d="M18 20V10M12 20V4M6 20v-6"/>
    </svg>
  )},
  { path: '/configuracoes', label: 'Config.', icon: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  )}
]

export default function Layout() {
  const { user, hotel, hotelId, selectHotel, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [hoteis, setHoteis] = useState([])
  const [showHotelPicker, setShowHotelPicker] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    api.get('/hoteis').then(r => setHoteis(r.data)).catch(() => {})
  }, [])

  const hotelAtual = hoteis.find(h => h.id === hotelId) || hotel

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto bg-slate-50">
      {/* Topbar */}
      <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-lg">
        <div>
          <p className="text-xs text-blue-200">Olá, {user?.nome?.split(' ')[0]}</p>
          <h1 className="text-lg font-bold tracking-tight">🏨 HotelMaint</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHotelPicker(true)}
            className="text-xs bg-white/20 rounded-full px-3 py-1.5 font-medium"
          >
            {hotelAtual?.nome?.split(' ').slice(0,2).join(' ') || 'Selecionar hotel'} ▾
          </button>
          <button onClick={() => setShowMenu(!showMenu)} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
            {user?.nome?.slice(0,2).toUpperCase()}
          </button>
        </div>
      </div>

      {/* User menu dropdown */}
      {showMenu && (
        <div className="absolute top-16 right-4 z-50 bg-white rounded-xl shadow-xl border border-slate-100 p-2 min-w-48">
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <p className="font-semibold text-sm">{user?.nome}</p>
            <p className="text-xs text-slate-500">{user?.role}</p>
          </div>
          <button onClick={() => { logout(); navigate('/login') }} className="w-full text-left px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50">
            Sair
          </button>
        </div>
      )}

      {/* Hotel picker modal */}
      {showHotelPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setShowHotelPicker(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-5" onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <h2 className="text-lg font-bold mb-4">Selecionar Hotel</h2>
            {hoteis.map(h => (
              <div key={h.id} onClick={() => { selectHotel(h); setShowHotelPicker(false) }}
                className="p-4 rounded-xl border border-slate-100 mb-2 cursor-pointer active:bg-blue-50">
                <p className="font-semibold">{h.nome}</p>
                <p className="text-xs text-slate-500">{h.endereco}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 p-3 pb-20 overflow-y-auto">
        <Outlet />
      </div>

      {/* FAB para nova OS */}
      {location.pathname === '/os' && (
        <button onClick={() => navigate('/os/nova')}
          className="fixed bottom-20 right-4 w-14 h-14 bg-blue-800 rounded-full flex items-center justify-center text-white shadow-lg z-30 active:scale-95">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-7 h-7">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
      )}

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-slate-200 flex z-40 shadow-lg safe-bottom">
        {NAV.map(item => {
          const active = location.pathname.startsWith(item.path)
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-14 text-xs font-medium transition-colors
                ${active ? 'text-blue-800' : 'text-slate-400'}`}>
              {item.icon}
              <span className="text-[10px]">{item.label}</span>
            </button>
          )
        })}
      </nav>

      {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />}
    </div>
  )
}
