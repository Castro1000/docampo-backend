// src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db');

/* ============================================================
   CADASTRO DO PRODUTOR
   ============================================================ */
router.post('/cadastro-produtor', (req, res) => {
  const { nome, cpf, senha } = req.body;

  if (!nome || !cpf || !senha) {
    return res.status(400).json({ erro: 'Preencha nome, CPF e senha.' });
  }

  db.run(
    `INSERT INTO produtores (nome, cpf, senha) VALUES (?, ?, ?)`,
    [nome, cpf, senha],
    function (err) {
      if (err) {
        console.error('Erro ao cadastrar produtor:', err);
        return res
          .status(400)
          .json({ erro: 'CPF já cadastrado ou dados inválidos.' });
      }
      res.json({ sucesso: true, id: this.lastID });
    }
  );
});

/* ============================================================
   LOGIN DO PRODUTOR
   ============================================================ */
router.post('/login-produtor', (req, res) => {
  const { cpf, senha } = req.body;

  db.get(
    `SELECT * FROM produtores WHERE cpf = ? AND senha = ?`,
    [cpf, senha],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ erro: 'Erro no servidor' });
      }
      if (!row) return res.status(401).json({ erro: 'Credenciais inválidas' });

      res.json({ sucesso: true, tipo: 'produtor', usuario: row });
    }
  );
});

/* ============================================================
   CADASTRO DO TRANSPORTADOR
   ============================================================ */
router.post('/cadastro-transportador', (req, res) => {
  const { nome, cpf, telefone, senha } = req.body;

  if (!nome || !cpf || !senha) {
    return res
      .status(400)
      .json({ erro: 'Nome, CPF e senha são obrigatórios.' });
  }

  db.run(
    // IMPORTANTE: sua tabela transportadores deve ter as colunas:
    // id, nome, cpf, telefone, senha
    // Se NÃO tiver "telefone", troque a linha abaixo por:
    // `INSERT INTO transportadores (nome, cpf, senha) VALUES (?, ?, ?)`
    // e os valores por [nome, cpf, senha]
    `INSERT INTO transportadores (nome, cpf, telefone, senha) VALUES (?, ?, ?, ?)`,
    [nome, cpf, telefone || null, senha],
    function (err) {
      if (err) {
        console.error('Erro ao cadastrar transportador:', err);

        // CPF duplicado
        if (err.message && err.message.includes('UNIQUE')) {
          return res
            .status(400)
            .json({ erro: 'CPF já cadastrado para outro transportador.' });
        }

        // Erro de estrutura de tabela (ex: coluna que não existe)
        if (err.message && err.message.toLowerCase().includes('no such column')) {
          return res
            .status(500)
            .json({
              erro:
                'Erro na estrutura da tabela de transportadores: ' +
                err.message,
            });
        }

        // Outro erro qualquer
        return res
          .status(400)
          .json({ erro: 'Erro ao cadastrar transportador: ' + err.message });
      }

      // SUCESSO MESMO
      res.json({
        sucesso: true,
        id: this.lastID,
      });
    }
  );
});

/* ============================================================
   LOGIN DO TRANSPORTADOR
   ============================================================ */
router.post('/login-transportador', (req, res) => {
  const { cpf, senha } = req.body;

  db.get(
    `SELECT * FROM transportadores WHERE cpf = ? AND senha = ?`,
    [cpf, senha],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ erro: 'Erro no servidor' });
      }
      if (!row) return res.status(401).json({ erro: 'Credenciais inválidas' });

      res.json({ sucesso: true, tipo: 'transportador', usuario: row });
    }
  );
});

/* ============================================================
   LOGIN DO ADMINISTRADOR
   ============================================================ */
router.post('/login-admin', (req, res) => {
  const { cpf, senha } = req.body;

  db.get(
    `SELECT * FROM administradores WHERE cpf = ? AND senha = ?`,
    [cpf, senha],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ erro: 'Erro no servidor' });
      }
      if (!row) return res.status(401).json({ erro: 'Credenciais inválidas' });

      res.json({ sucesso: true, tipo: 'admin', usuario: row });
    }
  );
});

module.exports = router;
