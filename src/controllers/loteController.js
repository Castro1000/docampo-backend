// src/controllers/loteController.js
const db = require('../db');

// Cadastrar novo lote (produto)
function criarLote(req, res) {
  const { produtor_id, produto, quantidade, data_colheita, local_producao } =
    req.body;

  if (!produtor_id || !produto || !quantidade || !data_colheita) {
    return res.status(400).json({
      erro: 'produtor_id, produto, quantidade e data_colheita são obrigatórios.',
    });
  }

  db.run(
    `
    INSERT INTO produtos (produtor_id, nome, quantidade, data_colheita, local_producao)
    VALUES (?, ?, ?, ?, ?)
  `,
    [produtor_id, produto, quantidade, data_colheita, local_producao || ''],
    function (err) {
      if (err) {
        console.error('Erro ao criar lote:', err.message);
        return res.status(500).json({ erro: 'Erro ao criar lote.' });
      }

      const produtoId = this.lastID;

      // Cria registro inicial no rastreamento
      db.run(
        `
        INSERT INTO rastreamento (produto_id, status, data, local)
        VALUES (?, 'Registrado pelo produtor', datetime('now'), ?)
      `,
        [produtoId, local_producao || 'Local de produção não informado']
      );

      // "QR Code" lógico: depois o app gera a imagem usando essa URL/id
      const qrData = {
        loteId: produtoId,
        url: `/lote/${produtoId}`,
      };

      res.json({
        sucesso: true,
        lote_id: produtoId,
        qrCode: qrData,
      });
    }
  );
}

// Listar lotes de um produtor (lista / cards)
function listarLotesDoProdutor(req, res) {
  const { produtorId } = req.params;

  db.all(
    `
    SELECT id, nome AS produto, quantidade, data_colheita, local_producao
    FROM produtos
    WHERE produtor_id = ?
    ORDER BY date(data_colheita) DESC, id DESC
  `,
    [produtorId],
    (err, rows) => {
      if (err) {
        console.error('Erro ao listar lotes:', err.message);
        return res.status(500).json({ erro: 'Erro ao listar lotes.' });
      }
      res.json(rows);
    }
  );
}

// Obter detalhes de um lote + histórico de rastreamento
function detalhesDoLote(req, res) {
  const { id } = req.params;

  db.get(
    `
    SELECT p.id, p.produtor_id, p.nome AS produto, p.quantidade, 
           p.data_colheita, p.local_producao
    FROM produtos p
    WHERE p.id = ?
  `,
    [id],
    (err, lote) => {
      if (err) {
        console.error('Erro ao buscar lote:', err.message);
        return res.status(500).json({ erro: 'Erro ao buscar lote.' });
      }
      if (!lote) {
        return res.status(404).json({ erro: 'Lote não encontrado.' });
      }

      db.all(
        `
        SELECT id, status, data, local, transportador_id
        FROM rastreamento
        WHERE produto_id = ?
        ORDER BY datetime(data) ASC
      `,
        [id],
        (err2, historico) => {
          if (err2) {
            console.error('Erro ao buscar histórico:', err2.message);
            return res
              .status(500)
              .json({ erro: 'Erro ao buscar histórico do lote.' });
          }

          res.json({
            lote,
            historico,
          });
        }
      );
    }
  );
}

// Editar lote
function editarLote(req, res) {
  const { id } = req.params;
  const { produto, quantidade, data_colheita, local_producao } = req.body;

  db.run(
    `
    UPDATE produtos
      SET nome = COALESCE(?, nome),
          quantidade = COALESCE(?, quantidade),
          data_colheita = COALESCE(?, data_colheita),
          local_producao = COALESCE(?, local_producao)
    WHERE id = ?
  `,
    [produto, quantidade, data_colheita, local_producao, id],
    function (err) {
      if (err) {
        console.error('Erro ao editar lote:', err.message);
        return res.status(500).json({ erro: 'Erro ao editar lote.' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ erro: 'Lote não encontrado.' });
      }
      res.json({ sucesso: true, mensagem: 'Lote atualizado com sucesso.' });
    }
  );
}

// Excluir lote (e histórico)
function excluirLote(req, res) {
  const { id } = req.params;

  db.run(
    `DELETE FROM rastreamento WHERE produto_id = ?`,
    [id],
    function (err) {
      if (err) {
        console.error(
          'Erro ao excluir histórico antes de excluir lote:',
          err.message
        );
        return res
          .status(500)
          .json({ erro: 'Erro ao excluir histórico do lote.' });
      }

      db.run(`DELETE FROM produtos WHERE id = ?`, [id], function (err2) {
        if (err2) {
          console.error('Erro ao excluir lote:', err2.message);
          return res.status(500).json({ erro: 'Erro ao excluir lote.' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ erro: 'Lote não encontrado.' });
        }
        res.json({ sucesso: true, mensagem: 'Lote excluído com sucesso.' });
      });
    }
  );
}

// Atualizar status (linha do tempo / em transporte / entregue / armazenado)
function atualizarStatusLote(req, res) {
  const { id } = req.params; // id do lote (produto_id)
  const { status, local, transportador_id } = req.body;

  if (!status || !local) {
    return res
      .status(400)
      .json({ erro: 'Status e local são obrigatórios para atualização.' });
  }

  db.run(
    `
    INSERT INTO rastreamento (produto_id, status, data, local, transportador_id)
    VALUES (?, ?, datetime('now'), ?, ?)
  `,
    [id, status, local, transportador_id || null],
    function (err) {
      if (err) {
        console.error('Erro ao atualizar status do lote:', err.message);
        return res
          .status(500)
          .json({ erro: 'Erro ao atualizar status do lote.' });
      }
      res.json({
        sucesso: true,
        mensagem: 'Status do lote atualizado.',
        rastreamento_id: this.lastID,
      });
    }
  );
}

// Obter histórico de movimentação (linha do tempo)
function historicoDoLote(req, res) {
  const { id } = req.params; // id do lote

  db.all(
    `
    SELECT id, status, data, local, transportador_id
    FROM rastreamento
    WHERE produto_id = ?
    ORDER BY datetime(data) ASC
  `,
    [id],
    (err, rows) => {
      if (err) {
        console.error('Erro ao carregar histórico:', err.message);
        return res
          .status(500)
          .json({ erro: 'Erro ao carregar histórico de movimentação.' });
      }
      res.json(rows);
    }
  );
}

// Relatório de produção por período (para gráficos)
function relatorioProducao(req, res) {
  const { produtor_id, inicio, fim, produto } = req.query;

  if (!produtor_id || !inicio || !fim) {
    return res.status(400).json({
      erro: 'produtor_id, inicio e fim são obrigatórios para o relatório.',
    });
  }

  const params = [produtor_id, inicio, fim];
  let filtroProduto = '';

  if (produto) {
    filtroProduto = 'AND nome = ?';
    params.push(produto);
  }

  db.all(
    `
    SELECT 
      nome AS produto,
      SUM(quantidade) AS total_quantidade,
      COUNT(*) AS qtd_lotes
    FROM produtos
    WHERE produtor_id = ?
      AND date(data_colheita) BETWEEN date(?) AND date(?)
      ${filtroProduto}
    GROUP BY nome
    ORDER BY nome
  `,
    params,
    (err, rows) => {
      if (err) {
        console.error('Erro ao gerar relatório:', err.message);
        return res
          .status(500)
          .json({ erro: 'Erro ao gerar relatório de produção.' });
      }
      res.json(rows);
    }
  );
}

module.exports = {
  criarLote,
  listarLotesDoProdutor,
  detalhesDoLote,
  editarLote,
  excluirLote,
  atualizarStatusLote,
  historicoDoLote,
  relatorioProducao,
};
