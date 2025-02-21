import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import metricsModule from '../monitoring/metrics.js';
import logger from '../utils/logger.js';

/**
 * Class fournissant des middlewares de sécurité pour Express
 */
class SecurityMiddleware {
  /**
   * Configure les middlewares de sécurité avec des paramètres optimisés
   * @returns {Object} Les configurations des middlewares de sécurité
   */
  static configure() {
    // Valeurs par défaut sécurisées en cas d'absence de variables d'environnement
    const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
    const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || (15 * 60 * 1000), 10);
    const DELAY_AFTER = parseInt(process.env.SPEED_LIMIT_AFTER || '50', 10);
    
    return {
      // Configuration Helmet avec CSP renforcée
      helmet: helmet({
        contentSecurityPolicy: {
          useDefaults: true,
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", process.env.API_URL],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
          },
        },
        xssFilter: true,
        noSniff: true,
        hsts: {
          maxAge: 15552000,
          includeSubDomains: true,
          preload: true
        },
        crossOriginEmbedderPolicy: false,
        frameguard: { action: 'deny' }
      }),

      // Rate limiter amélioré
      rateLimiter: rateLimit({
        windowMs: WINDOW_MS,
        max: MAX_REQUESTS,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
          metrics.rateLimitExceeded.inc({
            path: req.path,
            method: req.method
          });
          logger.warn('Rate limit exceeded', { 
            ip: req.ip, 
            path: req.path, 
            userAgent: req.get('user-agent') 
          });
          res.status(429).json({
            error: 'TOO_MANY_REQUESTS',
            message: 'Trop de requêtes, veuillez réessayer plus tard',
            retryAfter: Math.ceil(WINDOW_MS / 1000 / 60)
          });
        },
        skip: (req) => {
          return req.path === '/health' || req.path === '/metrics';
        }
      }),

      // Speed limiter amélioré
      speedLimiter: slowDown({
        windowMs: WINDOW_MS,
        delayAfter: DELAY_AFTER,
        delayMs: (hits) => Math.min(100 * Math.pow(1.5, hits - DELAY_AFTER), 10000),
        handler: (req, res, next) => {
          metrics.speedLimitReached.inc({
            path: req.path,
            method: req.method
          });
          logger.warn('Speed limit applied', { 
            ip: req.ip, 
            path: req.path,
            delay: res.locals.slowDown.delay
          });
          next();
        }
      }),

      // CORS configuré
      cors: {
        origin: (origin, callback) => {
          const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
          if (process.env.NODE_ENV === 'development') {
            allowedOrigins.push('http://localhost:3000', 'http://localhost:5173');
          }
          
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            metrics.corsViolations.inc({
              blockedOrigin: origin
            });
            logger.warn('CORS violation attempt', { 
              origin,
              allowedOrigins
            });
            callback(new Error('Not allowed by CORS'));
          }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
        maxAge: 86400
      }
    };
  }

  /**
   * Récupère tous les middlewares configurés pour utilisation dans l'application
   * @returns {Object} Les middlewares de sécurité prêts à l'emploi
   */
  static getMiddleware() {
    const config = this.configure();
    return {
      helmet: config.helmet,
      rateLimiter: config.rateLimiter,
      speedLimiter: config.speedLimiter,
      corsOptions: config.cors
    };
  }
}

export default SecurityMiddleware;