// src/index.ts
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { testConnection } from './db';
import routes from './routes'; 
import { errorHandler } from './middlewares/errorHandler';

// Carrega variáveis de ambiente
dotenv.config();

// Inicializa o Express
const app = express();

// Middlewares
app.use(helmet()); // Adiciona headers de segurança
app.use(cors());  // Habilita CORS
app.use(express.json()); // Parse de JSON no body das requisições

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'API EcoGanha funcionando!' });
});

// Registrar as rotas da API
console.log('Registrando rotas da API...');
app.use('/api', routes);
console.log('Rotas da API registradas com sucesso!');

// Middleware para rotas não encontradas - Versão mais segura
// No arquivo src/index.ts, substitua o middleware app.all('*', ...) por:
app.use((req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: 'Rota não encontrada'
  });
});

// Middleware para tratamento de erros
app.use(errorHandler);

// Porta
const PORT = process.env.PORT || 4000;
console.log(`Tentando iniciar o servidor na porta ${PORT}...`);

// Inicia o servidor
const startServer = async () => {
  try {
    // Testa a conexão com o banco de dados
    await testConnection();
    
    // Inicia o servidor
    app.listen(PORT, () => {
      console.log(`Servidor rodando com sucesso na porta ${PORT}`);
      console.log(`Acesse a API em: localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Erro ao iniciar o servidor:', error);
    process.exit(1);
  }
};

startServer();