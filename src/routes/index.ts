import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import ecoPointRoutes from './ecoPoint.routes';
import materialRoutes from './material.routes';
import partnerRoutes from './partner.routes';
import offerRoutes from './offer.routes';
import transactionRoutes from './transaction.routes';
import redemptionRoutes from './redemption.routes';

const router = Router();

// Log para depuração
console.log('Registrando rotas: auth');
router.use('/auth', authRoutes);

console.log('Registrando rotas: users');
router.use('/users', userRoutes);

console.log('Registrando rotas: eco-points');
router.use('/eco-points', ecoPointRoutes);

console.log('Registrando rotas: materials');
router.use('/materials', materialRoutes);

console.log('Registrando rotas: partners');
router.use('/partners', partnerRoutes);

console.log('Registrando rotas: offers');
router.use('/offers', offerRoutes);

console.log('Registrando rotas: transactions');
router.use('/transactions', transactionRoutes);

console.log('Registrando rotas: redemptions');
router.use('/redemptions', redemptionRoutes);

console.log('Todas as rotas registradas com sucesso');

export default router;