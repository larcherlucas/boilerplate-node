import recipeDataMapper from '../datamappers/recipe.js';
import ApiError from '../erros/api.error.js';
import logger from '../utils/logger.js';
import cacheService from '../services/cache.service.js';

// Fonction utilitaire pour déterminer le niveau d'accès
function determineAccessLevel(req) {
  if (!req.user) return 'none';
  if (req.user.role === 'admin') return 'admin';
  if (req.user.role === 'premium' || (req.subscription && req.subscription.active)) return 'premium';
  return 'basic';
}

// Fonction pour formater les ingrédients de manière uniforme
function formatIngredients(ingredients) {
  if (!ingredients) return [];
  
  // Si c'est une chaîne JSON, la parser
  if (typeof ingredients === 'string') {
    try {
      ingredients = JSON.parse(ingredients);
    } catch (e) {
      return [];
    }
  }
  
  // Si c'est déjà un tableau d'objets avec les propriétés attendues
  if (Array.isArray(ingredients) && ingredients[0] && ingredients[0].name) {
    return ingredients;
  }
  
  // Si c'est un format spécifique (par exemple un objet contenant un tableau 'ingredients')
  if (typeof ingredients === 'object' && ingredients.ingredients && Array.isArray(ingredients.ingredients)) {
    return ingredients.ingredients;
  }
  
  return [];
}

// Fonction pour formater les étapes de manière uniforme
function formatSteps(steps) {
  if (!steps) return [];
  
  // Si c'est une chaîne JSON, la parser
  if (typeof steps === 'string') {
    try {
      steps = JSON.parse(steps);
    } catch (e) {
      return [];
    }
  }
  
  // Si c'est déjà un tableau de strings
  if (Array.isArray(steps) && typeof steps[0] === 'string') {
    return [{
      category: 'Préparation',
      instructions: steps
    }];
  }
  
  // Si c'est un tableau d'objets avec une propriété 'description'
  if (Array.isArray(steps) && steps[0] && steps[0].description) {
    return [{
      category: 'Préparation',
      instructions: steps.map(step => step.description)
    }];
  }
  
  // Si c'est déjà au format attendu
  if (Array.isArray(steps) && steps[0] && Array.isArray(steps[0].instructions)) {
    return steps;
  }
  
  return [{
    category: 'Préparation',
    instructions: []
  }];
}

// Générer une clé de cache basée sur les filtres et le niveau d'accès
function generateCacheKey(prefix, filters, accessLevel, pagination) {
  const filterKey = JSON.stringify(filters || {});
  const paginationKey = JSON.stringify(pagination || {});
  return `${prefix}_${accessLevel}_${filterKey}_${paginationKey}`;
}

const recipeController = {
  getAllRecipes: async (req, res) => {
    try {
      // Récupérer tous les filtres possibles de la requête
      const { 
        meal_type, 
        difficulty_level, 
        season, 
        search, 
        maxPrepTime, 
        minRating,
        category,
        origin
      } = req.query;
      
      // Construire l'objet de filtres
      const filters = { 
        meal_type, 
        difficulty_level, 
        season,
        search,
        maxPrepTime: maxPrepTime ? parseInt(maxPrepTime, 10) : null,
        minRating: minRating ? parseFloat(minRating) : null,
        category,
        origin
      };
      
      // Nettoyer les filtres null ou undefined
      Object.keys(filters).forEach(key => {
        if (filters[key] === null || filters[key] === undefined) {
          delete filters[key];
        }
      });
      
      // Logger les filtres pour le débogage
      console.log('Filtres de recherche de recettes:', filters);
      
      // Pagination
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
      const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
      const pagination = { limit, offset };
      
      // Déterminer le niveau d'accès de l'utilisateur
      const accessLevel = determineAccessLevel(req);
      
      // Générer la clé de cache
      const cacheKey = generateCacheKey('recipes_list', filters, accessLevel, pagination);
      
      // Utiliser le service de cache pour éviter de requêter la BDD inutilement
      const result = await cacheService.getCachedData(
        cacheKey,
        async () => {
          logger.info(`Cache miss pour ${cacheKey} - Chargement depuis la BDD`);
          // Récupérer les recettes accessibles selon le niveau d'accès
          const recipes = await recipeDataMapper.findAccessibleRecipes(
            accessLevel,
            filters,
            pagination
          );
          
          // Compter le nombre total de recettes correspondant aux filtres
          const totalCount = await recipeDataMapper.countAccessibleRecipes(accessLevel, filters);
          
          return { recipes, totalCount };
        },
        30 * 60 // TTL de 30 minutes
      );
      
      // Formater la réponse pour correspondre au front-end
      return res.status(200).json({
        status: 'success',
        data: result.recipes,
        subscription: {
          active: req.subscription?.active || false,
          type: req.subscription?.type || 'none'
        },
        totalCount: result.totalCount
      });
    } catch (err) {
      console.error('Erreur lors de la récupération des recettes:', err);
      throw err;
    }
  },
  
  getOneRecipe: async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id, 10);
      
      if (isNaN(recipeId)) {
        throw new ApiError(400, 'ID de recette invalide');
      }
      
      console.log('Détails de la requête :', {
        user: req.user,
        subscription: req.subscription,
        headers: req.headers
      });
      
      // Déterminer le niveau d'accès
      const accessLevel = determineAccessLevel(req);
      
      // Générer la clé de cache
      const cacheKey = `recipe_${recipeId}_${accessLevel}`;
      
      // Utiliser le service de cache
      const recipe = await cacheService.getCachedData(
        cacheKey,
        async () => {
          logger.info(`Cache miss pour ${cacheKey} - Chargement depuis la BDD`);
          return await recipeDataMapper.findOneRecipe(recipeId);
        },
        60 * 60 // TTL de 60 minutes
      );
      
      if (!recipe) {
        throw new ApiError(404, 'Recette non trouvée');
      }
      
      // Log détaillé pour comprendre le contexte
      console.log('Vérification de l\'accès à la recette:', {
        recipeId,
        isPremium: recipe.is_premium,
        userAuthenticated: !!req.user,
        userRole: req.user?.role,
        subscriptionStatus: req.user?.subscription_status
      });
      
      // Vérification de l'accès premium
      if (recipe.is_premium) {
        const isAdmin = req.user?.role === 'admin';
        const isPremium = req.user?.role === 'premium';
        const hasActiveSubscription = 
          req.user?.subscription_status === 'active' || 
          (req.subscription && req.subscription.active) || 
          false;
        
        console.log('Conditions d\'accès :', {
          isAdmin,
          isPremium,
          hasActiveSubscription
        });
        
        if (!isAdmin && !isPremium && !hasActiveSubscription) {
          console.log('Accès refusé à la recette premium');
          throw new ApiError(403, 'Cette recette requiert un abonnement premium', {
            requiresSubscription: true,
            recipePartial: {
              id: recipe.id,
              title: recipe.title,
              image_url: recipe.image_url,
              is_premium: true
            }
          });
        }
      }
      
      const responseData = {
        ...recipe,
        ingredients: formatIngredients(recipe.ingredients),
        steps: formatSteps(recipe.steps || recipe.instructions)
      };
      
      return res.status(200).json({
        status: 'success',
        data: responseData
      });
    } catch (err) {
      console.error(`Erreur lors de la récupération de la recette #${req.params.id}:`, err);
      throw err;
    }
  },

  getRecipesByType: async (req, res) => {
    try {
      const { type } = req.params; // Récupération du type depuis le paramètre d'URL
      
      if (!type || (type !== 'free' && type !== 'premium')) {
        throw new ApiError(400, 'Paramètre de type invalide. Doit être "free" ou "premium"');
      }
      
      // Déterminer le niveau d'accès
      const accessLevel = determineAccessLevel(req);
      
      // Générer la clé de cache
      const cacheKey = `recipes_${type}_${accessLevel}`;
      
      // Utiliser le service de cache
      const recipes = await cacheService.getCachedData(
        cacheKey,
        async () => {
          logger.info(`Cache miss pour ${cacheKey} - Chargement depuis la BDD`);
          if (type === 'free') {
            // Pour les utilisateurs gratuits, limiter à 50 recettes
            return await recipeDataMapper.findFreeRecipes();
          } else {
            // Vérifier l'accès premium
            if (determineAccessLevel(req) === 'none' || determineAccessLevel(req) === 'basic') {
              throw new ApiError(403, 'Accès aux recettes premium nécessite un abonnement');
            }
            
            // Pour les utilisateurs premium, toutes les recettes
            return await recipeDataMapper.findPremiumRecipes();
          }
        },
        30 * 60 // TTL de 30 minutes
      );
      
      return res.status(200).json({
        status: 'success',
        data: recipes,
        access_type: type
      });
    } catch (err) {
      console.error('Erreur lors de la récupération des recettes par type:', err);
      throw err;
    }
  },

  createRecipe: async (req, res) => {
    try {
      // On suppose que l'ID de l'auteur vient du token JWT
      const authorId = req.user.id;
      
      // Vérifier les données obligatoires
      const requiredFields = ['title', 'description', 'ingredients', 'steps', 'meal_type'];
      for (const field of requiredFields) {
        if (!req.body[field]) {
          throw new ApiError(400, `Le champ "${field}" est obligatoire`);
        }
      }
      
      // Préparer les données
      const recipeData = { 
        ...req.body, 
        author_id: authorId,
        // Formater correctement les données
        ingredients: typeof req.body.ingredients === 'string' 
          ? JSON.parse(req.body.ingredients) 
          : req.body.ingredients,
        steps: typeof req.body.steps === 'string'
          ? JSON.parse(req.body.steps)
          : req.body.steps
      };
      
      const newRecipe = await recipeDataMapper.createRecipe(recipeData);
      
      // Invalider les caches pertinents
      cacheService.invalidateByPrefix('recipes_list');
      cacheService.invalidateByPrefix(`recipes_${newRecipe.is_premium ? 'premium' : 'free'}`);
      
      return res.status(201).json({
        status: 'success',
        data: newRecipe,
        message: 'Recette créée avec succès'
      });
    } catch (err) {
      console.error('Erreur lors de la création d\'une recette:', err);
      throw err;
    }
  },

  updateRecipe: async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id, 10);
      
      if (isNaN(recipeId)) {
        throw new ApiError(400, 'ID de recette invalide');
      }
      
      const authorId = req.user.id; // Pour vérifier que l'utilisateur est l'auteur
      console.log(`Tentative de mise à jour de la recette #${recipeId} par l'utilisateur #${authorId}`);

      const recipe = await recipeDataMapper.findOneRecipe(recipeId);
      if (!recipe) {
        throw new ApiError(404, 'Recette non trouvée');
      }

      // Vérifier que l'utilisateur est l'auteur ou un admin
      if (recipe.author_id !== authorId && req.user.role !== 'admin') {
        console.warn(`Accès non autorisé: L'utilisateur #${authorId} tente de modifier la recette #${recipeId} créée par #${recipe.author_id}`);
        throw new ApiError(403, 'Non autorisé à modifier cette recette');
      }
      
      // Formater les données JSON si nécessaire
      const updateData = { ...req.body };
      if (updateData.ingredients && typeof updateData.ingredients === 'string') {
        updateData.ingredients = JSON.parse(updateData.ingredients);
      }
      if (updateData.steps && typeof updateData.steps === 'string') {
        updateData.steps = JSON.parse(updateData.steps);
      }

      const updatedRecipe = await recipeDataMapper.updateRecipe(recipeId, updateData);
      
      // Invalider le cache pour cette recette
      cacheService.del(`recipe_${recipeId}_admin`);
      cacheService.del(`recipe_${recipeId}_premium`);
      cacheService.del(`recipe_${recipeId}_basic`);
      cacheService.del(`recipe_${recipeId}_none`);
      
      // Invalider également les listes qui pourraient contenir cette recette
      cacheService.invalidateByPrefix('recipes_list');
      cacheService.invalidateByPrefix(`recipes_${updatedRecipe.is_premium ? 'premium' : 'free'}`);

      return res.status(200).json({
        status: 'success',
        data: updatedRecipe,
        message: 'Recette mise à jour avec succès'
      });
    } catch (err) {
      console.error(`Erreur lors de la mise à jour de la recette #${req.params.id}:`, err);
      throw err;
    }
  },

  deleteRecipe: async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id, 10);
      
      if (isNaN(recipeId)) {
        throw new ApiError(400, 'ID de recette invalide');
      }
      
      const authorId = req.user.id;
      console.log(`Tentative de suppression de la recette #${recipeId} par l'utilisateur #${authorId}`);

      const recipe = await recipeDataMapper.findOneRecipe(recipeId);
      if (!recipe) {
        throw new ApiError(404, 'Recette non trouvée');
      }

      // Vérifier que l'utilisateur est l'auteur ou un admin
      if (recipe.author_id !== authorId && req.user.role !== 'admin') {
        console.warn(`Accès non autorisé: L'utilisateur #${authorId} tente de supprimer la recette #${recipeId} créée par #${recipe.author_id}`);
        throw new ApiError(403, 'Non autorisé à supprimer cette recette');
      }
      
      // Mémoriser si la recette était premium pour invalider le bon cache
      const isPremium = recipe.is_premium;

      const deleted = await recipeDataMapper.deleteRecipe(recipeId);
      
      if (!deleted) {
        throw new ApiError(500, 'Échec de la suppression de la recette');
      }
      
      // Invalider tous les caches relatifs à cette recette
      cacheService.del(`recipe_${recipeId}_admin`);
      cacheService.del(`recipe_${recipeId}_premium`);
      cacheService.del(`recipe_${recipeId}_basic`);
      cacheService.del(`recipe_${recipeId}_none`);
      
      // Invalider également les listes qui pourraient contenir cette recette
      cacheService.invalidateByPrefix('recipes_list');
      cacheService.invalidateByPrefix(`recipes_${isPremium ? 'premium' : 'free'}`);

      return res.status(204).end();
    } catch (err) {
      console.error(`Erreur lors de la suppression de la recette #${req.params.id}:`, err);
      throw err;
    }
  },
  
  getIngredients: async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id, 10);
      
      if (isNaN(recipeId)) {
        throw new ApiError(400, 'ID de recette invalide');
      }
      
      // Clé de cache spécifique pour les ingrédients
      const cacheKey = `recipe_${recipeId}_ingredients`;
      
      // Utiliser le service de cache
      const ingredients = await cacheService.getCachedData(
        cacheKey,
        async () => {
          logger.info(`Cache miss pour ${cacheKey} - Chargement depuis la BDD`);
          const recipe = await recipeDataMapper.findOneRecipe(recipeId);
          
          if (!recipe) {
            throw new ApiError(404, 'Recette non trouvée');
          }
          
          return formatIngredients(recipe.ingredients);
        },
        60 * 60 // TTL de 60 minutes
      );
      
      return res.status(200).json({
        status: 'success',
        data: ingredients
      });
    } catch (err) {
      console.error(`Erreur lors de la récupération des ingrédients de la recette #${req.params.id}:`, err);
      throw err;
    }
  },
  
  addIngredient: async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id, 10);
      
      if (isNaN(recipeId)) {
        throw new ApiError(400, 'ID de recette invalide');
      }
      
      const recipe = await recipeDataMapper.findOneRecipe(recipeId);
      
      if (!recipe) {
        throw new ApiError(404, 'Recette non trouvée');
      }
      
      // Vérifier que l'utilisateur est l'auteur ou un admin
      if (recipe.author_id !== req.user.id && req.user.role !== 'admin') {
        throw new ApiError(403, 'Non autorisé à modifier cette recette');
      }
      
      // Récupérer les ingrédients actuels
      const currentIngredients = formatIngredients(recipe.ingredients);
      
      // Vérifier que le nouvel ingrédient a les propriétés requises
      const newIngredient = req.body;
      if (!newIngredient.name || !newIngredient.quantity) {
        throw new ApiError(400, 'Les propriétés "name" et "quantity" sont requises');
      }
      
      // Générer un ID unique pour le nouvel ingrédient s'il n'en a pas
      if (!newIngredient.id) {
        newIngredient.id = `ing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      // Ajouter le nouvel ingrédient
      const updatedIngredients = [...currentIngredients, newIngredient];
      
      // Mettre à jour la recette
      const result = await recipeDataMapper.updateIngredients(recipeId, updatedIngredients);
      
      // Invalider les caches
      cacheService.del(`recipe_${recipeId}_ingredients`);
      cacheService.del(`recipe_${recipeId}_admin`);
      cacheService.del(`recipe_${recipeId}_premium`);
      cacheService.del(`recipe_${recipeId}_basic`);
      cacheService.del(`recipe_${recipeId}_none`);
      
      return res.status(200).json({
        status: 'success',
        data: result,
        message: 'Ingrédient ajouté avec succès'
      });
    } catch (err) {
      console.error(`Erreur lors de l'ajout d'un ingrédient à la recette #${req.params.id}:`, err);
      throw err;
    }
  },
  
  deleteIngredient: async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id, 10);
      const ingredientId = req.params.ingredientId;
      
      if (isNaN(recipeId)) {
        throw new ApiError(400, 'ID de recette invalide');
      }
      
      const recipe = await recipeDataMapper.findOneRecipe(recipeId);
      
      if (!recipe) {
        throw new ApiError(404, 'Recette non trouvée');
      }
      
      // Vérifier que l'utilisateur est l'auteur ou un admin
      if (recipe.author_id !== req.user.id && req.user.role !== 'admin') {
        throw new ApiError(403, 'Non autorisé à modifier cette recette');
      }
      
      // Filtrer l'ingrédient à supprimer
      const currentIngredients = formatIngredients(recipe.ingredients);
      const updatedIngredients = currentIngredients.filter(
        ingredient => ingredient.id !== ingredientId
      );
      
      // Si aucun ingrédient n'a été supprimé
      if (updatedIngredients.length === currentIngredients.length) {
        throw new ApiError(404, 'Ingrédient non trouvé');
      }
      
      // Mettre à jour la recette
      await recipeDataMapper.updateIngredients(recipeId, updatedIngredients);
      
      // Invalider les caches
      cacheService.del(`recipe_${recipeId}_ingredients`);
      cacheService.del(`recipe_${recipeId}_admin`);
      cacheService.del(`recipe_${recipeId}_premium`);
      cacheService.del(`recipe_${recipeId}_basic`);
      cacheService.del(`recipe_${recipeId}_none`);
      
      return res.status(204).end();
    } catch (err) {
      console.error(`Erreur lors de la suppression d'un ingrédient de la recette #${req.params.id}:`, err);
      throw err;
    }
  },
  
  deleteAllIngredients: async (req, res) => {
    try {
      const recipeId = parseInt(req.params.id, 10);
      
      if (isNaN(recipeId)) {
        throw new ApiError(400, 'ID de recette invalide');
      }
      
      const recipe = await recipeDataMapper.findOneRecipe(recipeId);
      
      if (!recipe) {
        throw new ApiError(404, 'Recette non trouvée');
      }
      
      // Vérifier que l'utilisateur est l'auteur ou un admin
      if (recipe.author_id !== req.user.id && req.user.role !== 'admin') {
        throw new ApiError(403, 'Non autorisé à modifier cette recette');
      }
      
      // Mettre à jour la recette avec un tableau vide d'ingrédients
      await recipeDataMapper.updateIngredients(recipeId, []);
      
      // Invalider les caches
      cacheService.del(`recipe_${recipeId}_ingredients`);
      cacheService.del(`recipe_${recipeId}_admin`);
      cacheService.del(`recipe_${recipeId}_premium`);
      cacheService.del(`recipe_${recipeId}_basic`);
      cacheService.del(`recipe_${recipeId}_none`);
      
      return res.status(204).end();
    } catch (err) {
      console.error(`Erreur lors de la suppression de tous les ingrédients de la recette #${req.params.id}:`, err);
      throw err;
    }
  },

/**
 * Version administrative de getAllRecipes
 * Récupère toutes les recettes avec pagination et filtrage, sans restriction d'accès
 */
getAllRecipesAdmin: async (req, res) => {
  try {
    // Récupérer les paramètres de pagination et filtrage
    const { 
      page = 1, 
      limit = 20, 
      status, 
      meal_type, 
      difficulty_level, 
      is_premium,
      sort_by = 'updated_at',
      sort_direction = 'desc',
      search
    } = req.query;
    
    // Construire l'objet filtres
    const filters = { 
      status, 
      meal_type, 
      difficulty_level,
      is_premium: is_premium === 'true' ? true : is_premium === 'false' ? false : undefined,
      search
    };
    
    // Nettoyer les filtres null ou undefined
    Object.keys(filters).forEach(key => {
      if (filters[key] === null || filters[key] === undefined) {
        delete filters[key];
      }
    });
    
    console.log('Filtres administrateur:', filters);
    
    // Pagination
    const pagination = {
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10)
    };
    
    // Tri
    const sort = {
      field: sort_by,
      direction: sort_direction.toUpperCase()
    };
    
    // Récupérer les recettes (en tant qu'admin, pas de restriction d'accès)
    const recipes = await recipeDataMapper.findAllRecipes(filters, pagination, sort);
    
    // Compter le nombre total pour la pagination
    const total = await recipeDataMapper.countRecipes(filters);
    
    return res.status(200).json({
      status: 'success',
      data: recipes,  // La liste des recettes
      totalCount: total  // Le nombre total de recettes
    });
  } catch (err) {
    console.error('Erreur dans getAllRecipesAdmin:', err);
    throw err;
  }
},

/**
 * Version administrative de getOneRecipe
 * Récupère les détails complets d'une recette, sans restriction d'accès
 */
getOneRecipeAdmin: async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id, 10);
    
    if (isNaN(recipeId)) {
      throw new ApiError(400, 'ID de recette invalide');
    }
    
    // Récupérer la recette complète
    const recipe = await recipeDataMapper.findOneRecipe(recipeId);
    
    if (!recipe) {
      throw new ApiError(404, 'Recette non trouvée');
    }
    
    // Formater la réponse avec les ingrédients et étapes
    const responseData = {
      ...recipe,
      ingredients: formatIngredients(recipe.ingredients),
      steps: formatSteps(recipe.steps || recipe.instructions)
    };
    
    return res.status(200).json({
      status: 'success',
      data: responseData
    });
  } catch (err) {
    console.error(`Erreur dans getOneRecipeAdmin pour la recette #${req.params.id}:`, err);
    throw err;
  }
},

/**
 * Créer une recette (version admin)
 */
createRecipeAdmin: async (req, res) => {
  try {
    // L'administrateur peut créer des recettes pour n'importe quel auteur
    const authorId = req.body.author_id || req.user.id;
    
    // Vérifier les données obligatoires
    const requiredFields = ['title', 'meal_type', 'difficulty_level'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        throw new ApiError(400, `Le champ "${field}" est obligatoire`);
      }
    }
    
    // Préparer les données
    const recipeData = { 
      ...req.body, 
      author_id: authorId,
      // Donner des valeurs par défaut si nécessaire
      status: req.body.status || 'draft',
      is_premium: req.body.is_premium !== undefined ? req.body.is_premium : false,
      // Formater correctement les données
      ingredients: typeof req.body.ingredients === 'string' 
        ? JSON.parse(req.body.ingredients) 
        : (req.body.ingredients || []),
      steps: typeof req.body.steps === 'string'
        ? JSON.parse(req.body.steps)
        : (req.body.steps || [])
    };
    
    const newRecipe = await recipeDataMapper.createRecipe(recipeData);
    
    // Invalider les caches pertinents
    cacheService.invalidateByPrefix('recipes_list');
    
    return res.status(201).json({
      status: 'success',
      data: newRecipe,
      message: 'Recette créée avec succès'
    });
  } catch (err) {
    console.error('Erreur dans createRecipeAdmin:', err);
    throw err;
  }
},

/**
 * Mettre à jour une recette (version admin)
 */
updateRecipeAdmin: async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id, 10);
    
    if (isNaN(recipeId)) {
      throw new ApiError(400, 'ID de recette invalide');
    }
    
    // Vérifier que la recette existe
    const recipe = await recipeDataMapper.findOneRecipe(recipeId);
    if (!recipe) {
      throw new ApiError(404, 'Recette non trouvée');
    }
    
    // Formater les données JSON si nécessaire
    const updateData = { ...req.body };
    if (updateData.ingredients && typeof updateData.ingredients === 'string') {
      updateData.ingredients = JSON.parse(updateData.ingredients);
    }
    if (updateData.steps && typeof updateData.steps === 'string') {
      updateData.steps = JSON.parse(updateData.steps);
    }
    
    const updatedRecipe = await recipeDataMapper.updateRecipe(recipeId, updateData);
    
    // Invalider le cache pour cette recette
    cacheService.del(`recipe_${recipeId}_admin`);
    cacheService.del(`recipe_${recipeId}_premium`);
    cacheService.del(`recipe_${recipeId}_basic`);
    cacheService.del(`recipe_${recipeId}_none`);
    
    // Invalider également les listes
    cacheService.invalidateByPrefix('recipes_list');
    
    return res.status(200).json({
      status: 'success',
      data: updatedRecipe,
      message: 'Recette mise à jour avec succès'
    });
  } catch (err) {
    console.error(`Erreur dans updateRecipeAdmin pour la recette #${req.params.id}:`, err);
    throw err;
  }
},

/**
 * Supprimer une recette (version admin)
 */
deleteRecipeAdmin: async (req, res) => {
  try {
    const recipeId = parseInt(req.params.id, 10);
    
    if (isNaN(recipeId)) {
      throw new ApiError(400, 'ID de recette invalide');
    }
    
    // Vérifier que la recette existe
    const recipe = await recipeDataMapper.findOneRecipe(recipeId);
    if (!recipe) {
      throw new ApiError(404, 'Recette non trouvée');
    }
    
    // L'administrateur peut supprimer n'importe quelle recette
    await recipeDataMapper.deleteRecipe(recipeId);
    
    // Invalider tous les caches relatifs à cette recette
    cacheService.del(`recipe_${recipeId}_admin`);
    cacheService.del(`recipe_${recipeId}_premium`);
    cacheService.del(`recipe_${recipeId}_basic`);
    cacheService.del(`recipe_${recipeId}_none`);
    
    // Invalider également les listes
    cacheService.invalidateByPrefix('recipes_list');
    
    return res.status(204).end();
  } catch (err) {
    console.error(`Erreur dans deleteRecipeAdmin pour la recette #${req.params.id}:`, err);
    throw err;
  }
},

/**
 * Actions en lot sur les recettes (version admin)
 */
bulkActionAdmin: async (req, res) => {
  try {
    const { action, recipeIds } = req.body;
    
    if (!action || !recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      throw new ApiError(400, 'Action et liste d\'IDs de recettes requises');
    }
    
    let result;
    
    switch (action) {
      case 'publish':
        result = await recipeDataMapper.bulkUpdateStatus(recipeIds, 'published');
        break;
      case 'archive':
        result = await recipeDataMapper.bulkUpdateStatus(recipeIds, 'archived');
        break;
      case 'makePremium':
        result = await recipeDataMapper.bulkUpdatePremium(recipeIds, true);
        break;
      case 'makeStandard':
        result = await recipeDataMapper.bulkUpdatePremium(recipeIds, false);
        break;
      case 'delete':
        result = await recipeDataMapper.bulkDelete(recipeIds);
        break;
      default:
        throw new ApiError(400, `Action non reconnue: ${action}`);
    }
    
    // Invalider tous les caches concernés
    cacheService.invalidateByPrefix('recipes_list');
    for (const id of recipeIds) {
      cacheService.invalidateByPrefix(`recipe_${id}`);
    }
    
    return res.status(200).json({
      status: 'success',
      message: `Action "${action}" effectuée sur ${result.affected || result.length || 0} recette(s)`,
      data: result
    });
  } catch (err) {
    console.error(`Erreur dans bulkActionAdmin:`, err);
    throw err;
  }
},
  
  getSuggestions: async (req, res) => {
    try {
      const userId = req.user.id;
      // On pourrait récupérer des préférences supplémentaires depuis la requête
      const preferences = {
        current_season: req.query.season || getCurrentSeason(),
        household_members: req.user.household_members || {},
        dietary_restrictions: req.query.restrictions ? req.query.restrictions.split(',') : []
      };
      
      // Clé de cache pour les suggestions
      const cacheKey = `suggestions_${userId}_${preferences.current_season}`;
      
      // Utiliser le service de cache
      const suggestions = await cacheService.getCachedData(
        cacheKey,
        async () => {
          logger.info(`Cache miss pour ${cacheKey} - Chargement depuis la BDD`);
          return await recipeDataMapper.getSuggestions(userId, preferences);
        },
        // TTL plus court pour les suggestions (15 minutes)
        15 * 60
      );
      
      return res.status(200).json({
        status: 'success',
        data: suggestions
      });
    } catch (err) {
      console.error('Erreur lors de la récupération des suggestions de recettes:', err);
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