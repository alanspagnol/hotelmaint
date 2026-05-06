const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { authMiddleware, requireRole } = require('../middleware');

// GET /api/estoque
router.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  const hid = req.query.hotel_id || req.user.hotel_id;
  let sql = 'SELECT * FROM estoque';
  let params = [];
  if (hid) { sql += ' WHERE hotel_id = ?'; params.push(hid); }
  sql += ' ORDER BY item_nome';
  res.json(db.prepare(sql).all(...params));
});

router.post('/', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
  const db = getDB();
  const { hotel_id, item_nome, categoria, quantidade_atual, quantidade_minima, unidade, fornecedor, custo_unitario, localizacao_almoxarifado } = req.body;
  if (!item_nome) return res.status(400).json({ error: 'Nome do item obrigatório' });
  const hid = hotel_id || req.user.hotel_id;
  const result = db.prepare(`INSERT INTO estoque (hotel_id, item_nome, categoria, quantidade_atual, quantidade_minima, unidade, fornecedor, custo_unitario, localizacao_almoxarifado) VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(hid, item_nome, categoria || 'outro', quantidade_atual || 0, quantidade_minima || 0, unidade || 'un', fornecedor || '', custo_unitario || 0, localizacao_almoxarifado || '');
  res.status(201).json(db.prepare('SELECT * FROM estoque WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
  const db = getDB();
  const { item_nome, categoria, quantidade_atual, quantidade_minima, unidade, fornecedor, custo_unitario, localizacao_almoxarifado } = req.body;
  db.prepare(`UPDATE estoque SET item_nome=?, categoria=?, quantidade_atual=?, quantidade_minima=?, unidade=?, fornecedor=?, custo_unitario=?, localizacao_almoxarifado=? WHERE id=?`)
    .run(item_nome, categoria, quantidade_atual, quantidade_minima, unidade, fornecedor, custo_unitario, localizacao_almoxarifado, req.params.id);
  res.json(db.prepare('SELECT * FROM estoque WHERE id = ?').get(req.params.id));
});

router.post('/:id/entrada', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
  const db = getDB();
  const { quantidade, observacao } = req.body;
  db.prepare('UPDATE estoque SET quantidade_atual = quantidade_atual + ? WHERE id = ?').run(quantidade, req.params.id);
  db.prepare('INSERT INTO estoque_movimentacoes (estoque_id, usuario_id, tipo, quantidade, observacao) VALUES (?,?,\'entrada\',?,?)').run(req.params.id, req.user.id, quantidade, observacao || 'Entrada manual');
  res.json(db.prepare('SELECT * FROM estoque WHERE id = ?').get(req.params.id));
});

router.get('/:id/movimentacoes', authMiddleware, (req, res) => {
  const db = getDB();
  const movs = db.prepare(`SELECT m.*, u.nome as usuario_nome FROM estoque_movimentacoes m LEFT JOIN usuarios u ON m.usuario_id = u.id WHERE m.estoque_id = ? ORDER BY m.created_at DESC LIMIT 50`).all(req.params.id);
  res.json(movs);
});

module.exports = router;
