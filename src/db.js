// src/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho EXATO do banco de dados (sempre na raiz do backend)
const dbFile = path.resolve(__dirname, '..', 'database.sqlite');

console.log("======================================");
console.log(">>> BANCO SQLITE EM USO:");
console.log(">>> ", dbFile);
console.log("======================================");

const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Erro ao conectar no banco SQLite:', err.message);
  } else {
    console.log('Conectado ao banco SQLite com sucesso.');
  }
});

// Criar tabelas e usuários padrão
db.serialize(() => {
  // Tabela Produtores
  db.run(`
    CREATE TABLE IF NOT EXISTS produtores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cpf TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL
    )
  `);

  // Tabela de Lotes
  db.run(`
    CREATE TABLE IF NOT EXISTS lotes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produtor_id INTEGER NOT NULL,
      produto TEXT NOT NULL,
      quantidade INTEGER NOT NULL,
      data_colheita TEXT,
      local_producao TEXT,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (produtor_id) REFERENCES produtores(id)
    )
  `);

  // Tabela Transportadores
  db.run(`
    CREATE TABLE IF NOT EXISTS transportadores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cpf TEXT UNIQUE,       -- CPF/CNPJ para login
      senha TEXT NOT NULL,   -- senha para login
      telefone TEXT,         -- telefone do transportador
      veiculo_tipo TEXT,
      placa TEXT,
      capacidade TEXT,
      cidade_atendimento TEXT,
      uf_atendimento TEXT,
      observacoes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela Administradores
  db.run(`
    CREATE TABLE IF NOT EXISTS administradores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      cpf TEXT UNIQUE NOT NULL,
      senha TEXT NOT NULL
    )
  `);

  // Tabela Produtos (se ainda estiver usando)
  db.run(`
    CREATE TABLE IF NOT EXISTS produtos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produtor_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      quantidade REAL NOT NULL,
      data_colheita TEXT NOT NULL,
      FOREIGN KEY(produtor_id) REFERENCES produtores(id)
    )
  `);

  // Tabela Rastreamento (vinculada a produtos/transportadores)
  db.run(`
    CREATE TABLE IF NOT EXISTS rastreamento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      data TEXT NOT NULL,
      local TEXT NOT NULL,
      transportador_id INTEGER,
      FOREIGN KEY(produto_id) REFERENCES produtos(id),
      FOREIGN KEY(transportador_id) REFERENCES transportadores(id)
    )
  `);

  // Admin padrão
  db.run(`
    INSERT OR IGNORE INTO administradores (id, nome, cpf, senha)
    VALUES (1, 'Administrador Geral', '00011122233', '1234')
  `);

  // Transportador padrão
  db.run(`
    INSERT OR IGNORE INTO transportadores (id, nome, cpf, senha, telefone)
    VALUES (1, 'Transportador Oficial', '99988877766', '1234', '(92) 99999-9999')
  `);
});

module.exports = db;
