import db from '../db';
import { RowDataPacket } from 'mysql2';

export const getConfig = async (key: string): Promise<string | null> => {
  try {
    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT config_value FROM system_config WHERE config_key = ?',
      [key]
    );
    return rows[0]?.config_value || null;
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    return null;
  }
};

export const getCountingMode = async (): Promise<'weight' | 'unit'> => {
  try {
    const mode = await getConfig('counting_mode');
    return (mode as 'weight' | 'unit') || 'weight';
  } catch (error) {
    console.error('Erro ao buscar modo de contagem:', error);
    return 'weight'; // fallback para peso
  }
};

export const setConfig = async (key: string, value: string): Promise<void> => {
  await db.execute(
    `INSERT INTO system_config (config_key, config_value) 
     VALUES (?, ?) 
     ON DUPLICATE KEY UPDATE config_value = ?, updated_at = CURRENT_TIMESTAMP`,
    [key, value, value]
  );
};

export const getAllConfigs = async (): Promise<Array<{key: string, value: string, description: string}>> => {
  const [rows] = await db.execute<RowDataPacket[]>(
    'SELECT config_key as key, config_value as value, description FROM system_config ORDER BY config_key'
  );
  return rows as Array<{key: string, value: string, description: string}>;
};