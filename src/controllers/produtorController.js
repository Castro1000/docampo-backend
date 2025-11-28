// src/routes/produtorRoutes.js
const express = require('express');
const router = express.Router();
const {
  getProdutorById,
  updateProdutor,
} = require('../controllers/produtorController');

// Buscar dados pessoais
router.get('/produtor/:id', getProdutorById);

// Atualizar dados pessoais
router.put('/produtor/:id', updateProdutor);

module.exports = router;
