// src/routes/test-route.ts
import { Router } from 'express';

const router = Router();

// Rota simples sem comentários JSDoc
router.get('/test', (req, res) => {
  res.json({ message: 'Teste funcionando!' });
});

export default router;