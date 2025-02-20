import recipeDataMapper from '../datamappers/recipe.js';
import ApiError from '../erros/api.error.js';

const recipeController = {
  getAllRecipes: async (req, res) => {
    try {
      // Récupération des query parameters pour le filtrage
      const { meal_type, difficulty_level, season, is_premium } = req.query;
      const filters = { meal_type, difficulty_level, season, is_premium };

      const recipes = await recipeDataMapper.findAllRecipes(filters);
      
      if (!recipes) {
        throw new ApiError(404, 'No recipes found');
      }
      
      return res.status(200).json({
        status: 'success',
        data: recipes
      });
    } catch (err) {
      throw err;
    }
  },

  getOneRecipe: async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id, 10);
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

      return res.status(204).end();
    } catch (err) {
      throw err;
    }
  }
};

export default recipeController;