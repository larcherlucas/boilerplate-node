import express from 'express';
import accountController from '../../controllers/account.js';
import cw from '../../middlewares/controller.wrapper.js';
import { patchSchema } from '../../validations/schemas/account.js';
import validate from '../../validations/validator.js';
import authMiddleware from '../../middlewares/auth.middleware.js';

const router = express.Router();


// Routes publiques
router.post('/account', validate(patchSchema), cw(accountController.createAccount));
router.post('/login', cw(accountController.loginForm));

// Routes protégées
router.get('/account', authMiddleware, cw(accountController.getAllAccounts));
router.get('/account/:id', authMiddleware, cw(accountController.getOneAccount));
router.patch('/account/:id', authMiddleware, validate(patchSchema), cw(accountController.updateAccount));
router.delete('/account/:id', authMiddleware, cw(accountController.deleteAccount));
router.post('/logout', authMiddleware, cw(accountController.logout));
router.get('/verify-token', cw(accountController.verifyToken));

export default router;