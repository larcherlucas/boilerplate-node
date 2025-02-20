import express from 'express';
import recipeReviewsController from '../../controllers/recipeReviews.js';

const router = express.Router();

// Routes publiques
router.get('/recipes/:recipeId(\\d+)/reviews', recipeReviewsController.getAllByRecipe);
router.get('/recipes/:recipeId(\\d+)/reviews/stats', recipeReviewsController.getStats);

// Routes privées
router.get('/my/reviews', recipeReviewsController.getAllByUser);
router.post('/recipes/:recipeId(\\d+)/reviews', recipeReviewsController.create);
router.put('/recipes/:recipeId(\\d+)/reviews', recipeReviewsController.update);
router.delete('/recipes/:recipeId(\\d+)/reviews', recipeReviewsController.delete);

export default router;