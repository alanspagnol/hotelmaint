import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'
import { Spinner, Empty } from '../components/ui'

const FREQ_LABELS = { diario: 'Diário', semanal: 'Semanal', mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' }

export function Preventiva() {
  const { hotelId, user } = useAuth()
  const [planos, setPlanos] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)

  useEffect(() => {
    api.get('/preventivos', { params: { hotel_id: hotelId } })
      .then(r => setPlanos(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [hotelId])

  async function gerarOS(plano) {
    setSaving(plano.id)
    try {
      const { data } = await api.post(`/preventivos/${plano.id}/gerar-os`)
      alert(`OS #${data.os_id} criada! Próxima execução: ${data.proxima_execucao}`)
      const r = await api.get('/preventivos', { params: { hotel_id: hotelId } })
      setPlanos(r.data)
    } catch (e) { alert(e.response?.data?.error || 'Erro') }
    finally { setSaving(null) }
  }

  if (loading) return <Spinner />

  return (
    <div>
      <h2 className="text-base font-bold mb-4">Manutenção Preventiva</h2>
      {planos.length === 0 ? <Empty text="Nenhum plano preventivo cadastrado" /> : planos.map(p => {
        const hoje = new Date()
        const proxima = new Date(p.proxima_execucao)
        const diff = Math.ceil((proxima - hoje) / 86400000)
        const atrasado = diff < 0
        const proximo = diff >= 0 && diff <= 7
        return (
          <div key={p.id} className="card">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 pr-2">
                <p className="font-semibold text-sm">{p.titulo}</p>
                <span className="badge bg-blue-50 text-blue-700 mt-1">{FREQ_LABELS[p.frequencia]}</span>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-bold ${atrasado ? 'text-red-600' : proximo ? 'text-orange-600' : 'text-green-600'}`}>
                  {atrasado ? `${Math.abs(diff)}d atrasado` : diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : `${diff} dias`}
                </p>
                <p className="text-xs text-slate-400">{proxima.toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            {p.instrucoes && <p className="text-xs text-slate-500 mb-2">{p.instrucoes}</p>}
            <p className="text-xs text-slate-400 mb-3">Responsável: {p.responsavel_nome || 'Não definido'}</p>
            {(atrasado || proximo) && ['admin', 'supervisor'].includes(user.role) && (
              <button className="btn btn-primary text-sm" disabled={saving === p.id}
                onClick={() => gerarOS(p)}>
                {saving === p.id ? 'Gerando...' : '📋 Gerar OS Preventiva'}
              </button>
            )}
            {p.ultima_execucao && <p className="text-xs text-slate-400 mt-2">Última execução: {new Date(p.ultima_execucao).toLocaleDateString('pt-BR')}</p>}
          </div>
        )
      })}
    </div>
  )
}

export function Estoque() {
  const { hotelId, user } = useAuth()
  const [itens, setItens] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [entradaModal, setEntradaModal] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ item_nome: '', categoria: 'outro', quantidade_atual: 0, quantidade_minima: 5, unidade: 'un', fornecedor: '', custo_unitario: 0 })
  const [qtdEntrada, setQtdEntrada] = useState(1)
  const [obsEntrada, setObsEntrada] = useState('')

  async function load() {
    const r = await api.get('/estoque', { params: { hotel_id: hotelId } })
    setItens(r.data)
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [hotelId])

  const isAdmin = ['admin', 'supervisor'].includes(user.role)
  const alertas = itens.filter(i => i.quantidade_atual < i.quantidade_minima)

  async function salvar() {
    setSaving(true)
    try { await api.post('/estoque', { ...form, hotel_id: hotelId }); await load(); setModal(false) }
    catch (e) { alert(e.response?.data?.error || 'Erro') }
    finally { setSaving(false) }
  }

  async function registrarEntrada() {
    setSaving(true)
    try { await api.post(`/estoque/${entradaModal.id}/entrada`, { quantidade: qtdEntrada, observacao: obsEntrada }); await load(); setEntradaModal(null) }
    catch (e) { alert(e.response?.data?.error || 'Erro') }
    finally { setSaving(false) }
  }

  if (loading) return <Spinner />

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-bold">Estoque de Peças</h2>
        {isAdmin && <button className="btn btn-primary btn-sm" onClick={() => setModal(true)}>+ Novo item</button>}
      </div>

      {alertas.length > 0 && (
        <div className="card border-red-100 bg-red-50 mb-3">
          <p className="text-sm font-bold text-red-700 mb-1">⚠️ {alertas.length} item(s) abaixo do mínimo</p>
          {alertas.map(e => <p key={e.id} className="text-xs text-red-600">{e.item_nome}: {e.quantidade_atual}/{e.quantidade_minima} {e.unidade}</p>)}
        </div>
      )}

      {itens.map(item => {
        const pct = Math.min(100, (item.quantidade_atual / (item.quantidade_minima || 1)) * 100)
        const cor = item.quantidade_atual < item.quantidade_minima ? '#dc2626' : item.quantidade_atual < item.quantidade_minima * 1.5 ? '#d97706' : '#16a34a'
        return (
          <div key={item.id} className="card">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold text-sm">{item.item_nome}</p>
                <p className="text-xs text-slate-500">{item.fornecedor} · R$ {item.custo_unitario}/un</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold" style={{ color: cor }}>{item.quantidade_atual}</p>
                <p className="text-xs text-slate-400">{item.unidade} (mín: {item.quantidade_minima})</p>
              </div>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full mb-2">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cor }} />
            </div>
            {isAdmin && (
              <button className="btn btn-secondary btn-sm mt-1" onClick={() => { setEntradaModal(item); setQtdEntrada(1); setObsEntrada('') }}>
                + Entrada de estoque
              </button>
            )}
          </div>
        )
      })}

      {/* Modal novo item */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setModal(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 mx-auto" onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-4">Novo Item de Estoque</h3>
            <label className="label">Nome do item</label>
            <input className="input" value={form.item_nome} onChange={e => setForm({ ...form, item_nome: e.target.value })} placeholder="Ex: Filtro de ar condicionado" />
            <label className="label">Categoria</label>
            <select className="input" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
              {['eletrica', 'hidraulica', 'climatizacao', 'piscina', 'elevador', 'gerador', 'outro'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <div><label className="label">Qtd. atual</label><input type="number" className="input" value={form.quantidade_atual} onChange={e => setForm({ ...form, quantidade_atual: parseFloat(e.target.value) || 0 })} /></div>
              <div><label className="label">Qtd. mínima</label><input type="number" className="input" value={form.quantidade_minima} onChange={e => setForm({ ...form, quantidade_minima: parseFloat(e.target.value) || 0 })} /></div>
              <div><label className="label">Unidade</label><input className="input" value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })} /></div>
              <div><label className="label">Custo unit. R$</label><input type="number" className="input" value={form.custo_unitario} onChange={e => setForm({ ...form, custo_unitario: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <label className="label">Fornecedor</label>
            <input className="input" value={form.fornecedor} onChange={e => setForm({ ...form, fornecedor: e.target.value })} />
            <button className="btn btn-primary" onClick={salvar} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      )}

      {/* Modal entrada */}
      {entradaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setEntradaModal(null)}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 mx-auto" onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-1">Entrada de Estoque</h3>
            <p className="text-sm text-slate-500 mb-4">{entradaModal.item_nome}</p>
            <label className="label">Quantidade</label>
            <input type="number" className="input" value={qtdEntrada} min="1" onChange={e => setQtdEntrada(parseFloat(e.target.value) || 1)} />
            <label className="label">Observação</label>
            <input className="input" value={obsEntrada} onChange={e => setObsEntrada(e.target.value)} placeholder="Ex: Compra NF 1234" />
            <button className="btn btn-success" onClick={registrarEntrada} disabled={saving}>{saving ? 'Registrando...' : 'Registrar Entrada'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Relatorios() {
  const { hotelId } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState(30)

  useEffect(() => {
    setLoading(true)
    const di = new Date(Date.now() - periodo * 86400000).toISOString()
    api.get('/relatorios', { params: { hotel_id: hotelId, data_inicio: di } })
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [hotelId, periodo])

  if (loading) return <Spinner />

  const t = data?.totais || {}
  const pctPrev = t.total > 0 ? Math.round((t.preventivas / t.total) * 100) : 0
  const maxPrio = Math.max(...(data?.por_prioridade?.map(p => p.total) || [1]), 1)

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-bold">Relatórios</h2>
        <select className="input w-auto mb-0 text-xs" value={periodo} onChange={e => setPeriodo(parseInt(e.target.value))}>
          <option value={7}>7 dias</option>
          <option value={30}>30 dias</option>
          <option value={90}>90 dias</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {[
          { label: 'Total OS', val: t.total || 0, color: 'text-slate-800' },
          { label: 'Concluídas', val: t.concluidas || 0, color: 'text-green-600' },
          { label: 'Custo total', val: `R$ ${(t.custo_total || 0).toFixed(0)}`, color: 'text-blue-700' },
          { label: 'Tempo médio', val: `${t.tempo_medio_horas || 0}h`, color: 'text-orange-600' }
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl p-4 border border-slate-100 text-center shadow-sm">
            <p className={`text-2xl font-bold ${k.color}`}>{k.val}</p>
            <p className="text-xs text-slate-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Preventiva vs Corretiva */}
      <div className="card mb-3">
        <p className="font-semibold text-sm mb-3">Preventiva vs Corretiva</p>
        <div className="flex items-center gap-4">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="30" fill="none" stroke="#e2e8f0" strokeWidth="12"/>
            <circle cx="40" cy="40" r="30" fill="none" stroke="#1e40af" strokeWidth="12"
              strokeDasharray={`${pctPrev * 1.885} 188.5`} strokeLinecap="round" transform="rotate(-90 40 40)"/>
            <text x="40" y="36" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1e40af">{pctPrev}%</text>
            <text x="40" y="49" textAnchor="middle" fontSize="9" fill="#64748b">prev.</text>
          </svg>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-blue-800" /><span className="text-xs">Preventiva: {t.preventivas || 0}</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-slate-200" /><span className="text-xs">Corretiva: {t.corretivas || 0}</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-200" /><span className="text-xs">SLA estourado: {t.sla_estourado || 0}</span></div>
          </div>
        </div>
      </div>

      {/* Por prioridade */}
      {data?.por_prioridade?.length > 0 && (
        <div className="card mb-3">
          <p className="font-semibold text-sm mb-3">OS por prioridade</p>
          <div className="flex items-end gap-2 h-20">
            {[
              { p: 'urgente', c: '#dc2626' }, { p: 'alta', c: '#ea580c' },
              { p: 'normal', c: '#2563eb' }, { p: 'baixa', c: '#94a3b8' }
            ].map(({ p, c }) => {
              const count = data.por_prioridade.find(x => x.prioridade === p)?.total || 0
              return (
                <div key={p} className="flex-1 flex flex-col items-center">
                  <p className="text-xs font-bold mb-1">{count}</p>
                  <div className="w-full rounded-t-md" style={{ height: `${(count / maxPrio) * 52}px`, background: c }} />
                  <p className="text-[9px] text-slate-400 mt-1 text-center">{p}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Ativos críticos */}
      {data?.ativos_criticos?.length > 0 && (
        <div className="card">
          <p className="font-semibold text-sm mb-3">Ativos com mais corretivas</p>
          {data.ativos_criticos.map((a, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-xs font-medium">{a.nome}</p>
                <p className="text-[10px] text-slate-400">{a.localizacao}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800">{a.total_os} OS</p>
                {a.custo_total > 0 && <p className="text-[10px] text-slate-400">R$ {a.custo_total.toFixed(0)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
