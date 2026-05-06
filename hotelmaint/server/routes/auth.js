const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../database');
const { authMiddleware } = require('../middleware');

const JWT_SECRET = process.env.JWT_SECRET || 'hotelmaint-secret-change-in-production';

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

  const db = getDB();
  const user = db.prepare('SELECT * FROM usuarios WHERE email = ? AND ativo = 1').get(email.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: 'Email ou senha incorretos' });

  const valid = bcrypt.compareSync(senha, user.senha_hash);
  if (!valid) return res.status(401).json({ error: 'Email ou senha incorretos' });

  const token = jwt.sign(
    { id: user.id, nome: user.nome, email: user.email, role: user.role, hotel_id: user.hotel_id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: { id: user.id, nome: user.nome, email: user.email, role: user.role, hotel_id: user.hotel_id }
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const db = getDB();
  const user = db.prepare('SELECT id, nome, email, role, hotel_id FROM usuarios WHERE id = ?').get(req.user.id);
  res.json(user);
});

// POST /api/auth/alterar-senha
router.post('/alterar-senha', authMiddleware, (req, res) => {
  const { senha_atual, nova_senha } = req.body;
  if (!senha_atual || !nova_senha) return res.status(400).json({ error: 'Campos obrigatórios' });
  if (nova_senha.length < 6) return res.status(400).json({ error: 'Senha deve ter ao menos 6 caracteres' });

  const db = getDB();
  const user = db.prepare('SELECT * FROM usuarios WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(senha_atual, user.senha_hash)) {
    return res.status(401).json({ error: 'Senha atual incorreta' });
  }
  const nova_hash = bcrypt.hashSync(nova_senha, 10);
  db.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(nova_hash, req.user.id);
  res.json({ message: 'Senha alterada com sucesso' });
});

module.exports = router;
