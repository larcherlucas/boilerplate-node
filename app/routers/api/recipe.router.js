import express from 'express';
import recipeController from '../../controllers/recipe.js';
import cw from '../../middlewares/controller.wrapper.js';
import { recipeSchema } from '../../validations/schemas/recipe.js';
import validate from '../../validations/validator.js';
import authMiddleware from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Routes publiques
router.get('/recipes', cw(recipeController.getAllRecipes));
router.get('/recipes/:id', cw(recipeController.getOneRecipe));

// Routes protégées (nécessitent une authentification)
router.use(authMiddleware);

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

export default router;