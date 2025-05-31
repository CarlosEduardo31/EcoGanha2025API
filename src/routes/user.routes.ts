// src/routes/user.routes.ts - com a ordem de rotas corrigida
import { Router } from 'express';
import { 
  getProfile, 
  updateProfile, 
  findUserByPhone,
  getRecycleHistory,
  getRedemptionHistory,
  getAllUsers,
  getUserById
} from '../controllers/user.controller';
import { auth, checkUserType } from '../middlewares/auth';

const router = Router();


router.get('/profile', auth, getProfile);


router.patch('/profile', auth, updateProfile);


router.get('/by-phone/:phone', auth, checkUserType(['ecoponto', 'patrocinador']), findUserByPhone);


router.get('/recycle-history', auth, getRecycleHistory);


router.get('/redemption-history', auth, getRedemptionHistory);

// Estas rotas precisam vir depois das rotas específicas
router.get('/', getAllUsers);
router.get('/:id', getUserById);

export default router;