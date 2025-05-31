import { Router } from 'express';
import { 
  addRecycleTransaction, 
  getEcoPointTransactions,
  getEcoPointStats
} from '../controllers/transaction.controller';
import { auth, checkUserType } from '../middlewares/auth';

const router = Router();


router.post('/', auth, checkUserType(['ecoponto']), addRecycleTransaction);


router.get('/eco-point/:ecoPointId', auth, checkUserType(['ecoponto']), getEcoPointTransactions);


router.get('/eco-point/:ecoPointId/stats', auth, checkUserType(['ecoponto']), getEcoPointStats);

export default router;