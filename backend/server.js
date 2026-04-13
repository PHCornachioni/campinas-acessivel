// Importando as bibliotecas
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// Inicializando o Express
const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json()); // Permite que a API receba dados em formato JSON

// Configurando a conexão com o Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Necessário para conexões em nuvem
});

// Rota de teste para verificar se o banco está respondendo
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

// Rota de Inserção (POST): Cadastrar um novo local e sua acessibilidade
app.post('/api/locais', async (req, res) => {
  // Extraímos os dados que chegarão no "corpo" da requisição
  const {
    nome, tipo, endereco, latitude, longitude,
    acessibilidade_fisica, acessibilidade_visual, acessibilidade_auditiva, acessibilidade_intelectual
  } = req.body;

  try {
    // Passo 1: Inserir na tabela 'locais' e resgatar o ID gerado pelo banco (RETURNING id)
    // O $1, $2, etc., protege nosso banco contra invasões (SQL Injection)
    const queryLocal = `
      INSERT INTO locais (nome, tipo, endereco, latitude, longitude)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id;
    `;
    const valoresLocal = [nome, tipo, endereco, latitude, longitude];
    const resultadoLocal = await pool.query(queryLocal, valoresLocal);
    
    const novoLocalId = resultadoLocal.rows[0].id;

    // Passo 2: Usar o ID gerado para amarrar os dados na tabela 'acessibilidade'
    const queryAcessibilidade = `
      INSERT INTO acessibilidade (equipamento_id, acessibilidade_fisica, acessibilidade_visual, acessibilidade_auditiva, acessibilidade_intelectual)
      VALUES ($1, $2, $3, $4, $5);
    `;
    // Usamos "|| false" para garantir que, se não enviarem a info, ela salva como falsa
    const valoresAcessibilidade = [
      novoLocalId,
      acessibilidade_fisica || false,
      acessibilidade_visual || false,
      acessibilidade_auditiva || false,
      acessibilidade_intelectual || false
    ];
    await pool.query(queryAcessibilidade, valoresAcessibilidade);

    // Devolvemos uma mensagem de sucesso (Código 201 significa "Criado com sucesso")
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

// Iniciando o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

// Rota oficial: Buscar todos os locais e seus dados de acessibilidade
app.get('/api/locais', async (req, res) => {
  try {
    // Aqui usamos um JOIN para unir a tabela de locais com a de acessibilidade
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
    
    // Retorna os dados em formato JSON para o Frontend
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
    // Passo 1: Apagar os dados dependentes na tabela 'acessibilidade' primeiro
    // Isso evita o erro de restrição de chave estrangeira (Foreign Key Constraint)
    await pool.query('DELETE FROM acessibilidade WHERE equipamento_id = $1', [id]);

    // Passo 2: Apagar o local da tabela principal
    const result = await pool.query('DELETE FROM locais WHERE id = $1', [id]);

    // Verifica se realmente algo foi apagado
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
    // Iniciamos uma transação para garantir que as duas tabelas sejam atualizadas juntas
    await pool.query('BEGIN');

    // 1. Atualiza a tabela 'locais'
    const queryLocal = `
      UPDATE locais 
      SET nome = $1, tipo = $2, endereco = $3, latitude = $4, longitude = $5
      WHERE id = $6;
    `;
    await pool.query(queryLocal, [nome, tipo, endereco, latitude, longitude, id]);

    // 2. Atualiza a tabela 'acessibilidade'
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

    await pool.query('COMMIT'); // Finaliza e salva as alterações
    res.status(200).json({ mensagem: 'Local atualizado com sucesso!' });

  } catch (erro) {
    await pool.query('ROLLBACK'); // Desfaz tudo se der erro
    console.error("Erro ao atualizar:", erro);
    res.status(500).json({ erro: 'Erro interno ao atualizar local.' });
  }
});