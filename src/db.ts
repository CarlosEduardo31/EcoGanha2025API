import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Cria um pool de conexões com o banco de dados
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Função para testar a conexão
export const testConnection = async (): Promise<void> => {
  try {
    await pool.query('SELECT 1');
    console.log('Conexão com o banco de dados estabelecida com sucesso!');
  } catch (error) {
    console.error('Erro ao conectar ao banco de dados:', error);
    throw error;
  }
};

// Exporta o pool para uso em outros módulos
export default pool;