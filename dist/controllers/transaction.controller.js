"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEcoPointStats = exports.getEcoPointTransactions = exports.addRecycleTransaction = void 0;
const db_1 = __importDefault(require("../db"));
const appError_1 = require("../utils/appError");
// Adicionar pontos por reciclagem (usado pelos operadores de Eco Ponto)
const addRecycleTransaction = async (req, res, next) => {
    try {
        const operatorId = req.user.id;
        const { userId, materialId, weight, ecoPointId } = req.body;
        // Validar se todos os campos necessários foram fornecidos
        if (!userId || !materialId || !weight || !ecoPointId) {
            throw new appError_1.AppError('Todos os campos são obrigatórios', 400);
        }
        // Validar se operador está associado ao eco ponto
        const [operators] = await db_1.default.execute('SELECT id FROM eco_points WHERE id = ? AND operator_id = ?', [ecoPointId, operatorId]);
        if (operators.length === 0) {
            throw new appError_1.AppError('Operador não autorizado para este Eco Ponto', 403);
        }
        // Verificar se o eco ponto aceita este material
        const [materials] = await db_1.default.execute('SELECT 1 FROM eco_point_materials WHERE eco_point_id = ? AND material_id = ?', [ecoPointId, materialId]);
        if (materials.length === 0) {
            throw new appError_1.AppError('Este Eco Ponto não aceita este material', 400);
        }
        // Buscar o valor em pontos do material
        const [materialRows] = await db_1.default.execute('SELECT points_per_kg FROM materials WHERE id = ?', [materialId]);
        if (materialRows.length === 0) {
            throw new appError_1.AppError('Material não encontrado', 404);
        }
        const pointsPerKg = materialRows[0].points_per_kg;
        const points = Math.round(weight * pointsPerKg);
        // Iniciar transação
        await db_1.default.query('START TRANSACTION');
        try {
            // Registrar a transação de reciclagem
            const [result] = await db_1.default.execute('INSERT INTO recycle_transactions (user_id, eco_point_id, material_id, weight, points) VALUES (?, ?, ?, ?, ?)', [userId, ecoPointId, materialId, weight, points]);
            const transactionId = result.insertId;
            // Atualizar os pontos do usuário
            await db_1.default.execute('UPDATE users SET points = points + ? WHERE id = ?', [points, userId]);
            // Commit da transação
            await db_1.default.query('COMMIT');
            // Buscar os dados atualizados
            const [userRows] = await db_1.default.execute('SELECT id, name, phone, user_type as userType, points FROM users WHERE id = ?', [userId]);
            const [transactionRows] = await db_1.default.execute(`SELECT 
          t.id, 
          t.weight, 
          t.points, 
          t.created_at as date, 
          m.name as materialName, 
          e.name as ecoPointName 
        FROM 
          recycle_transactions t
          JOIN materials m ON t.material_id = m.id
          JOIN eco_points e ON t.eco_point_id = e.id
        WHERE 
          t.id = ?`, [transactionId]);
            res.status(201).json({
                status: 'success',
                data: {
                    transaction: transactionRows[0],
                    user: userRows[0]
                }
            });
        }
        catch (error) {
            // Rollback em caso de erro
            await db_1.default.query('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        next(error);
    }
};
exports.addRecycleTransaction = addRecycleTransaction;
// Listar transações de um eco ponto
const getEcoPointTransactions = async (req, res, next) => {
    try {
        const operatorId = req.user.id;
        const { ecoPointId } = req.params;
        // Validar se operador está associado ao eco ponto
        const [operators] = await db_1.default.execute('SELECT id FROM eco_points WHERE id = ? AND operator_id = ?', [ecoPointId, operatorId]);
        if (operators.length === 0) {
            throw new appError_1.AppError('Operador não autorizado para este Eco Ponto', 403);
        }
        // Buscar transações do eco ponto
        const [rows] = await db_1.default.execute(`SELECT 
        t.id, 
        t.weight, 
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
        t.created_at DESC`, [ecoPointId]);
        res.json({
            status: 'success',
            data: rows
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getEcoPointTransactions = getEcoPointTransactions;
// Obter estatísticas de um eco ponto
const getEcoPointStats = async (req, res, next) => {
    try {
        const operatorId = req.user.id;
        const { ecoPointId } = req.params;
        // Validar se operador está associado ao eco ponto
        const [operators] = await db_1.default.execute('SELECT id FROM eco_points WHERE id = ? AND operator_id = ?', [ecoPointId, operatorId]);
        if (operators.length === 0) {
            throw new appError_1.AppError('Operador não autorizado para este Eco Ponto', 403);
        }
        // Buscar estatísticas do dia atual
        const today = new Date().toISOString().split('T')[0];
        // Total reciclado hoje
        const [totalToday] = await db_1.default.execute(`SELECT SUM(weight) as totalWeight 
      FROM recycle_transactions 
      WHERE eco_point_id = ? AND DATE(created_at) = ?`, [ecoPointId, today]);
        // Pontos distribuídos hoje
        const [pointsToday] = await db_1.default.execute(`SELECT SUM(points) as totalPoints 
      FROM recycle_transactions 
      WHERE eco_point_id = ? AND DATE(created_at) = ?`, [ecoPointId, today]);
        // Usuários atendidos hoje
        const [usersToday] = await db_1.default.execute(`SELECT COUNT(DISTINCT user_id) as userCount 
      FROM recycle_transactions 
      WHERE eco_point_id = ? AND DATE(created_at) = ?`, [ecoPointId, today]);
        // Material mais reciclado (total)
        const [topMaterial] = await db_1.default.execute(`SELECT m.name, SUM(t.weight) as totalWeight
      FROM recycle_transactions t
      JOIN materials m ON t.material_id = m.id
      WHERE t.eco_point_id = ?
      GROUP BY t.material_id
      ORDER BY totalWeight DESC
      LIMIT 1`, [ecoPointId]);
        // Distribuição por material
        const [materialDistribution] = await db_1.default.execute(`SELECT 
        m.name, 
        SUM(t.weight) as totalWeight,
        ROUND((SUM(t.weight) / (
          SELECT SUM(weight) 
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
        totalWeight DESC`, [ecoPointId, ecoPointId]);
        res.json({
            status: 'success',
            data: {
                totalRecycledToday: totalToday[0].totalWeight || 0,
                pointsDistributed: pointsToday[0].totalPoints || 0,
                usersServed: usersToday[0].userCount || 0,
                mostRecycledMaterial: topMaterial.length > 0 ? topMaterial[0].name : null,
                materialDistribution
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getEcoPointStats = getEcoPointStats;
