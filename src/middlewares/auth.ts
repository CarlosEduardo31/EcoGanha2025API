import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError';

// Extendendo o tipo Request para incluir o usuário
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Obter o token do header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new AppError('Token não fornecido', 401);
    }

    // Verificar se é um Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new AppError('Token mal formatado', 401);
    }

    const token = parts[1];

    // Verificar o token
    const jwtSecret = process.env.JWT_SECRET as string;
    jwt.verify(token, jwtSecret, (err, decoded) => {
      if (err) {
        throw new AppError('Token inválido', 401);
      }

      // Adicionar o usuário decodificado à requisição
      req.user = decoded;
      next();
    });
  } catch (error) {
    next(error);
  }
};

// Middleware para verificar o tipo de usuário
export const checkUserType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Usuário não autenticado', 401);
      }

      if (!allowedTypes.includes(req.user.userType)) {
        throw new AppError('Acesso não autorizado para este tipo de usuário', 403);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};