// src/routes/user.routes.ts - com as novas rotas de edição de usuários
import { Router } from 'express';
import { 
  getProfile, 
  updateProfile, 
  findUserByPhone,
  getRecycleHistory,
  getRedemptionHistory,
  getAllUsers,
  getUserById,
  updateUser
} from '../controllers/user.controller';
import { auth, checkUserType } from '../middlewares/auth';

const router = Router();

// Rotas do perfil do usuário logado
router.get('/profile', auth, getProfile);
router.patch('/profile', auth, updateProfile);

// Rota para buscar usuário por telefone (operadores de Eco Ponto e Patrocinadores)
router.get('/by-phone/:phone', auth, checkUserType(['ecoponto', 'patrocinador']), findUserByPhone);

// Rotas de histórico do usuário logado
router.get('/recycle-history', auth, getRecycleHistory);
router.get('/redemption-history', auth, getRedemptionHistory);

// Rotas administrativas (apenas admin)
router.get('/', auth, checkUserType(['admin']), getAllUsers);
router.get('/:id', auth, checkUserType(['admin']), getUserById);
router.patch('/:id', auth, checkUserType(['admin']), updateUser);

export default router;