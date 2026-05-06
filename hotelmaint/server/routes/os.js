const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { authMiddleware, requireRole } = require('../middleware');

const SLA_MAP = { urgente: 1, alta: 4, normal: 24, baixa: 72 };

function calcSLAStatus(prioridade, data_abertura) {
  const horas = SLA_MAP[prioridade] || 24;
  const abertura = new Date(data_abertura).getTime();
  const fim = abertura + horas * 3600000;
  const agora = Date.now();
  const restante = (fim - agora) / 3600000;
  const pct = restante / horas;
  if (agora > fim) return 'estourado';
  if (pct <= 0.2) return 'em_risco';
  return 'dentro';
}

function detectPrioridade(titulo, descricao) {
  const txt = `${titulo} ${descricao}`.toLowerCase();
  if (/urgente|elevador|energia|incêndio|incendio|vazamento grande|fogo|curto|cheiro de queimado/.test(txt)) return 'urgente';
  if (/ar.condicionado|chuveiro|trava|fechadura|tv|televisao|televisão|infiltração|infiltracao/.test(txt)) return 'alta';
  return 'normal';
}

// GET /api/os
router.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  const { hotel_id, status, prioridade, tipo, tecnico_id, limit = 100, offset = 0 } = req.query;

  let where = [];
  let params = [];

  // Restrict by hotel for non-admin
  if (req.user.role !== 'admin') {
    const hid = hotel_id || req.user.hotel_id;
    where.push('os.hotel_id = ?');
    params.push(hid);
  } else if (hotel_id) {
    where.push('os.hotel_id = ?');
    params.push(hotel_id);
  }

  if (req.user.role === 'tecnico') {
    where.push('os.tecnico_id = ?');
    params.push(req.user.id);
  }

  if (status) { where.push('os.status = ?'); params.push(status); }
  if (prioridade) { where.push('os.prioridade = ?'); params.push(prioridade); }
  if (tipo) { where.push('os.tipo = ?'); params.push(tipo); }
  if (tecnico_id) { where.push('os.tecnico_id = ?'); params.push(tecnico_id); }

  const sql = `
    SELECT os.*,
      sol.nome as solicitante_nome,
      tec.nome as tecnico_nome,
      h.nome as hotel_nome,
      a.nome as ativo_nome
    FROM ordens_servico os
    LEFT JOIN usuarios sol ON os.solicitante_id = sol.id
    LEFT JOIN usuarios tec ON os.tecnico_id = tec.id
    LEFT JOIN hoteis h ON os.hotel_id = h.id
    LEFT JOIN ativos a ON os.ativo_id = a.id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY CASE os.prioridade WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
             os.data_abertura DESC
    LIMIT ? OFFSET ?
  `;
  params.push(parseInt(limit), parseInt(offset));

  const rows = db.prepare(sql).all(...params);

  // Update SLA status on the fly
  const result = rows.map(row => {
    if (!['concluida', 'cancelada'].includes(row.status)) {
      row.sla_status = calcSLAStatus(row.prioridade, row.data_abertura);
      db.prepare('UPDATE ordens_servico SET sla_status = ? WHERE id = ?').run(row.sla_status, row.id);
    }
    return row;
  });

  res.json(result);
});

// GET /api/os/:id
router.get('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const os = db.prepare(`
    SELECT os.*,
      sol.nome as solicitante_nome,
      tec.nome as tecnico_nome,
      h.nome as hotel_nome,
      a.nome as ativo_nome
    FROM ordens_servico os
    LEFT JOIN usuarios sol ON os.solicitante_id = sol.id
    LEFT JOIN usuarios tec ON os.tecnico_id = tec.id
    LEFT JOIN hoteis h ON os.hotel_id = h.id
    LEFT JOIN ativos a ON os.ativo_id = a.id
    WHERE os.id = ?
  `).get(req.params.id);

  if (!os) return res.status(404).json({ error: 'OS não encontrada' });

  const registros = db.prepare(`
    SELECT r.*, u.nome as autor_nome
    FROM os_registros r
    LEFT JOIN usuarios u ON r.autor_id = u.id
    WHERE r.os_id = ?
    ORDER BY r.created_at ASC
  `).all(req.params.id);

  res.json({ ...os, registros });
});

// POST /api/os
router.post('/', authMiddleware, (req, res) => {
  const db = getDB();
  const { hotel_id, ativo_id, tipo, titulo, descricao, localizacao, prioridade } = req.body;

  if (!titulo || !localizacao) return res.status(400).json({ error: 'Título e localização são obrigatórios' });

  const hid = hotel_id || req.user.hotel_id;
  if (!hid) return res.status(400).json({ error: 'Hotel não identificado' });

  const prio = prioridade || detectPrioridade(titulo, descricao || '');
  const sla_horas = SLA_MAP[prio];

  const result = db.prepare(`
    INSERT INTO ordens_servico
      (hotel_id, ativo_id, solicitante_id, tipo, titulo, descricao, localizacao, prioridade, status, sla_horas, data_abertura)
    VALUES (?,?,?,?,?,?,?,?,'triagem',?,datetime('now'))
  `).run(hid, ativo_id || null, req.user.id, tipo || 'corretiva', titulo, descricao || '', localizacao, prio, sla_horas);

  const osId = result.lastInsertRowid;

  db.prepare(`INSERT INTO os_registros (os_id, autor_id, tipo, conteudo) VALUES (?,?,?,?)`)
    .run(osId, req.user.id, 'status_change', `OS aberta. Prioridade detectada automaticamente: ${prio.toUpperCase()}. SLA: ${sla_horas}h`);

  const os = db.prepare('SELECT * FROM ordens_servico WHERE id = ?').get(osId);
  res.status(201).json(os);
});

// PATCH /api/os/:id/atribuir
router.patch('/:id/atribuir', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
  const db = getDB();
  const { tecnico_id, prioridade } = req.body;
  const os = db.prepare('SELECT * FROM ordens_servico WHERE id = ?').get(req.params.id);
  if (!os) return res.status(404).json({ error: 'OS não encontrada' });

  const updates = { tecnico_id, status: 'atribuida', data_atribuicao: new Date().toISOString() };
  if (prioridade) {
    updates.prioridade = prioridade;
    updates.sla_horas = SLA_MAP[prioridade];
  }

  db.prepare(`UPDATE ordens_servico SET tecnico_id=?, status='atribuida', data_atribuicao=datetime('now'), prioridade=COALESCE(?,prioridade), sla_horas=COALESCE(?,sla_horas) WHERE id=?`)
    .run(tecnico_id, prioridade || null, prioridade ? SLA_MAP[prioridade] : null, req.params.id);

  const tec = db.prepare('SELECT nome FROM usuarios WHERE id = ?').get(tecnico_id);
  db.prepare('INSERT INTO os_registros (os_id, autor_id, tipo, conteudo) VALUES (?,?,?,?)')
    .run(req.params.id, req.user.id, 'status_change', `OS atribuída para ${tec?.nome}${prioridade ? `. Prioridade alterada para ${prioridade}` : ''}`);

  res.json(db.prepare('SELECT * FROM ordens_servico WHERE id = ?').get(req.params.id));
});

// PATCH /api/os/:id/iniciar
router.patch('/:id/iniciar', authMiddleware, requireRole('tecnico', 'admin', 'supervisor'), (req, res) => {
  const db = getDB();
  db.prepare(`UPDATE ordens_servico SET status='em_execucao', data_inicio=datetime('now') WHERE id=?`).run(req.params.id);
  db.prepare('INSERT INTO os_registros (os_id, autor_id, tipo, conteudo) VALUES (?,?,?,?)')
    .run(req.params.id, req.user.id, 'status_change', 'Execução iniciada pelo técnico.');
  res.json(db.prepare('SELECT * FROM ordens_servico WHERE id = ?').get(req.params.id));
});

// PATCH /api/os/:id/concluir
router.patch('/:id/concluir', authMiddleware, requireRole('tecnico', 'admin', 'supervisor'), (req, res) => {
  const db = getDB();
  const { observacoes_conclusao, custo_mao_obra } = req.body;
  db.prepare(`UPDATE ordens_servico SET status='concluida', data_conclusao=datetime('now'), observacoes_conclusao=?, custo_mao_obra=COALESCE(?,custo_mao_obra) WHERE id=?`)
    .run(observacoes_conclusao || '', custo_mao_obra || null, req.params.id);
  db.prepare('INSERT INTO os_registros (os_id, autor_id, tipo, conteudo) VALUES (?,?,?,?)')
    .run(req.params.id, req.user.id, 'status_change', `OS concluída. ${observacoes_conclusao || ''}`);
  res.json(db.prepare('SELECT * FROM ordens_servico WHERE id = ?').get(req.params.id));
});

// PATCH /api/os/:id/reabrir
router.patch('/:id/reabrir', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
  const db = getDB();
  const { motivo } = req.body;
  db.prepare(`UPDATE ordens_servico SET status='em_execucao', data_conclusao=NULL WHERE id=?`).run(req.params.id);
  db.prepare('INSERT INTO os_registros (os_id, autor_id, tipo, conteudo) VALUES (?,?,?,?)')
    .run(req.params.id, req.user.id, 'status_change', `OS reaberta pelo supervisor. Motivo: ${motivo || 'Correção necessária'}`);
  res.json(db.prepare('SELECT * FROM ordens_servico WHERE id = ?').get(req.params.id));
});

// PATCH /api/os/:id/status
router.patch('/:id/status', authMiddleware, (req, res) => {
  const db = getDB();
  const { status } = req.body;
  const allowed = ['aberta', 'triagem', 'atribuida', 'em_execucao', 'aguardando_peca', 'concluida', 'cancelada'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Status inválido' });
  db.prepare('UPDATE ordens_servico SET status=? WHERE id=?').run(status, req.params.id);
  db.prepare('INSERT INTO os_registros (os_id, autor_id, tipo, conteudo) VALUES (?,?,?,?)')
    .run(req.params.id, req.user.id, 'status_change', `Status alterado para: ${status}`);
  res.json(db.prepare('SELECT * FROM ordens_servico WHERE id = ?').get(req.params.id));
});

// POST /api/os/:id/comentario
router.post('/:id/comentario', authMiddleware, (req, res) => {
  const db = getDB();
  const { conteudo, tipo = 'comentario' } = req.body;
  if (!conteudo) return res.status(400).json({ error: 'Conteúdo obrigatório' });
  const result = db.prepare('INSERT INTO os_registros (os_id, autor_id, tipo, conteudo) VALUES (?,?,?,?)')
    .run(req.params.id, req.user.id, tipo, conteudo);
  const reg = db.prepare(`SELECT r.*, u.nome as autor_nome FROM os_registros r LEFT JOIN usuarios u ON r.autor_id = u.id WHERE r.id = ?`).get(result.lastInsertRowid);
  res.status(201).json(reg);
});

// POST /api/os/:id/peca
router.post('/:id/peca', authMiddleware, requireRole('tecnico', 'admin', 'supervisor'), (req, res) => {
  const db = getDB();
  const { estoque_id, quantidade, custo_unitario } = req.body;
  if (!estoque_id || !quantidade) return res.status(400).json({ error: 'Campos obrigatórios' });

  const item = db.prepare('SELECT * FROM estoque WHERE id = ?').get(estoque_id);
  if (!item) return res.status(404).json({ error: 'Item não encontrado' });
  if (item.quantidade_atual < quantidade) return res.status(400).json({ error: 'Estoque insuficiente' });

  // Baixar estoque
  db.prepare('UPDATE estoque SET quantidade_atual = quantidade_atual - ? WHERE id = ?').run(quantidade, estoque_id);

  // Registrar movimentação
  db.prepare('INSERT INTO estoque_movimentacoes (estoque_id, os_id, usuario_id, tipo, quantidade, observacao) VALUES (?,?,?,\'saida\',?,?)')
    .run(estoque_id, req.params.id, req.user.id, quantidade, `Usado na OS #${req.params.id}`);

  // Atualizar custo da OS
  const custo = (custo_unitario || item.custo_unitario) * quantidade;
  db.prepare('UPDATE ordens_servico SET custo_pecas = custo_pecas + ? WHERE id = ?').run(custo, req.params.id);

  // Registrar na timeline
  db.prepare('INSERT INTO os_registros (os_id, autor_id, tipo, conteudo) VALUES (?,?,?,?)')
    .run(req.params.id, req.user.id, 'peca_usada', `Peça usada: ${item.item_nome} — ${quantidade} ${item.unidade} (R$ ${custo.toFixed(2)})`);

  // Verificar estoque mínimo
  const atualizado = db.prepare('SELECT * FROM estoque WHERE id = ?').get(estoque_id);
  const alerta = atualizado.quantidade_atual < atualizado.quantidade_minima;

  res.json({ success: true, alerta_estoque: alerta, item: atualizado });
});

module.exports = router;
