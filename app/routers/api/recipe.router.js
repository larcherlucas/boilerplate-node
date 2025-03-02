import express from 'express';
import recipeController from '../../controllers/recipe.js';
import cw from '../../middlewares/controller.wrapper.js';
import { recipeSchema } from '../../validations/schemas/recipe.js';
import validate from '../../validations/validator.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import { detectAccessLevel, checkRecipeAccess } from '../../middlewares/subscription.middleware.js';

const router = express.Router();

// Routes publiques avec détection du niveau d'accès
// Attention à l'ordre: les routes plus spécifiques doivent venir avant les routes avec paramètres
router.get('/recipes/type/:type', detectAccessLevel, cw(recipeController.getRecipesByType));
router.get('/recipes', detectAccessLevel, cw(recipeController.getAllRecipes));
router.get('/recipes/:id', detectAccessLevel, checkRecipeAccess, cw(recipeController.getOneRecipe));
router.get('/recipes/:id/ingredients', detectAccessLevel, checkRecipeAccess, cw(recipeController.getIngredients));

// Routes protégées (nécessitent une authentification)
router.use(authMiddleware);

// Route pour les suggestions - après le middleware d'authentification
router.get('/recipes/suggestions', detectAccessLevel, cw(recipeController.getSuggestions));

// Routes de création/modification - authentification requise
router.post('/recipes',
  validate(recipeSchema),
  cw(recipeController.createRecipe)
);

router.patch('/recipes/:id',
  validate(recipeSchema),
  cw(recipeController.updateRecipe)
);

router.delete('/recipes/:id',
  cw(recipeController.deleteRecipe)
);

// Routes pour les ingrédients (modification)
router.post('/recipes/:id/ingredients', cw(recipeController.addIngredient));
router.delete('/recipes/:id/ingredients/:ingredientId', cw(recipeController.deleteIngredient));
router.delete('/recipes/:id/ingredients', cw(recipeController.deleteAllIngredients));

export default router;