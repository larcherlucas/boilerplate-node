import ApiError from '../erros/api.error.js';
import pool from '../datamappers/connexion.js';
import { checkSubscriptionStatus } from '../middlewares/subscription.middleware.js';

/**
 * Contrôleur pour la gestion des abonnements
 */
const subscriptionController = {
  /**
   * Récupérer tous les plans d'abonnement disponibles
   */
  getAllPlans: async (req, res) => {
    try {
      const query = `
        SELECT * FROM subscription_plans
        WHERE is_active = true
        ORDER BY price ASC
      `;
      
      const result = await pool.query(query);
      
      return res.status(200).json({
        status: 'success',
        data: result.rows
      });
    } catch (err) {
      throw err;
    }
  },
  
  /**
   * Créer un nouveau plan d'abonnement (admin)
   */
  createPlan: async (req, res) => {
    try {
      const { 
        name, 
        description, 
        price, 
        currency = 'EUR', 
        interval, 
        subscription_type,
        features = [], 
        stripe_price_id 
      } = req.body;
      
      // Valider les données requises
      if (!name || !price || !interval || !subscription_type) {
        throw new ApiError(400, 'Données manquantes: name, price, interval et subscription_type sont requis');
      }
      
      // Vérifier les valeurs permises
      if (!['month', 'year'].includes(interval)) {
        throw new ApiError(400, 'Interval doit être "month" ou "year"');
      }
      
      if (!['monthly', 'annual'].includes(subscription_type)) {
        throw new ApiError(400, 'Type d\'abonnement doit être "monthly" ou "annual"');
      }
      
      const query = `
        INSERT INTO subscription_plans 
        (name, description, price, currency, interval, subscription_type, features, stripe_price_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        name,
        description,
        price,
        currency,
        interval,
        subscription_type,
        JSON.stringify(features),
        stripe_price_id
      ];
      
      const result = await pool.query(query, values);
      
      return res.status(201).json({
        status: 'success',
        data: result.rows[0]
      });
    } catch (err) {
      throw err;
    }
  },
  
  /**
   * Mettre à jour un plan d'abonnement (admin)
   */
  updatePlan: async (req, res) => {
    try {
      const planId = parseInt(req.params.id, 10);
      
      if (isNaN(planId)) {
        throw new ApiError(400, 'ID de plan invalide');
      }
      
      // Préparer les champs à mettre à jour
      const allowedFields = ['name', 'description', 'price', 'currency', 'interval', 
                            'subscription_type', 'features', 'is_active', 'stripe_price_id'];
      const updateFields = [];
      const values = [];
      let paramIndex = 1;
      
      Object.entries(req.body).forEach(([key, value]) => {
        if (allowedFields.includes(key)) {
          updateFields.push(`${key} = $${paramIndex}`);
          
          // Convertir les tableaux en JSON pour le stockage
          if (key === 'features' && Array.isArray(value)) {
            values.push(JSON.stringify(value));
          } else {
            values.push(value);
          }
          
          paramIndex++;
        }
      });
      
      if (updateFields.length === 0) {
        throw new ApiError(400, 'Aucun champ valide à mettre à jour');
      }
      
      // Ajouter l'ID du plan comme dernier paramètre
      values.push(planId);
      
      const query = `
        UPDATE subscription_plans
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      const result = await pool.query(query, values);
      
      if (result.rows.length === 0) {
        throw new ApiError(404, 'Plan d\'abonnement non trouvé');
      }
      
      return res.status(200).json({
        status: 'success',
        data: result.rows[0]
      });
    } catch (err) {
      throw err;
    }
  },
  
  /**
   * Supprimer un plan d'abonnement (admin)
   */
  deletePlan: async (req, res) => {
    try {
      const planId = parseInt(req.params.id, 10);
      
      if (isNaN(planId)) {
        throw new ApiError(400, 'ID de plan invalide');
      }
      
      // Vérifier si le plan est utilisé par des utilisateurs
      const usersQuery = `
        SELECT COUNT(*) FROM users
        WHERE subscription_type = (
          SELECT subscription_type FROM subscription_plans WHERE id = $1
        )
      `;
      
      const usersResult = await pool.query(usersQuery, [planId]);
      const userCount = parseInt(usersResult.rows[0].count, 10);
      
      if (userCount > 0) {
        // Ne pas supprimer, mais désactiver le plan
        const deactivateQuery = `
          UPDATE subscription_plans
          SET is_active = false
          WHERE id = $1
          RETURNING *
        `;
        
        const result = await pool.query(deactivateQuery, [planId]);
        
        if (result.rows.length === 0) {
          throw new ApiError(404, 'Plan d\'abonnement non trouvé');
        }
        
        return res.status(200).json({
          status: 'success',
          message: `Plan désactivé car utilisé par ${userCount} utilisateur(s)`,
          data: result.rows[0]
        });
      }
      
      // Si aucun utilisateur n'utilise ce plan, le supprimer
      const deleteQuery = `
        DELETE FROM subscription_plans
        WHERE id = $1
        RETURNING *
      `;
      
      const result = await pool.query(deleteQuery, [planId]);
      
      if (result.rows.length === 0) {
        throw new ApiError(404, 'Plan d\'abonnement non trouvé');
      }
      
      return res.status(200).json({
        status: 'success',
        message: 'Plan d\'abonnement supprimé',
        data: result.rows[0]
      });
    } catch (err) {
      throw err;
    }
  },
  
  /**
   * Vérifier le statut d'abonnement de l'utilisateur
   */
  checkStatus: async (req, res) => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Utilisateur non authentifié');
      }
      
      const subscription = await checkSubscriptionStatus(req.user.id);
      
      return res.status(200).json({
        status: 'success',
        data: {
          subscription: {
            active: subscription.active,
            type: subscription.type,
            status: subscription.status,
            expiryDate: subscription.expiryDate
          }
        }
      });
    } catch (err) {
      throw err;
    }
  }
};

export default subscriptionController;