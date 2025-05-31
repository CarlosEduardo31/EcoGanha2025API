import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { RequestHandler } from 'express'; // Adicione esta importação

const router = Router();


router.post('/login', authController.login as RequestHandler);


router.post('/register', authController.register as RequestHandler);

export default router;