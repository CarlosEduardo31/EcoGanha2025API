import { Request, Response, NextFunction } from 'express';
import db from '../db';
import { AppError } from '../utils/appError';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Resgatar pontos por uma oferta (usado pelos parceiros patrocinadores)
export const redeemOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partnerId = req.user.id;
    const { userId, offerId } = req.body;

    // Validar se todos os campos necessários foram fornecidos
    if (!userId || !offerId) {
      throw new AppError('Todos os campos são obrigatórios', 400);
    }

    // Buscar o ID do parceiro na tabela partners pelo user_id
    const [partners] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM partners WHERE user_id = ?',
      [partnerId]
    );

    if (partners.length === 0) {
      throw new AppError('Parceiro não encontrado', 404);
    }

    const partnerRecordId = partners[0].id;

    // Verificar se a oferta pertence a este parceiro
    const [offers] = await db.execute<RowDataPacket[]>(
      'SELECT id, title, points FROM offers WHERE id = ? AND partner_id = ?',
      [offerId, partnerRecordId]
    );

    if (offers.length === 0) {
      throw new AppError('Oferta não encontrada ou não pertence a este parceiro', 404);
    }

    const offer = offers[0];

    // Verificar se o usuário tem pontos suficientes
    const [users] = await db.execute<RowDataPacket[]>(
      'SELECT id, name, phone, user_type as userType, points FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      throw new AppError('Usuário não encontrado', 404);
    }

    const user = users[0];

    if (user.points < offer.points) {
      throw new AppError(`Pontos insuficientes. O usuário tem ${user.points} pontos, mas a oferta requer ${offer.points} pontos.`, 400);
    }

    // Iniciar transação
    await db.query('START TRANSACTION');

    try {
      // Registrar o resgate
      const [result] = await db.execute<ResultSetHeader>(
        'INSERT INTO redemptions (user_id, offer_id, points) VALUES (?, ?, ?)',
        [userId, offerId, offer.points]
      );

      const redemptionId = result.insertId;

      // Atualizar os pontos do usuário
      await db.execute(
        'UPDATE users SET points = points - ? WHERE id = ?',
        [offer.points, userId]
      );

      // Commit da transação
      await db.query('COMMIT');

      // Buscar os dados atualizados
      const [updatedUsers] = await db.execute<RowDataPacket[]>(
        'SELECT id, name, phone, user_type as userType, points FROM users WHERE id = ?',
        [userId]
      );

      const [redemptionRows] = await db.execute<RowDataPacket[]>(
        `SELECT 
          r.id, 
          r.points, 
          r.created_at as date, 
          o.title, 
          o.description,
          u.name as partnerName
        FROM 
          redemptions r
          JOIN offers o ON r.offer_id = o.id
          JOIN partners p ON o.partner_id = p.id
          JOIN users u ON p.user_id = u.id
        WHERE 
          r.id = ?`,
        [redemptionId]
      );

      res.status(201).json({
        status: 'success',
        data: {
          redemption: redemptionRows[0],
          user: updatedUsers[0]
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

// Listar resgates de um parceiro
export const getPartnerRedemptions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partnerId = req.user.id;

    // Buscar o ID do parceiro na tabela partners pelo user_id
    const [partners] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM partners WHERE user_id = ?',
      [partnerId]
    );

    if (partners.length === 0) {
      throw new AppError('Parceiro não encontrado', 404);
    }

    const partnerRecordId = partners[0].id;

    // Buscar resgates do parceiro
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT 
        r.id, 
        r.points, 
        r.created_at as date, 
        o.title, 
        o.description,
        u.name as userName,
        u.phone as userPhone
      FROM 
        redemptions r
        JOIN offers o ON r.offer_id = o.id
        JOIN partners p ON o.partner_id = p.id
        JOIN users u ON r.user_id = u.id
      WHERE 
        p.id = ?
      ORDER BY 
        r.created_at DESC`,
      [partnerRecordId]
    );

    res.json({
      status: 'success',
      data: rows
    });
  } catch (error) {
    next(error);
  }
};