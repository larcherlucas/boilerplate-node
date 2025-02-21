import express from 'express';
import paymentController from '../../controllers/payment.js';
import cw from '../../middlewares/controller.wrapper.js';
import authMiddleware from '../../middlewares/auth.middleware.js';
import { 
  paymentRateLimiter, 
  subscriptionMiddleware,
  validateWebhook,
  paymentAdminMiddleware
} from '../../middlewares/payment.js';
import { paymentSchema } from '../../validations/schemas/payment.js';
import validate from '../../validations/validator.js';

const router = express.Router();

// Routes publiques (webhook Stripe)
router.post('/webhook', validateWebhook, cw(paymentController.handleWebhook));

// Routes protégées (nécessitent une authentification)
router.post(
  '/subscription',
  authMiddleware,
  paymentRateLimiter,
  validate(paymentSchema),
  cw(paymentController.createOrUpdateSubscription)
);

router.post(
  '/subscription/cancel',
  authMiddleware,
  paymentRateLimiter,
  cw(paymentController.cancelSubscription)
);

router.get(
  '/payment-history',
  authMiddleware,
  subscriptionMiddleware,
  cw(paymentController.getPaymentHistory)
);

// Routes admin
router.get(
  '/admin/payments',
  authMiddleware,
  paymentAdminMiddleware,
  cw(paymentController.getAllPayments)
);

export default router;