require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Init DB
initDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/hoteis', require('./routes/hoteis'));
app.use('/api/os', require('./routes/os'));
app.use('/api/ativos', require('./routes/ativos'));
app.use('/api/estoque', require('./routes/estoque'));
app.use('/api/preventivos', require('./routes/preventivos'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/relatorios', require('./routes/relatorios'));
app.use('/api/usuarios', require('./routes/usuarios'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'HotelMaint API - Porto Seguro BA', status: 'running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
});

app.listen(PORT, () => {
  console.log(`HotelMaint API rodando na porta ${PORT}`);
});
