const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { authMiddleware, requireRole } = require('../middleware');

router.get('/', authMiddleware, requireRole('admin', 'supervisor'), (req, res) => {
  const db = getDB();
  const hid = req.query.hotel_id || (req.user.role !== 'admin' ? req.user.hotel_id : null);
  let sql = 'SELECT id, nome, email, role, hotel_id, ativo, created_at FROM usuarios';
  let params = [];
  if (hid) { sql += ' WHERE hotel_id = ? OR hotel_id IS NULL'; params.push(hid); }
  sql += ' ORDER BY role, nome';
  res.json(db.prepare(sql).all(...params));
});

router.post('/', authMiddleware, requireRole('admin'), (req, res) => {
  const bcrypt = require('bcryptjs');
  const db = getDB();
  const { nome, email, senha, role, hotel_id } = req.body;
  if (!nome || !email || !senha || !role) return res.status(400).json({ error: 'Campos obrigatórios' });
  const hash = bcrypt.hashSync(senha, 10);
  try {
    const result = db.prepare('INSERT INTO usuarios (nome, email, senha_hash, role, hotel_id) VALUES (?,?,?,?,?)').run(nome, email.toLowerCase(), hash, role, hotel_id || null);
    res.status(201).json({ id: result.lastInsertRowid, nome, email, role, hotel_id });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Email já cadastrado' });
    throw e;
  }
});

router.put('/:id', authMiddleware, requireRole('admin'), (req, res) => {
  const db = getDB();
  const { nome, role, hotel_id, ativo } = req.body;
  db.prepare('UPDATE usuarios SET nome=?, role=?, hotel_id=?, ativo=? WHERE id=?').run(nome, role, hotel_id, ativo !== undefined ? ativo : 1, req.params.id);
  res.json({ id: req.params.id, nome, role, hotel_id });
});

router.post('/:id/redefinir-senha', authMiddleware, requireRole('admin'), (req, res) => {
  const bcrypt = require('bcryptjs');
  const db = getDB();
  const { nova_senha } = req.body;
  if (!nova_senha || nova_senha.length < 6) return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });
  const hash = bcrypt.hashSync(nova_senha, 10);
  db.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(hash, req.params.id);
  res.json({ message: 'Senha redefinida com sucesso' });
});

module.exports = router;
