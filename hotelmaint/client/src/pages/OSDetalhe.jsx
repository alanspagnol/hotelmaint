import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'
import { PrioridadeBadge, SLABadge, StatusBadge, STATUS_LABELS, Spinner, BackButton, timeAgo } from '../components/ui'

export default function OSDetalhe() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [os, setOS] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tecnicos, setTecnicos] = useState([])
  const [estoque, setEstoque] = useState([])
  const [comentario, setComentario] = useState('')
  const [tecnicoId, setTecnicoId] = useState('')
  const [estoqueId, setEstoqueId] = useState('')
  const [qtdPeca, setQtdPeca] = useState(1)
  const [obsConc, setObsConc] = useState('')
  const [custoMO, setCustoMO] = useState(0)
  const [saving, setSaving] = useState(false)

  async function load() {
    const [osR, tecR] = await Promise.all([
      api.get(`/os/${id}`),
      api.get('/usuarios', { params: { hotel_id: user.hotel_id } }).catch(() => ({ data: [] }))
    ])
    setOS(osR.data)
    setTecnicos(tecR.data.filter(u => u.role === 'tecnico'))
    setObsConc(osR.data.observacoes_conclusao || '')
    setCustoMO(osR.data.custo_mao_obra || 0)
    if (osR.data.hotel_id) {
      api.get('/estoque', { params: { hotel_id: osR.data.hotel_id } }).then(r => setEstoque(r.data)).catch(() => {})
    }
  }

  useEffect(() => {
    load().catch(console.error).finally(() => setLoading(false))
  }, [id])

  async function action(fn) {
    setSaving(true)
    try { await fn(); await load() } catch (e) { alert(e.response?.data?.error || 'Erro ao salvar') }
    finally { setSaving(false) }
  }

  if (loading) return <Spinner />
  if (!os) return <div className="text-center p-8 text-slate-400">OS não encontrada</div>

  const isAdmin = ['admin', 'supervisor'].includes(user.role)
  const isTecnico = user.role === 'tecnico'
  const isMeuOS = os.tecnico_id === user.id

  return (
    <div>
      <BackButton onClick={() => navigate('/os')} label="Voltar" />

      {/* Header */}
      <div className="card">
        <p className="text-xs text-slate-400 mb-1">#{os.id} · {os.tipo} · {os.hotel_nome}</p>
        <h2 className="text-lg font-bold text-slate-800 mb-3">{os.titulo}</h2>
        <div className="flex gap-1.5 flex-wrap mb-3">
          <PrioridadeBadge p={os.prioridade} />
          <StatusBadge status={os.status} />
          <SLABadge os={os} />
        </div>
        {os.descricao && <p className="text-sm text-slate-600 mb-3">{os.descricao}</p>}
        <div className="border-t border-slate-50 pt-3 space-y-1">
          <p className="text-xs text-slate-500">📍 {os.localizacao}</p>
          <p className="text-xs text-slate-500">👤 Técnico: {os.tecnico_nome || 'Não atribuído'}</p>
          <p className="text-xs text-slate-500">🙋 Solicitante: {os.solicitante_nome}</p>
          <p className="text-xs text-slate-500">📅 Abertura: {new Date(os.data_abertura).toLocaleString('pt-BR')}</p>
          {os.ativo_nome && <p className="text-xs text-slate-500">🔧 Ativo: {os.ativo_nome}</p>}
          {os.data_conclusao && <p className="text-xs text-slate-500">✅ Conclusão: {new Date(os.data_conclusao).toLocaleString('pt-BR')}</p>}
          {(os.custo_pecas > 0 || os.custo_mao_obra > 0) && (
            <p className="text-xs text-slate-500">💰 Custo: R$ {(os.custo_pecas + os.custo_mao_obra).toFixed(2)}</p>
          )}
        </div>
      </div>

      {/* Ações supervisor: atribuir */}
      {isAdmin && os.status === 'triagem' && (
        <div className="card">
          <p className="font-semibold text-sm mb-3">Atribuir técnico</p>
          <label className="label">Selecionar técnico</label>
          <select className="input" value={tecnicoId} onChange={e => setTecnicoId(e.target.value)}>
            <option value="">Selecione...</option>
            {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <button className="btn btn-primary" disabled={!tecnicoId || saving}
            onClick={() => action(() => api.patch(`/os/${id}/atribuir`, { tecnico_id: parseInt(tecnicoId) }))}>
            {saving ? 'Salvando...' : 'Atribuir'}
          </button>
        </div>
      )}

      {/* Ações técnico: iniciar */}
      {(isTecnico || isAdmin) && os.status === 'atribuida' && (isMeuOS || isAdmin) && (
        <button className="btn btn-success mb-3" disabled={saving}
          onClick={() => action(() => api.patch(`/os/${id}/iniciar`))}>
          ▶ Iniciar Execução
        </button>
      )}

      {/* Ações técnico: registrar peça + concluir */}
      {(isTecnico || isAdmin) && os.status === 'em_execucao' && (isMeuOS || isAdmin) && (
        <div className="card">
          <p className="font-semibold text-sm mb-3">Registrar peça utilizada</p>
          <label className="label">Item do estoque</label>
          <select className="input" value={estoqueId} onChange={e => setEstoqueId(e.target.value)}>
            <option value="">Selecione um item...</option>
            {estoque.map(e => <option key={e.id} value={e.id}>{e.item_nome} ({e.quantidade_atual} {e.unidade})</option>)}
          </select>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="label">Quantidade</label>
              <input type="number" className="input" min="1" value={qtdPeca} onChange={e => setQtdPeca(parseInt(e.target.value) || 1)} />
            </div>
            <div className="flex items-end pb-2.5">
              <button className="btn btn-secondary btn-sm" disabled={!estoqueId || saving}
                onClick={() => action(async () => {
                  await api.post(`/os/${id}/peca`, { estoque_id: parseInt(estoqueId), quantidade: qtdPeca })
                  setEstoqueId(''); setQtdPeca(1)
                })}>
                Registrar
              </button>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3 mt-1">
            <p className="font-semibold text-sm mb-2">Concluir OS</p>
            <label className="label">Custo mão de obra (R$)</label>
            <input type="number" className="input" value={custoMO} onChange={e => setCustoMO(parseFloat(e.target.value) || 0)} />
            <label className="label">Observações de conclusão</label>
            <textarea className="input min-h-20 resize-none" value={obsConc} onChange={e => setObsConc(e.target.value)} placeholder="Descreva o que foi feito..." />
            <button className="btn btn-success" disabled={saving}
              onClick={() => action(() => api.patch(`/os/${id}/concluir`, { observacoes_conclusao: obsConc, custo_mao_obra: custoMO }))}>
              ✅ Concluir OS
            </button>
          </div>
        </div>
      )}

      {/* Ações supervisor: validar */}
      {isAdmin && os.status === 'concluida' && (
        <div className="card">
          <p className="font-semibold text-sm mb-2">Validação do supervisor</p>
          {os.observacoes_conclusao && (
            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 mb-3">{os.observacoes_conclusao}</div>
          )}
          <div className="flex gap-2">
            <button className="btn btn-success flex-1" disabled={saving} onClick={() => {
              action(() => api.post(`/os/${id}/comentario`, { conteudo: 'OS aprovada e validada pelo supervisor.', tipo: 'status_change' }))
              alert('OS aprovada!')
            }}>✅ Aprovar</button>
            <button className="btn btn-danger flex-1" disabled={saving}
              onClick={() => { const m = prompt('Motivo para reabrir:'); if (m) action(() => api.patch(`/os/${id}/reabrir`, { motivo: m })) }}>
              ↩ Reabrir
            </button>
          </div>
        </div>
      )}

      {/* Muda status aguardando peça */}
      {(isTecnico || isAdmin) && os.status === 'em_execucao' && (
        <button className="btn btn-secondary mb-3" disabled={saving}
          onClick={() => action(() => api.patch(`/os/${id}/status`, { status: 'aguardando_peca' }))}>
          ⏳ Aguardando Peça
        </button>
      )}
      {(isTecnico || isAdmin) && os.status === 'aguardando_peca' && (
        <button className="btn btn-secondary mb-3" disabled={saving}
          onClick={() => action(() => api.patch(`/os/${id}/status`, { status: 'em_execucao' }))}>
          ▶ Retomar Execução
        </button>
      )}

      {/* Timeline */}
      <div className="card">
        <p className="font-semibold text-sm mb-3">Timeline</p>
        {(!os.registros || os.registros.length === 0) && <p className="text-xs text-slate-400">Sem registros ainda.</p>}
        {os.registros?.map(r => (
          <div key={r.id} className="flex gap-3 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
              r.tipo === 'status_change' ? 'bg-green-500' : r.tipo === 'peca_usada' ? 'bg-orange-500' : 'bg-blue-400'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-700">{r.conteudo}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{r.autor_nome} · {timeAgo(r.created_at)}</p>
            </div>
          </div>
        ))}

        {/* Adicionar comentário */}
        <div className="border-t border-slate-100 pt-3 mt-3">
          <label className="label">Adicionar comentário</label>
          <textarea className="input min-h-16 resize-none" value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Escreva um comentário..." />
          <button className="btn btn-secondary" disabled={!comentario || saving}
            onClick={() => action(async () => { await api.post(`/os/${id}/comentario`, { conteudo: comentario }); setComentario('') })}>
            Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}
