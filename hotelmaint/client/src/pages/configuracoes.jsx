import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../api'
import { Spinner } from '../components/ui'

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'senha', label: '🔑 Minha Senha' },
  { id: 'usuarios', label: '👥 Equipe' },
  { id: 'hoteis', label: '🏨 Hotéis' },
]

// ── Alterar senha (qualquer usuário) ──────────────────────────────────────────
function AlterarSenha() {
  const [form, setForm] = useState({ senha_atual: '', nova_senha: '', confirmar: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  async function salvar(e) {
    e.preventDefault()
    if (form.nova_senha !== form.confirmar) return setMsg({ tipo: 'erro', texto: 'A nova senha e a confirmação não coincidem.' })
    if (form.nova_senha.length < 6) return setMsg({ tipo: 'erro', texto: 'A nova senha deve ter pelo menos 6 caracteres.' })
    setSaving(true)
    try {
      await api.post('/auth/alterar-senha', { senha_atual: form.senha_atual, nova_senha: form.nova_senha })
      setMsg({ tipo: 'ok', texto: 'Senha alterada com sucesso!' })
      setForm({ senha_atual: '', nova_senha: '', confirmar: '' })
    } catch (err) {
      setMsg({ tipo: 'erro', texto: err.response?.data?.error || 'Erro ao alterar senha.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card max-w-sm">
      <h3 className="font-bold text-sm mb-4">Alterar minha senha</h3>
      <form onSubmit={salvar}>
        <label className="label">Senha atual</label>
        <input type="password" className="input" value={form.senha_atual}
          onChange={e => setForm({ ...form, senha_atual: e.target.value })} required />
        <label className="label">Nova senha</label>
        <input type="password" className="input" value={form.nova_senha}
          onChange={e => setForm({ ...form, nova_senha: e.target.value })} required />
        <label className="label">Confirmar nova senha</label>
        <input type="password" className="input" value={form.confirmar}
          onChange={e => setForm({ ...form, confirmar: e.target.value })} required />
        {msg && (
          <div className={`rounded-lg p-3 text-xs mb-3 ${msg.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {msg.texto}
          </div>
        )}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Alterar Senha'}
        </button>
      </form>
    </div>
  )
}

// ── Gestão de usuários (admin) ─────────────────────────────────────────────────
function GestaoUsuarios({ hoteis }) {
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [saving, setSaving] = useState(false)
  const [senhaModal, setSenhaModal] = useState(null)
  const [novaSenhaAdmin, setNovaSenhaAdmin] = useState('')
  const [savingSenha, setSavingSenha] = useState(false)
  const [form, setForm] = useState({ nome: '', email: '', senha: '', role: 'tecnico', hotel_id: '' })

  async function load() {
    const r = await api.get('/usuarios')
    setUsuarios(r.data)
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  function abrirNovo() {
    setEditando(null)
    setForm({ nome: '', email: '', senha: '', role: 'tecnico', hotel_id: '' })
    setModal(true)
  }

  function abrirEditar(u) {
    setEditando(u)
    setForm({ nome: u.nome, email: u.email, senha: '', role: u.role, hotel_id: u.hotel_id || '' })
    setModal(true)
  }

  async function salvar() {
    if (!form.nome || !form.email) return alert('Nome e e-mail são obrigatórios')
    if (!editando && !form.senha) return alert('Senha é obrigatória para novo usuário')
    setSaving(true)
    try {
      if (editando) {
        await api.put(`/usuarios/${editando.id}`, { nome: form.nome, role: form.role, hotel_id: form.hotel_id || null, ativo: 1 })
      } else {
        await api.post('/usuarios', { nome: form.nome, email: form.email, senha: form.senha, role: form.role, hotel_id: form.hotel_id || null })
      }
      await load()
      setModal(false)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function redefinirSenha() {
    if (!novaSenhaAdmin || novaSenhaAdmin.length < 6) return alert('Mínimo 6 caracteres')
    setSavingSenha(true)
    try {
      await api.post(`/usuarios/${senhaModal.id}/redefinir-senha`, { nova_senha: novaSenhaAdmin })
      alert(`Senha de ${senhaModal.nome} redefinida com sucesso!`)
      setSenhaModal(null)
      setNovaSenhaAdmin('')
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao redefinir senha')
    } finally {
      setSavingSenha(false)
    }
  }

  const ROLE_LABELS = { admin: 'Admin', supervisor: 'Supervisor', tecnico: 'Técnico', hospede: 'Hóspede' }
  const ROLE_CORES = { admin: 'bg-purple-100 text-purple-700', supervisor: 'bg-blue-100 text-blue-700', tecnico: 'bg-green-100 text-green-700', hospede: 'bg-slate-100 text-slate-600' }

  if (loading) return <Spinner />

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-bold text-slate-700">{usuarios.length} usuários cadastrados</p>
        <button className="btn btn-primary btn-sm" onClick={abrirNovo}>+ Novo usuário</button>
      </div>

      {usuarios.map(u => (
        <div key={u.id} className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-800 flex-shrink-0">
              {u.nome.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{u.nome}</p>
              <p className="text-xs text-slate-500 truncate">{u.email}</p>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                <span className={`badge text-[10px] ${ROLE_CORES[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                {u.hotel_id && <span className="badge bg-slate-100 text-slate-500 text-[10px]">{hoteis.find(h => h.id === u.hotel_id)?.nome?.split(' ')[0]}</span>}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <button onClick={() => abrirEditar(u)} className="btn btn-secondary btn-sm text-xs px-2 py-1">Editar</button>
              <button onClick={() => { setSenhaModal(u); setNovaSenhaAdmin('') }} className="btn btn-secondary btn-sm text-xs px-2 py-1">Senha</button>
            </div>
          </div>
        </div>
      ))}

      {/* Modal criar/editar usuário */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setModal(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 mx-auto max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-4">{editando ? 'Editar usuário' : 'Novo usuário'}</h3>

            <label className="label">Nome completo</label>
            <input className="input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: João da Silva" />

            <label className="label">E-mail {editando && <span className="text-slate-400 font-normal">(não pode ser alterado)</span>}</label>
            <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} disabled={!!editando} placeholder="joao@email.com" />

            {!editando && (
              <>
                <label className="label">Senha inicial</label>
                <input type="password" className="input" value={form.senha} onChange={e => setForm({ ...form, senha: e.target.value })} placeholder="Mínimo 6 caracteres" />
              </>
            )}

            <label className="label">Perfil de acesso</label>
            <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="admin">Admin — acesso total</option>
              <option value="supervisor">Supervisor — gerencia OS e equipe</option>
              <option value="tecnico">Técnico — executa OS</option>
              <option value="hospede">Hóspede — abre chamados</option>
            </select>

            <label className="label">Hotel</label>
            <select className="input" value={form.hotel_id} onChange={e => setForm({ ...form, hotel_id: e.target.value })}>
              <option value="">Todos os hotéis (admin)</option>
              {hoteis.map(h => <option key={h.id} value={h.id}>{h.nome}</option>)}
            </select>

            <div className="flex gap-2 mt-2">
              <button className="btn btn-primary flex-1" onClick={salvar} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button className="btn btn-secondary flex-1" onClick={() => setModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal redefinir senha */}
      {senhaModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setSenhaModal(null)}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 mx-auto" onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-1">Redefinir senha</h3>
            <p className="text-sm text-slate-500 mb-4">{senhaModal.nome}</p>
            <label className="label">Nova senha</label>
            <input type="password" className="input" value={novaSenhaAdmin}
              onChange={e => setNovaSenhaAdmin(e.target.value)} placeholder="Mínimo 6 caracteres" />
            <div className="flex gap-2">
              <button className="btn btn-primary flex-1" onClick={redefinirSenha} disabled={savingSenha}>
                {savingSenha ? 'Salvando...' : 'Redefinir'}
              </button>
              <button className="btn btn-secondary flex-1" onClick={() => setSenhaModal(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Gestão de hotéis (admin) ───────────────────────────────────────────────────
function GestaoHoteis({ hoteis, setHoteis }) {
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ nome: '', endereco: '', telefone: '' })

  function abrirNovo() {
    setEditando(null)
    setForm({ nome: '', endereco: '', telefone: '' })
    setModal(true)
  }

  function abrirEditar(h) {
    setEditando(h)
    setForm({ nome: h.nome, endereco: h.endereco || '', telefone: h.telefone || '' })
    setModal(true)
  }

  async function salvar() {
    if (!form.nome) return alert('Nome do hotel é obrigatório')
    setSaving(true)
    try {
      if (editando) {
        const r = await api.put(`/hoteis/${editando.id}`, form)
        setHoteis(prev => prev.map(h => h.id === editando.id ? r.data : h))
      } else {
        const r = await api.post('/hoteis', form)
        setHoteis(prev => [...prev, r.data])
      }
      setModal(false)
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm font-bold text-slate-700">{hoteis.length} hotéis cadastrados</p>
        <button className="btn btn-primary btn-sm" onClick={abrirNovo}>+ Novo hotel</button>
      </div>

      {hoteis.map(h => (
        <div key={h.id} className="card">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="font-semibold text-sm">{h.nome}</p>
              {h.endereco && <p className="text-xs text-slate-500 mt-0.5">📍 {h.endereco}</p>}
              {h.telefone && <p className="text-xs text-slate-500">📞 {h.telefone}</p>}
            </div>
            <button onClick={() => abrirEditar(h)} className="btn btn-secondary btn-sm flex-shrink-0">Editar</button>
          </div>
        </div>
      ))}

      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={() => setModal(false)}>
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 mx-auto" onClick={e => e.stopPropagation()}>
            <div className="w-9 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
            <h3 className="font-bold text-lg mb-4">{editando ? 'Editar hotel' : 'Novo hotel'}</h3>

            <label className="label">Nome do hotel</label>
            <input className="input" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Grand Hotel Porto Seguro" />

            <label className="label">Endereço</label>
            <input className="input" value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} placeholder="Ex: Av. Beira Mar, 1500 - Porto Seguro, BA" />

            <label className="label">Telefone</label>
            <input className="input" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="Ex: (73) 3288-1000" />

            <div className="flex gap-2 mt-2">
              <button className="btn btn-primary flex-1" onClick={salvar} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button className="btn btn-secondary flex-1" onClick={() => setModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Página principal Configurações ─────────────────────────────────────────────
export default function Configuracoes() {
  const { user } = useAuth()
  const [aba, setAba] = useState('senha')
  const [hoteis, setHoteis] = useState([])
  const isAdmin = user?.role === 'admin'

  const tabs = isAdmin ? TABS : [TABS[0]]

  useEffect(() => {
    if (isAdmin) {
      api.get('/hoteis').then(r => setHoteis(r.data)).catch(() => {})
    }
  }, [isAdmin])

  return (
    <div>
      <h2 className="text-base font-bold mb-4">⚙️ Configurações</h2>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setAba(t.id)}
            className={`flex-shrink-0 px-3 py-2 rounded-full text-xs font-medium border transition-colors
              ${aba === t.id ? 'bg-blue-800 text-white border-blue-800' : 'bg-white text-slate-600 border-slate-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {aba === 'senha' && <AlterarSenha />}
      {aba === 'usuarios' && isAdmin && <GestaoUsuarios hoteis={hoteis} />}
      {aba === 'hoteis' && isAdmin && <GestaoHoteis hoteis={hoteis} setHoteis={setHoteis} />}
    </div>
  )
}
