"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEcoPoint = exports.updateEcoPoint = exports.createEcoPoint = exports.getEcoPoint = exports.getAllEcoPoints = exports.getOperatorEcoPoint = void 0;
const db_1 = __importDefault(require("../db"));
const appError_1 = require("../utils/appError");
// Obter ecoponto do operador logado
const getOperatorEcoPoint = async (req, res, next) => {
    try {
        const operatorId = req.user.id;
        // Buscar o ponto de coleta associado ao operador logado
        const [rows] = await db_1.default.execute(`SELECT 
        e.id, 
        e.name, 
        e.address, 
        e.opening_hours as openingHours,
        e.operator_id as operatorId
      FROM 
        eco_points e
      WHERE 
        e.operator_id = ?`, [operatorId]);
        if (rows.length === 0) {
            throw new appError_1.AppError('Operador não está associado a nenhum Eco Ponto', 404);
        }
        const ecoPoint = rows[0];
        // Buscar os materiais aceitos
        const [materials] = await db_1.default.execute(`SELECT 
        m.id, 
        m.name,
        m.points_per_kg as pointsPerKg
      FROM 
        materials m
        JOIN eco_point_materials epm ON m.id = epm.material_id
      WHERE 
        epm.eco_point_id = ?`, [ecoPoint.id]);
        ecoPoint.materials = materials;
        res.json({
            status: 'success',
            data: ecoPoint
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getOperatorEcoPoint = getOperatorEcoPoint;
// Obter todos os pontos de coleta
const getAllEcoPoints = async (req, res, next) => {
    try {
        // Buscar todos os pontos de coleta com seus materiais aceitos
        const [rows] = await db_1.default.execute(`SELECT 
        e.id, 
        e.name, 
        e.address, 
        e.opening_hours as openingHours
      FROM 
        eco_points e`);
        // Para cada ponto de coleta, buscar os materiais aceitos
        const ecoPoints = await Promise.all(rows.map(async (ecoPoint) => {
            const [materials] = await db_1.default.execute(`SELECT 
          m.id, 
          m.name,
          m.points_per_kg as pointsPerKg
        FROM 
          materials m
          JOIN eco_point_materials epm ON m.id = epm.material_id
        WHERE 
          epm.eco_point_id = ?`, [ecoPoint.id]);
            return {
                ...ecoPoint,
                materials: materials
            };
        }));
        res.json({
            status: 'success',
            data: ecoPoints
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllEcoPoints = getAllEcoPoints;
// Obter um ponto de coleta específico
const getEcoPoint = async (req, res, next) => {
    try {
        const { ecoPointId } = req.params;
        // Buscar o ponto de coleta
        const [rows] = await db_1.default.execute(`SELECT 
        e.id, 
        e.name, 
        e.address, 
        e.opening_hours as openingHours
      FROM 
        eco_points e
      WHERE 
        e.id = ?`, [ecoPointId]);
        if (rows.length === 0) {
            throw new appError_1.AppError('Ponto de coleta não encontrado', 404);
        }
        const ecoPoint = rows[0];
        // Buscar os materiais aceitos
        const [materials] = await db_1.default.execute(`SELECT 
        m.id, 
        m.name,
        m.points_per_kg as pointsPerKg
      FROM 
        materials m
        JOIN eco_point_materials epm ON m.id = epm.material_id
      WHERE 
        epm.eco_point_id = ?`, [ecoPointId]);
        ecoPoint.materials = materials;
        res.json({
            status: 'success',
            data: ecoPoint
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getEcoPoint = getEcoPoint;
// Criar novo ponto de coleta (admin)
const createEcoPoint = async (req, res, next) => {
    try {
        const { name, address, openingHours, operatorId, materials } = req.body;
        // Validar se todos os campos necessários foram fornecidos
        if (!name || !address || !openingHours || !materials || !Array.isArray(materials)) {
            throw new appError_1.AppError('Todos os campos são obrigatórios', 400);
        }
        // Iniciar transação
        await db_1.default.query('START TRANSACTION');
        try {
            // Inserir novo ponto de coleta
            const [result] = await db_1.default.execute(`INSERT INTO eco_points (name, address, opening_hours, operator_id) 
        VALUES (?, ?, ?, ?)`, [name, address, openingHours, operatorId || null]);
            const ecoPointId = result.insertId;
            // Inserir materiais aceitos
            for (const materialId of materials) {
                await db_1.default.execute('INSERT INTO eco_point_materials (eco_point_id, material_id) VALUES (?, ?)', [ecoPointId, materialId]);
            }
            // Commit da transação
            await db_1.default.query('COMMIT');
            // Buscar o ponto de coleta criado
            const [ecoPoints] = await db_1.default.execute(`SELECT 
          e.id, 
          e.name, 
          e.address, 
          e.opening_hours as openingHours,
          e.operator_id as operatorId
        FROM 
          eco_points e
        WHERE 
          e.id = ?`, [ecoPointId]);
            // Buscar os materiais aceitos
            const [materialRows] = await db_1.default.execute(`SELECT 
          m.id, 
          m.name,
          m.points_per_kg as pointsPerKg
        FROM 
          materials m
          JOIN eco_point_materials epm ON m.id = epm.material_id
        WHERE 
          epm.eco_point_id = ?`, [ecoPointId]);
            const ecoPoint = {
                ...ecoPoints[0],
                materials: materialRows
            };
            res.status(201).json({
                status: 'success',
                data: ecoPoint
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
exports.createEcoPoint = createEcoPoint;
// Atualizar ponto de coleta (admin)
const updateEcoPoint = async (req, res, next) => {
    try {
        const { ecoPointId } = req.params;
        const { name, address, openingHours, operatorId, materials } = req.body;
        // Verificar se o ponto de coleta existe
        const [existingPoints] = await db_1.default.execute('SELECT id FROM eco_points WHERE id = ?', [ecoPointId]);
        if (existingPoints.length === 0) {
            throw new appError_1.AppError('Ponto de coleta não encontrado', 404);
        }
        // Iniciar transação
        await db_1.default.query('START TRANSACTION');
        try {
            // Atualizar ponto de coleta
            await db_1.default.execute(`UPDATE eco_points 
        SET 
          name = ?, 
          address = ?, 
          opening_hours = ?, 
          operator_id = ? 
        WHERE 
          id = ?`, [name, address, openingHours, operatorId || null, ecoPointId]);
            // Atualizar materiais aceitos se fornecidos
            if (materials && Array.isArray(materials)) {
                // Remover todos os materiais existentes
                await db_1.default.execute('DELETE FROM eco_point_materials WHERE eco_point_id = ?', [ecoPointId]);
                // Inserir novos materiais
                for (const materialId of materials) {
                    await db_1.default.execute('INSERT INTO eco_point_materials (eco_point_id, material_id) VALUES (?, ?)', [ecoPointId, materialId]);
                }
            }
            // Commit da transação
            await db_1.default.query('COMMIT');
            // Buscar o ponto de coleta atualizado
            const [ecoPoints] = await db_1.default.execute(`SELECT 
          e.id, 
          e.name, 
          e.address, 
          e.opening_hours as openingHours,
          e.operator_id as operatorId
        FROM 
          eco_points e
        WHERE 
          e.id = ?`, [ecoPointId]);
            // Buscar os materiais aceitos
            const [materialRows] = await db_1.default.execute(`SELECT 
          m.id, 
          m.name,
          m.points_per_kg as pointsPerKg
        FROM 
          materials m
          JOIN eco_point_materials epm ON m.id = epm.material_id
        WHERE 
          epm.eco_point_id = ?`, [ecoPointId]);
            const ecoPoint = {
                ...ecoPoints[0],
                materials: materialRows
            };
            res.json({
                status: 'success',
                data: ecoPoint
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
exports.updateEcoPoint = updateEcoPoint;
// Excluir ponto de coleta (admin)
const deleteEcoPoint = async (req, res, next) => {
    try {
        const { ecoPointId } = req.params;
        // Verificar se o ponto de coleta existe
        const [existingPoints] = await db_1.default.execute('SELECT id FROM eco_points WHERE id = ?', [ecoPointId]);
        if (existingPoints.length === 0) {
            throw new appError_1.AppError('Ponto de coleta não encontrado', 404);
        }
        // Verificar se existem transações associadas a este ponto de coleta
        const [transactions] = await db_1.default.execute('SELECT id FROM recycle_transactions WHERE eco_point_id = ? LIMIT 1', [ecoPointId]);
        if (transactions.length > 0) {
            throw new appError_1.AppError('Não é possível excluir um ponto de coleta que possui transações', 400);
        }
        // Iniciar transação
        await db_1.default.query('START TRANSACTION');
        try {
            // Remover materiais aceitos
            await db_1.default.execute('DELETE FROM eco_point_materials WHERE eco_point_id = ?', [ecoPointId]);
            // Remover ponto de coleta
            await db_1.default.execute('DELETE FROM eco_points WHERE id = ?', [ecoPointId]);
            // Commit da transação
            await db_1.default.query('COMMIT');
            res.status(204).send();
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
exports.deleteEcoPoint = deleteEcoPoint;
