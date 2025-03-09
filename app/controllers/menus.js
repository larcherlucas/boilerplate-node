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
      return res.status(200).json({
        status: 'success',
        data: menus
      });
    } catch (error) {
      next(error);
    }
  },
  
  async getActiveWeeklyMenu(req, res, next) {
    try {
      const activeMenu = await menusDataMapper.findActiveWeeklyMenu(req.user.id);
      
      if (!activeMenu) {
        // Si aucun menu actif n'est trouvé, renvoyer une réponse 404
        return res.status(404).json({
          status: 'error',
          error: 'Aucun menu actif trouvé',
          data: null
        });
      }
  
      return res.status(200).json({
        status: 'success',
        data: activeMenu,
        message: 'Menu actif récupéré avec succès'
      });
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
      
      return res.status(200).json({
        status: 'success',
        data: menu
      });
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
      
      return res.status(201).json({
        status: 'success',
        data: newMenu
      });
    } catch (error) {
      next(error);
    }
  },

  async generateWeeklyMenu(req, res, next) {
    try {
      console.log('generateWeeklyMenu - Body reçu:', req.body);
      
      // Validation des options
      const { error, value } = weeklyMenuSchema.validate(req.body);
      if (error) {
        console.error('Erreur de validation:', error);
        throw new ApiError(400, error.message);
      }
      
      console.log('Données validées:', value);
      
      // Extraire les données validées
      const { 
        type, 
        meal_schedule, 
        valid_from, 
        valid_to, 
        family_size = 1, 
        user_preferences 
      } = value;
      
      // Déterminer le type d'utilisateur pour l'accès aux recettes
      const userRole = req.user?.role || 'user';
      console.log('Role utilisateur:', userRole);
      
      // Extraire les préférences et restrictions alimentaires
      const excludedIngredients = user_preferences?.excludedIngredients || [];
      const dietaryRestrictions = user_preferences?.dietaryRestrictions || [];
      const mealTypes = user_preferences?.mealTypes || ['breakfast', 'lunch', 'dinner'];
      
      console.log('Préférences:', {
        excludedIngredients,
        dietaryRestrictions,
        mealTypes
      });
      
      // Préparer la liste combinée de restrictions alimentaires
      const allRestrictions = [...excludedIngredients, ...dietaryRestrictions];
      
      // Récupérer des recettes éligibles
      console.log('Récupération des recettes éligibles...');
      const eligibleRecipes = await menusDataMapper.getEligibleRecipes(
        allRestrictions,
        family_size,
        mealTypes,
        100, // limite raisonnable
        userRole
      );
      
      console.log(`${eligibleRecipes.length} recettes éligibles trouvées`);
      
      // Récupérer les recettes favorites si disponible
      let favoriteRecipes = [];
      try {
        favoriteRecipes = await favoritesDataMapper.getAll(req.user.id);
        console.log(`${favoriteRecipes.length} recettes favorites trouvées`);
      } catch (err) {
        console.warn('Impossible de récupérer les favoris:', err);
      }
      
      // Générer le planning de repas
      const options = {
        numberOfMeals: 3,
        numberOfDays: 7,
        includeFavorites: favoriteRecipes.length > 0,
        familySize: family_size,
        mealTypes: mealTypes
      };
      
      console.log('Génération du planning des repas...');
      const filledMealSchedule = generateMealSchedule(
        eligibleRecipes,
        favoriteRecipes,
        options
      );
      
      // Créer le menu avec les données complètes
      const menuData = {
        type,
        meal_schedule: filledMealSchedule, // Planning avec recettes
        status: 'active',
        is_customized: false,
        valid_from,
        valid_to,
        family_size,
        generated_options: {
          generated_at: new Date().toISOString(),
          excluded_ingredients: excludedIngredients,
          dietary_restrictions: dietaryRestrictions,
          meal_types: mealTypes
        }
      };
      
      console.log('Création du menu dans la base de données...');
      const newMenu = await menusDataMapper.createWeeklyMenu(req.user.id, menuData);
      
      console.log('Menu créé avec succès:', newMenu.id);
      
      return res.status(201).json({
        status: 'success',
        data: newMenu
      });
    } catch (error) {
      console.error('Erreur dans generateWeeklyMenu:', error);
      // Assurez-vous que l'erreur a un statut
      error.status = error.status || 500;
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
      
      return res.status(200).json({
        status: 'success',
        data: updatedMenu
      });
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
      
      return res.status(204).end();
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
  const { numberOfMeals, numberOfDays = 7, includeFavorites, mealTypes } = options;
  
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
          cook_time: selectedRecipe.cook_time,
          difficulty_level: selectedRecipe.difficulty_level,
          servings: options.familySize || 1
        };
        
        // Retirer la recette des listes pour éviter les répétitions
        if (useFavorite) {
          favoritesByType[mealType] = favoritesByType[mealType].filter(r => r.id !== selectedRecipe.id);
        }
        recipesByType[mealType] = recipesByType[mealType].filter(r => r.id !== selectedRecipe.id);
        
        // Si on n'a plus de recettes de ce type, réinitialiser la liste
        if (recipesByType[mealType].length === 0 || recipesByType[mealType].length < 3) {
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