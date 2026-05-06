import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'
import { BackButton } from '../components/ui'

const PRIO_RULES = [
  { regex: /urgente|elevador|energia|incêndio|incendio|vazamento grande|fogo|curto|queimado/i, val: 'urgente' },
  { regex: /ar.condicionado|chuveiro|trava|fechadura|tv |televisão|infiltração/i, val: 'alta' }
]

function detectPrio(titulo, desc) {
  const txt = `${titulo} ${desc}`
  for (const r of PRIO_RULES) if (r.regex.test(txt)) return r.val
  return 'normal'
}

export default function NovaOS() {
  const { user, hotelId } = useAuth()
  const navigate = useNavigate()
  const [ativos, setAtivos] = useState([])
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    tipo: 'corretiva', titulo: '', descricao: '', localizacao: '', ativo_id: '', hotel_id: hotelId
  })

  useEffect(() => {
    if (hotelId) api.get('/ativos', { params: { hotel_id: hotelId } }).then(r => setAtivos(r.data)).catch(() => {})
  }, [hotelId])

  const prioDectada = form.titulo ? detectPrio(form.titulo, form.descricao) : null
  const prioColor = { urgente: 'text-red-600', alta: 'text-orange-600', normal: 'text-blue-600', baixa: 'text-slate-500' }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.titulo || !form.localizacao) return alert('Preencha título e localização')
    setSaving(true)
    try {
      const { data } = await api.post('/os', { ...form, hotel_id: hotelId, ativo_id: form.ativo_id || undefined })
      navigate(`/os/${data.id}`)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar OS')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <BackButton onClick={() => navigate('/os')} label="Voltar" />
      <h2 className="text-lg font-bold mb-4">Nova Ordem de Serviço</h2>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <label className="label">Tipo de OS</label>
          <select className="input" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
            <option value="corretiva">Corretiva (problema ocorreu)</option>
            <option value="preventiva">Preventiva (manutenção agendada)</option>
          </select>

          <label className="label">Título / Problema *</label>
          <input className="input" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })}
            placeholder="Ex: Ar condicionado não liga no quarto 205" required />
          {prioDectada && (
            <p className="text-xs mb-2 -mt-1">
              Prioridade detectada: <strong className={prioColor[prioDectada]}>{prioDectada.toUpperCase()}</strong>
            </p>
          )}

          <label className="label">Descrição do problema</label>
          <textarea className="input min-h-20 resize-none" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })}
            placeholder="Descreva o problema com mais detalhes..." />

          <label className="label">Localização *</label>
          <input className="input" value={form.localizacao} onChange={e => setForm({ ...form, localizacao: e.target.value })}
            placeholder="Ex: Quarto 205, Restaurante, Área da piscina..." required />

          <label className="label">Equipamento relacionado (opcional)</label>
          <select className="input" value={form.ativo_id} onChange={e => setForm({ ...form, ativo_id: e.target.value })}>
            <option value="">Nenhum / Não sei</option>
            {ativos.map(a => <option key={a.id} value={a.id}>{a.nome} — {a.localizacao}</option>)}
          </select>

          <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-800 mb-4">
            ℹ️ A prioridade é calculada automaticamente com base no título e descrição. OS urgentes notificam o supervisor imediatamente.
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Abrindo OS...' : '📋 Abrir Ordem de Serviço'}
          </button>
        </div>
      </form>
    </div>
  )
}
