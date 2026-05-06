const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { authMiddleware, requireRole } = require('../middleware');

router.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  const hid = req.query.hotel_id || req.user.hotel_id;
  let sql = 'SELECT * FROM ativos';
  let params = [];
  if (hid) { sql += ' WHERE hotel_id = ?'; params.push(hid); }
  sql += ' ORDER BY categoria, nome';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const ativo = db.prepare('SELECT * FROM ativos WHERE id = ?').get(req.params.id);
  if (!ativo) return res.status(404).json({ error: 'Ativo não encontrado' });
  const os = db.prepare('SELECT id, titulo, status, prioridade, data_abertura FROM ordens_servico WHERE ativo_id = ? ORDER BY data_abertura DESC LIMIT 10').all(req.params.id);
  res.json({ ...ativo, historico_os: os });
});

router.post('/', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
  const db = getDB();
  const { hotel_id, nome, categoria, localizacao, numero_serie, fabricante, data_instalacao, vida_util_anos } = req.body;
  if (!nome || !categoria) return res.status(400).json({ error: 'Nome e categoria obrigatórios' });
  const hid = hotel_id || req.user.hotel_id;
  const result = db.prepare(`INSERT INTO ativos (hotel_id, nome, categoria, localizacao, numero_serie, fabricante, data_instalacao, vida_util_anos) VALUES (?,?,?,?,?,?,?,?)`)
    .run(hid, nome, categoria, localizacao || '', numero_serie || '', fabricante || '', data_instalacao || null, vida_util_anos || null);
  res.status(201).json(db.prepare('SELECT * FROM ativos WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
  const db = getDB();
  const { nome, categoria, localizacao, numero_serie, fabricante, data_instalacao, vida_util_anos, status } = req.body;
  db.prepare(`UPDATE ativos SET nome=?, categoria=?, localizacao=?, numero_serie=?, fabricante=?, data_instalacao=?, vida_util_anos=?, status=? WHERE id=?`)
    .run(nome, categoria, localizacao, numero_serie, fabricante, data_instalacao, vida_util_anos, status, req.params.id);
  res.json(db.prepare('SELECT * FROM ativos WHERE id = ?').get(req.params.id));
});

module.exports = router;
