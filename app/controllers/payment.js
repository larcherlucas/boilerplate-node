import Stripe from 'stripe';
import accountDataMapper from '../datamappers/account.js';
import ApiError from '../erros/api.error.js';
import logger from '../utils/logger.js';
import paymentDataMapper from '../datamappers/payment.js';
import formatUserResponse from '../utils/formatUserResponse.js';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const paymentController = {

  async createOrUpdateSubscription(req, res) {
    try {
      const { priceId, couponCode } = req.body;
      const userId = req.user.id;

      const user = await accountDataMapper.findOneAccount(userId);
      if (!user) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      let stripeCustomerId = user.stripe_customer_id;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { userId: user.id }
        });
        stripeCustomerId = customer.id;
        await accountDataMapper.updateAccount(userId, { stripe_customer_id: stripeCustomerId });
      }

      const subscriptionParams = {
        customer: stripeCustomerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent']
      };

      if (couponCode) {
        const promotions = await stripe.promotionCodes.list({ code: couponCode });
        if (promotions.data.length > 0) {
          subscriptionParams.discount = { coupon: promotions.data[0].coupon.id };
        }
      }

      const existingSubscriptions = await stripe.subscriptions.list({ customer: stripeCustomerId, status: 'active' });
      let subscription;

      if (existingSubscriptions.data.length > 0) {
        subscription = await stripe.subscriptions.update(existingSubscriptions.data[0].id, {
          items: [{ price: priceId }],
          proration_behavior: 'create_prorations'
        });
      } else {
        subscription = await stripe.subscriptions.create(subscriptionParams);
      }

      await paymentDataMapper.createPaymentRecord({
        user_id: userId,
        stripe_payment_id: subscription.latest_invoice.payment_intent.id,
        stripe_invoice_id: subscription.latest_invoice.id,
        amount: subscription.latest_invoice.amount_due,
        currency: subscription.latest_invoice.currency,
        status: 'pending',
        payment_method: subscription.default_payment_method || null,
        payment_type: 'subscription'
      });

      await paymentDataMapper.updateSubscriptionDetails(userId, {
        subscription_type: subscription.plan?.nickname || 'premium',
        subscription_status: subscription.status,
        subscription_start_date: new Date(subscription.current_period_start * 1000),
        subscription_end_date: new Date(subscription.current_period_end * 1000)
      });

      const updatedUser = await accountDataMapper.findOneAccount(userId);
      return res.status(200).json({
        status: 'success',
        data: {
          user: formatUserResponse(updatedUser),
          payment: {
            clientSecret: subscription.latest_invoice.payment_intent.client_secret,
            subscriptionId: subscription.id
          }
        }
      });
    } catch (error) {
      logger.error('Erreur lors de la création/mise à jour de l\'abonnement:', error);
      return res.status(500).json({ error: 'Erreur lors du traitement de l\'abonnement' });
    }
  },

  /**
   * Annule un abonnement Stripe
   */
  async cancelSubscription(req, res) {
    try {
      const userId = req.user.id;
      const user = await accountDataMapper.findOneAccount(userId);

      if (!user || !user.stripe_customer_id) {
        return res.status(404).json({ error: 'Abonnement non trouvé' });
      }

      const subscriptions = await stripe.subscriptions.list({ customer: user.stripe_customer_id, status: 'active' });
      if (subscriptions.data.length === 0) {
        return res.status(404).json({ error: 'Aucun abonnement actif trouvé' });
      }

      const subscription = subscriptions.data[0];
      await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: true });
      await accountDataMapper.updateAccount(userId, {
        subscription_status: 'cancelled',
        subscription_end_date: new Date(subscription.current_period_end * 1000)
      });

      return res.status(200).json({ status: 'success', message: 'Abonnement annulé avec succès' });
    } catch (error) {
      logger.error('Erreur lors de l\'annulation de l\'abonnement:', error);
      return res.status(500).json({ error: 'Erreur lors de l\'annulation de l\'abonnement' });
    }
  }
};

export default paymentController;