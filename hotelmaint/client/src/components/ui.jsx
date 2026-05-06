// Shared small components

const SLA_MAP = { urgente: 1, alta: 4, normal: 24, baixa: 72 }

export function calcSLAStatus(prioridade, data_abertura) {
  const horas = SLA_MAP[prioridade] || 24
  const fim = new Date(data_abertura).getTime() + horas * 3600000
  const agora = Date.now()
  const restante = (fim - agora) / 3600000
  const pct = restante / horas
  if (agora > fim) return 'estourado'
  if (pct <= 0.2) return 'em_risco'
  return 'dentro'
}

export function timeAgo(iso) {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return Math.floor(diff / 60) + 'min'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h'
  return Math.floor(diff / 86400) + 'd'
}

export function PrioridadeBadge({ p }) {
  const map = { urgente: 'badge-urgente', alta: 'badge-alta', normal: 'badge-normal', baixa: 'badge-baixa' }
  const emoji = { urgente: '🔴', alta: '🟠', normal: '🔵', baixa: '⚪' }
  return <span className={`badge ${map[p]}`}>{emoji[p]} {p?.charAt(0).toUpperCase() + p?.slice(1)}</span>
}

export function SLABadge({ os }) {
  if (['concluida', 'cancelada'].includes(os.status)) return <span className="badge badge-status">Concluída</span>
  const s = os.sla_status || calcSLAStatus(os.prioridade, os.data_abertura)
  const cls = s === 'dentro' ? 'badge-ok' : s === 'em_risco' ? 'badge-risco' : 'badge-estouro'
  const txt = s === 'dentro' ? '✓ No prazo' : s === 'em_risco' ? '⚠ Em risco' : '🔥 Estourado'
  return <span className={`badge ${cls}`}>{txt}</span>
}

export const STATUS_LABELS = {
  aberta: 'Aberta', triagem: 'Triagem', atribuida: 'Atribuída',
  em_execucao: 'Em Execução', aguardando_peca: 'Aguard. Peça',
  concluida: 'Concluída', cancelada: 'Cancelada'
}

export const STATUS_CORES = {
  aberta: '#2563eb', triagem: '#7c3aed', atribuida: '#d97706',
  em_execucao: '#16a34a', aguardando_peca: '#ea580c', concluida: '#64748b', cancelada: '#94a3b8'
}

export function StatusBadge({ status }) {
  return <span className="badge badge-status">{STATUS_LABELS[status] || status}</span>
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-800 rounded-full animate-spin" />
    </div>
  )
}

export function Empty({ text = 'Nenhum item encontrado' }) {
  return (
    <div className="text-center py-12 text-slate-400">
      <div className="text-4xl mb-2">📋</div>
      <p className="text-sm">{text}</p>
    </div>
  )
}

export function BackButton({ onClick, label = '' }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 text-blue-800 font-semibold mb-4">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M19 12H5M12 19l-7-7 7-7"/>
      </svg>
      {label}
    </button>
  )
}
