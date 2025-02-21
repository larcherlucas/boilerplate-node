// Import dependencies
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
import { config } from 'dotenv';
import bodySanitizer from './app/middlewares/bodySanitizer.js';
import createDoc from './app/services/api.doc.js';
import router from './app/routers/router.js';

// Importer le middleware de sécurité
import SecurityMiddleware from './app/middlewares/security.js';

// Importer les métriques et le logger
import metricsModule from './app/monitoring/metrics.js';
import logger from './app/utils/logger.js';

const { metricsMiddleware, metricsEndpoint } = metricsModule;

config({ path: '.env' });

const app = express();

// Configuration des chemins
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de métriques doit être ajouté en premier pour mesurer toutes les requêtes
app.use(metricsMiddleware);

// Endpoint pour exposer les métriques Prometheus 
app.get('/metrics', metricsEndpoint);

// Récupérer les middlewares de sécurité configurés
const security = SecurityMiddleware.getMiddleware();

// Application de Helmet en premier pour configurer les en-têtes HTTP de sécurité
app.use(security.helmet);

// Appliquer les limiteurs de débit globaux 
app.use(security.rateLimiter);
app.use(security.speedLimiter);

// Configurer CORS avec les options sécurisées
app.use(cors(security.corsOptions));

// Setup body parser avec des limites explicites
app.use(bodyParser.json({ 
  limit: '2mb', 
  verify: (req, res, buf) => {
    // Vérification optionnelle de la taille du contenu
    if (buf.length > 2 * 1024 * 1024) {
      throw new Error('Payload too large');
    }
  }
}));
app.use(bodyParser.urlencoded({ 
  limit: '2mb',
  extended: true 
}));

// Sanitisation du corps de la requête
app.use(bodySanitizer);

// Documentation API
createDoc(app);

// Routes de l'application
app.use(router);

// Middleware de gestion d'erreurs global en dernier
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  // Ne pas exposer les détails des erreurs en production
  const response = {
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Une erreur est survenue' 
      : err.message
  };
  
  // Journalisation des erreurs
  if (statusCode >= 500) {
    logger.error('Server error', {
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method
    });
  }
  
  res.status(statusCode).json(response);
});

// Vérifier que le dossier de logs existe
const logDirectory = path.join('/tmp', 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

export default app;