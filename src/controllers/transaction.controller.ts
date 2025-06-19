import { Request, Response, NextFunction } from 'express';
import db from '../db';
import { AppError } from '../utils/appError';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getCountingMode } from '../services/configService'; // NOVO IMPORT

// Adicionar pontos por reciclagem (usado pelos operadores de Eco Ponto)
export const addRecycleTransaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const operatorId = req.user.id;
    const { userId, materialId, weight, quantity, ecoPointId } = req.body; // ADICIONADO quantity

    // 🔍 DEBUG - ADICIONE ESTAS LINHAS TEMPORARIAMENTE (remover depois)
    console.log('🔍 DEBUG INFO:');
    console.log('Operator ID do token:', operatorId);
    console.log('EcoPoint ID da requisição:', ecoPointId);
    console.log('User do token completo:', req.user);

    // Obter modo de contagem atual
    const countingMode = await getCountingMode(); // NOVO
    console.log('🔧 Modo de contagem atual:', countingMode);

    // Validação baseada no modo de contagem
    if (countingMode === 'weight') {
      if (!userId || !materialId || !weight || !ecoPointId) {
        throw new AppError('Todos os campos são obrigatórios (modo peso: userId, materialId, weight, ecoPointId)', 400);
      }
      if (weight <= 0) {
        throw new AppError('Peso deve ser maior que zero', 400);
      }
    } else {
      if (!userId || !materialId || !quantity || !ecoPointId) {
        throw new AppError('Todos os campos são obrigatórios (modo unidade: userId, materialId, quantity, ecoPointId)', 400);
      }
      if (quantity <= 0) {
        throw new AppError('Quantidade deve ser maior que zero', 400);
      }
    }

    // Validar se operador está associado ao eco ponto
    const [operators] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM eco_points WHERE id = ? AND operator_id = ?',
      [ecoPointId, operatorId]
    );

    if (operators.length === 0) {
      throw new AppError('Operador não autorizado para este Eco Ponto', 403);
    }

    // Verificar se o eco ponto aceita este material
    const [materials] = await db.execute<RowDataPacket[]>(
      'SELECT 1 FROM eco_point_materials WHERE eco_point_id = ? AND material_id = ?',
      [ecoPointId, materialId]
    );

    if (materials.length === 0) {
      throw new AppError('Este Eco Ponto não aceita este material', 400);
    }

    // Buscar pontos do material baseado no modo de contagem
    const [materialRows] = await db.execute<RowDataPacket[]>(
      countingMode === 'weight' 
        ? 'SELECT points_per_kg, points_per_unit FROM materials WHERE id = ?'
        : 'SELECT points_per_kg, points_per_unit FROM materials WHERE id = ?',
      [materialId]
    );

    if (materialRows.length === 0) {
      throw new AppError('Material não encontrado', 404);
    }

    // Calcular pontos baseado no modo
    let points: number;
    if (countingMode === 'weight') {
      const pointsPerKg = materialRows[0].points_per_kg;
      if (!pointsPerKg) {
        throw new AppError('Material não tem pontos por kg configurado', 400);
      }
      points = Math.round(weight * pointsPerKg);
    } else {
      const pointsPerUnit = materialRows[0].points_per_unit;
      if (!pointsPerUnit) {
        throw new AppError('Material não tem pontos por unidade configurado', 400);
      }
      points = quantity * pointsPerUnit;
    }

    // Iniciar transação
    await db.query('START TRANSACTION');

    try {
      // Registrar a transação de reciclagem (DUAL MODE - salva weight E quantity)
      const [result] = await db.execute<ResultSetHeader>(
        'INSERT INTO recycle_transactions (user_id, eco_point_id, material_id, weight, quantity, points) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, ecoPointId, materialId, weight || 0, quantity || 0, points]
      );

      const transactionId = result.insertId;

      // Atualizar os pontos do usuário
      await db.execute(
        'UPDATE users SET points = points + ? WHERE id = ?',
        [points, userId]
      );

      // Commit da transação
      await db.query('COMMIT');

      // Buscar os dados atualizados
      const [userRows] = await db.execute<RowDataPacket[]>(
        'SELECT id, name, phone, user_type as userType, points FROM users WHERE id = ?',
        [userId]
      );

      const [transactionRows] = await db.execute<RowDataPacket[]>(
        `SELECT 
          t.id, 
          t.weight, 
          t.quantity,
          t.points, 
          t.created_at as date, 
          m.name as materialName, 
          e.name as ecoPointName 
        FROM 
          recycle_transactions t
          JOIN materials m ON t.material_id = m.id
          JOIN eco_points e ON t.eco_point_id = e.id
        WHERE 
          t.id = ?`,
        [transactionId]
      );

      res.status(201).json({
        status: 'success',
        data: {
          transaction: transactionRows[0],
          user: userRows[0],
          counting_mode: countingMode // Retornar modo usado
        }
      });
    } catch (error) {
      // Rollback em caso de erro
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

// Listar transações de um eco ponto
export const getEcoPointTransactions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const operatorId = req.user.id;
    const { ecoPointId } = req.params;

    // Validar se operador está associado ao eco ponto
    const [operators] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM eco_points WHERE id = ? AND operator_id = ?',
      [ecoPointId, operatorId]
    );

    if (operators.length === 0) {
      throw new AppError('Operador não autorizado para este Eco Ponto', 403);
    }

    // Buscar transações do eco ponto (INCLUINDO quantity)
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT 
        t.id, 
        t.weight, 
        t.quantity,
        t.points, 
        t.created_at as date, 
        m.name as materialName,
        u.name as userName,
        u.phone as userPhone
      FROM 
        recycle_transactions t
        JOIN materials m ON t.material_id = m.id
        JOIN users u ON t.user_id = u.id
      WHERE 
        t.eco_point_id = ?
      ORDER BY 
        t.created_at DESC`,
      [ecoPointId]
    );

    // Incluir modo de contagem atual na resposta
    const countingMode = await getCountingMode();

    res.json({
      status: 'success',
      data: rows,
      counting_mode: countingMode
    });
  } catch (error) {
    next(error);
  }
};

// Obter estatísticas de um eco ponto
export const getEcoPointStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const operatorId = req.user.id;
    const { ecoPointId } = req.params;

    // Validar se operador está associado ao eco ponto
    const [operators] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM eco_points WHERE id = ? AND operator_id = ?',
      [ecoPointId, operatorId]
    );

    if (operators.length === 0) {
      throw new AppError('Operador não autorizado para este Eco Ponto', 403);
    }

    const countingMode = await getCountingMode();

    // Buscar estatísticas do dia atual
    const today = new Date().toISOString().split('T')[0];
    
    // Total reciclado hoje (baseado no modo)
    const totalColumn = countingMode === 'weight' ? 'weight' : 'quantity';
    const [totalToday] = await db.execute<RowDataPacket[]>(
      `SELECT SUM(${totalColumn}) as totalAmount 
      FROM recycle_transactions 
      WHERE eco_point_id = ? AND DATE(created_at) = ?`,
      [ecoPointId, today]
    );

    // Pontos distribuídos hoje
    const [pointsToday] = await db.execute<RowDataPacket[]>(
      `SELECT SUM(points) as totalPoints 
      FROM recycle_transactions 
      WHERE eco_point_id = ? AND DATE(created_at) = ?`,
      [ecoPointId, today]
    );

    // Usuários atendidos hoje
    const [usersToday] = await db.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT user_id) as userCount 
      FROM recycle_transactions 
      WHERE eco_point_id = ? AND DATE(created_at) = ?`,
      [ecoPointId, today]
    );

    // Material mais reciclado (total)
    const [topMaterial] = await db.execute<RowDataPacket[]>(
      `SELECT m.name, SUM(t.${totalColumn}) as totalAmount
      FROM recycle_transactions t
      JOIN materials m ON t.material_id = m.id
      WHERE t.eco_point_id = ?
      GROUP BY t.material_id
      ORDER BY totalAmount DESC
      LIMIT 1`,
      [ecoPointId]
    );

    // Distribuição por material
    const [materialDistribution] = await db.execute<RowDataPacket[]>(
      `SELECT 
        m.name, 
        SUM(t.${totalColumn}) as totalAmount,
        ROUND((SUM(t.${totalColumn}) / (
          SELECT SUM(${totalColumn}) 
          FROM recycle_transactions 
          WHERE eco_point_id = ?
        )) * 100, 1) as percentage
      FROM 
        recycle_transactions t
        JOIN materials m ON t.material_id = m.id
      WHERE 
        t.eco_point_id = ?
      GROUP BY 
        t.material_id
      ORDER BY 
        totalAmount DESC`,
      [ecoPointId, ecoPointId]
    );

    res.json({
      status: 'success',
      data: {
        totalRecycledToday: totalToday[0].totalAmount || 0,
        pointsDistributed: pointsToday[0].totalPoints || 0,
        usersServed: usersToday[0].userCount || 0,
        mostRecycledMaterial: topMaterial.length > 0 ? topMaterial[0].name : null,
        materialDistribution,
        counting_mode: countingMode,
        unit_label: countingMode === 'weight' ? 'kg' : 'unidades'
      }
    });
  } catch (error) {
    next(error);
  }
};