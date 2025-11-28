// src/app.js
const express = require('express');
const cors = require('cors');

const app = express();

// Inicializa o banco e cria as tabelas
require('./db');

// Rotas
const authRoutes = require('./routes/authRoutes');
const produtorRoutes = require('./routes/produtorRoutes');
const loteRoutes = require('./routes/loteRoutes');
const transporteRoutes = require('./routes/transporteRoutes');
const transportadorRoutes = require('./routes/transportadorRoutes');

app.use(cors());
app.use(express.json());

app.use('/api', authRoutes);
app.use('/api', produtorRoutes);
app.use('/api', loteRoutes);
app.use('/api', transporteRoutes);
app.use('/api', transportadorRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
