import { Router } from 'express';
import { 
  getAllMaterials, 
  getMaterial, 
  createMaterial, 
  updateMaterial, 
  deleteMaterial
} from '../controllers/material.controller';
import { auth, checkUserType } from '../middlewares/auth';

const router = Router();


router.get('/', getAllMaterials);


router.get('/:materialId', getMaterial);


router.post('/', auth, checkUserType(['admin']), createMaterial);


router.patch('/:materialId', auth, checkUserType(['admin']), updateMaterial);


router.delete('/:materialId', auth, checkUserType(['admin']), deleteMaterial);

export default router;