import express from 'express';
import ApiError from '../../erros/api.error.js';
import jwtMiddleware from '../../middlewares/jwt.middleware.js';
import accountRouter from './account.router.js';
import recipeRouter from './recipe.router.js';
import signupRouter from './signup.router.js';
import loginRouter from './login.router.js';
import seasonalItemsRouter from './seasonalItems.router.js';
import menusRouter from './menus.router.js';
import favoritesRouter from './favorites.router.js';
import dietaryRestrictionsRouter from './dietaryRestrictions.router.js';
import recipeReviewsRouter from './recipeReviews.router.js';

const router = express.Router();

router.use((_, res, next) => {
  res.type('json');
  next();
});

// Routes publiques
router.use(signupRouter);
router.use(loginRouter);
router.use(recipeReviewsRouter); // Les routes publiques des reviews

router.use(jwtMiddleware);

// Routes privées
router.use(accountRouter);
router.use(recipeRouter);
router.use(seasonalItemsRouter);
router.use(menusRouter);
router.use(favoritesRouter);
router.use(dietaryRestrictionsRouter);

// Error handler (404)
router.use((_, __, next) => {
  next(new ApiError(404, 'Not Found'));
});

export default router;