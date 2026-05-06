import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'
import { PrioridadeBadge, SLABadge, StatusBadge, STATUS_LABELS, Spinner, Empty, timeAgo } from '../components/ui'

const FILTROS_STATUS = ['todas', 'aberta', 'triagem', 'atribuida', 'em_execucao', 'aguardando_peca', 'concluida']
const FILTROS_PRIO = ['todas', 'urgente', 'alta', 'normal', 'baixa']

export default function OS() {
  const { hotelId, user } = useAuth()
  const navigate = useNavigate()
  const [os, setOS] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('todas')
  const [filtroPrio, setFiltroPrio] = useState('todas')

  useEffect(() => {
    setLoading(true)
    const params = { hotel_id: hotelId }
    if (filtroStatus !== 'todas') params.status = filtroStatus
    if (filtroPrio !== 'todas') params.prioridade = filtroPrio
    api.get('/os', { params })
      .then(r => setOS(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [hotelId, filtroStatus, filtroPrio])

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-bold text-slate-800">Ordens de Serviço</h2>
        <span className="text-xs text-slate-500">{os.length} OS</span>
      </div>

      {/* Filtro status */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-2 scrollbar-hide">
        {FILTROS_STATUS.map(s => (
          <button key={s} onClick={() => setFiltroStatus(s)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
              ${filtroStatus === s ? 'bg-blue-800 text-white border-blue-800' : 'bg-white text-slate-600 border-slate-200'}`}>
            {s === 'todas' ? 'Todas' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Filtro prioridade */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
        {FILTROS_PRIO.map(p => (
          <button key={p} onClick={() => setFiltroPrio(p)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
              ${filtroPrio === p ? 'bg-blue-800 text-white border-blue-800' : 'bg-white text-slate-600 border-slate-200'}`}>
            {p === 'todas' ? 'Toda prioridade' : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : os.length === 0 ? <Empty text="Nenhuma OS encontrada" /> : (
        os.map(o => (
          <div key={o.id} className={`os-card os-${o.prioridade}`} onClick={() => navigate(`/os/${o.id}`)}>
            <div className="flex justify-between items-start mb-1">
              <span className="text-xs text-slate-400">#{o.id} · {o.tipo}</span>
              <span className="text-xs text-slate-400">{timeAgo(o.data_abertura)}</span>
            </div>
            <p className="font-semibold text-sm text-slate-800 mb-1">{o.titulo}</p>
            <p className="text-xs text-slate-500 mb-2">{o.localizacao}</p>
            <div className="flex gap-1.5 flex-wrap">
              <PrioridadeBadge p={o.prioridade} />
              <StatusBadge status={o.status} />
              <SLABadge os={o} />
            </div>
            {o.tecnico_nome && (
              <p className="text-xs text-slate-400 mt-1.5">👤 {o.tecnico_nome}</p>
            )}
          </div>
        ))
      )}
    </div>
  )
}
