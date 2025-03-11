import express from 'express';
import recipeController from '../../controllers/recipe.js';
import cw from '../../middlewares/controller.wrapper.js';
import { recipeSchema } from '../../validations/schemas/recipe.js';
import validate from '../../validations/validator.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import { detectAccessLevel, checkRecipeAccess } from '../../middlewares/subscription.middleware.js';
import cacheService from '../../services/cache.service.js'; 
import checkRole from '../../middlewares/role.middleware.js';

const router = express.Router();

// Middleware pour nettoyer le cache lors des modifications
const clearCache = (prefix) => {
  return (req, res, next) => {
    // On mémorise l'ancien end pour pouvoir l'exécuter après
    const originalEnd = res.end;
    
    // On remplace la méthode end
    res.end = function(...args) {
      // Si la requête a réussi (status 2xx), on invalide le cache
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.invalidateByPrefix(prefix);
      }
      
      // On appelle la méthode originale
      return originalEnd.apply(this, args);
    };
    
    next();
  };
};

// Middleware pour nettoyer le cache d'une recette spécifique
const clearRecipeCache = (req, res, next) => {
  const recipeId = parseInt(req.params.id, 10);
  
  if (!isNaN(recipeId)) {
    // On mémorise l'ancien end pour pouvoir l'exécuter après
    const originalEnd = res.end;
    
    // On remplace la méthode end
    res.end = function(...args) {
      // Si la requête a réussi (status 2xx), on invalide le cache
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheService.del(`recipe_${recipeId}_admin`);
        cacheService.del(`recipe_${recipeId}_premium`);
        cacheService.del(`recipe_${recipeId}_basic`);
        cacheService.del(`recipe_${recipeId}_none`);
        cacheService.del(`recipe_${recipeId}_ingredients`);
        cacheService.invalidateByPrefix('recipes_list');
      }
      
      // On appelle la méthode originale
      return originalEnd.apply(this, args);
    };
  }
  
  next();
};

// Route pour obtenir des statistiques sur le cache (pour le monitoring)
router.get('/cache-stats', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès interdit' });
  }
  
  const stats = cacheService.getStats();
  res.json({ 
    status: 'success',
    data: stats
  });
});

// Routes publiques avec détection du niveau d'accès
// Attention à l'ordre: les routes plus spécifiques doivent venir avant les routes avec paramètres
router.get('/recipes/type/:type', detectAccessLevel, cw(recipeController.getRecipesByType));
router.get('/recipes', detectAccessLevel, cw(recipeController.getAllRecipes));
router.get('/recipes/:id', authMiddleware, detectAccessLevel, checkRecipeAccess, cw(recipeController.getOneRecipe));
router.get('/recipes/:id/ingredients', detectAccessLevel, checkRecipeAccess, cw(recipeController.getIngredients));

// Routes protégées (nécessitent une authentification)
router.use(authMiddleware);

// Routes d'administration des recettes (admin uniquement)
router.get('/admin/recipes', checkRole('admin'), cw(recipeController.getAllRecipesAdmin));
router.get('/admin/recipes/:id', checkRole('admin'), cw(recipeController.getOneRecipeAdmin));
router.post('/admin/recipes', checkRole('admin'), validate(recipeSchema), clearCache('recipes_list'), cw(recipeController.createRecipeAdmin));
router.patch('/admin/recipes/:id', checkRole('admin'), validate(recipeSchema), clearRecipeCache, cw(recipeController.updateRecipeAdmin));
router.delete('/admin/recipes/:id', checkRole('admin'), clearRecipeCache, cw(recipeController.deleteRecipeAdmin));
router.post('/admin/recipes/bulk', checkRole('admin'), cw(recipeController.bulkActionAdmin));
// Route pour les suggestions - après le middleware d'authentification
router.get('/recipes/suggestions', detectAccessLevel, cw(recipeController.getSuggestions));

// Routes de création/modification - authentification requise
router.post('/recipes',
  validate(recipeSchema),
  clearCache('recipes_list'), // Invalider le cache des listes après création
  cw(recipeController.createRecipe)
);

router.patch('/recipes/:id',
  validate(recipeSchema),
  clearRecipeCache, // Invalider le cache de cette recette spécifique
  cw(recipeController.updateRecipe)
);

router.delete('/recipes/:id',
  clearRecipeCache, // Invalider le cache de cette recette spécifique
  cw(recipeController.deleteRecipe)
);

// Routes pour les ingrédients (modification)
router.post('/recipes/:id/ingredients', 
  clearRecipeCache,
  cw(recipeController.addIngredient)
);

router.delete('/recipes/:id/ingredients/:ingredientId', 
  clearRecipeCache,
  cw(recipeController.deleteIngredient)
);

router.delete('/recipes/:id/ingredients', 
  clearRecipeCache,
  cw(recipeController.deleteAllIngredients)
);

// Route pour vider manuellement le cache (admin uniquement)
router.post('/cache/clear', authMiddleware, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès interdit' });
  }
  
  const { prefix } = req.body;
  
  if (prefix) {
    const count = cacheService.invalidateByPrefix(prefix);
    res.json({ 
      status: 'success', 
      message: `${count} entrées de cache avec le préfixe "${prefix}" ont été supprimées` 
    });
  } else {
    cacheService.flush();
    res.json({ 
      status: 'success', 
      message: 'Cache entièrement vidé' 
    });
  }
});

export default router;