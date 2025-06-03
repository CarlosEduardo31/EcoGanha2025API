import { Request, Response, NextFunction } from 'express';
import db from '../db';
import { AppError } from '../utils/appError';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Utilitário para validar e otimizar imagem base64
const validateAndOptimizeImage = (imageBase64: string): string | null => {
  if (!imageBase64) return null;
  
  try {
    // Verificar se é base64 válido
    const base64Regex = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
    if (!base64Regex.test(imageBase64)) {
      throw new AppError('Formato de imagem inválido. Use JPEG, PNG, GIF ou WebP.', 400);
    }
    
    // Extrair apenas a parte base64 (sem o prefixo data:image/...)
    const base64Data = imageBase64.split(',')[1];
    
    // Verificar tamanho (máximo 500KB em base64 ≈ 375KB arquivo original)
    const sizeInBytes = (base64Data.length * 3) / 4;
    const maxSizeInBytes = 500 * 1024; // 500KB
    
    if (sizeInBytes > maxSizeInBytes) {
      throw new AppError('Imagem muito grande. Máximo permitido: 500KB. Redimensione a imagem.', 400);
    }
    
    return imageBase64;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Erro ao processar imagem. Verifique o formato.', 400);
  }
};

// Obter todas as ofertas de um parceiro
export const getPartnerOffers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partnerId = req.user.id;

    const [partners] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM partners WHERE user_id = ?',
      [partnerId]
    );

    if (partners.length === 0) {
      throw new AppError('Parceiro não encontrado', 404);
    }

    const partnerRecordId = partners[0].id;

    // ATUALIZADO: Incluir campo image
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT 
        id, 
        title, 
        description, 
        points, 
        quantity,
        image,
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
    const { title, description, points, quantity, validUntil, image } = req.body;

    // Validar campos obrigatórios
    if (!title || !points || !quantity) {
      throw new AppError('Título, pontos e quantidade são obrigatórios', 400);
    }

    if (quantity <= 0) {
      throw new AppError('A quantidade deve ser maior que zero', 400);
    }

    // Validar e processar imagem (opcional)
    const processedImage = image ? validateAndOptimizeImage(image) : null;

    const [partners] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM partners WHERE user_id = ?',
      [partnerId]
    );

    if (partners.length === 0) {
      throw new AppError('Parceiro não encontrado', 404);
    }

    const partnerRecordId = partners[0].id;

    // ATUALIZADO: Incluir campo image
    const [result] = await db.execute<ResultSetHeader>(
      `INSERT INTO offers 
        (partner_id, title, description, points, quantity, image, valid_until) 
      VALUES 
        (?, ?, ?, ?, ?, ?, ?)`,
      [
        partnerRecordId, 
        title, 
        description || null, 
        points, 
        quantity,
        processedImage,
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
        quantity,
        image,
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
    const { title, description, points, quantity, validUntil, image } = req.body;

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

    // Validar quantidade se fornecida
    if (quantity !== undefined && quantity < 0) {
      throw new AppError('A quantidade não pode ser negativa', 400);
    }

    // Processar imagem se fornecida
    let processedImage = undefined;
    if (image !== undefined) {
      // Se image é null ou string vazia, remove a imagem
      if (!image) {
        processedImage = null;
      } else {
        // Valida e processa nova imagem
        processedImage = validateAndOptimizeImage(image);
      }
    }

    // ATUALIZADO: Incluir campo image na atualização
    await db.execute(
      `UPDATE offers 
      SET 
        title = ?, 
        description = ?, 
        points = ?, 
        quantity = ?,
        image = COALESCE(?, image),
        valid_until = ? 
      WHERE 
        id = ?`,
      [
        title, 
        description || null, 
        points, 
        quantity,
        processedImage,
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
        quantity,
        image,
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

// Excluir oferta (mantém a lógica anterior)
export const deleteOffer = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const partnerId = req.user.id;
    const { offerId } = req.params;

    const [partners] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM partners WHERE user_id = ?',
      [partnerId]
    );

    if (partners.length === 0) {
      throw new AppError('Parceiro não encontrado', 404);
    }

    const partnerRecordId = partners[0].id;

    const [offers] = await db.execute<RowDataPacket[]>(
      'SELECT id, title FROM offers WHERE id = ? AND partner_id = ?',
      [offerId, partnerRecordId]
    );

    if (offers.length === 0) {
      throw new AppError('Oferta não encontrada ou não pertence a este parceiro', 404);
    }

    const offer = offers[0];

    const [redemptions] = await db.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as redemptionCount 
       FROM redemptions 
       WHERE offer_id = ?`,
      [offerId]
    );

    const redemptionCount = redemptions[0].redemptionCount;

    if (redemptionCount > 0) {
      throw new AppError(
        `Não é possível excluir a oferta "${offer.title}" pois ela já foi resgatada ${redemptionCount} vez(es). ` +
        `Ofertas que já foram resgatadas não podem ser excluídas para manter a integridade do histórico.`,
        400
      );
    }

    await db.execute('DELETE FROM offers WHERE id = ?', [offerId]);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

// Listar todas as ofertas disponíveis (para usuários comuns)
export const getAllOffers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    // ATUALIZADO: Incluir campo image
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT 
        o.id, 
        o.title, 
        o.description, 
        o.points, 
        o.quantity,
        o.image,
        o.valid_until as validUntil,
        u.name as partnerName,
        p.logo_url as partnerLogo,
        p.location as partnerLocation
      FROM 
        offers o
        JOIN partners p ON o.partner_id = p.id
        JOIN users u ON p.user_id = u.id
      WHERE 
        o.quantity > 0 
        AND (o.valid_until IS NULL OR o.valid_until >= ?)
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
        quantity: offer.quantity,
        image: offer.image,
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