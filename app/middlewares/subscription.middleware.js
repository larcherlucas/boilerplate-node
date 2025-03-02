import accountDataMapper from '../datamappers/account.js';
import recipeDataMapper from '../datamappers/recipe.js';
import ApiError from '../erros/api.error.js';

/**
 * Middleware pour vérifier si l'utilisateur a un abonnement actif
 */
export const checkActiveSubscription = async (req, res, next) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentification requise');
    }
    
    const subscription = await checkSubscriptionStatus(req.user.id);
    
    if (!subscription.active) {
      throw new ApiError(403, 'Cette fonctionnalité nécessite un abonnement actif');
    }
    
    // Ajouter les infos d'abonnement à la requête
    req.subscription = subscription;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware pour détecter le niveau d'accès de l'utilisateur
 * sans bloquer la requête
 */
export const detectAccessLevel = async (req, res, next) => {
  try {
    // Par défaut: 'none'
    req.accessLevel = 'none';
    
    if (req.user) {
      const subscription = await checkSubscriptionStatus(req.user.id);
      req.accessLevel = subscription.active ? subscription.type : 'none';
      req.subscription = subscription;
    }
    
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware pour vérifier l'accès à une recette spécifique
 */
export const checkRecipeAccess = async (req, res, next) => {
  try {
    const recipeId = parseInt(req.params.id, 10);
    
    if (isNaN(recipeId)) {
      throw new ApiError(400, 'ID de recette invalide');
    }
    
    const recipe = await recipeDataMapper.findOneRecipe(recipeId);
    
    if (!recipe) {
      throw new ApiError(404, 'Recette non trouvée');
    }
    
    // Si recette non premium, autoriser l'accès
    if (!recipe.is_premium) {
      return next();
    }
    
    // Pour les recettes premium, vérifier l'abonnement
    if (req.user) {
      const subscription = await checkSubscriptionStatus(req.user.id);
      if (subscription.active) {
        return next();
      }
    }
    
    throw new ApiError(403, 'Cette recette nécessite un abonnement premium');
  } catch (error) {
    next(error);
  }
};

/**
 * Vérifie le statut d'abonnement d'un utilisateur
 * @param {number} userId - ID de l'utilisateur
 * @returns {object} - Informations sur l'abonnement
 */
export const checkSubscriptionStatus = async (userId) => {
  const user = await accountDataMapper.findOneAccount(userId);
  
  if (!user) {
    return { active: false, type: 'none' };
  }
  
  // Vérifier si l'abonnement est actif
  const isActive = user.subscription_status === 'active' && 
                   (!user.subscription_end_date || new Date(user.subscription_end_date) > new Date());
  
  const subscriptionType = isActive ? user.subscription_type : 'none';
  
  return {
    active: isActive,
    type: subscriptionType,
    status: user.subscription_status,
    expiryDate: user.subscription_end_date
  };
};

export default {
  checkActiveSubscription,
  detectAccessLevel,
  checkRecipeAccess,
  checkSubscriptionStatus
};