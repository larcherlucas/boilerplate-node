import express from 'express';
import cw from '../../middlewares/controller.wrapper.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import checkRole from '../../middlewares/role.middleware.js';
import subscriptionController from '../../controllers/subscription.js';

const router = express.Router();

// Routes publiques pour récupérer les plans d'abonnement disponibles
router.get('/subscription-plans', cw(subscriptionController.getAllPlans));

// Route pour vérifier le statut d'abonnement de l'utilisateur connecté
router.get('/subscription/status', authMiddleware, cw(subscriptionController.checkStatus));

// Routes admin pour gérer les plans d'abonnement (création, modification, suppression)
router.post('/subscription-plans', 
  authMiddleware, 
  checkRole('admin'), 
  cw(subscriptionController.createPlan)
);

router.put('/subscription-plans/:id', 
  authMiddleware, 
  checkRole('admin'), 
  cw(subscriptionController.updatePlan)
);

router.delete('/subscription-plans/:id', 
  authMiddleware, 
  checkRole('admin'), 
  cw(subscriptionController.deletePlan)
);

export default router;