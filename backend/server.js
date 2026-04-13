// Importando as bibliotecas
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// Inicializando o Express
const app = express();

// CORS Liberado: Permite que o seu React (mesmo local) converse com o Render sem travas
app.use(cors()); 
app.use(express.json()); // Permite que a API receba dados em formato JSON

// Configurando a conexão com o Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Necessário para conexões em nuvem
});

// ==========================================
// ROTAS DA API
// ==========================================

// Rota de teste
app.get('/api/teste-conexao', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS hora_atual;');
    res.json({
      status: 'Sucesso',
      mensagem: 'Conectado ao Supabase de Campinas com sucesso!',
      hora_banco: result.rows[0].hora_atual
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ status: 'Erro', mensagem: 'Falha ao conectar no banco.' });
  }
});

// Rota de Inserção (POST)
app.post('/api/locais', async (req, res) => {
  const {
    nome, tipo, endereco, latitude, longitude,
    acessibilidade_fisica, acessibilidade_visual, acessibilidade_auditiva, acessibilidade_intelectual
  } = req.body;

  try {
    const queryLocal = `
      INSERT INTO locais (nome, tipo, endereco, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `;
    const valoresLocal = [nome, tipo, endereco, latitude, longitude];
    const resultadoLocal = await pool.query(queryLocal, valoresLocal);
    
    const novoLocalId = resultadoLocal.rows[0].id;

    const queryAcessibilidade = `
      INSERT INTO acessibilidade (equipamento_id, acessibilidade_fisica, acessibilidade_visual, acessibilidade_auditiva, acessibilidade_intelectual)
      VALUES ($1, $2, $3, $4, $5);
    `;
    const valoresAcessibilidade = [
      novoLocalId,
      acessibilidade_fisica || false,
      acessibilidade_visual || false,
      acessibilidade_auditiva || false,
      acessibilidade_intelectual || false
    ];
    await pool.query(queryAcessibilidade, valoresAcessibilidade);

    res.status(201).json({ 
      status: 'Sucesso', 
      mensagem: 'Local cadastrado com sucesso!', 
      id_gerado: novoLocalId 
    });

  } catch (erro) {
    console.error('Erro ao cadastrar o local:', erro);
    res.status(500).json({ status: 'Erro', mensagem: 'Falha ao salvar no banco de dados.' });
  }
});

// Rota oficial: Buscar todos os locais
app.get('/api/locais', async (req, res) => {
  try {
    const query = `
      SELECT 
        l.id, l.nome, l.tipo, l.endereco, l.latitude, l.longitude,
        a.acessibilidade_fisica, a.acessibilidade_visual, 
        a.acessibilidade_auditiva, a.acessibilidade_intelectual
      FROM locais l
      LEFT JOIN acessibilidade a ON l.id = a.equipamento_id
      ORDER BY l.nome ASC;
    `;
    
    const resultado = await pool.query(query);
    res.json(resultado.rows);
    
  } catch (erro) {
    console.error('Erro ao buscar os locais:', erro);
    res.status(500).json({ status: 'Erro', mensagem: 'Falha ao buscar os dados.' });
  }
});

// ROTA PARA DELETAR UM LOCAL
app.delete('/api/locais/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM acessibilidade WHERE equipamento_id = $1', [id]);
    const result = await pool.query('DELETE FROM locais WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ erro: 'Local não encontrado.' });
    }

    res.status(200).json({ mensagem: 'Local e seus dados de acessibilidade excluídos com sucesso!' });
  } catch (erro) {
    console.error("Erro ao excluir:", erro);
    res.status(500).json({ erro: 'Erro interno no servidor ao tentar excluir.' });
  }
});

// ROTA PARA ATUALIZAR UM LOCAL (PUT)
app.put('/api/locais/:id', async (req, res) => {
  const { id } = req.params;
  const {
    nome, tipo, endereco, latitude, longitude,
    acessibilidade_fisica, acessibilidade_visual, acessibilidade_auditiva, acessibilidade_intelectual
  } = req.body;

  try {
    await pool.query('BEGIN');

    const queryLocal = `
      UPDATE locais 
      SET nome = $1, tipo = $2, endereco = $3, latitude = $4, longitude = $5
      WHERE id = $6;
    `;
    await pool.query(queryLocal, [nome, tipo, endereco, latitude, longitude, id]);

    const queryAcesso = `
      UPDATE acessibilidade 
      SET acessibilidade_fisica = $1, acessibilidade_visual = $2, 
          acessibilidade_auditiva = $3, acessibilidade_intelectual = $4
      WHERE equipamento_id = $5;
    `;
    await pool.query(queryAcesso, [
      acessibilidade_fisica, acessibilidade_visual, 
      acessibilidade_auditiva, acessibilidade_intelectual, id
    ]);

    await pool.query('COMMIT');
    res.status(200).json({ mensagem: 'Local atualizado com sucesso!' });

  } catch (erro) {
    await pool.query('ROLLBACK');
    console.error("Erro ao atualizar:", erro);
    res.status(500).json({ erro: 'Erro interno ao atualizar local.' });
  }
});

// Iniciando Servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});