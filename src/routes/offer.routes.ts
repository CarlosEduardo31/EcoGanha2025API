import { Router } from 'express';
import { 
  getPartnerOffers, 
  addOffer, 
  updateOffer, 
  deleteOffer,
  getAllOffers
} from '../controllers/offer.controller';
import { auth, checkUserType } from '../middlewares/auth';

const router = Router();


router.get('/', getAllOffers);

router.get('/partner', auth, checkUserType(['patrocinador']), getPartnerOffers);


router.post('/', auth, checkUserType(['patrocinador']), addOffer);


router.patch('/:offerId', auth, checkUserType(['patrocinador']), updateOffer);


router.delete('/:offerId', auth, checkUserType(['patrocinador']), deleteOffer);

export default router;