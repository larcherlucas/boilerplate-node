import express from 'express';
import favoritesController from '../../controllers/favorites.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import { detectAccessLevel } from '../../middlewares/subscription.middleware.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Ajouter le middleware de détection du niveau d'accès à toutes les routes
router.use(detectAccessLevel);

router.get('/favorites', favoritesController.getAll);
router.get('/favorites/:recipeId(\\d+)/check', favoritesController.checkFavorite);
router.post('/favorites', favoritesController.create);
router.delete('/favorites/:recipeId(\\d+)', favoritesController.delete);

export default router;