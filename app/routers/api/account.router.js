import express from 'express';
import accountController from '../../controllers/account.js';
import cw from '../../middlewares/controller.wrapper.js';
import { patchSchema } from '../../validations/schemas/account.js';
import validate from '../../validations/validator.js';
import authMiddleware from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Middleware de débogage pour comprendre ce qui se passe avec l'authentification
const debugMiddleware = (req, res, next) => {
  console.log("---- DEBUG ROUTES ----");
  console.log("URL appelée:", req.originalUrl);
  console.log("Méthode:", req.method);
  console.log("Headers:", JSON.stringify(req.headers, null, 2));
  console.log("User dans la requête:", req.user);
  console.log("--------------------");
  next();
};

// Routes publiques
router.post('/account', validate(patchSchema), cw(accountController.createAccount));
router.post('/login', cw(accountController.loginForm));

// Routes protégées
router.get('/account', authMiddleware, debugMiddleware, cw(accountController.getAllAccounts));
router.get('/account/:id', authMiddleware, debugMiddleware, cw(accountController.getOneAccount));
router.patch('/account/:id', authMiddleware, debugMiddleware, validate(patchSchema), cw(accountController.updateAccount));
router.delete('/account/:id', authMiddleware, debugMiddleware, cw(accountController.deleteAccount));
router.post('/logout', authMiddleware, cw(accountController.logout));
router.get('/verify-token', cw(accountController.verifyToken));

export default router;