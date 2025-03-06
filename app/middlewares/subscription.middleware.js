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
// subscription.middleware.js
export const detectAccessLevel = async (req, res, next) => {
  try {
    // L'utilisateur est déjà authentifié grâce au middleware auth
    const user = req.user;
    
    if (!user) {
      req.subscription = { active: false, type: 'none' };
      return next();
    }
    
    const subscriptionStatus = await checkSubscriptionStatus(user.id);
    
    // DEBUG: Logguer le statut d'abonnement
    console.log(`Statut d'abonnement pour l'utilisateur ${user.id}:`, {
      active: subscriptionStatus.active,
      type: subscriptionStatus.type,
      role: user.role
    });
    
    req.subscription = {
      active: subscriptionStatus.active || 
              user.role === 'premium' || 
              user.role === 'admin',
      type: subscriptionStatus.type
    };
    
    next();
  } catch (error) {
    console.error('Erreur lors de la détection du niveau d\'accès:', error);
    req.subscription = { active: false, type: 'none' };
    next();
  }
};

/**
 * Middleware pour vérifier l'accès à une recette spécifique
 */
export const checkRecipeAccess = async (req, res, next) => {
  try {
    const recipeId = parseInt(req.params.id, 10);
    
    console.log('Contexte de la requête:', {
      recipeId,
      user: req.user,
      subscription: req.subscription,
      headers: req.headers
    });
    
    const recipe = await recipeDataMapper.findOneRecipe(recipeId);
    
    if (!recipe) {
      return res.status(404).json({ message: 'Recette non trouvée' });
    }
    
    // Log détaillé pour comprendre le contexte
    console.log('Vérification de l\'accès à la recette:', {
      recipeId,
      isPremium: recipe.is_premium,
      userAuthenticated: !!req.user,
      userRole: req.user?.role,
      subscriptionStatus: req.user?.subscription_status,
      subscriptionActive: req.subscription?.active
    });
    
    // Si recette non premium, autoriser l'accès
    if (!recipe.is_premium) {
      return next();
    }
    
    // Vérifier si l'utilisateur a accès aux recettes premium
    const isAdmin = req.user?.role === 'admin';
    const isPremium = req.user?.role === 'premium';
    const hasActiveSubscription = 
      req.subscription?.active || 
      req.user?.subscription_status === 'active';
    
    console.log('Conditions d\'accès :', {
      isAdmin,
      isPremium,
      hasActiveSubscription
    });
    
    if (isAdmin || isPremium || hasActiveSubscription) {
      return next();
    }
    
    return res.status(403).json({ 
      message: 'Cette recette nécessite un abonnement premium',
      requiresSubscription: true,
      recipePartial: {
        id: recipe.id,
        title: recipe.title,
        image_url: recipe.image_url,
        is_premium: true
      }
    });
  } catch (error) {
    console.error('Erreur dans checkRecipeAccess:', error);
    return res.status(500).json({ message: 'Erreur de serveur' });
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