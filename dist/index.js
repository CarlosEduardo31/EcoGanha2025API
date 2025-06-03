"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const db_1 = require("./db");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middlewares/errorHandler");
// Carrega variáveis de ambiente
dotenv_1.default.config();
// Inicializa o Express
const app = (0, express_1.default)();
// Middlewares
app.use((0, helmet_1.default)()); // Adiciona headers de segurança
app.use((0, cors_1.default)()); // Habilita CORS
app.use(express_1.default.json()); // Parse de JSON no body das requisições
// Rota de teste
app.get('/', (req, res) => {
    res.json({ message: 'API EcoGanha funcionando!' });
});
// Registrar as rotas da API
console.log('Registrando rotas da API...');
app.use('/api', routes_1.default);
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
app.use(errorHandler_1.errorHandler);
// Porta
const PORT = process.env.PORT || 4000;
console.log(`Tentando iniciar o servidor na porta ${PORT}...`);
// Inicia o servidor
const startServer = async () => {
    try {
        // Testa a conexão com o banco de dados
        await (0, db_1.testConnection)();
        // Inicia o servidor
        app.listen(PORT, () => {
            console.log(`Servidor rodando com sucesso na porta ${PORT}`);
            console.log(`Acesse a API em: localhost:${PORT}/api`);
        });
    }
    catch (error) {
        console.error('Erro ao iniciar o servidor:', error);
        process.exit(1);
    }
};
startServer();
