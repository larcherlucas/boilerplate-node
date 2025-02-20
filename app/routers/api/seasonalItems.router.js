import express from 'express';
import { jwtMiddleware, checkRole } from '../../middlewares/jwt.middleware.js';
import seasonalItemsController from '../../controllers/seasonalItems.js';

const router = express.Router();

// Routes publiques
router.get('/seasonal-items', seasonalItemsController.getAll);
router.get('/seasonal-items/:id(\\d+)', seasonalItemsController.getById);
router.get('/seasonal-items/type/:type', seasonalItemsController.getByType);

// Routes protégées nécessitant des droits admin
router.post('/seasonal-items', jwtMiddleware, checkRole('admin'), seasonalItemsController.create);
router.put('/seasonal-items/:id(\\d+)', jwtMiddleware, checkRole('admin'), seasonalItemsController.update);
router.delete('/seasonal-items/:id(\\d+)', jwtMiddleware, checkRole('admin'), seasonalItemsController.delete);

export default router;