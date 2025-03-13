// app/routes/cache.routes.js
import express from 'express';
import cacheController from '../../controllers/cache.controller.js';
import jwtMiddleware from '../../middlewares/jwt.middleware.js';
import adminMiddleware from '../../middlewares/admin.middleware.js';
import controllerWrapper from '../../middlewares/controller.wrapper.js';

const router = express.Router();

// Toutes les routes de cache nécessitent une authentification et des droits admin
router.use(jwtMiddleware);
router.use(adminMiddleware);

// Routes pour la gestion du cache
router.get('/stats', controllerWrapper(cacheController.getStats));
router.get('/keys', controllerWrapper(cacheController.getKeys));
router.post('/clear', controllerWrapper(cacheController.clearByType));
router.post('/clear-all', controllerWrapper(cacheController.clearAll));
router.delete('/keys/:key', controllerWrapper(cacheController.deleteKey));
router.patch('/ttl', controllerWrapper(cacheController.updateTTL));
router.patch('/toggle', controllerWrapper(cacheController.toggleCache));

export default router;