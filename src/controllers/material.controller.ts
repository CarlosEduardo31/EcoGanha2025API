import { Request, Response, NextFunction } from 'express';
import db from '../db';
import { AppError } from '../utils/appError';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Obter todos os materiais
export const getAllMaterials = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Buscar todos os materiais
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT 
        id, 
        name, 
        points_per_kg as pointsPerKg
      FROM 
        materials
      ORDER BY 
        name ASC`
    );

    res.json({
      status: 'success',
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

// Obter um material específico
export const getMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { materialId } = req.params;

    // Buscar o material
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT 
        id, 
        name, 
        points_per_kg as pointsPerKg
      FROM 
        materials
      WHERE 
        id = ?`,
      [materialId]
    );

    if (rows.length === 0) {
      throw new AppError('Material não encontrado', 404);
    }

    res.json({
      status: 'success',
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Criar novo material (admin)
export const createMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, pointsPerKg } = req.body;

    // Validar se todos os campos necessários foram fornecidos
    if (!name || !pointsPerKg) {
      throw new AppError('Todos os campos são obrigatórios', 400);
    }

    // Verificar se já existe um material com este nome
    const [existingMaterials] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM materials WHERE name = ?',
      [name]
    );

    if (existingMaterials.length > 0) {
      throw new AppError('Já existe um material com este nome', 400);
    }

    // Inserir novo material
    const [result] = await db.execute<ResultSetHeader>(
      'INSERT INTO materials (name, points_per_kg) VALUES (?, ?)',
      [name, pointsPerKg]
    );

    const materialId = result.insertId;

    // Buscar o material criado
    const [materials] = await db.execute<RowDataPacket[]>(
      `SELECT 
        id, 
        name, 
        points_per_kg as pointsPerKg
      FROM 
        materials
      WHERE 
        id = ?`,
      [materialId]
    );

    res.status(201).json({
      status: 'success',
      data: materials[0]
    });
  } catch (error) {
    next(error);
  }
};

// Atualizar material (admin)
export const updateMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { materialId } = req.params;
    const { name, pointsPerKg } = req.body;

    // Verificar se o material existe
    const [existingMaterials] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM materials WHERE id = ?',
      [materialId]
    );

    if (existingMaterials.length === 0) {
      throw new AppError('Material não encontrado', 404);
    }

    // Verificar se já existe outro material com este nome
    if (name) {
      const [nameCheck] = await db.execute<RowDataPacket[]>(
        'SELECT id FROM materials WHERE name = ? AND id != ?',
        [name, materialId]
      );

      if (nameCheck.length > 0) {
        throw new AppError('Já existe outro material com este nome', 400);
      }
    }

    // Atualizar material
    await db.execute(
      `UPDATE materials 
      SET 
        name = ?, 
        points_per_kg = ? 
      WHERE 
        id = ?`,
      [name, pointsPerKg, materialId]
    );

    // Buscar o material atualizado
    const [materials] = await db.execute<RowDataPacket[]>(
      `SELECT 
        id, 
        name, 
        points_per_kg as pointsPerKg
      FROM 
        materials
      WHERE 
        id = ?`,
      [materialId]
    );

    res.json({
      status: 'success',
      data: materials[0]
    });
  } catch (error) {
    next(error);
  }
};

// Excluir material (admin)
export const deleteMaterial = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { materialId } = req.params;

    // Verificar se o material existe
    const [existingMaterials] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM materials WHERE id = ?',
      [materialId]
    );

    if (existingMaterials.length === 0) {
      throw new AppError('Material não encontrado', 404);
    }

    // Verificar se existem transações associadas a este material
    const [transactions] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM recycle_transactions WHERE material_id = ? LIMIT 1',
      [materialId]
    );

    if (transactions.length > 0) {
      throw new AppError('Não é possível excluir um material que possui transações', 400);
    }

    // Verificar se existem eco pontos associados a este material
    const [ecoPoints] = await db.execute<RowDataPacket[]>(
      'SELECT eco_point_id FROM eco_point_materials WHERE material_id = ? LIMIT 1',
      [materialId]
    );

    if (ecoPoints.length > 0) {
      throw new AppError('Não é possível excluir um material que está associado a pontos de coleta', 400);
    }

    // Excluir material
    await db.execute(
      'DELETE FROM materials WHERE id = ?',
      [materialId]
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};