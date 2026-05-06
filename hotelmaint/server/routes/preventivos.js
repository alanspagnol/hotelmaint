const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { authMiddleware, requireRole } = require('../middleware');

router.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  const hid = req.query.hotel_id || req.user.hotel_id;
  let sql = `SELECT p.*, a.nome as ativo_nome, u.nome as responsavel_nome FROM planos_preventivos p LEFT JOIN ativos a ON p.ativo_id = a.id LEFT JOIN usuarios u ON p.responsavel_id = u.id`;
  let params = [];
  if (hid) { sql += ' WHERE p.hotel_id = ? AND p.ativo = 1'; params.push(hid); }
  sql += ' ORDER BY p.proxima_execucao';
  res.json(db.prepare(sql).all(...params));
});

router.post('/', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
  const db = getDB();
  const { hotel_id, ativo_id, titulo, frequencia, proxima_execucao, responsavel_id, instrucoes } = req.body;
  if (!titulo || !frequencia) return res.status(400).json({ error: 'Título e frequência obrigatórios' });
  const hid = hotel_id || req.user.hotel_id;
  const result = db.prepare(`INSERT INTO planos_preventivos (hotel_id, ativo_id, titulo, frequencia, proxima_execucao, responsavel_id, instrucoes) VALUES (?,?,?,?,?,?,?)`)
    .run(hid, ativo_id || null, titulo, frequencia, proxima_execucao || null, responsavel_id || null, instrucoes || '');
  res.status(201).json(db.prepare('SELECT * FROM planos_preventivos WHERE id = ?').get(result.lastInsertRowid));
});

router.post('/:id/gerar-os', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
  const db = getDB();
  const plano = db.prepare('SELECT * FROM planos_preventivos WHERE id = ?').get(req.params.id);
  if (!plano) return res.status(404).json({ error: 'Plano não encontrado' });

  const SLA_MAP = { urgente: 1, alta: 4, normal: 24, baixa: 72 };
  const result = db.prepare(`INSERT INTO ordens_servico (hotel_id, ativo_id, solicitante_id, tipo, titulo, descricao, localizacao, prioridade, status, sla_horas, data_abertura) VALUES (?,?,?,\'preventiva\',?,?,?,\'normal\',\'aberta\',24,datetime(\'now\'))`)
    .run(plano.hotel_id, plano.ativo_id, req.user.id, plano.titulo, plano.instrucoes || '', 'Conforme plano preventivo');

  const osId = result.lastInsertRowid;
  db.prepare('INSERT INTO os_registros (os_id, autor_id, tipo, conteudo) VALUES (?,?,?,?)').run(osId, req.user.id, 'status_change', `OS gerada automaticamente a partir do plano preventivo: ${plano.titulo}`);

  // Atualizar proxima execução
  const freqDias = { diario: 1, semanal: 7, mensal: 30, trimestral: 90, semestral: 180, anual: 365 };
  const dias = freqDias[plano.frequencia] || 30;
  const proxima = new Date(Date.now() + dias * 86400000).toISOString().split('T')[0];
  db.prepare('UPDATE planos_preventivos SET ultima_execucao = date(\'now\'), proxima_execucao = ? WHERE id = ?').run(proxima, plano.id);

  res.status(201).json({ os_id: osId, proxima_execucao: proxima });
});

router.put('/:id', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
  const db = getDB();
  const { titulo, frequencia, proxima_execucao, responsavel_id, instrucoes, ativo } = req.body;
  db.prepare('UPDATE planos_preventivos SET titulo=?, frequencia=?, proxima_execucao=?, responsavel_id=?, instrucoes=?, ativo=? WHERE id=?')
    .run(titulo, frequencia, proxima_execucao, responsavel_id, instrucoes, ativo !== undefined ? ativo : 1, req.params.id);
  res.json(db.prepare('SELECT * FROM planos_preventivos WHERE id = ?').get(req.params.id));
});

module.exports = router;
