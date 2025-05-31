import { Request, Response, NextFunction } from 'express';
import db from '../db';
import { AppError } from '../utils/appError';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Obter todas as ofertas de um parceiro
export const getPartnerOffers = async (req: Request, res: Response, next: NextFunction) => {
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

    // Buscar ofertas do parceiro
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT 
        id, 
        title, 
        description, 
        points, 
        valid_until as validUntil,
        created_at as createdAt,
        updated_at as updatedAt
      FROM 
        offers
      WHERE 
        partner_id = ?
      ORDER BY 
        created_at DESC`,
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

// Adicionar nova oferta
export const addOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partnerId = req.user.id;
    const { title, description, points, validUntil } = req.body;

    // Validar se todos os campos necessários foram fornecidos
    if (!title || !points) {
      throw new AppError('Título e pontos são obrigatórios', 400);
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

    // Inserir nova oferta
    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO offers 
        (partner_id, title, description, points, valid_until) 
      VALUES 
        (?, ?, ?, ?, ?)`,
      [
        partnerRecordId, 
        title, 
        description || null, 
        points, 
        validUntil || null
      ]
    );

    const offerId = result.insertId;

    // Buscar a oferta criada
    const [offers] = await db.execute<RowDataPacket[]>(
      `SELECT 
        id, 
        title, 
        description, 
        points, 
        valid_until as validUntil,
        created_at as createdAt,
        updated_at as updatedAt
      FROM 
        offers
      WHERE 
        id = ?`,
      [offerId]
    );

    res.status(201).json({
      status: 'success',
      data: offers[0]
    });
  } catch (error) {
    next(error);
  }
};

// Atualizar oferta existente
export const updateOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partnerId = req.user.id;
    const { offerId } = req.params;
    const { title, description, points, validUntil } = req.body;

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
      'SELECT id FROM offers WHERE id = ? AND partner_id = ?',
      [offerId, partnerRecordId]
    );

    if (offers.length === 0) {
      throw new AppError('Oferta não encontrada ou não pertence a este parceiro', 404);
    }

    // Atualizar oferta
    await db.execute(
      `UPDATE offers 
      SET 
        title = ?, 
        description = ?, 
        points = ?, 
        valid_until = ? 
      WHERE 
        id = ?`,
      [
        title, 
        description || null, 
        points, 
        validUntil || null, 
        offerId
      ]
    );

    // Buscar a oferta atualizada
    const [updatedOffers] = await db.execute<RowDataPacket[]>(
      `SELECT 
        id, 
        title, 
        description, 
        points, 
        valid_until as validUntil,
        created_at as createdAt,
        updated_at as updatedAt
      FROM 
        offers
      WHERE 
        id = ?`,
      [offerId]
    );

    res.json({
      status: 'success',
      data: updatedOffers[0]
    });
  } catch (error) {
    next(error);
  }
};

// Excluir oferta
export const deleteOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partnerId = req.user.id;
    const { offerId } = req.params;

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
      'SELECT id FROM offers WHERE id = ? AND partner_id = ?',
      [offerId, partnerRecordId]
    );

    if (offers.length === 0) {
      throw new AppError('Oferta não encontrada ou não pertence a este parceiro', 404);
    }

    // Verificar se a oferta já foi resgatada por algum usuário
    const [redemptions] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM redemptions WHERE offer_id = ? LIMIT 1',
      [offerId]
    );

    if (redemptions.length > 0) {
      throw new AppError('Não é possível excluir uma oferta que já foi resgatada', 400);
    }

    // Excluir oferta
    await db.execute(
      'DELETE FROM offers WHERE id = ?',
      [offerId]
    );

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Listar todas as ofertas disponíveis (para usuários comuns)
export const getAllOffers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // Buscar todas as ofertas válidas
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT 
        o.id, 
        o.title, 
        o.description, 
        o.points, 
        o.valid_until as validUntil,
        u.name as partnerName,
        p.logo_url as partnerLogo,
        p.location as partnerLocation
      FROM 
        offers o
        JOIN partners p ON o.partner_id = p.id
        JOIN users u ON p.user_id = u.id
      WHERE 
        o.valid_until IS NULL OR o.valid_until >= ?
      ORDER BY 
        o.points ASC`,
      [today]
    );

    // Organizar ofertas por parceiro
    const partners: any = {};
    
    rows.forEach((offer: any) => {
      const partnerId = offer.partnerName;
      
      if (!partners[partnerId]) {
        partners[partnerId] = {
          name: offer.partnerName,
          logo: offer.partnerLogo,
          location: offer.partnerLocation,
          offers: []
        };
      }
      
      partners[partnerId].offers.push({
        id: offer.id,
        title: offer.title,
        description: offer.description,
        points: offer.points,
        validUntil: offer.validUntil
      });
    });

    res.json({
      status: 'success',
      data: Object.values(partners)
    });
  } catch (error) {
    next(error);
  }
};