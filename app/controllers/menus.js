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
        household_members,
        user_preferences 
      } = value;
      
      // Obtenir les informations de household_members depuis la base de données si non fournies
      let householdInfo = household_members;
      if (!householdInfo) {
        const user = await accountDataMapper.findOneAccount(req.user.id);
        householdInfo = user.household_members || {
          adults: 1,
          children_over_3: 0,
          children_under_3: 0,
          babies: 0
        };
      }
      
      // Déterminer le type d'utilisateur pour l'accès aux recettes
      const userRole = req.user?.role || 'user';
      console.log('Role utilisateur:', userRole);
      
      // Extraire les préférences et restrictions alimentaires
      const excludedIngredients = user_preferences?.excludedIngredients || [];
      const dietaryRestrictions = user_preferences?.dietaryRestrictions || [];
      const mealTypes = user_preferences?.mealTypes || ['breakfast', 'lunch', 'dinner'];
      const ageCategories = user_preferences?.age_category || ['toute la famille'];
      
      console.log('Préférences:', {
        excludedIngredients,
        dietaryRestrictions,
        mealTypes,
        ageCategories,
        householdInfo
      });
      
      // Préparer la liste combinée de restrictions alimentaires
      const allRestrictions = [...excludedIngredients, ...dietaryRestrictions];
      
      // Récupérer des recettes éligibles
      console.log('Récupération des recettes éligibles...');
      const eligibleRecipes = await menusDataMapper.getEligibleRecipes(
        allRestrictions,
        family_size,
        mealTypes,
        ageCategories,
        100, // limite raisonnable
        userRole
      );
      
      console.log(`${eligibleRecipes.length} recettes éligibles trouvées`);
      
      // Récupérer les menus précédents pour éviter la répétition
      const previousMenus = await menusDataMapper.findRecentMenus(req.user.id, 3); // Récupérer les 3 derniers menus
      const previousRecipeIds = new Set();
      
      // Extraire les IDs des recettes utilisées dans les menus précédents
      previousMenus.forEach(menu => {
        Object.values(menu.meal_schedule).forEach(day => {
          Object.values(day).forEach(meal => {
            if (meal && meal.recipe_id) {
              previousRecipeIds.add(meal.recipe_id);
            }
          });
        });
      });
      
      console.log(`${previousRecipeIds.size} recettes récemment utilisées à éviter`);
      
      // Récupérer les recettes favorites si disponible
      let favoriteRecipes = [];
      try {
        favoriteRecipes = await favoritesDataMapper.findAllByUser(req.user.id);
        console.log(`${favoriteRecipes.length} recettes favorites trouvées`);
      } catch (err) {
        console.warn('Impossible de récupérer les favoris:', err);
      }
      
      // Filtrer les recettes favorites par type de repas et âge
      const filteredFavorites = favoriteRecipes.filter(fav => 
        mealTypes.includes(fav.recipe.meal_type) && 
        (!ageCategories.length || ageCategories.includes(fav.recipe.age_category))
      );
      
      // Générer le planning de repas
      const options = {
        numberOfDays: type === 'weekly' ? 7 : 30,
        includeFavorites: filteredFavorites.length > 0,
        familySize: family_size,
        householdInfo: householdInfo,
        mealTypes: mealTypes,
        ageCategories: ageCategories,
        previousRecipeIds: [...previousRecipeIds]
      };
      
      console.log('Génération du planning des repas...');
      const filledMealSchedule = generateMealSchedule(
        eligibleRecipes,
        filteredFavorites,
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
          household_members: householdInfo,
          excluded_ingredients: excludedIngredients,
          dietary_restrictions: dietaryRestrictions,
          meal_types: mealTypes,
          age_categories: ageCategories
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
  const { 
    numberOfDays = 7, 
    includeFavorites, 
    familySize,
    householdInfo,
    mealTypes,
    ageCategories,
    previousRecipeIds = []
  } = options;
  
  // Organiser les recettes par type de repas
  const recipesByType = mealTypes.reduce((acc, type) => {
    // Exclure les recettes déjà utilisées récemment
    const availableRecipes = eligibleRecipes.filter(recipe => 
      recipe.meal_type === type && 
      !previousRecipeIds.includes(recipe.id) &&
      (ageCategories.includes(recipe.age_category) || !recipe.age_category)
    );
    acc[type] = availableRecipes;
    return acc;
  }, {});
  
  // Organiser les favoris par type de repas si inclus
  const favoritesByType = includeFavorites ? mealTypes.reduce((acc, type) => {
    const availableFavorites = favoriteRecipes.filter(fav => 
      fav.recipe.meal_type === type && 
      !previousRecipeIds.includes(fav.recipe.id) &&
      (ageCategories.includes(fav.recipe.age_category) || !fav.recipe.age_category)
    );
    acc[type] = availableFavorites;
    return acc;
  }, {}) : {};
  
  // Structurer le planning selon la période (hebdomadaire ou mensuelle)
  const mealSchedule = {};
  
  // Format du planning: day_1, day_2, etc. pour les jours
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
        // Privilégier les recettes adaptées à l'âge des membres du foyer
        let prioritizedRecipes = selectedRecipes;
        
        if (householdInfo && (householdInfo.babies > 0 || householdInfo.children_under_3 > 0)) {
          // Si le foyer a des bébés, essayer de trouver des recettes adaptées
          const babyFriendlyRecipes = selectedRecipes.filter(r => 
            r.age_category && r.age_category.includes('bébé')
          );
          if (babyFriendlyRecipes.length > 0) {
            prioritizedRecipes = babyFriendlyRecipes;
          }
        }
        
        const randomIndex = Math.floor(Math.random() * prioritizedRecipes.length);
        const selectedRecipe = prioritizedRecipes[randomIndex];
        
        // Recette brute ou contenue dans un objet favori
        const recipeData = selectedRecipe.recipe_id ? selectedRecipe.recipe : selectedRecipe;
        
        // Ajouter la recette au planning
        mealSchedule[dayKey][mealType] = {
          recipe_id: recipeData.id,
          title: recipeData.title,
          is_favorite: useFavorite,
          image_url: recipeData.image_url,
          prep_time: recipeData.prep_time,
          cook_time: recipeData.cook_time,
          difficulty_level: recipeData.difficulty_level,
          servings: familySize || 1,
          age_category: recipeData.age_category || 'toute la famille'
        };
        
        // Retirer la recette des listes pour éviter les répétitions
        if (useFavorite) {
          favoritesByType[mealType] = favoritesByType[mealType].filter(r => 
            r.recipe.id !== recipeData.id
          );
        }
        recipesByType[mealType] = recipesByType[mealType].filter(r => r.id !== recipeData.id);
        
        // Si on n'a plus de recettes de ce type, réinitialiser la liste
        // mais en excluant toujours les recettes déjà utilisées dans ce menu
        if (recipesByType[mealType].length < 3) {
          const usedIdsInCurrentMenu = Object.values(mealSchedule)
            .flatMap(day => Object.values(day))
            .filter(meal => meal && meal.recipe_id)
            .map(meal => meal.recipe_id);
          
          recipesByType[mealType] = eligibleRecipes.filter(recipe => 
            recipe.meal_type === mealType && 
            !usedIdsInCurrentMenu.includes(recipe.id) &&
            (ageCategories.includes(recipe.age_category) || !recipe.age_category)
          );
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