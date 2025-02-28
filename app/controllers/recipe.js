import recipeDataMapper from '../datamappers/recipe.js';
import ApiError from '../erros/api.error.js';

const recipeController = {
  getAllRecipes: async (req, res) => {
    try {
      // Récupération des query parameters pour le filtrage
      const { meal_type, difficulty_level, season, is_premium } = req.query;
      const filters = { meal_type, difficulty_level, season, is_premium };

      const recipes = await recipeDataMapper.findAllRecipes(filters);
      
      if (recipes.length === 0) {
        return res.status(200).json({
          status: 'success',
          message: 'No recipes found with these criteria',
          data: []
        });
      }
      
      return res.status(200).json({
        status: 'success',
        data: recipes
      });
    } catch (err) {
      throw err;
    }
  },

  getRecipesByType: async (req, res) => {
    try {
      const { type } = req.params; // Récupération du type depuis le paramètre d'URL
      
      if (!type || (type !== 'free' && type !== 'premium')) {
        throw new ApiError(400, 'Invalid type parameter. Must be "free" or "premium"');
      }
      
      let recipes;
      
      if (type === 'free') {
        // Pour les utilisateurs gratuits, limitez à 50 recettes
        recipes = await recipeDataMapper.findFreeRecipes();
      } else {
        // Pour les utilisateurs premium, toutes les recettes
        recipes = await recipeDataMapper.findPremiumRecipes();
      }
      
      return res.status(200).json({
        status: 'success',
        data: recipes,
        access_type: type
      });
    } catch (err) {
      throw err;
    }
  },

  getOneRecipe: async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id, 10);
      
      if (isNaN(recipeId)) {
        throw new ApiError(400, 'Invalid recipe ID');
      }
      
      const recipe = await recipeDataMapper.findOneRecipe(recipeId);

      if (!recipe) {
        throw new ApiError(404, 'Recipe not found');
      }

      return res.status(200).json({
        status: 'success',
        data: recipe
      });
    } catch (err) {
      throw err;
    }
  },

  createRecipe: async (req, res) => {
    try {
      // On suppose que l'ID de l'auteur vient du token JWT
      const authorId = req.user.id;
      const recipeData = { ...req.body, author_id: authorId };
      
      const newRecipe = await recipeDataMapper.createRecipe(recipeData);

      return res.status(201).json({
        status: 'success',
        data: newRecipe
      });
    } catch (err) {
      throw err;
    }
  },

  updateRecipe: async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id, 10);
      
      if (isNaN(recipeId)) {
        throw new ApiError(400, 'Invalid recipe ID');
      }
      
      const authorId = req.user.id; // Pour vérifier que l'utilisateur est l'auteur

      const recipe = await recipeDataMapper.findOneRecipe(recipeId);
      if (!recipe) {
        throw new ApiError(404, 'Recipe not found');
      }

      // Vérifier que l'utilisateur est l'auteur ou un admin
      if (recipe.author_id !== authorId && req.user.role !== 'admin') {
        throw new ApiError(403, 'Not authorized to update this recipe');
      }

      const updatedRecipe = await recipeDataMapper.updateRecipe(recipeId, req.body);

      return res.status(200).json({
        status: 'success',
        data: updatedRecipe
      });
    } catch (err) {
      throw err;
    }
  },

  deleteRecipe: async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id, 10);
      
      if (isNaN(recipeId)) {
        throw new ApiError(400, 'Invalid recipe ID');
      }
      
      const authorId = req.user.id;

      const recipe = await recipeDataMapper.findOneRecipe(recipeId);
      if (!recipe) {
        throw new ApiError(404, 'Recipe not found');
      }

      // Vérifier que l'utilisateur est l'auteur ou un admin
      if (recipe.author_id !== authorId && req.user.role !== 'admin') {
        throw new ApiError(403, 'Not authorized to delete this recipe');
      }

      const deleted = await recipeDataMapper.deleteRecipe(recipeId);
      
      if (!deleted) {
        throw new ApiError(500, 'Failed to delete recipe');
      }

      return res.status(204).end();
    } catch (err) {
      throw err;
    }
  },
  
  getIngredients: async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id, 10);
      
      if (isNaN(recipeId)) {
        throw new ApiError(400, 'Invalid recipe ID');
      }
      
      const recipe = await recipeDataMapper.findOneRecipe(recipeId);
      
      if (!recipe) {
        throw new ApiError(404, 'Recipe not found');
      }
      
      return res.status(200).json({
        status: 'success',
        data: recipe.ingredients
      });
    } catch (err) {
      throw err;
    }
  },
  
  addIngredient: async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id, 10);
      
      if (isNaN(recipeId)) {
        throw new ApiError(400, 'Invalid recipe ID');
      }
      
      const recipe = await recipeDataMapper.findOneRecipe(recipeId);
      
      if (!recipe) {
        throw new ApiError(404, 'Recipe not found');
      }
      
      // Vérifier que l'utilisateur est l'auteur ou un admin
      if (recipe.author_id !== req.user.id && req.user.role !== 'admin') {
        throw new ApiError(403, 'Not authorized to modify this recipe');
      }
      
      // Récupérer les ingrédients actuels
      const currentIngredients = recipe.ingredients || [];
      
      // Ajouter le nouvel ingrédient
      const newIngredient = req.body;
      const updatedIngredients = [...currentIngredients, newIngredient];
      
      // Mettre à jour la recette
      const result = await recipeDataMapper.updateIngredients(recipeId, updatedIngredients);
      
      return res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (err) {
      throw err;
    }
  },
  
  deleteIngredient: async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id, 10);
      const ingredientId = req.params.ingredientId;
      
      if (isNaN(recipeId)) {
        throw new ApiError(400, 'Invalid recipe ID');
      }
      
      const recipe = await recipeDataMapper.findOneRecipe(recipeId);
      
      if (!recipe) {
        throw new ApiError(404, 'Recipe not found');
      }
      
      // Vérifier que l'utilisateur est l'auteur ou un admin
      if (recipe.author_id !== req.user.id && req.user.role !== 'admin') {
        throw new ApiError(403, 'Not authorized to modify this recipe');
      }
      
      // Filtrer l'ingrédient à supprimer (en supposant que chaque ingrédient a un id dans le JSONB)
      const currentIngredients = recipe.ingredients || [];
      const updatedIngredients = currentIngredients.filter(
        ingredient => ingredient.id !== ingredientId
      );
      
      // Si aucun ingrédient n'a été supprimé
      if (updatedIngredients.length === currentIngredients.length) {
        throw new ApiError(404, 'Ingredient not found');
      }
      
      // Mettre à jour la recette
      await recipeDataMapper.updateIngredients(recipeId, updatedIngredients);
      
      return res.status(204).end();
    } catch (err) {
      throw err;
    }
  },
  
  deleteAllIngredients: async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id, 10);
      
      if (isNaN(recipeId)) {
        throw new ApiError(400, 'Invalid recipe ID');
      }
      
      const recipe = await recipeDataMapper.findOneRecipe(recipeId);
      
      if (!recipe) {
        throw new ApiError(404, 'Recipe not found');
      }
      
      // Vérifier que l'utilisateur est l'auteur ou un admin
      if (recipe.author_id !== req.user.id && req.user.role !== 'admin') {
        throw new ApiError(403, 'Not authorized to modify this recipe');
      }
      
      // Mettre à jour la recette avec un tableau vide d'ingrédients
      await recipeDataMapper.updateIngredients(recipeId, []);
      
      return res.status(204).end();
    } catch (err) {
      throw err;
    }
  },
  
  getSuggestions: async (req, res) => {
    try {
      const userId = req.user.id;
      // On pourrait récupérer des préférences supplémentaires depuis la requête
      const preferences = {
        current_season: req.query.season || getCurrentSeason()
      };
      
      const suggestions = await recipeDataMapper.getSuggestions(userId, preferences);
      
      return res.status(200).json({
        status: 'success',
        data: suggestions
      });
    } catch (err) {
      throw err;
    }
  }
};

// Fonction utilitaire pour obtenir la saison actuelle
function getCurrentSeason() {
  const date = new Date();
  const month = date.getMonth();
  
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

export default recipeController;