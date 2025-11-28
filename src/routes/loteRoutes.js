// src/routes/loteRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Cadastrar novo lote
router.post('/lotes', (req, res) => {
  const { produtor_id, produto, quantidade, data_colheita, local_producao } = req.body;

  if (!produtor_id || !produto || !quantidade) {
    return res.status(400).json({ erro: 'produtor_id, produto e quantidade são obrigatórios.' });
  }

  const sql = `
    INSERT INTO lotes (produtor_id, produto, quantidade, data_colheita, local_producao)
    VALUES (?, ?, ?, ?, ?)
  `;
  const params = [produtor_id, produto, quantidade, data_colheita || null, local_producao || null];

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Erro ao inserir lote:', err);
      return res.status(500).json({ erro: 'Erro ao cadastrar lote.' });
    }
    return res.status(201).json({
      mensagem: 'Lote cadastrado com sucesso.',
      id: this.lastID,
    });
  });
});

// Listar lotes de um produtor
router.get('/lotes/produtor/:produtorId', (req, res) => {
  const { produtorId } = req.params;

  const sql = `
    SELECT id, produto, quantidade, data_colheita, local_producao
    FROM lotes
    WHERE produtor_id = ?
    ORDER BY id DESC
  `;
  db.all(sql, [produtorId], (err, rows) => {
    if (err) {
      console.error('Erro ao buscar lotes:', err);
      return res.status(500).json({ erro: 'Erro ao buscar lotes.' });
    }
    return res.json(rows || []);
  });
});

// Obter detalhes de um lote
router.get('/lotes/:id', (req, res) => {
  const { id } = req.params;

  const sql = `
    SELECT id, produtor_id, produto, quantidade, data_colheita, local_producao
    FROM lotes
    WHERE id = ?
  `;
  db.get(sql, [id], (err, row) => {
    if (err) {
      console.error('Erro ao buscar lote:', err);
      return res.status(500).json({ erro: 'Erro ao buscar lote.' });
    }
    if (!row) {
      return res.status(404).json({ erro: 'Lote não encontrado.' });
    }
    return res.json(row);
  });
});

// Atualizar lote (edição)
router.put('/lotes/:id', (req, res) => {
  const { id } = req.params;
  const { produto, quantidade, data_colheita, local_producao } = req.body;

  if (!produto || !quantidade) {
    return res.status(400).json({ erro: 'produto e quantidade são obrigatórios.' });
  }

  const sql = `
    UPDATE lotes
    SET produto = ?, quantidade = ?, data_colheita = ?, local_producao = ?, atualizado_em = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  const params = [produto, quantidade, data_colheita || null, local_producao || null, id];

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Erro ao atualizar lote:', err);
      return res.status(500).json({ erro: 'Erro ao atualizar lote.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ erro: 'Lote não encontrado.' });
    }
    return res.json({ mensagem: 'Lote atualizado com sucesso.' });
  });
});

// Excluir lote
router.delete('/lotes/:id', (req, res) => {
  const { id } = req.params;

  const sql = `DELETE FROM lotes WHERE id = ?`;
  db.run(sql, [id], function (err) {
    if (err) {
      console.error('Erro ao excluir lote:', err);
      return res.status(500).json({ erro: 'Erro ao excluir lote.' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ erro: 'Lote não encontrado.' });
    }
    return res.json({ mensagem: 'Lote excluído com sucesso.' });
  });
});

module.exports = router;
