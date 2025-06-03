"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteMaterial = exports.updateMaterial = exports.createMaterial = exports.getMaterial = exports.getAllMaterials = void 0;
const db_1 = __importDefault(require("../db"));
const appError_1 = require("../utils/appError");
// Obter todos os materiais
const getAllMaterials = async (req, res, next) => {
    try {
        // Buscar todos os materiais
        const [rows] = await db_1.default.execute(`SELECT 
        id, 
        name, 
        points_per_kg as pointsPerKg
      FROM 
        materials
      ORDER BY 
        name ASC`);
        res.json({
            status: 'success',
            data: rows
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllMaterials = getAllMaterials;
// Obter um material específico
const getMaterial = async (req, res, next) => {
    try {
        const { materialId } = req.params;
        // Buscar o material
        const [rows] = await db_1.default.execute(`SELECT 
        id, 
        name, 
        points_per_kg as pointsPerKg
      FROM 
        materials
      WHERE 
        id = ?`, [materialId]);
        if (rows.length === 0) {
            throw new appError_1.AppError('Material não encontrado', 404);
        }
        res.json({
            status: 'success',
            data: rows[0]
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMaterial = getMaterial;
// Criar novo material (admin)
const createMaterial = async (req, res, next) => {
    try {
        const { name, pointsPerKg } = req.body;
        // Validar se todos os campos necessários foram fornecidos
        if (!name || !pointsPerKg) {
            throw new appError_1.AppError('Todos os campos são obrigatórios', 400);
        }
        // Verificar se já existe um material com este nome
        const [existingMaterials] = await db_1.default.execute('SELECT id FROM materials WHERE name = ?', [name]);
        if (existingMaterials.length > 0) {
            throw new appError_1.AppError('Já existe um material com este nome', 400);
        }
        // Inserir novo material
        const [result] = await db_1.default.execute('INSERT INTO materials (name, points_per_kg) VALUES (?, ?)', [name, pointsPerKg]);
        const materialId = result.insertId;
        // Buscar o material criado
        const [materials] = await db_1.default.execute(`SELECT 
        id, 
        name, 
        points_per_kg as pointsPerKg
      FROM 
        materials
      WHERE 
        id = ?`, [materialId]);
        res.status(201).json({
            status: 'success',
            data: materials[0]
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createMaterial = createMaterial;
// Atualizar material (admin)
const updateMaterial = async (req, res, next) => {
    try {
        const { materialId } = req.params;
        const { name, pointsPerKg } = req.body;
        // Verificar se o material existe
        const [existingMaterials] = await db_1.default.execute('SELECT id FROM materials WHERE id = ?', [materialId]);
        if (existingMaterials.length === 0) {
            throw new appError_1.AppError('Material não encontrado', 404);
        }
        // Verificar se já existe outro material com este nome
        if (name) {
            const [nameCheck] = await db_1.default.execute('SELECT id FROM materials WHERE name = ? AND id != ?', [name, materialId]);
            if (nameCheck.length > 0) {
                throw new appError_1.AppError('Já existe outro material com este nome', 400);
            }
        }
        // Atualizar material
        await db_1.default.execute(`UPDATE materials 
      SET 
        name = ?, 
        points_per_kg = ? 
      WHERE 
        id = ?`, [name, pointsPerKg, materialId]);
        // Buscar o material atualizado
        const [materials] = await db_1.default.execute(`SELECT 
        id, 
        name, 
        points_per_kg as pointsPerKg
      FROM 
        materials
      WHERE 
        id = ?`, [materialId]);
        res.json({
            status: 'success',
            data: materials[0]
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMaterial = updateMaterial;
// Excluir material (admin)
const deleteMaterial = async (req, res, next) => {
    try {
        const { materialId } = req.params;
        // Verificar se o material existe
        const [existingMaterials] = await db_1.default.execute('SELECT id FROM materials WHERE id = ?', [materialId]);
        if (existingMaterials.length === 0) {
            throw new appError_1.AppError('Material não encontrado', 404);
        }
        // Verificar se existem transações associadas a este material
        const [transactions] = await db_1.default.execute('SELECT id FROM recycle_transactions WHERE material_id = ? LIMIT 1', [materialId]);
        if (transactions.length > 0) {
            throw new appError_1.AppError('Não é possível excluir um material que possui transações', 400);
        }
        // Verificar se existem eco pontos associados a este material
        const [ecoPoints] = await db_1.default.execute('SELECT eco_point_id FROM eco_point_materials WHERE material_id = ? LIMIT 1', [materialId]);
        if (ecoPoints.length > 0) {
            throw new appError_1.AppError('Não é possível excluir um material que está associado a pontos de coleta', 400);
        }
        // Excluir material
        await db_1.default.execute('DELETE FROM materials WHERE id = ?', [materialId]);
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
};
exports.deleteMaterial = deleteMaterial;
