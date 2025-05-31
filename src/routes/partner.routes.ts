import { Router } from 'express';
import { auth, checkUserType } from '../middlewares/auth';

const router = Router();

// Note: As funcionalidades de parceiros estão distribuídas entre outras rotas, como offers e redemptions.
// Aqui podemos adicionar funcionalidades específicas para gerenciamento de parceiros, se necessário.

router.get('/', (req, res) => {
  // Esta rota pode ser implementada para listar todos os parceiros para a visualização dos usuários
  // Por enquanto, retornamos uma mensagem informativa
  res.json({
    status: 'success',
    message: 'As funcionalidades de parceiros estão distribuídas entre as rotas de ofertas e resgates.'
  });
});

export default router;