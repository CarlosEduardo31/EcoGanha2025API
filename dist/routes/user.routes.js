"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/user.routes.ts - com a ordem de rotas corrigida
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.get('/profile', auth_1.auth, user_controller_1.getProfile);
router.patch('/profile', auth_1.auth, user_controller_1.updateProfile);
router.get('/by-phone/:phone', auth_1.auth, (0, auth_1.checkUserType)(['ecoponto', 'patrocinador']), user_controller_1.findUserByPhone);
router.get('/recycle-history', auth_1.auth, user_controller_1.getRecycleHistory);
router.get('/redemption-history', auth_1.auth, user_controller_1.getRedemptionHistory);
// Estas rotas precisam vir depois das rotas específicas
router.get('/', user_controller_1.getAllUsers);
router.get('/:id', user_controller_1.getUserById);
exports.default = router;
