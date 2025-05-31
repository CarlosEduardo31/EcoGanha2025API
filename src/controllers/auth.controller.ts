// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Login de usuário
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, password } = req.body;

    // Buscar usuário pelo telefone
    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT id, name, phone, password, user_type as userType, points FROM users WHERE phone = ?',
      [phone]
    );

    // Verificar se encontrou usuário
    if (rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuário não encontrado'
      });
    }

    const user = rows[0];

    // Verificar a senha
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Senha incorreta'
      });
    }

    // Gerar token JWT - Corrigido
    const secretKey = process.env.JWT_SECRET || 'segredo_temporario';
    const token = jwt.sign(
      { 
        id: user.id, 
        name: user.name,
        phone: user.phone,
        userType: user.userType,
        points: user.points
      },
      secretKey,
      { expiresIn: '1d' }
    );

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
  } catch (error) {
    next(error);
  }
};

// Registro de usuário
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      name, 
      phone, 
      password, 
      userType,
      address 
    } = req.body;

    // Verificar se já existe um usuário com este telefone
    const [existingUsers] = await db.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE phone = ?',
      [phone]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Este número de telefone já está registrado'
      });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Iniciar transação
    await db.query('START TRANSACTION');

    try {
      // Inserir usuário
      const [result] = await db.execute<ResultSetHeader>(
        'INSERT INTO users (name, phone, password, user_type, points) VALUES (?, ?, ?, ?, ?)',
        [name, phone, hashedPassword, userType, 0]
      );

      const userId = result.insertId;

      // Se forneceu endereço, inserir na tabela de endereços
      if (address) {
        await db.execute(
          'INSERT INTO addresses (user_id, street, number, complement, neighborhood, city, state, zip_code, reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
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

      // Se for patrocinador, inserir na tabela de parceiros
      if (userType === 'patrocinador') {
        await db.execute(
          'INSERT INTO partners (user_id) VALUES (?)',
          [userId]
        );
      }

      // Commit da transação
      await db.query('COMMIT');

      // Buscar usuário criado
      const [users] = await db.execute<RowDataPacket[]>(
        'SELECT id, name, phone, user_type as userType, points FROM users WHERE id = ?',
        [userId]
      );

      const newUser = users[0];

      // Gerar token JWT - Corrigido
      const secretKey = process.env.JWT_SECRET || 'segredo_temporario';
      const token = jwt.sign(
        { 
          id: newUser.id, 
          name: newUser.name,
          phone: newUser.phone,
          userType: newUser.userType,
          points: newUser.points
        },
        secretKey,
        { expiresIn: '1d' }
      );

      // Retornar dados do usuário e token
      res.status(201).json({
        status: 'success',
        data: {
          user: newUser,
          token
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