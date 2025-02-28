import express from 'express';
import recipeReviewsController from '../../controllers/recipeReviews.js';
import authMiddleware from '../../middlewares/auth.middleware.js'; // Assurez-vous que ce middleware existe

const router = express.Router();

// Routes publiques
router.get('/recipes/:recipeId/reviews', recipeReviewsController.getAllByRecipe);
router.get('/recipes/:recipeId/reviews/stats', recipeReviewsController.getStats);

// Routes privées (nécessitant authentification)
router.post('/recipes/:recipeId/reviews', authMiddleware, recipeReviewsController.create);
router.get('/me/reviews', authMiddleware, recipeReviewsController.getAllByUser);
router.put('/recipes/:recipeId/reviews', authMiddleware, recipeReviewsController.update); // ou PATCH
router.delete('/recipes/:recipeId/reviews', authMiddleware, recipeReviewsController.delete);

export default router;