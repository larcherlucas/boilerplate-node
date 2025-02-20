import express from 'express';
import favoritesController from '../../controllers/favorites.js';

const router = express.Router();

router.get('/favorites', favoritesController.getAll);
router.get('/favorites/:recipeId(\\d+)/check', favoritesController.checkFavorite);
router.post('/favorites', favoritesController.create);
router.delete('/favorites/:recipeId(\\d+)', favoritesController.delete);

export default router;