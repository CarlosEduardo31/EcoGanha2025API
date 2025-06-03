"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUserType = exports.auth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const appError_1 = require("../utils/appError");
const auth = (req, res, next) => {
    try {
        // Obter o token do header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            throw new appError_1.AppError('Token não fornecido', 401);
        }
        // Verificar se é um Bearer token
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            throw new appError_1.AppError('Token mal formatado', 401);
        }
        const token = parts[1];
        // Verificar o token
        const jwtSecret = process.env.JWT_SECRET;
        jsonwebtoken_1.default.verify(token, jwtSecret, (err, decoded) => {
            if (err) {
                throw new appError_1.AppError('Token inválido', 401);
            }
            // Adicionar o usuário decodificado à requisição
            req.user = decoded;
            next();
        });
    }
    catch (error) {
        next(error);
    }
};
exports.auth = auth;
// Middleware para verificar o tipo de usuário
const checkUserType = (allowedTypes) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new appError_1.AppError('Usuário não autenticado', 401);
            }
            if (!allowedTypes.includes(req.user.userType)) {
                throw new appError_1.AppError('Acesso não autorizado para este tipo de usuário', 403);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.checkUserType = checkUserType;
