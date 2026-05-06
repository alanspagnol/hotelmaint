const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { authMiddleware } = require('../middleware');

router.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  const hid = req.query.hotel_id || req.user.hotel_id;
  const params = hid ? [hid] : [];
  const where = hid ? 'WHERE hotel_id = ?' : '';
  const whereOS = hid ? 'WHERE os.hotel_id = ?' : '';

  const hoje = new Date().toISOString().split('T')[0];

  const abertas_hoje = db.prepare(`SELECT COUNT(*) as c FROM ordens_servico ${where ? where + ' AND' : 'WHERE'} date(data_abertura) = '${hoje}' AND status != 'cancelada'`).get(...params).c;
  const total_abertas = db.prepare(`SELECT COUNT(*) as c FROM ordens_servico ${where ? where + ' AND' : 'WHERE'} status NOT IN ('concluida','cancelada')`).get(...params).c;
  const concluidas_7d = db.prepare(`SELECT COUNT(*) as c FROM ordens_servico ${where ? where + ' AND' : 'WHERE'} status = 'concluida' AND data_conclusao >= datetime('now','-7 days')`).get(...params).c;
  const atrasadas = db.prepare(`SELECT COUNT(*) as c FROM ordens_servico ${where ? where + ' AND' : 'WHERE'} sla_status = 'estourado' AND status NOT IN ('concluida','cancelada')`).get(...params).c;
  const em_risco = db.prepare(`SELECT COUNT(*) as c FROM ordens_servico ${where ? where + ' AND' : 'WHERE'} sla_status = 'em_risco' AND status NOT IN ('concluida','cancelada')`).get(...params).c;

  const urgentes = db.prepare(`
    SELECT os.*, u.nome as tecnico_nome FROM ordens_servico os
    LEFT JOIN usuarios u ON os.tecnico_id = u.id
    ${whereOS} ${hid ? 'AND' : 'WHERE'} os.prioridade = 'urgente' AND os.status NOT IN ('concluida','cancelada')
    ORDER BY os.data_abertura LIMIT 10
  `).all(...params);

  const estoque_alertas = db.prepare(`SELECT * FROM estoque ${where} ${hid ? 'AND' : 'WHERE'} quantidade_atual < quantidade_minima`).all(...params);

  const por_status = db.prepare(`
    SELECT status, COUNT(*) as total FROM ordens_servico ${where} ${hid ? 'AND' : 'WHERE'} status != 'cancelada' GROUP BY status
  `).all(...params);

  const tecnicos_carga = db.prepare(`
    SELECT u.id, u.nome, COUNT(os.id) as os_abertas
    FROM usuarios u
    LEFT JOIN ordens_servico os ON os.tecnico_id = u.id AND os.status NOT IN ('concluida','cancelada')
    WHERE u.role = 'tecnico' ${hid ? 'AND (u.hotel_id = ? OR u.hotel_id IS NULL)' : ''}
    GROUP BY u.id ORDER BY os_abertas DESC
  `).all(...(hid ? [hid] : []));

  res.json({ abertas_hoje, total_abertas, concluidas_7d, atrasadas, em_risco, urgentes, estoque_alertas, por_status, tecnicos_carga });
});

module.exports = router;
