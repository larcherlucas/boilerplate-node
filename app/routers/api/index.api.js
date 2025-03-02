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
import paymentRouter from './payment.router.js';
import subscriptionPlansRouter from './subscriptionPlans.router.js'; // Nouveau routeur

const router = express.Router();

router.use((_, res, next) => {
  res.type('json');
  next();
});

// Routes publiques
router.use(signupRouter);
router.use(loginRouter);
router.use(recipeReviewsRouter); // Routes publiques des reviews
router.use(subscriptionPlansRouter); // Accès public aux plans d'abonnement

// Route publique pour le webhook Stripe (doit être avant le jwtMiddleware)
router.use('/webhook', express.raw({ type: 'application/json' }));
router.use('/api/payment/webhook', paymentRouter); // Only webhook route

// Routes qui peuvent être publiques ou nécessiter une authentification
// Le middleware dans recipe.router.js gère l'accès selon le statut de connexion
router.use(recipeRouter);

// Authentification requise pour les routes suivantes
router.use(jwtMiddleware);

// Routes privées
router.use(accountRouter);
router.use(seasonalItemsRouter);
router.use(menusRouter);
router.use(favoritesRouter);
router.use(dietaryRestrictionsRouter);
router.use('/payment', paymentRouter);

// Error handler (404)
router.use((_, __, next) => {
  next(new ApiError(404, 'Not Found'));
});

export default router;