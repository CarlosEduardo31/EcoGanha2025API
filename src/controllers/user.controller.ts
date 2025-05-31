import { Request, Response, NextFunction } from 'express';
import db from '../db';
import { AppError } from '../utils/appError';
import { RowDataPacket } from 'mysql2';

// Buscar usuário por telefone (usado pelos operadores de Eco Ponto e Patrocinadores)
export const findUserByPhone = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.params;

    // Buscar usuário pelo telefone
    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT id, name, phone, user_type as userType, points FROM users WHERE phone = ? AND user_type = "comum"',
      [phone]
    );

    // Verificar se encontrou usuário
    if (rows.length === 0) {
      throw new AppError('Usuário não encontrado ou não é um usuário comum', 404);
    }

    res.json({
      status: 'success',
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Obter perfil do usuário logado
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;

    // Buscar usuário pelo ID
    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT id, name, phone, user_type as userType, points FROM users WHERE id = ?',
      [userId]
    );

    // Verificar se encontrou usuário
    if (rows.length === 0) {
      throw new AppError('Usuário não encontrado', 404);
    }

    // Buscar endereço se existir
    const [addresses] = await db.execute<RowDataPacket[]>(
      'SELECT street, number, complement, neighborhood, city, state, zip_code as zipCode, reference FROM addresses WHERE user_id = ?',
      [userId]
    );

    const userData = {
      ...rows[0],
      address: addresses.length > 0 ? addresses[0] : null
    };

    res.json({
      status: 'success',
      data: userData
    });
  } catch (error) {
    next(error);
  }
};

// Atualizar perfil do usuário logado
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;
    const { name, address } = req.body;

    // Iniciar transação
    await db.query('START TRANSACTION');

    try {
      // Atualizar nome do usuário
      if (name) {
        await db.execute(
          'UPDATE users SET name = ? WHERE id = ?',
          [name, userId]
        );
      }

      // Atualizar endereço se fornecido
      if (address) {
        // Verificar se já existe um endereço
        const [existingAddresses] = await db.execute<RowDataPacket[]>(
          'SELECT id FROM addresses WHERE user_id = ?',
          [userId]
        );

        if (existingAddresses.length > 0) {
          // Atualizar endereço existente
          await db.execute(
            `UPDATE addresses SET 
              street = ?, 
              number = ?, 
              complement = ?, 
              neighborhood = ?, 
              city = ?, 
              state = ?, 
              zip_code = ?, 
              reference = ? 
            WHERE user_id = ?`,
            [
              address.street || '',
              address.number || '',
              address.complement || '',
              address.neighborhood || '',
              address.city || '',
              address.state || '',
              address.zipCode || '',
              address.reference || '',
              userId
            ]
          );
        } else {
          // Inserir novo endereço
          await db.execute(
            `INSERT INTO addresses 
              (user_id, street, number, complement, neighborhood, city, state, zip_code, reference) 
            VALUES 
              (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userId,
              address.street || '',
              address.number || '',
              address.complement || '',
              address.neighborhood || '',
              address.city || '',
              address.state || '',
              address.zipCode || '',
              address.reference || ''
            ]
          );
        }
      }

      // Commit da transação
      await db.query('COMMIT');

      // Buscar usuário atualizado
      const [rows] = await db.execute<RowDataPacket[]>(
        'SELECT id, name, phone, user_type as userType, points FROM users WHERE id = ?',
        [userId]
      );

      // Buscar endereço atualizado
      const [addresses] = await db.execute<RowDataPacket[]>(
        'SELECT street, number, complement, neighborhood, city, state, zip_code as zipCode, reference FROM addresses WHERE user_id = ?',
        [userId]
      );

      const userData = {
        ...rows[0],
        address: addresses.length > 0 ? addresses[0] : null
      };

      res.json({
        status: 'success',
        data: userData
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

// Obter histórico de reciclagem do usuário
export const getRecycleHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;

    // Buscar histórico de reciclagem do usuário
    const [rows] = await db.execute<RowDataPacket[]>(
      `SELECT 
        r.id, 
        r.weight, 
        r.points, 
        r.created_at as date, 
        m.name as materialName, 
        e.name as ecoPointName 
      FROM 
        recycle_transactions r
        JOIN materials m ON r.material_id = m.id
        JOIN eco_points e ON r.eco_point_id = e.id
      WHERE 
        r.user_id = ?
      ORDER BY 
        r.created_at DESC`,
      [userId]
    );

    res.json({
      status: 'success',
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

// Obter histórico de resgates do usuário
export const getRedemptionHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user.id;

    // Buscar histórico de resgates do usuário
    const [rows] = await db.execute<RowDataPacket[]>(
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
        r.user_id = ?
      ORDER BY 
        r.created_at DESC`,
      [userId]
    );

    res.json({
      status: 'success',
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

// Obter todos os usuários
// export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     console.log('Executando getAllUsers...');
//     // Executar consulta SQL para buscar todos os usuários
//     const [rows] = await db.execute<RowDataPacket[]>(
//       'SELECT id, name, phone, user_type as userType, points FROM users'
//     );

//     console.log(`Encontrados ${rows.length} usuários`);
    
//     // Retornar os usuários encontrados
//     res.json({
//       status: 'success',
//       results: rows.length,
//       data: rows
//     });
//   } catch (error) {
//     console.error('Erro em getAllUsers:', error);
//     next(error);
//   }
// };

// Obter usuário por ID
// export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
//   try {
//     const { id } = req.params;
//     console.log(`Executando getUserById para ID: ${id}...`);

//     // Executar consulta SQL para buscar o usuário pelo ID
//     const [rows] = await db.execute<RowDataPacket[]>(
//       'SELECT id, name, phone, user_type as userType, points FROM users WHERE id = ?',
//       [id]
//     );

//     // Verificar se encontrou o usuário
//     if (rows.length === 0) {
//       console.log(`Usuário com ID ${id} não encontrado`);
//       return res.status(404).json({
//         status: 'error',
//         message: 'Usuário não encontrado'
//       });
//     }

//     console.log(`Usuário com ID ${id} encontrado`);
    
//     // Retornar o usuário encontrado
//     return res.json({
//       status: 'success',
//       data: rows[0]
//     });
//   } catch (error) {
//     console.error(`Erro em getUserById para ID ${req.params.id}:`, error);
//     return next(error);
//   }
// };


// Adicione estas funções ao user.controller.ts se elas ainda não existirem
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Implementação
    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT id, name, phone, user_type as userType, points FROM users'
    );
    
    res.json({
      status: 'success',
      data: rows
    });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT id, name, phone, user_type as userType, points FROM users WHERE id = ?',
      [id]
    );
    
    if (rows.length === 0) {
      throw new AppError('Usuário não encontrado', 404);
    }
    
    res.json({
      status: 'success',
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
};