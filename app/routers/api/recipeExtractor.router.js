import express from 'express';
import RecipeExtractor from '../../services/recipeExtractor.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import checkRole from '../../middlewares/role.middleware.js';
import cw from '../../middlewares/controller.wrapper.js';

const router = express.Router();

// Route protégée : réservée aux administrateurs
router.use(authMiddleware);
router.use(checkRole('admin')); // S'assurer que seuls les administrateurs peuvent extraire des recettes

/**
 * @route POST /api/extract/recipe
 * @desc Extrait une recette depuis une URL ou un texte brut
 * @access Private (Admin only)
 */
router.post('/recipe', cw(async (req, res) => {
  const { url, text } = req.body;
  
  if (!url && !text) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Vous devez fournir une URL ou un texte de recette' 
    });
  }
  
  // Extraction de la recette
  const recipe = await RecipeExtractor.extract({ url, text });
  
  // Génération de la requête SQL pour référence
  const sqlQuery = RecipeExtractor.generateSqlInsert(recipe);
  
  return res.status(200).json({
    status: 'success',
    data: {
      recipe,
      sqlQuery
    }
  });
}));

/**
 * @route POST /api/extract/recipe/save
 * @desc Sauvegarde une recette extraite et validée en base de données
 * @access Private (Admin only)
 */
router.post('/recipe/save', cw(async (req, res) => {
  const recipe = req.body;
  
  // Nouvelle validation pour sécurité
  await RecipeExtractor.validateRecipe(recipe);
  
  // Insertion en base de données via votre dataMapper existant
  // Ici, nous supposons que votre recipeDataMapper a une fonction createRecipe
  const recipeDataMapper = (await import('../../datamappers/recipe.js')).default;
  
  const newRecipe = await recipeDataMapper.createRecipe(recipe);
  
  return res.status(201).json({
    status: 'success',
    message: 'Recette sauvegardée avec succès',
    data: {
      recipe: newRecipe
    }
  });
}));

export default router;