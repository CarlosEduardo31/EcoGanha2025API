import { Router } from 'express';
import { 
  getAllEcoPoints, 
  getEcoPoint, 
  createEcoPoint, 
  updateEcoPoint, 
  deleteEcoPoint,
  getOperatorEcoPoint
} from '../controllers/ecoPoint.controller';
import { auth, checkUserType } from '../middlewares/auth';

const router = Router();


router.get('/', getAllEcoPoints);

router.get('/operator', auth, checkUserType(['ecoponto']), getOperatorEcoPoint);

router.get('/:ecoPointId', getEcoPoint);

router.post('/', auth, checkUserType(['admin']), createEcoPoint);


router.patch('/:ecoPointId', auth, checkUserType(['admin']), updateEcoPoint);


router.delete('/:ecoPointId', auth, checkUserType(['admin']), deleteEcoPoint);



export default router;