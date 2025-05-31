import { Router } from 'express';
import { 
  redeemOffer, 
  getPartnerRedemptions
} from '../controllers/redemption.controller';
import { auth, checkUserType } from '../middlewares/auth';

const router = Router();


router.post('/', auth, checkUserType(['patrocinador']), redeemOffer);


router.get('/partner', auth, checkUserType(['patrocinador']), getPartnerRedemptions);

export default router;