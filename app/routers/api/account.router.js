import express from 'express';
import accountController from '../../controllers/account.js';
import cw from '../../middlewares/controller.wrapper.js';
import { patchSchema } from '../../validations/schemas/account.js';
import validate from '../../validations/validator.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import userProfileController from '../../controllers/userProfil.js';

const router = express.Router();


// Routes publiques
router.post('/account', validate(patchSchema), cw(accountController.createAccount));
router.post('/login', cw(accountController.loginForm));

// Routes pour le profil utilisateur
router.get('/account/me', authMiddleware, cw(userProfileController.getProfile));
router.patch('/account/me', authMiddleware, cw(userProfileController.updateProfile));
router.delete('/account/me', authMiddleware, cw(userProfileController.deleteProfile));
// Routes protégées
router.get('/account', authMiddleware, cw(accountController.getAllAccounts));
router.get('/account/:id', authMiddleware, cw(accountController.getOneAccount));
router.patch('/account/:id', authMiddleware, validate(patchSchema), cw(accountController.updateAccount));
router.delete('/account/:id', authMiddleware, cw(accountController.deleteAccount));
router.post('/logout', authMiddleware, cw(accountController.logout));
router.get('/verify-token', cw(accountController.verifyToken));

// Routes pour les restrictions alimentaires de l'utilisateur
router.get('/account/me/dietary-restrictions', authMiddleware, cw(userProfileController.getDietaryRestrictions));
router.post('/account/me/dietary-restrictions', authMiddleware, cw(userProfileController.addDietaryRestriction));
router.delete('/account/me/dietary-restrictions/:type', authMiddleware, cw(userProfileController.deleteDietaryRestriction));
router.delete('/account/me/dietary-restrictions', authMiddleware, cw(userProfileController.deleteAllDietaryRestrictions));
// Routes pour la composition du foyer de l'utilisateur
router.get('/account/me/household', authMiddleware, cw(userProfileController.getComposition));
router.post('/account/me/household', authMiddleware, cw(userProfileController.addMember));
router.delete('/account/me/household/:id', authMiddleware, cw(userProfileController.deleteMember));
router.delete('/account/me/household', authMiddleware, cw(userProfileController.deleteAllMembers));

export default router;