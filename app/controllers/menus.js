import ApiError from '../erros/api.error.js';
import menusDataMapper from '../datamappers/menus.js';
import dietaryRestrictionsDataMapper from '../datamappers/dietaryRestrictions.js';
import favoritesDataMapper from '../datamappers/favorites.js';
import { weeklyMenuSchema } from '../validations/schemas/menus.js';

const menusController = {
  // Weekly menus methods
  async getWeeklyMenus(req, res, next) {
    try {
      const menus = await menusDataMapper.findAllWeeklyMenus(req.user.id);
      res.json(menus);
    } catch (error) {
      next(error);
    }
  },

  async getWeeklyMenuById(req, res, next) {
    try {
      const menu = await menusDataMapper.findWeeklyMenuById(req.params.id, req.user.id);
      if (!menu) {
        throw new ApiError(404, 'Weekly menu not found');
      }
      res.json(menu);
    } catch (error) {
      next(error);
    }
  },

  async createWeeklyMenu(req, res, next) {
    try {
      const { error, value } = weeklyMenuSchema.validate(req.body);
      if (error) {
        throw new ApiError(400, error.message);
      }
      const newMenu = await menusDataMapper.createWeeklyMenu(req.user.id, value);
      res.status(201).json(newMenu);
    } catch (error) {
      next(error);
    }
  },

  async generateWeeklyMenu(req, res, next) {
    try {
      // Validation des options
      const { error, value } = weeklyMenuSchema.validate(req.body);
      if (error) {
        throw new ApiError(400, error.message);
      }
      
      // Options par défaut
      const options = {
        numberOfMeals: req.body.numberOfMeals || 3,
        numberOfDays: req.body.numberOfDays || 7,
        includeFavorites: req.body.includeFavorites !== false,
        familySize: req.body.familySize || 1,
        startDate: req.body.startDate || new Date().toISOString().split('T')[0],
        mealTypes: req.body.mealTypes || ['breakfast', 'lunch', 'dinner']
      };
  
      // Déterminer le type d'utilisateur pour l'accès aux recettes
      const userType = req.subscription?.active ? req.subscription.type : 'none';
  
      // Récupérer les restrictions alimentaires
      const dietaryRestrictions = await dietaryRestrictionsDataMapper.findAllByUser(req.user.id);
      
      // Récupérer des recettes éligibles basées sur les restrictions et la taille du foyer
      const eligibleRecipes = await menusDataMapper.getEligibleRecipes(
        dietaryRestrictions,
        options.familySize,
        options.mealTypes,
        userType
      );
      
      // Récupérer les recettes favorites si demandé
      let favoriteRecipes = [];
      if (options.includeFavorites) {
        favoriteRecipes = await menusDataMapper.getFavoriteRecipes(req.user.id);
        
        // Filtrer les recettes premium si l'utilisateur n'a pas d'abonnement
        if (userType === 'none') {
          favoriteRecipes = favoriteRecipes.filter(recipe => !recipe.is_premium);
        }
      }
      
      // Générer le planning des repas
      const meal_schedule = generateMealSchedule(
        eligibleRecipes,
        favoriteRecipes,
        options
      );
      
      // Calculer la période de validité
      const valid_from = new Date(options.startDate);
      const valid_to = new Date(valid_from);
      valid_to.setDate(valid_to.getDate() + options.numberOfDays - 1);
      
      // Créer le menu
      const menuData = {
        meal_schedule,
        valid_from,
        valid_to,
        family_size: options.familySize,
        is_customized: false,
        generated_options: options
      };
      
      const newMenu = await menusDataMapper.createWeeklyMenu(req.user.id, menuData);
      res.status(201).json({
        status: 'success',
        data: newMenu
      });
    } catch (error) {
      next(error);
    }
  },

  async updateWeeklyMenu(req, res, next) {
    try {
      const { error, value } = weeklyMenuSchema.validate(req.body);
      if (error) {
        throw new ApiError(400, error.message);
      }
      const updatedMenu = await menusDataMapper.updateWeeklyMenu(req.params.id, req.user.id, value);
      if (!updatedMenu) {
        throw new ApiError(404, 'Weekly menu not found');
      }
      res.json(updatedMenu);
    } catch (error) {
      next(error);
    }
  },

  async deleteWeeklyMenu(req, res, next) {
    try {
      const deletedMenu = await menusDataMapper.deleteWeeklyMenu(req.params.id, req.user.id);
      if (!deletedMenu) {
        throw new ApiError(404, 'Weekly menu not found');
      }
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
};

/**
 * Génère un planning de repas hebdomadaire
 * @param {Array} eligibleRecipes - Recettes éligibles selon les restrictions
 * @param {Array} favoriteRecipes - Recettes favorites de l'utilisateur
 * @param {Object} options - Options de génération
 * @returns {Object} Planning des repas
 */
function generateMealSchedule(eligibleRecipes, favoriteRecipes, options) {
  const { numberOfMeals, numberOfDays, includeFavorites, mealTypes } = options;
  
  // Organiser les recettes par type de repas
  const recipesByType = mealTypes.reduce((acc, type) => {
    acc[type] = eligibleRecipes.filter(recipe => recipe.meal_type === type);
    return acc;
  }, {});
  
  // Organiser les favoris par type de repas si inclus
  const favoritesByType = includeFavorites ? mealTypes.reduce((acc, type) => {
    acc[type] = favoriteRecipes.filter(recipe => recipe.meal_type === type);
    return acc;
  }, {}) : {};
  
  // Générer le planning sur le nombre de jours demandé
  const mealSchedule = {};
  
  for (let day = 1; day <= numberOfDays; day++) {
    const dayKey = `day_${day}`;
    mealSchedule[dayKey] = {};
    
    // Pour chaque type de repas
    mealTypes.forEach(mealType => {
      // Déterminer si on utilise une recette favorite pour ce repas (25% de chance si disponible)
      const useFavorite = includeFavorites && 
                          favoritesByType[mealType]?.length > 0 && 
                          Math.random() < 0.25;
      
      // Sélectionner une recette au hasard
      let selectedRecipes;
      if (useFavorite) {
        selectedRecipes = favoritesByType[mealType];
      } else {
        selectedRecipes = recipesByType[mealType];
      }
      
      // S'assurer qu'il y a des recettes disponibles
      if (selectedRecipes && selectedRecipes.length > 0) {
        const randomIndex = Math.floor(Math.random() * selectedRecipes.length);
        const selectedRecipe = selectedRecipes[randomIndex];
        
        // Ajouter la recette au planning
        mealSchedule[dayKey][mealType] = {
          recipe_id: selectedRecipe.id,
          title: selectedRecipe.title,
          is_favorite: useFavorite,
          image_url: selectedRecipe.image_url,
          prep_time: selectedRecipe.prep_time,
          cooking_time: selectedRecipe.cooking_time,
          difficulty_level: selectedRecipe.difficulty_level,
          serves: options.familySize
        };
        
        // Retirer la recette des listes pour éviter les répétitions
        if (useFavorite) {
          favoritesByType[mealType] = favoritesByType[mealType].filter(r => r.id !== selectedRecipe.id);
        }
        recipesByType[mealType] = recipesByType[mealType].filter(r => r.id !== selectedRecipe.id);
        
        // Si on n'a plus de recettes de ce type, réinitialiser la liste
        if (recipesByType[mealType].length === 0) {
          recipesByType[mealType] = eligibleRecipes.filter(recipe => recipe.meal_type === mealType);
        }
      } else {
        // Si aucune recette n'est disponible pour ce type de repas
        mealSchedule[dayKey][mealType] = null;
      }
    });
  }
  
  return mealSchedule;
}

export default menusController;