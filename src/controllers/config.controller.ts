import { Request, Response, NextFunction } from 'express';
import { getConfig, setConfig, getCountingMode, getAllConfigs } from '../services/configService';
import { AppError } from '../utils/appError';

export const getSystemConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const value = await getConfig(key);
    
    if (!value) {
      throw new AppError('Configuração não encontrada', 404);
    }

    res.json({
      status: 'success',
      data: { key, value }
    });
  } catch (error) {
    next(error);
  }
};

export const updateSystemConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (!value) {
      throw new AppError('Valor da configuração é obrigatório', 400);
    }

    await setConfig(key, value);

    res.json({
      status: 'success',
      message: 'Configuração atualizada com sucesso',
      data: { key, value }
    });
  } catch (error) {
    next(error);
  }
};

export const getCurrentCountingMode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const mode = await getCountingMode();
    
    res.json({
      status: 'success',
      data: { 
        counting_mode: mode,
        description: mode === 'weight' ? 'Contagem por peso (kg)' : 'Contagem por unidade'
      }
    });
  } catch (error) {
    next(error);
  }
};

export const listAllConfigs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const configs = await getAllConfigs();
    
    res.json({
      status: 'success',
      data: configs
    });
  } catch (error) {
    next(error);
  }
};

export const switchCountingMode = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { mode } = req.body;

    if (!mode || !['weight', 'unit'].includes(mode)) {
      throw new AppError('Modo deve ser "weight" ou "unit"', 400);
    }

    await setConfig('counting_mode', mode);

    res.json({
      status: 'success',
      message: `Modo de contagem alterado para: ${mode === 'weight' ? 'peso' : 'unidade'}`,
      data: { counting_mode: mode }
    });
  } catch (error) {
    next(error);
  }
};