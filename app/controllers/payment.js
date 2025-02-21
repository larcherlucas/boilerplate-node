import Stripe from 'stripe';
import accountDataMapper from '../datamappers/account.js';
import ApiError from '../erros/api.error.js';
import logger from '../utils/logger.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const paymentController = {
 /**
 * Crée ou met à jour un abonnement Stripe
 */
async createOrUpdateSubscription(req, res) {
    try {
      const { priceId, couponCode } = req.body;
      const userId = req.user.id;
  
      // Vérifier si l'utilisateur existe
      const user = await accountDataMapper.findOneAccount(userId);
      if (!user) {
        throw new ApiError(404, 'Utilisateur non trouvé');
      }
  
      let subscription;
      let stripeCustomerId = user.stripe_customer_id;
  
      // Créer un customer Stripe si n'existe pas
    if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: {
            userId: user.id
          }
        });
        stripeCustomerId = customer.id;
  
        // Mettre à jour l'ID client Stripe dans la base de données
        await accountDataMapper.updateAccount(userId, {
          stripe_customer_id: stripeCustomerId
        });
      }
  
      const subscriptionParams = {
        customer: stripeCustomerId,
        items: [{
          price: priceId
        }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent']
      };
  
      // Ajouter un coupon si fourni
      if (couponCode) {
        subscriptionParams.coupon = couponCode;
      }
  
      // Vérifier si l'utilisateur a déjà un abonnement actif
      const existingSubscriptions = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: 'active'
      });
  
      if (existingSubscriptions.data.length > 0) {
        // Mettre à jour l'abonnement existant
        subscription = await stripe.subscriptions.update(
          existingSubscriptions.data[0].id,
          {
            items: [{
              price: priceId
            }],
            proration_behavior: 'create_prorations'
          }
        );
      } else {
        // Créer un nouvel abonnement
        subscription = await stripe.subscriptions.create(subscriptionParams);
      }
  
      // Enregistrer le paiement dans la base de données
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

    // Mettre à jour le statut d'abonnement dans la base de données
    await paymentDataMapper.updateSubscriptionDetails(userId, {
        subscription_type: subscription.plan.nickname || 'premium',
        subscription_status: subscription.status,
        subscription_start_date: new Date(subscription.current_period_start * 1000),
        subscription_end_date: new Date(subscription.current_period_end * 1000)
      });
  
      return res.status(200).json({
        status: 'success',
        data: {
          clientSecret: subscription.latest_invoice.payment_intent.client_secret,
          subscriptionId: subscription.id
        }
      });
    } catch (error) {
      logger.error('Erreur lors de la création/mise à jour de l\'abonnement:', error);
      throw new ApiError(500, 'Erreur lors du traitement de l\'abonnement');
    }
  },

  /**
   * Annule un abonnement
   */
  async cancelSubscription(req, res) {
    try {
      const userId = req.user.id;
      const user = await accountDataMapper.findOneAccount(userId);

      if (!user || !user.stripe_customer_id) {
        throw new ApiError(404, 'Abonnement non trouvé');
      }

      // Récupérer l'abonnement actif
      const subscriptions = await stripe.subscriptions.list({
        customer: user.stripe_customer_id,
        status: 'active'
      });

      if (subscriptions.data.length === 0) {
        throw new ApiError(404, 'Aucun abonnement actif trouvé');
      }

      // Annuler l'abonnement à la fin de la période
      await stripe.subscriptions.update(subscriptions.data[0].id, {
        cancel_at_period_end: true
      });

      // Mettre à jour le statut dans la base de données
      await accountDataMapper.updateAccount(userId, {
        subscription_status: 'cancelled'
      });

      return res.status(200).json({
        status: 'success',
        message: 'Abonnement annulé avec succès'
      });
    } catch (error) {
      logger.error('Erreur lors de l\'annulation de l\'abonnement:', error);
      throw new ApiError(500, 'Erreur lors de l\'annulation de l\'abonnement');
    }
  },
/**
 * Récupère tous les paiements (admin)
 */
async getAllPayments(req, res) {
    try {
      const { limit = 20, offset = 0, status, payment_type } = req.query;
      
      // Construire les filtres
      const filters = {};
      if (status) filters.status = status;
      if (payment_type) filters.payment_type = payment_type;
      
      // Récupérer les paiements avec pagination
      const payments = await paymentDataMapper.getAllPayments(
        parseInt(limit), 
        parseInt(offset), 
        filters
      );
      
      // Compter le total de paiements
      const totalCount = await paymentDataMapper.countAllPayments(filters);
      
      return res.status(200).json({
        status: 'success',
        data: {
          payments,
          pagination: {
            total: totalCount,
            limit: parseInt(limit),
            offset: parseInt(offset),
            pages: Math.ceil(totalCount / limit)
          }
        }
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération des paiements:', error);
      throw new ApiError(500, 'Erreur lors de la récupération des paiements');
    }
  },
  /**
   * Webhook Stripe pour gérer les événements
   */
  async handleWebhook(req, res) {
    try {
      const sig = req.headers['stripe-signature'];
      const event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
  
      logger.info(`Traitement de l'événement Stripe: ${event.type}`);
  
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object;
          await paymentDataMapper.updatePaymentStatus(paymentIntent.id, 'succeeded');
          break;
        }
  
        case 'payment_intent.payment_failed': {
          const paymentIntent = event.data.object;
          await paymentDataMapper.updatePaymentStatus(paymentIntent.id, 'failed');
          break;
        }
  
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const subscription = event.data.object;
          const customer = await stripe.customers.retrieve(subscription.customer);
          const userId = customer.metadata.userId;
  
          await paymentDataMapper.updateSubscriptionDetails(userId, {
            subscription_status: subscription.status,
            subscription_end_date: new Date(subscription.current_period_end * 1000)
          });
          break;
        }
  
        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          const customer = await stripe.customers.retrieve(invoice.customer);
          const userId = customer.metadata.userId;
  
          await paymentDataMapper.updateSubscriptionDetails(userId, {
            subscription_status: 'payment_failed'
          });
  
          // Si un paiement est associé à cette facture
          if (invoice.payment_intent) {
            await paymentDataMapper.updatePaymentStatus(invoice.payment_intent, 'failed');
          }
          break;
        }
  
        case 'invoice.paid': {
          const invoice = event.data.object;
          
          // Si un paiement est associé à cette facture
          if (invoice.payment_intent) {
            await paymentDataMapper.updatePaymentStatus(invoice.payment_intent, 'succeeded');
          }
          break;
        }
      }
  
      return res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Erreur dans le webhook Stripe:', error);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }
  },

  /**
   * Récupère l'historique des paiements d'un utilisateur
   */
  async getPaymentHistory(req, res) {
    try {
      const userId = req.user.id;
      const user = await accountDataMapper.findOneAccount(userId);

      if (!user || !user.stripe_customer_id) {
        throw new ApiError(404, 'Utilisateur non trouvé');
      }

      const paymentIntents = await stripe.paymentIntents.list({
        customer: user.stripe_customer_id,
        limit: 10
      });

      return res.status(200).json({
        status: 'success',
        data: paymentIntents.data.map(pi => ({
          id: pi.id,
          amount: pi.amount,
          currency: pi.currency,
          status: pi.status,
          created: new Date(pi.created * 1000)
        }))
      });
    } catch (error) {
      logger.error('Erreur lors de la récupération de l\'historique:', error);
      throw new ApiError(500, 'Erreur lors de la récupération de l\'historique des paiements');
    }
  }
};

export default paymentController;