import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    try {
      await login(email, senha)
      navigate('/dashboard')
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏨</div>
          <h1 className="text-2xl font-extrabold text-blue-800">HotelMaint</h1>
          <p className="text-slate-500 text-sm mt-1">Gestão de Manutenção Hoteleira</p>
          <p className="text-slate-400 text-xs">Porto Seguro, BA</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="label">E-mail</label>
          <input
            type="email" className="input" placeholder="seu@email.com"
            value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email"
          />
          <label className="label">Senha</label>
          <input
            type="password" className="input" placeholder="••••••••"
            value={senha} onChange={e => setSenha(e.target.value)} required autoComplete="current-password"
          />
          {erro && <p className="text-red-600 text-xs mb-3 bg-red-50 p-2 rounded-lg">{erro}</p>}
          <button type="submit" className="btn btn-primary mt-2" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
          <p className="font-semibold mb-1">Usuários de teste:</p>
          <p>admin@hotelmaint.com</p>
          <p>pedro@hotelmaint.com (técnico)</p>
          <p>mariana@hotelmaint.com (supervisor)</p>
          <p className="mt-1 text-slate-400">Senha: <strong>hotel123</strong></p>
        </div>
      </div>
    </div>
  )
}
