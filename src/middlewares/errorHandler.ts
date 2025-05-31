// src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';

// Não usamos o tipo ErrorRequestHandler explicitamente
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log do erro para depuração
  console.error('ERROR 💥', err);

  // Verificar se é um erro operacional conhecido
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
    return;
  }

  // Se for um erro não tratado (programação, banco de dados, etc)
  // Em produção, não expor detalhes do erro
  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({
      status: 'error',
      message: 'Algo deu errado'
    });
    return;
  }

  // Em desenvolvimento, retorna o erro completo
  res.status(500).json({
    status: 'error',
    message: err.message,
    error: err,
    stack: err.stack
  });
};