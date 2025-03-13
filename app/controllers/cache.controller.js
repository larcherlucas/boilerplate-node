// src/controllers/cache.controller.js
import ApiError from '../erros/api.error.js';
import logger from '../utils/logger.js';
import cacheService from '../services/cache.service.js';

/**
 * Controller pour la gestion du cache, permettant d'accéder aux statistiques
 * et de vider le cache côté serveur
 */
const cacheController = {
  /**
   * Récupérer les statistiques du cache
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  getStats: async (req, res) => {
    try {
      const stats = cacheService.getStats();
      
      logger.info('Statistiques du cache récupérées', stats);
      
      return res.status(200).json({
        status: 'success',
        data: {
          hits: stats.hits,
          misses: stats.misses,
          keys: stats.keys,
          hitRatio: stats.hitRatio
        }
      });
    } catch (err) {
      logger.error('Erreur lors de la récupération des statistiques du cache:', err);
      throw new ApiError(500, 'Erreur lors de la récupération des statistiques du cache');
    }
  },
  
  /**
   * Récupérer la liste des clés en cache
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  getKeys: async (req, res) => {
    try {
      const keys = cacheService.cache.keys();
      
      // Obtenir quelques détails supplémentaires sur chaque clé
      const keysWithDetails = keys.map(key => {
        const ttl = cacheService.cache.getTtl(key);
        
        // Déterminer le type de contenu en cache
        let type = 'Autre';
        if (key.startsWith('recipe_')) type = 'Recette';
        else if (key.startsWith('recipes_list')) type = 'Liste';
        else if (key.startsWith('suggestions_')) type = 'Suggestion';
        
        return {
          key,
          type,
          expiration: ttl ? new Date(ttl) : null
        };
      });
      
      logger.info(`${keys.length} clés récupérées du cache`);
      
      return res.status(200).json({
        status: 'success',
        data: keysWithDetails
      });
    } catch (err) {
      logger.error('Erreur lors de la récupération des clés du cache:', err);
      throw new ApiError(500, 'Erreur lors de la récupération des clés du cache');
    }
  },
  
  /**
   * Vider le cache par type (préfixe)
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  clearByType: async (req, res) => {
    try {
      const { type } = req.body;
      
      if (!type) {
        throw new ApiError(400, 'Type de cache requis');
      }
      
      // Vérifier si le type est valide
      const validTypes = ['recipe', 'recipes_list', 'suggestions', 'all'];
      if (!validTypes.includes(type) && !type.startsWith('recipe_')) {
        throw new ApiError(400, `Type de cache invalide. Types valides: ${validTypes.join(', ')} ou préfixe recipe_`);
      }
      
      let count = 0;
      
      if (type === 'all') {
        // Vider tout le cache
        cacheService.flush();
        logger.info('Cache entièrement vidé');
        
        return res.status(200).json({
          status: 'success',
          message: 'Cache entièrement vidé'
        });
      } else {
        // Vider par préfixe
        count = cacheService.invalidateByPrefix(type);
        logger.info(`${count} entrées de cache vidées pour le type ${type}`);
      }
      
      return res.status(200).json({
        status: 'success',
        data: { clearedEntries: count },
        message: `${count} entrées de cache vidées pour le type ${type}`
      });
    } catch (err) {
      logger.error('Erreur lors du vidage du cache par type:', err);
      throw new ApiError(500, 'Erreur lors du vidage du cache');
    }
  },
  
  /**
   * Vider tout le cache
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  clearAll: async (req, res) => {
    try {
      cacheService.flush();
      logger.info('Cache entièrement vidé');
      
      return res.status(200).json({
        status: 'success',
        message: 'Cache entièrement vidé'
      });
    } catch (err) {
      logger.error('Erreur lors du vidage complet du cache:', err);
      throw new ApiError(500, 'Erreur lors du vidage du cache');
    }
  },
  
  /**
   * Supprimer une entrée spécifique du cache
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  deleteKey: async (req, res) => {
    try {
      const { key } = req.params;
      
      if (!key) {
        throw new ApiError(400, 'Clé de cache requise');
      }
      
      const deleted = cacheService.del(key);
      
      if (deleted) {
        logger.info(`Entrée de cache supprimée: ${key}`);
        return res.status(200).json({
          status: 'success',
          message: `Entrée "${key}" supprimée du cache`
        });
      } else {
        logger.info(`Entrée de cache non trouvée: ${key}`);
        return res.status(404).json({
          status: 'error',
          error: `Entrée "${key}" non trouvée dans le cache`
        });
      }
    } catch (err) {
      logger.error('Erreur lors de la suppression d\'une entrée du cache:', err);
      throw new ApiError(500, 'Erreur lors de la suppression de l\'entrée du cache');
    }
  },
  
  /**
   * Mettre à jour la durée de vie par défaut du cache
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  updateTTL: async (req, res) => {
    try {
      const { duration } = req.body;
      
      if (!duration || typeof duration !== 'number' || duration <= 0) {
        throw new ApiError(400, 'Durée de vie invalide. Veuillez fournir un nombre positif de minutes.');
      }
      
      // Convertir les minutes en secondes pour le cache
      const ttlSeconds = duration * 60;
      
      // Mettre à jour la durée de vie par défaut
      cacheService.cache.options.stdTTL = ttlSeconds;
      
      logger.info(`Durée de vie du cache mise à jour à ${duration} minutes (${ttlSeconds} secondes)`);
      
      return res.status(200).json({
        status: 'success',
        message: `Durée de vie du cache mise à jour à ${duration} minutes`
      });
    } catch (err) {
      logger.error('Erreur lors de la mise à jour de la durée de vie du cache:', err);
      throw new ApiError(500, 'Erreur lors de la mise à jour de la durée de vie du cache');
    }
  },
  
  /**
   * Activer ou désactiver le cache
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   */
  toggleCache: async (req, res) => {
    try {
      const { enabled } = req.body;
      
      if (typeof enabled !== 'boolean') {
        throw new ApiError(400, 'Le paramètre "enabled" doit être un booléen');
      }
      
      // Conserver l'état actuel du cache pour le restaurer si nécessaire
      if (enabled) {
        // Activer le cache (restaurer l'état précédent si disponible)
        if (cacheService.previousOptions) {
          cacheService.cache.options = { ...cacheService.previousOptions };
          cacheService.previousOptions = null;
        }
        logger.info('Cache activé');
      } else {
        // Désactiver le cache (sauvegarder l'état actuel)
        cacheService.previousOptions = { ...cacheService.cache.options };
        
        // Définir TTL à 0 pour que toutes les entrées expirent immédiatement
        cacheService.cache.options.stdTTL = 0;
        cacheService.cache.options.checkperiod = 1; // Vérifier toutes les secondes
        
        // Vider le cache existant
        cacheService.flush();
        logger.info('Cache désactivé');
      }
      
      return res.status(200).json({
        status: 'success',
        message: `Cache ${enabled ? 'activé' : 'désactivé'}`
      });
    } catch (err) {
      logger.error(`Erreur lors de ${req.body.enabled ? 'l\'activation' : 'la désactivation'} du cache:`, err);
      throw new ApiError(500, `Erreur lors de ${req.body.enabled ? 'l\'activation' : 'la désactivation'} du cache`);
    }
  }
};

export default cacheController;