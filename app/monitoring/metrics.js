import client from 'prom-client';
import logger from '../utils/logger.js';

// Création du registre prometheus
const register = new client.Registry();

// Ajouter les métriques par défaut
client.collectDefaultMetrics({ register });

// Métriques spécifiques pour la sécurité
const metrics = {
  // Compteur pour les limites de taux dépassées
  rateLimitExceeded: new client.Counter({
    name: 'rate_limit_exceeded_total',
    help: 'Nombre total de requêtes ayant dépassé la limite de taux',
    labelNames: ['path', 'method'],
    registers: [register]
  }),

  // Compteur pour les limites de vitesse atteintes
  speedLimitReached: new client.Counter({
    name: 'speed_limit_reached_total',
    help: 'Nombre total de requêtes ayant atteint la limite de vitesse',
    labelNames: ['path', 'method'],
    registers: [register]
  }),

  // Compteur pour les violations CORS
  corsViolations: new client.Counter({
    name: 'cors_violations_total',
    help: 'Nombre total de tentatives de violation CORS',
    labelNames: ['blockedOrigin'],
    registers: [register]
  }),

  // Histogramme pour les temps de réponse
  requestDuration: new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Durée des requêtes HTTP en secondes',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10],
    registers: [register]
  }),

  // Compteur pour les codes d'état HTTP
  httpResponseCodes: new client.Counter({
    name: 'http_responses_total',
    help: 'Nombre total de réponses HTTP',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
  }),

  // Jauge pour les connexions actives
  activeConnections: new client.Gauge({
    name: 'active_connections',
    help: 'Nombre de connexions actives',
    registers: [register]
  })
};

/**
 * Middleware pour collecter des métriques sur les requêtes HTTP
 * @param {Object} req - Objet requête Express
 * @param {Object} res - Objet réponse Express
 * @param {Function} next - Fonction next Express
 */
const metricsMiddleware = (req, res, next) => {
  // Incrémenter les connexions actives
  metrics.activeConnections.inc();
  
  // Capturer le temps de début
  const start = Date.now();
  
  // Capturer le statut original pour tracer les métriques
  const originalEnd = res.end;
  
  // Remplacer la méthode end pour capturer les métriques au moment de la réponse
  res.end = function() {
    // Calculer la durée
    const duration = (Date.now() - start) / 1000;
    
    // Obtenir la route normalisée (remplacer les IDs par des paramètres)
    const route = req.route ? req.route.path : req.path || 'unknown';
    const normalizedRoute = route.replace(/\/:[^/]+/g, '/:param');
    
    // Enregistrer la durée
    metrics.requestDuration.observe(
      { method: req.method, route: normalizedRoute, status_code: res.statusCode },
      duration
    );
    
    // Incrémenter le compteur de codes de réponse
    metrics.httpResponseCodes.inc({
      method: req.method,
      route: normalizedRoute,
      status_code: res.statusCode
    });
    
    // Décrémenter les connexions actives
    metrics.activeConnections.dec();
    
    // Logger la requête au niveau HTTP
    logger.http(`${req.method} ${req.originalUrl}`, {
      statusCode: res.statusCode,
      responseTime: duration,
      ip: req.ip
    });
    
    // Appeler la méthode originale
    return originalEnd.apply(this, arguments);
  };
  
  next();
};

/**
 * Fonction qui renvoie le middleware pour exposer les métriques
 * @returns {Function} Middleware Express pour exposer les métriques
 */
const metricsEndpoint = (req, res) => {
  res.set('Content-Type', register.contentType);
  register.metrics().then(data => res.end(data));
};

// Exporte les métriques et middlewares dans un objet
const metricsModule = {
  metrics,
  metricsMiddleware,
  metricsEndpoint,
  register
};

export default metricsModule;