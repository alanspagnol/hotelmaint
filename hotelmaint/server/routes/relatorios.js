const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { authMiddleware, requireRole } = require('../middleware');

router.get('/', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
  const db = getDB();
  const { hotel_id, data_inicio, data_fim } = req.query;
  const hid = hotel_id || req.user.hotel_id;

  const di = data_inicio || new Date(Date.now() - 30 * 86400000).toISOString();
  const df = data_fim || new Date().toISOString();

  const where = hid ? 'WHERE os.hotel_id = ? AND' : 'WHERE';
  const params = hid ? [hid, di, df] : [di, df];

  const totais = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status='concluida' THEN 1 ELSE 0 END) as concluidas,
      SUM(CASE WHEN tipo='preventiva' THEN 1 ELSE 0 END) as preventivas,
      SUM(CASE WHEN tipo='corretiva' THEN 1 ELSE 0 END) as corretivas,
      SUM(CASE WHEN sla_status='estourado' THEN 1 ELSE 0 END) as sla_estourado,
      ROUND(AVG(CASE WHEN data_conclusao IS NOT NULL THEN (julianday(data_conclusao)-julianday(data_abertura))*24 END),1) as tempo_medio_horas,
      ROUND(SUM(custo_pecas + custo_mao_obra),2) as custo_total,
      ROUND(AVG(custo_pecas + custo_mao_obra),2) as custo_medio
    FROM ordens_servico os
    ${where} os.data_abertura BETWEEN ? AND ?
  `).get(...params);

  const por_prioridade = db.prepare(`
    SELECT prioridade, COUNT(*) as total FROM ordens_servico os
    ${where} os.data_abertura BETWEEN ? AND ?
    GROUP BY prioridade
  `).all(...params);

  const ativos_criticos = db.prepare(`
    SELECT a.nome, a.categoria, a.localizacao, COUNT(os.id) as total_os,
      SUM(os.custo_pecas + os.custo_mao_obra) as custo_total
    FROM ativos a
    JOIN ordens_servico os ON os.ativo_id = a.id
    ${hid ? 'WHERE a.hotel_id = ? AND' : 'WHERE'} os.data_abertura BETWEEN ? AND ?
    GROUP BY a.id ORDER BY total_os DESC LIMIT 10
  `).all(...params);

  const custo_por_categoria = db.prepare(`
    SELECT a.categoria, COUNT(os.id) as total_os,
      ROUND(SUM(os.custo_pecas + os.custo_mao_obra),2) as custo_total
    FROM ativos a
    JOIN ordens_servico os ON os.ativo_id = a.id
    ${hid ? 'WHERE a.hotel_id = ? AND' : 'WHERE'} os.data_abertura BETWEEN ? AND ?
    GROUP BY a.categoria ORDER BY custo_total DESC
  `).all(...params);

  res.json({ totais, por_prioridade, ativos_criticos, custo_por_categoria });
});

module.exports = router;
