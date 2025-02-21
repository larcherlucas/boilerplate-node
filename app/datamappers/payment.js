import DbError from "../erros/dbError.js";
import pool from "../datamappers/connexion.js";

const paymentDataMapper = {
  async createPaymentRecord(paymentData) {
    try {
      const {
        user_id,
        stripe_payment_id,
        amount,
        currency,
        status,
        payment_method,
        payment_type
      } = paymentData;

      const result = await pool.query(
        `INSERT INTO payments 
         (user_id, stripe_payment_id, amount, currency, status, 
          payment_method, payment_type, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP) 
         RETURNING *;`,
        [user_id, stripe_payment_id, amount, currency, status, 
         payment_method, payment_type]
      );
      
      return result.rows[0];
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  async updatePaymentStatus(stripePaymentId, status) {
    try {
      const result = await pool.query(
        `UPDATE payments 
         SET status = $1, 
             updated_at = CURRENT_TIMESTAMP 
         WHERE stripe_payment_id = $2 
         RETURNING *;`,
        [status, stripePaymentId]
      );
      
      return result.rows[0];
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  async getPaymentHistory(userId, limit = 10) {
    try {
      const result = await pool.query(
        `SELECT * FROM payments 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2;`,
        [userId, limit]
      );
      
      return result.rows;
    } catch (error) {
      throw new DbError(error.message);
    }
  },
  async getAllPayments(limit = 20, offset = 0, filters = {}) {
    try {
      let query = 'SELECT p.*, u.email FROM payments p JOIN users u ON p.user_id = u.id';
      const queryParams = [];
      let paramCounter = 1;
      
      // Construire la clause WHERE en fonction des filtres
      if (Object.keys(filters).length > 0) {
        query += ' WHERE';
        Object.entries(filters).forEach(([key, value], index) => {
          if (index > 0) query += ' AND';
          query += ` p.${key} = $${paramCounter}`;
          queryParams.push(value);
          paramCounter++;
        });
      }
      
      // Ajouter ORDER BY et LIMIT/OFFSET
      query += ' ORDER BY p.created_at DESC LIMIT $' + paramCounter + ' OFFSET $' + (paramCounter + 1);
      queryParams.push(limit, offset);
      
      const result = await pool.query(query, queryParams);
      return result.rows;
    } catch (error) {
      throw new DbError(error.message);
    }
  },
  
  async countAllPayments(filters = {}) {
    try {
      let query = 'SELECT COUNT(*) FROM payments';
      const queryParams = [];
      let paramCounter = 1;
      
      // Construire la clause WHERE en fonction des filtres
      if (Object.keys(filters).length > 0) {
        query += ' WHERE';
        Object.entries(filters).forEach(([key, value], index) => {
          if (index > 0) query += ' AND';
          query += ` ${key} = $${paramCounter}`;
          queryParams.push(value);
          paramCounter++;
        });
      }
      
      const result = await pool.query(query, queryParams);
      return parseInt(result.rows[0].count);
    } catch (error) {
      throw new DbError(error.message);
    }
  },
  
  async updateSubscriptionDetails(userId, subscriptionData) {
    try {
      const {
        subscription_type,
        subscription_status,
        subscription_start_date,
        subscription_end_date
      } = subscriptionData;

      const result = await pool.query(
        `UPDATE users 
         SET subscription_type = $1,
             subscription_status = $2,
             subscription_start_date = $3,
             subscription_end_date = $4,
             updated_at = CURRENT_TIMESTAMP 
         WHERE id = $5 
         RETURNING *;`,
        [subscription_type, subscription_status, 
         subscription_start_date, subscription_end_date, userId]
      );
      
      return result.rows[0];
    } catch (error) {
      throw new DbError(error.message);
    }
  }
};

export default paymentDataMapper;