import ApiError from '../erros/api.error.js';
import favoritesDataMapper from '../datamappers/favorites.js';
import { favoriteSchema } from '../validations/schemas/favorites.js';

const favoritesController = {
  async getAll(req, res, next) {
    try {
      const favorites = await favoritesDataMapper.findAllByUser(req.user.id);
      res.json(favorites);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const { error, value } = favoriteSchema.validate(req.body);
      if (error) {
        throw new ApiError(400, error.message);
      }

      // Vérifier si la recette existe
      const recipeExists = await favoritesDataMapper.checkRecipeExists(value.recipe_id);
      if (!recipeExists) {
        throw new ApiError(404, 'Recipe not found');
      }

      // Vérifier si déjà en favori
      const existingFavorite = await favoritesDataMapper.findOne(req.user.id, value.recipe_id);
      if (existingFavorite) {
        throw new ApiError(400, 'Recipe already in favorites');
      }

      const newFavorite = await favoritesDataMapper.create(req.user.id, value.recipe_id);
      res.status(201).json(newFavorite);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      const deletedFavorite = await favoritesDataMapper.delete(req.user.id, req.params.recipeId);
      if (!deletedFavorite) {
        throw new ApiError(404, 'Favorite not found');
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  },

  async checkFavorite(req, res, next) {
    try {
      const favorite = await favoritesDataMapper.findOne(req.user.id, req.params.recipeId);
      res.json({ isFavorite: !!favorite });
    } catch (error) {
      next(error);
    }
  }
};

export default favoritesController;