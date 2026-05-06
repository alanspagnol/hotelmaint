import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'
import { PrioridadeBadge, SLABadge, STATUS_CORES, STATUS_LABELS, Spinner, timeAgo } from '../components/ui'

export default function Dashboard() {
  const { hotelId } = useAuth()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/dashboard', { params: { hotel_id: hotelId } })
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [hotelId])

  if (loading) return <Spinner />
  if (!data) return null

  const statusList = ['aberta', 'triagem', 'atribuida', 'em_execucao', 'aguardando_peca', 'concluida']
  const total = statusList.reduce((s, k) => s + (data.por_status?.find(x => x.status === k)?.total || 0), 0) || 1

  return (
    <div>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {[
          { label: 'Abertas hoje', val: data.abertas_hoje, color: 'text-blue-700' },
          { label: 'Em atraso', val: data.atrasadas, color: 'text-red-600' },
          { label: 'Concluídas 7d', val: data.concluidas_7d, color: 'text-green-600' },
          { label: 'Total abertas', val: data.total_abertas, color: 'text-orange-600' }
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm text-center">
            <p className={`text-3xl font-bold ${k.color}`}>{k.val}</p>
            <p className="text-xs text-slate-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Alertas de estoque */}
      {data.estoque_alertas?.length > 0 && (
        <div className="card border-red-100 bg-red-50 mb-3">
          <p className="text-sm font-bold text-red-700 mb-2">⚠️ Estoque abaixo do mínimo</p>
          {data.estoque_alertas.map(e => (
            <div key={e.id} className="flex justify-between text-xs py-1 border-b border-red-100 last:border-0">
              <span className="text-red-800 font-medium">{e.item_nome}</span>
              <span className="text-red-600">{e.quantidade_atual}/{e.quantidade_minima} {e.unidade}</span>
            </div>
          ))}
        </div>
      )}

      {/* OS Urgentes */}
      {data.urgentes?.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-bold text-slate-700 mb-2">🚨 Urgentes / Em risco</p>
          {data.urgentes.map(os => (
            <div key={os.id} className={`os-card os-${os.prioridade}`} onClick={() => navigate(`/os/${os.id}`)}>
              <p className="text-xs text-slate-400 mb-1">#{os.id} · {timeAgo(os.data_abertura)}</p>
              <p className="font-semibold text-sm">{os.titulo}</p>
              <p className="text-xs text-slate-500 mb-2">{os.localizacao}</p>
              <div className="flex gap-2 flex-wrap">
                <PrioridadeBadge p={os.prioridade} />
                <SLABadge os={os} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Status chart */}
      <div className="card">
        <p className="text-sm font-bold mb-3">OS por status</p>
        {statusList.map(s => {
          const count = data.por_status?.find(x => x.status === s)?.total || 0
          const pct = Math.round((count / total) * 100)
          return (
            <div key={s} className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-600">{STATUS_LABELS[s]}</span>
                <span className="font-semibold">{count}</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: STATUS_CORES[s] }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Carga técnicos */}
      {data.tecnicos_carga?.length > 0 && (
        <div className="card">
          <p className="text-sm font-bold mb-3">Carga dos técnicos</p>
          {data.tecnicos_carga.map(t => (
            <div key={t.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-800">
                  {t.nome?.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-sm font-medium">{t.nome}</span>
              </div>
              <span className={`badge ${t.os_abertas > 3 ? 'badge-urgente' : t.os_abertas > 1 ? 'badge-alta' : 'badge-ok'}`}>
                {t.os_abertas} OS
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
