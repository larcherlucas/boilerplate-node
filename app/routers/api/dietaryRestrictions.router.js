import express from 'express';
import dietaryRestrictionsController from '../../controllers/dietaryRestrictions.js';

const router = express.Router();

router.get('/dietary-restrictions', dietaryRestrictionsController.getAll);
// router.post('/dietary-restrictions', dietaryRestrictionsController.create); a supprimer
// router.put('/dietary-restrictions/:type', dietaryRestrictionsController.update);
// router.delete('/dietary-restrictions/:type', dietaryRestrictionsController.delete);
// router.delete('/dietary-restrictions', dietaryRestrictionsController.deleteAll);

export default router;