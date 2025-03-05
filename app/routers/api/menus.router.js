import express from 'express';
import menusController from '../../controllers/menus.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import { detectAccessLevel } from '../../middlewares/subscription.middleware.js';

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authMiddleware);

// Ajouter le middleware de détection du niveau d'accès
router.use(detectAccessLevel);

router.get('/weekly-menus', menusController.getWeeklyMenus);
router.get('/active-weekly-menu', menusController.getActiveWeeklyMenu);
router.get('/weekly-menus/:id(\\d+)', menusController.getWeeklyMenuById);
router.post('/weekly-menus', menusController.createWeeklyMenu);
router.post('/weekly-menus/generate', menusController.generateWeeklyMenu);
router.put('/weekly-menus/:id(\\d+)', menusController.updateWeeklyMenu);
router.delete('/weekly-menus/:id(\\d+)', menusController.deleteWeeklyMenu);

export default router;