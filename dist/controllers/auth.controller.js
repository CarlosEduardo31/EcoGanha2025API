"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
// Login de usuário
const login = async (req, res, next) => {
    try {
        const { phone, password } = req.body;
        // Buscar usuário pelo telefone
        const [rows] = await db_1.default.execute('SELECT id, name, phone, password, user_type as userType, points FROM users WHERE phone = ?', [phone]);
        // Verificar se encontrou usuário
        if (rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Usuário não encontrado'
            });
        }
        const user = rows[0];
        // Verificar a senha
        const isPasswordValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                status: 'error',
                message: 'Senha incorreta'
            });
        }
        // Gerar token JWT - Corrigido
        const secretKey = process.env.JWT_SECRET || 'segredo_temporario';
        const token = jsonwebtoken_1.default.sign({
            id: user.id,
            name: user.name,
            phone: user.phone,
            userType: user.userType,
            points: user.points
        }, secretKey, { expiresIn: '1d' });
        // Remover a senha do objeto do usuário
        delete user.password;
        // Retornar dados do usuário e token
        res.json({
            status: 'success',
            data: {
                user,
                token
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.login = login;
// Registro de usuário
const register = async (req, res, next) => {
    try {
        const { name, phone, password, userType, address } = req.body;
        // Verificar se já existe um usuário com este telefone
        const [existingUsers] = await db_1.default.execute('SELECT id FROM users WHERE phone = ?', [phone]);
        if (existingUsers.length > 0) {
            return res.status(400).json({
                status: 'error',
                message: 'Este número de telefone já está registrado'
            });
        }
        // Hash da senha
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Iniciar transação
        await db_1.default.query('START TRANSACTION');
        try {
            // Inserir usuário
            const [result] = await db_1.default.execute('INSERT INTO users (name, phone, password, user_type, points) VALUES (?, ?, ?, ?, ?)', [name, phone, hashedPassword, userType, 0]);
            const userId = result.insertId;
            // Se forneceu endereço, inserir na tabela de endereços
            if (address) {
                await db_1.default.execute('INSERT INTO addresses (user_id, street, number, complement, neighborhood, city, state, zip_code, reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [
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
            // Se for patrocinador, inserir na tabela de parceiros
            if (userType === 'patrocinador') {
                await db_1.default.execute('INSERT INTO partners (user_id) VALUES (?)', [userId]);
            }
            // Commit da transação
            await db_1.default.query('COMMIT');
            // Buscar usuário criado
            const [users] = await db_1.default.execute('SELECT id, name, phone, user_type as userType, points FROM users WHERE id = ?', [userId]);
            const newUser = users[0];
            // Gerar token JWT - Corrigido
            const secretKey = process.env.JWT_SECRET || 'segredo_temporario';
            const token = jsonwebtoken_1.default.sign({
                id: newUser.id,
                name: newUser.name,
                phone: newUser.phone,
                userType: newUser.userType,
                points: newUser.points
            }, secretKey, { expiresIn: '1d' });
            // Retornar dados do usuário e token
            res.status(201).json({
                status: 'success',
                data: {
                    user: newUser,
                    token
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
exports.register = register;
