import rateLimit from 'express-rate-limit';
import ApiError from '../erros/api.error.js';
import accountDataMapper from '../datamappers/account.js';
import logger from '../utils/logger.js';

// Rate limiter pour les routes de paiement
export const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requêtes maximum par fenêtre
  message: 'Trop de tentatives de paiement, veuillez réessayer plus tard',
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware de vérification d'abonnement
export const subscriptionMiddleware = async (req, res, next) => {
  try {
    const user = await accountDataMapper.findOneAccount(req.user.id);
    
    if (!user) {
      throw new ApiError(404, 'Utilisateur non trouvé');
    }

    if (user.subscription_status !== 'active') {
      throw new ApiError(403, 'Abonnement inactif ou expiré');
    }

    // Vérifier si l'abonnement est expiré
    if (user.subscription_end_date && new Date(user.subscription_end_date) < new Date()) {
      await accountDataMapper.updateAccount(user.id, {
        subscription_status: 'expired'
      });
      throw new ApiError(403, 'Abonnement expiré');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Middleware de validation des webhooks Stripe
export const validateWebhook = (req, res, next) => {
  if (!req.rawBody) {
    logger.error('Webhook error: No raw body available');
    return res.status(400).send('Webhook Error: No raw body');
  }

  const signature = req.headers['stripe-signature'];
  if (!signature) {
    logger.error('Webhook error: No Stripe signature found');
    return res.status(400).send('Webhook Error: No Stripe signature');
  }

  next();
};

// Middleware de vérification des rôles pour les opérations de paiement
export const paymentAdminMiddleware = (req, res, next) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'Accès réservé aux administrateurs');
  }
  next();
};