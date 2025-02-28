import express from 'express';
import menusController from '../../controllers/menus.js';

const router = express.Router();

router.get('/weekly-menus', menusController.getWeeklyMenus);
router.get('/weekly-menus/:id(\\d+)', menusController.getWeeklyMenuById);
router.post('/weekly-menus', menusController.createWeeklyMenu);
router.post('/weekly-menus/generate', menusController.generateWeeklyMenu);
router.put('/weekly-menus/:id(\\d+)', menusController.updateWeeklyMenu);
router.delete('/weekly-menus/:id(\\d+)', menusController.deleteWeeklyMenu);


export default router;