// src/routes/produtorRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * CADASTRAR PRODUTOR
 * POST /api/produtores/cadastrar
 * body: { nome, cpf, senha, email?, telefone? }
 *
 * OBS: no banco atual a tabela "produtores" tem campos:
 *   id, nome, cpf, senha
 * Então, por enquanto vamos salvar só esses 3: nome, cpf, senha.
 */
router.post('/produtores/cadastrar', (req, res) => {
  const { nome, cpf, senha } = req.body;

  if (!nome || !cpf || !senha) {
    return res
      .status(400)
      .json({ message: 'Nome, CPF e senha são obrigatórios.' });
  }

  // verificar se já existe produtor com esse CPF
  const sqlCheck = 'SELECT id FROM produtores WHERE cpf = ?';
  db.get(sqlCheck, [cpf], (err, row) => {
    if (err) {
      console.error('Erro ao verificar produtor:', err);
      return res
        .status(500)
        .json({ message: 'Erro ao verificar produtor.' });
    }

    if (row) {
      return res
        .status(400)
        .json({ message: 'CPF já cadastrado para outro produtor.' });
    }

    // inserir novo produtor
    const sqlInsert =
      'INSERT INTO produtores (nome, cpf, senha) VALUES (?, ?, ?)';
    db.run(sqlInsert, [nome, cpf, senha], function (err2) {
      if (err2) {
        console.error('Erro ao inserir produtor:', err2);
        return res
          .status(500)
          .json({ message: 'Erro ao cadastrar produtor.' });
      }

      return res.status(201).json({
        message: 'Produtor cadastrado com sucesso.',
        id: this.lastID,
      });
    });
  });
});

/**
 * LOGIN DO PRODUTOR
 * POST /api/login-produtor
 * body: { cpf, senha }
 */
router.post('/login-produtor', (req, res) => {
  const { cpf, senha } = req.body;

  if (!cpf || !senha) {
    return res
      .status(400)
      .json({ erro: 'CPF e senha são obrigatórios.' });
  }

  const sql =
    'SELECT id, nome, cpf FROM produtores WHERE cpf = ? AND senha = ?';
  db.get(sql, [cpf, senha], (err, row) => {
    if (err) {
      console.error('Erro ao buscar produtor para login:', err);
      return res
        .status(500)
        .json({ erro: 'Erro ao realizar login do produtor.' });
    }

    if (!row) {
      return res
        .status(401)
        .json({ erro: 'CPF ou senha inválidos.' });
    }

    // sucesso
    return res.json({
      mensagem: 'Login realizado com sucesso.',
      produtor: {
        id: row.id,
        nome: row.nome,
        cpf: row.cpf,
      },
    });
  });
});

/**
 * LISTAR LOTES DE UM PRODUTOR (já deve existir, mas deixo aqui)
 * GET /api/lotes/produtor/:produtorId
 * (usado na home e na tela de lotes)
 */
router.get('/lotes/produtor/:produtorId', (req, res) => {
  const { produtorId } = req.params;

  const sql =
    'SELECT id, produto, quantidade, data_colheita, local_producao FROM lotes WHERE produtor_id = ? ORDER BY id DESC';

  db.all(sql, [produtorId], (err, rows) => {
    if (err) {
      console.error('Erro ao listar lotes do produtor:', err);
      return res
        .status(500)
        .json({ erro: 'Erro ao listar lotes do produtor.' });
    }

    return res.json(rows);
  });
});

module.exports = router;
