// src/routes/transporteRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar transportes de um produtor (para tela do produtor > Transporte)
router.get('/transportes/produtor/:produtorId', (req, res) => {
  const { produtorId } = req.params;

  const sql = `
    SELECT
      t.id AS transporte_id,
      t.destino,
      t.status,
      t.data_saida,
      t.data_chegada,
      tr.id AS transportador_id,
      tr.nome AS transportador_nome,
      tr.telefone AS transportador_telefone,
      GROUP_CONCAT(l.id) AS lotes_ids,
      GROUP_CONCAT(l.produto) AS lotes_produtos
    FROM transportes t
    JOIN transportadores tr ON tr.id = t.transportador_id
    JOIN transporte_lotes tl ON tl.transporte_id = t.id
    JOIN lotes l ON l.id = tl.lote_id
    WHERE t.produtor_id = ?
    GROUP BY t.id
    ORDER BY t.id DESC
  `;

  db.all(sql, [produtorId], (err, rows) => {
    if (err) {
      console.error('Erro ao listar transportes do produtor:', err);
      return res.status(500).json({ erro: 'Erro ao listar transportes do produtor.' });
    }

    const resposta = rows.map((row) => ({
      id: row.transporte_id,
      destino: row.destino,
      status: row.status,
      data_saida: row.data_saida,
      data_chegada: row.data_chegada,
      transportador: {
        id: row.transportador_id,
        nome: row.transportador_nome,
        telefone: row.transportador_telefone || null,
      },
      lotes: (row.lotes_ids || '').split(',').map((idStr, idx) => ({
        id: Number(idStr),
        produto: (row.lotes_produtos || '').split(',')[idx] || '',
      })),
    }));

    res.json(resposta);
  });
});

// (Opcional) Criar um novo transporte — futuro fluxo quando você montar a tela do transportador
router.post('/transportes', (req, res) => {
  const {
    produtor_id,
    transportador_id,
    destino,
    status = 'CARREGANDO',
    data_saida = null,
    data_chegada = null,
    lotes_ids = [], // array de IDs de lotes
  } = req.body;

  if (!produtor_id || !transportador_id || !destino || !Array.isArray(lotes_ids) || lotes_ids.length === 0) {
    return res.status(400).json({ erro: 'Dados obrigatórios não informados.' });
  }

  db.serialize(() => {
    db.run(
      `
        INSERT INTO transportes (produtor_id, transportador_id, destino, status, data_saida, data_chegada)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [produtor_id, transportador_id, destino, status, data_saida, data_chegada],
      function (err) {
        if (err) {
          console.error('Erro ao criar transporte:', err);
          return res.status(500).json({ erro: 'Erro ao criar transporte.' });
        }

        const transporteId = this.lastID;

        const stmt = db.prepare(`
          INSERT INTO transporte_lotes (transporte_id, lote_id)
          VALUES (?, ?)
        `);

        lotes_ids.forEach((loteId) => {
          stmt.run([transporteId, loteId]);
        });

        stmt.finalize((err2) => {
          if (err2) {
            console.error('Erro ao vincular lotes ao transporte:', err2);
            return res.status(500).json({ erro: 'Erro ao vincular lotes ao transporte.' });
          }

          res.status(201).json({ id: transporteId });
        });
      }
    );
  });
});

// Atualizar status do transporte (CARREGANDO, EM_TRANSITO, DESCARREGANDO, CONCLUIDO)
router.put('/transportes/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ erro: 'Status não informado.' });
  }

  db.run(
    `UPDATE transportes SET status = ? WHERE id = ?`,
    [status, id],
    function (err) {
      if (err) {
        console.error('Erro ao atualizar status do transporte:', err);
        return res.status(500).json({ erro: 'Erro ao atualizar status.' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ erro: 'Transporte não encontrado.' });
      }

      res.json({ mensagem: 'Status atualizado com sucesso.' });
    }
  );
});

module.exports = router;
