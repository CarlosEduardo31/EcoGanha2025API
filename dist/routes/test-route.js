"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/test-route.ts
const express_1 = require("express");
const router = (0, express_1.Router)();
// Rota simples sem comentários JSDoc
router.get('/test', (req, res) => {
    res.json({ message: 'Teste funcionando!' });
});
exports.default = router;
