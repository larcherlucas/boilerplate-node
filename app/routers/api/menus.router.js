import express from 'express';
import menusController from '../../controllers/menus.js';

const router = express.Router();

router.get('/menus', menusController.getAll);
router.get('/menus/active', menusController.getActive);
router.get('/menus/:id(\\d+)', menusController.getById);
router.post('/menus', menusController.create);
router.put('/menus/:id(\\d+)', menusController.update);
router.delete('/menus/:id(\\d+)', menusController.delete);

export default router;