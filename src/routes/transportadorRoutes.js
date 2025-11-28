// src/routes/transportadorRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db');

/* ============================================================
   CRIAR NOVO CONTRATO / TRANSPORTE
   ============================================================ */
// POST /api/transportes/novo
// Body:
// {
//   transportador_id: number,
//   cpf_produtor: string,
//   destino: string,
//   descricao: string (opcional)
// }
router.post('/transportes/novo', (req, res) => {
  const { transportador_id, cpf_produtor, destino, descricao } = req.body;

  if (!transportador_id || !cpf_produtor || !destino) {
    return res
      .status(400)
      .json({
        erro: 'Transportador, CPF do produtor e destino são obrigatórios.',
      });
  }

  // 1) Buscar produtor pelo CPF
  db.get(
    `SELECT id, nome, cpf FROM produtores WHERE cpf = ?`,
    [cpf_produtor],
    (err, produtor) => {
      if (err) {
        console.error('Erro ao buscar produtor:', err);
        return res.status(500).json({ erro: 'Erro ao buscar produtor.' });
      }

      if (!produtor) {
        return res
          .status(400)
          .json({ erro: 'Produtor não encontrado para este CPF.' });
      }

      const statusInicial = 'EM PREPARO';
      const agora = new Date().toISOString();

      // 2) Inserir na tabela de transportes
      db.run(
        `INSERT INTO transportes
          (produtor_id, transportador_id, destino, status, data_saida, data_chegada, descricao)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          produtor.id,
          transportador_id,
          destino,
          statusInicial,
          agora,
          null,
          descricao || null,
        ],
        function (err2) {
          if (err2) {
            console.error('Erro ao criar transporte:', err2);
            return res.status(500).json({
              erro: 'Erro ao criar transporte: ' + err2.message,
            });
          }

          return res.json({
            sucesso: true,
            transporte: {
              id: this.lastID,
              produtor_id: produtor.id,
              produtor_nome: produtor.nome,
              produtor_cpf: produtor.cpf,
              transportador_id,
              destino,
              status: statusInicial,
              data_saida: agora,
              data_chegada: null,
              descricao: descricao || null,
            },
          });
        }
      );
    }
  );
});

/* ============================================================
   LISTAR TRANSPORTES DO TRANSPORTADOR (painel dele)
   ============================================================ */
// GET /api/transportes/transportador/:id
router.get('/transportes/transportador/:id', (req, res) => {
  const { id } = req.params;

  db.all(
    `
    SELECT
      t.id,
      t.destino,
      t.status,
      t.data_saida,
      t.data_chegada,
      t.descricao,
      p.nome AS produtor_nome
    FROM transportes t
    JOIN produtores p ON p.id = t.produtor_id
    WHERE t.transportador_id = ?
    ORDER BY t.data_saida DESC
    `,
    [id],
    (err, rows) => {
      if (err) {
        console.error('Erro ao listar transportes do transportador:', err);
        return res.status(500).json({
          erro: 'Erro ao listar transportes do transportador.',
        });
      }

      res.json({ sucesso: true, transportes: rows });
    }
  );
});





/* ============================================================
   ADMIN - LISTAR TODOS OS TRANSPORTES
   ============================================================ */
// GET /api/admin/transportes
router.get('/admin/transportes', (req, res) => {
  db.all(
    `
    SELECT
      t.id,
      t.destino,
      t.status,
      t.data_saida,
      t.data_chegada,
      t.descricao,
      p.nome  AS produtor_nome,
      p.cpf   AS produtor_cpf,
      tr.nome AS transportador_nome
    FROM transportes t
    JOIN produtores      p  ON p.id  = t.produtor_id
    JOIN transportadores tr ON tr.id = t.transportador_id
    ORDER BY t.data_saida DESC
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error('Erro ao listar transportes para o admin:', err);
        return res.status(500).json({
          erro: 'Erro ao listar transportes para o administrador.',
        });
      }

      return res.json({
        sucesso: true,
        transportes: rows,
      });
    }
  );
});






/* ============================================================
   NOVA – ATUALIZAR STATUS DO TRANSPORTE
   ============================================================ */
// PATCH /api/transportes/:id/status
// body: { status: 'EM PREPARO' | 'EM TRANSPORTE' | 'ENTREGUE' }
router.patch('/transportes/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ erro: 'Informe o novo status.' });
  }

  const statusUpper = String(status).toUpperCase();
  const agora = new Date().toISOString();

  let sql;
  let params;

  // Se marcar como ENTREGUE, já grava a data_chegada
  if (statusUpper === 'ENTREGUE') {
    sql = `UPDATE transportes SET status = ?, data_chegada = ? WHERE id = ?`;
    params = [statusUpper, agora, id];
  } else {
    sql = `UPDATE transportes SET status = ? WHERE id = ?`;
    params = [statusUpper, id];
  }

  db.run(sql, params, function (err) {
    if (err) {
      console.error('Erro ao atualizar status do transporte:', err);
      return res
        .status(500)
        .json({ erro: 'Erro ao atualizar status do transporte.' });
    }

    if (this.changes === 0) {
      return res
        .status(404)
        .json({ erro: 'Transporte não encontrado para este ID.' });
    }

    // Buscar o registro atualizado pra devolver pro app
    db.get(
      `
      SELECT
        t.id,
        t.destino,
        t.status,
        t.data_saida,
        t.data_chegada,
        t.descricao,
        p.nome  AS produtor_nome,
        tr.nome AS transportador_nome
      FROM transportes t
      JOIN produtores p      ON p.id  = t.produtor_id
      JOIN transportadores tr ON tr.id = t.transportador_id
      WHERE t.id = ?
      `,
      [id],
      (err2, row) => {
        if (err2) {
          console.error('Erro ao buscar transporte atualizado:', err2);
          return res.status(500).json({
            erro: 'Status atualizado, mas falha ao retornar transporte.',
          });
        }

        return res.json({
          sucesso: true,
          transporte: row,
        });
      }
    );
  });
});

/* ============================================================
   LISTAR TRANSPORTES DO PRODUTOR (Meus transportes)
   filtrando pelo CPF
   ============================================================ */
// GET /api/meus-transportes-produtor/:cpf
router.get('/meus-transportes-produtor/:cpf', (req, res) => {
  const { cpf } = req.params;
  console.log('>>> BUSCANDO TRANSPORTES DO PRODUTOR CPF:', cpf);

  db.all(
    `
    SELECT
      t.id,
      t.destino,
      t.status,
      t.data_saida,
      t.data_chegada,
      t.descricao,
      tr.nome AS transportador_nome
    FROM transportes t
    JOIN produtores p ON p.id = t.produtor_id
    JOIN transportadores tr ON tr.id = t.transportador_id
    WHERE p.cpf = ?
    ORDER BY t.data_saida DESC
    `,
    [cpf],
    (err, rows) => {
      if (err) {
        console.error('Erro ao listar transportes do produtor:', err);
        return res.status(500).json({
          erro: 'Erro ao listar transportes do produtor: ' + err.message,
        });
      }

      return res.json({
        sucesso: true,
        transportes: rows,
      });
    }
  );
});

/* ============================================================
   LISTAR TODOS OS TRANSPORTADORES (para o produtor ver)
   ============================================================ */
// GET /api/transportadores
router.get('/transportadores', (req, res) => {
  db.all(
    `
    SELECT
      id,
      nome,
      cpf,
      telefone
    FROM transportadores
    ORDER BY nome ASC
    `,
    [],
    (err, rows) => {
      if (err) {
        console.error('Erro ao listar transportadores:', err);
        return res
          .status(500)
          .json({ erro: 'Erro ao listar transportadores.' });
      }

      res.json({ sucesso: true, transportadores: rows });
    }
  );
});

module.exports = router;
