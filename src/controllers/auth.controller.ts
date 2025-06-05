// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

// Login de usuário (sem alterações)
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, password } = req.body;

    // Buscar usuário pelo telefone - ATUALIZADO para incluir age
    const [rows] = await db.execute<RowDataPacket[]>(
      'SELECT id, name, phone, password, user_type as userType, points, age FROM users WHERE phone = ?',
      [phone]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Usuário não encontrado'
      });
    }

    const user = rows[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Senha incorreta'
      });
    }

    const secretKey = process.env.JWT_SECRET || 'segredo_temporario';
    const token = jwt.sign(
      { 
        id: user.id, 
        name: user.name,
        phone: user.phone,
        userType: user.userType,
        points: user.points,
        age: user.age // <- INCLUIR AGE NO TOKEN
      },
      secretKey,
      { expiresIn: '1d' }
    );

    delete user.password;

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

// Registro de usuário - ATUALIZADO com idade e consentimento
export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { 
      name, 
      phone, 
      password, 
      userType,
      age, // <- NOVO CAMPO
      consentGiven, // <- NOVO CAMPO
      address 
    } = req.body;

    // Validações básicas
    if (!name || !phone || !password || !userType) {
      return res.status(400).json({
        status: 'error',
        message: 'Nome, telefone, senha e tipo de usuário são obrigatórios'
      });
    }

    // Validação de idade (apenas para usuários comuns)
    if (userType === 'comum') {
      if (!age) {
        return res.status(400).json({
          status: 'error',
          message: 'Idade é obrigatória para usuários comuns'
        });
      }

      // Validar se idade é um número válido
      const ageNumber = parseInt(age);
      if (isNaN(ageNumber) || ageNumber < 1 || ageNumber > 120) {
        return res.status(400).json({
          status: 'error',
          message: 'Idade deve ser um número entre 1 e 120 anos'
        });
      }

      // Validação de idade mínima (exemplo: 13 anos para uso da plataforma)
      if (ageNumber < 13) {
        return res.status(400).json({
          status: 'error',
          message: 'É necessário ter pelo menos 13 anos para usar a plataforma'
        });
      }
    }

    // Validação de consentimento LGPD (obrigatório para todos)
    if (!consentGiven) {
      return res.status(400).json({
        status: 'error',
        message: 'É necessário aceitar os termos de uso e política de privacidade'
      });
    }

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

    const hashedPassword = await bcrypt.hash(password, 10);

    // Iniciar transação
    await db.query('START TRANSACTION');

    try {
      // Inserir usuário - ATUALIZADO para incluir age e consent_given
      const [result] = await db.execute<ResultSetHeader>(
        'INSERT INTO users (name, phone, password, user_type, points, age, consent_given) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, phone, hashedPassword, userType, 0, age || null, consentGiven || false]
      );

      const userId = result.insertId;

      // Se forneceu endereço, inserir na tabela de endereços (SEM campo reference)
      if (address) {
        await db.execute(
          'INSERT INTO addresses (user_id, street, number, complement, neighborhood, city, state, zip_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            userId,
            address.street || '',
            address.number || '',
            address.complement || '',
            address.neighborhood || '',
            address.city || '',
            address.state || '',
            address.zipCode || ''
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

      await db.query('COMMIT');

      // Buscar usuário criado - ATUALIZADO para incluir age
      const [users] = await db.execute<RowDataPacket[]>(
        'SELECT id, name, phone, user_type as userType, points, age FROM users WHERE id = ?',
        [userId]
      );

      const newUser = users[0];

      const secretKey = process.env.JWT_SECRET || 'segredo_temporario';
      const token = jwt.sign(
        { 
          id: newUser.id, 
          name: newUser.name,
          phone: newUser.phone,
          userType: newUser.userType,
          points: newUser.points,
          age: newUser.age // <- INCLUIR AGE NO TOKEN
        },
        secretKey,
        { expiresIn: '1d' }
      );

      res.status(201).json({
        status: 'success',
        data: {
          user: newUser,
          token
        }
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    next(error);
  }
};