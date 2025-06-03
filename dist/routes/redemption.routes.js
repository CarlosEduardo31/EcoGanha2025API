"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const redemption_controller_1 = require("../controllers/redemption.controller");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.post('/', auth_1.auth, (0, auth_1.checkUserType)(['patrocinador']), redemption_controller_1.redeemOffer);
router.get('/partner', auth_1.auth, (0, auth_1.checkUserType)(['patrocinador']), redemption_controller_1.getPartnerRedemptions);
exports.default = router;
