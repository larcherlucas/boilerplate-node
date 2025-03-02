import ApiError from '../erros/api.error.js';
import favoritesDataMapper from '../datamappers/favorites.js';
import { favoriteSchema } from '../validations/schemas/favorites.js';

const favoritesController = {
async getAll(req, res, next) {
  try {
    // Vérifier si l'utilisateur est authentifié
    if (!req.user) {
      throw new ApiError(401, 'Authentification requise');
    }
    
    // Vérifier le statut d'abonnement
    const hasActiveSubscription = req.subscription?.active || false;
    
    // Récupérer les favoris adaptés au statut d'abonnement
    const favorites = await favoritesDataMapper.findAllByUser(
      req.user.id, 
      hasActiveSubscription
    );
    
    res.status(200).json({
      status: 'success',
      data: favorites,
      subscription: {
        active: hasActiveSubscription,
        type: req.subscription?.type || 'none'
      }
    });
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
    const recipe = await recipeDataMapper.findOneRecipe(value.recipe_id);
    if (!recipe) {
      throw new ApiError(404, 'Recette non trouvée');
    }
    
    // Vérifier l'abonnement pour les recettes premium
    if (recipe.is_premium) {
      const hasActiveSubscription = req.subscription?.active || false;
      if (!hasActiveSubscription) {
        throw new ApiError(403, 'Abonnement premium requis pour ajouter cette recette aux favoris');
      }
    }

    // Vérifier si déjà en favori
    const existingFavorite = await favoritesDataMapper.findOne(req.user.id, value.recipe_id);
    if (existingFavorite) {
      throw new ApiError(400, 'Recette déjà dans vos favoris');
    }

    const newFavorite = await favoritesDataMapper.create(req.user.id, value.recipe_id);
    res.status(201).json({
      status: 'success',
      data: newFavorite
    });
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