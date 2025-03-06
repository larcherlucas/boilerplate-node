import NodeCache from 'node-cache';
import logger from '../utils/logger.js';

/**
 * Service de cache pour stocker temporairement les résultats des requêtes
 * afin d'améliorer les performances et réduire la charge sur la base de données
 */
class CacheService {
  constructor() {
    // Configuration du cache avec une durée de vie par défaut de 15 minutes
    this.cache = new NodeCache({
      stdTTL: 15 * 60, // 15 minutes en secondes
      checkperiod: 60, // Vérification des expirations toutes les 60 secondes
      useClones: false // Pour les performances, ne pas cloner les objets stockés
    });
    
    // Statistiques du cache
    this.stats = {
      hits: 0,
      misses: 0,
      keys: () => this.cache.keys().length
    };
    
    // Écouter les événements d'expiration
    this.cache.on('expired', (key, value) => {
      logger.info(`Cache: Clé expirée: ${key}`);
    });
    
    logger.info('Service de cache initialisé');
  }

  /**
   * Récupérer une valeur du cache
   * @param {string} key - Clé du cache
   * @returns {any} - Valeur stockée ou undefined si non trouvée
   */
  get(key) {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.stats.hits++;
      return value;
    }
    this.stats.misses++;
    return undefined;
  }

  /**
   * Stocker une valeur dans le cache
   * @param {string} key - Clé du cache
   * @param {any} value - Valeur à stocker
   * @param {number} ttl - Durée de vie en secondes (optionnel)
   * @returns {boolean} - true si stocké avec succès
   */
  set(key, value, ttl) {
    return this.cache.set(key, value, ttl);
  }

  /**
   * Supprimer une entrée du cache
   * @param {string} key - Clé à supprimer
   * @returns {number} - Nombre d'éléments supprimés (0 ou 1)
   */
  del(key) {
    return this.cache.del(key);
  }

  /**
   * Vider entièrement le cache
   * @returns {void}
   */
  flush() {
    this.cache.flushAll();
    logger.info('Cache entièrement vidé');
  }

  /**
   * Récupérer des statistiques du cache
   * @returns {Object} - Statistiques d'utilisation du cache
   */
  getStats() {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: this.stats.keys(),
      hitRatio: this.stats.hits / (this.stats.hits + this.stats.misses) || 0
    };
  }

  /**
   * Utilitaire pour récupérer des données du cache ou les charger si absentes
   * @param {string} key - Clé de cache
   * @param {Function} fetchFunction - Fonction asynchrone pour charger les données
   * @param {number} ttl - Durée de vie en secondes (optionnel)
   * @returns {Promise<any>} - Données du cache ou nouvellement chargées
   */
  async getCachedData(key, fetchFunction, ttl) {
    const cachedData = this.get(key);
    
    if (cachedData !== undefined) {
      logger.debug(`Cache hit pour: ${key}`);
      return cachedData;
    }
    
    logger.debug(`Cache miss pour: ${key}`);
    try {
      const freshData = await fetchFunction();
      this.set(key, freshData, ttl);
      return freshData;
    } catch (error) {
      logger.error(`Erreur lors du chargement des données pour la clé ${key}:`, error);
      throw error;
    }
  }
  
  /**
   * Invalider toutes les clés qui correspondent à un préfixe
   * @param {string} prefix - Préfixe des clés à invalider
   * @returns {number} - Nombre de clés invalidées
   */
  invalidateByPrefix(prefix) {
    const keys = this.cache.keys();
    let count = 0;
    
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        this.cache.del(key);
        count++;
      }
    });
    
    logger.info(`Cache: ${count} clés invalidées avec le préfixe ${prefix}`);
    return count;
  }
}

// Créer une instance singleton du service de cache
const cacheService = new CacheService();
export default cacheService;