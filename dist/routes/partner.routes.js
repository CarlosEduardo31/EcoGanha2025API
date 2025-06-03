"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
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
exports.default = router;
