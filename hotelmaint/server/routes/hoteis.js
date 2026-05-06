const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { authMiddleware, requireRole } = require('../middleware');

router.get('/', authMiddleware, (req, res) => {
  const db = getDB();
  res.json(db.prepare('SELECT * FROM hoteis ORDER BY nome').all());
});

router.post('/', authMiddleware, requireRole('admin'), (req, res) => {
  const db = getDB();
  const { nome, endereco, telefone } = req.body;
  if (!nome) return res.status(400).json({ error: 'Nome obrigatório' });
  const result = db.prepare('INSERT INTO hoteis (nome, endereco, telefone) VALUES (?,?,?)').run(nome, endereco || '', telefone || '');
  res.status(201).json(db.prepare('SELECT * FROM hoteis WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const db = getDB();
  const { nome, endereco, telefone } = req.body;
  db.prepare('UPDATE hoteis SET nome=?, endereco=?, telefone=? WHERE id=?').run(nome, endereco, telefone, req.params.id);
  res.json(db.prepare('SELECT * FROM hoteis WHERE id = ?').get(req.params.id));
});

module.exports = router;
