"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testConnection = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Cria um pool de conexões com o banco de dados
const pool = promise_1.default.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
// Função para testar a conexão
const testConnection = async () => {
    try {
        await pool.query('SELECT 1');
        console.log('Conexão com o banco de dados estabelecida com sucesso!');
    }
    catch (error) {
        console.error('Erro ao conectar ao banco de dados:', error);
        throw error;
    }
};
exports.testConnection = testConnection;
// Exporta o pool para uso em outros módulos
exports.default = pool;
