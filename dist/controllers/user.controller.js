"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = exports.getAllUsers = exports.getRedemptionHistory = exports.getRecycleHistory = exports.updateProfile = exports.getProfile = exports.findUserByPhone = void 0;
const db_1 = __importDefault(require("../db"));
const appError_1 = require("../utils/appError");
// Buscar usuário por telefone (usado pelos operadores de Eco Ponto e Patrocinadores)
const findUserByPhone = async (req, res, next) => {
    try {
        const { phone } = req.params;
        // Buscar usuário pelo telefone
        const [rows] = await db_1.default.execute('SELECT id, name, phone, user_type as userType, points FROM users WHERE phone = ? AND user_type = "comum"', [phone]);
        // Verificar se encontrou usuário
        if (rows.length === 0) {
            throw new appError_1.AppError('Usuário não encontrado ou não é um usuário comum', 404);
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
exports.findUserByPhone = findUserByPhone;
// Obter perfil do usuário logado
const getProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        // Buscar usuário pelo ID
        const [rows] = await db_1.default.execute('SELECT id, name, phone, user_type as userType, points FROM users WHERE id = ?', [userId]);
        // Verificar se encontrou usuário
        if (rows.length === 0) {
            throw new appError_1.AppError('Usuário não encontrado', 404);
        }
        // Buscar endereço se existir
        const [addresses] = await db_1.default.execute('SELECT street, number, complement, neighborhood, city, state, zip_code as zipCode, reference FROM addresses WHERE user_id = ?', [userId]);
        const userData = {
            ...rows[0],
            address: addresses.length > 0 ? addresses[0] : null
        };
        res.json({
            status: 'success',
            data: userData
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getProfile = getProfile;
// Atualizar perfil do usuário logado
const updateProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { name, address } = req.body;
        // Iniciar transação
        await db_1.default.query('START TRANSACTION');
        try {
            // Atualizar nome do usuário
            if (name) {
                await db_1.default.execute('UPDATE users SET name = ? WHERE id = ?', [name, userId]);
            }
            // Atualizar endereço se fornecido
            if (address) {
                // Verificar se já existe um endereço
                const [existingAddresses] = await db_1.default.execute('SELECT id FROM addresses WHERE user_id = ?', [userId]);
                if (existingAddresses.length > 0) {
                    // Atualizar endereço existente
                    await db_1.default.execute(`UPDATE addresses SET 
              street = ?, 
              number = ?, 
              complement = ?, 
              neighborhood = ?, 
              city = ?, 
              state = ?, 
              zip_code = ?, 
              reference = ? 
            WHERE user_id = ?`, [
                        address.street || '',
                        address.number || '',
                        address.complement || '',
                        address.neighborhood || '',
                        address.city || '',
                        address.state || '',
                        address.zipCode || '',
                        address.reference || '',
                        userId
                    ]);
                }
                else {
                    // Inserir novo endereço
                    await db_1.default.execute(`INSERT INTO addresses 
              (user_id, street, number, complement, neighborhood, city, state, zip_code, reference) 
            VALUES 
              (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                        userId,
                        address.street || '',
                        address.number || '',
                        address.complement || '',
                        address.neighborhood || '',
                        address.city || '',
                        address.state || '',
                        address.zipCode || '',
                        address.reference || ''
                    ]);
                }
            }
            // Commit da transação
            await db_1.default.query('COMMIT');
            // Buscar usuário atualizado
            const [rows] = await db_1.default.execute('SELECT id, name, phone, user_type as userType, points FROM users WHERE id = ?', [userId]);
            // Buscar endereço atualizado
            const [addresses] = await db_1.default.execute('SELECT street, number, complement, neighborhood, city, state, zip_code as zipCode, reference FROM addresses WHERE user_id = ?', [userId]);
            const userData = {
                ...rows[0],
                address: addresses.length > 0 ? addresses[0] : null
            };
            res.json({
                status: 'success',
                data: userData
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
exports.updateProfile = updateProfile;
// Obter histórico de reciclagem do usuário
const getRecycleHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;
        // Buscar histórico de reciclagem do usuário
        const [rows] = await db_1.default.execute(`SELECT 
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
        r.created_at DESC`, [userId]);
        res.json({
            status: 'success',
            data: rows
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getRecycleHistory = getRecycleHistory;
// Obter histórico de resgates do usuário
const getRedemptionHistory = async (req, res, next) => {
    try {
        const userId = req.user.id;
        // Buscar histórico de resgates do usuário
        const [rows] = await db_1.default.execute(`SELECT 
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
        r.created_at DESC`, [userId]);
        res.json({
            status: 'success',
            data: rows
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getRedemptionHistory = getRedemptionHistory;
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
const getAllUsers = async (req, res, next) => {
    try {
        // Implementação
        const [rows] = await db_1.default.execute('SELECT id, name, phone, user_type as userType, points FROM users');
        res.json({
            status: 'success',
            data: rows
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllUsers = getAllUsers;
const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const [rows] = await db_1.default.execute('SELECT id, name, phone, user_type as userType, points FROM users WHERE id = ?', [id]);
        if (rows.length === 0) {
            throw new appError_1.AppError('Usuário não encontrado', 404);
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
exports.getUserById = getUserById;
