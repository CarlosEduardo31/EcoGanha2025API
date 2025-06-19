import { Router } from 'express';
import { 
  getSystemConfig, 
  updateSystemConfig, 
  getCurrentCountingMode,
  listAllConfigs,
  switchCountingMode
} from '../controllers/config.controller';
import { auth, checkUserType } from '../middlewares/auth';

const router = Router();

// Rota pública para obter modo de contagem atual
router.get('/counting-mode', getCurrentCountingMode);

// Rotas protegidas para admins
router.get('/', auth, checkUserType(['admin']), listAllConfigs);
router.get('/:key', auth, checkUserType(['admin']), getSystemConfig);
router.put('/:key', auth, checkUserType(['admin']), updateSystemConfig);

// Rota específica para trocar modo de contagem
router.post('/switch-counting-mode', auth, checkUserType(['admin']), switchCountingMode);

export default router;