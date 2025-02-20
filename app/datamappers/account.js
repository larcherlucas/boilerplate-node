import DbError from "../erros/dbError.js";
import pool from "../datamappers/connexion.js";

const accountDataMapper = {
  async findAllAccounts() {
    try {
      const result = await pool.query(
        `SELECT id, email, role, household_members, preferences, 
                subscription_type, subscription_status, created_at, updated_at 
         FROM "users";`
      );
      return result.rows;
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  async findOneAccount(id) {
    try {
      const result = await pool.query(
        `SELECT id, email, role, household_members, preferences, 
                subscription_type, subscription_status, created_at, updated_at 
         FROM "users" 
         WHERE id = $1;`,
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  // Méthode pour trouver un utilisateur par email (sans mot de passe)
  async findByEmail(email) {
    try {
      const result = await pool.query(
        `SELECT id, email, role, household_members, preferences, 
               subscription_type, subscription_status, created_at, updated_at 
         FROM "users" 
         WHERE email = $1;`,
        [email]
      );
      return result.rows[0];
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  // Méthode pour trouver un utilisateur par email avec le mot de passe
  async findByEmailWithPassword(email) {
    try {
      const result = await pool.query(
        `SELECT id, email, password_hash, role, household_members, preferences, 
               subscription_type, subscription_status, created_at, updated_at 
         FROM "users" 
         WHERE email = $1;`,
        [email]
      );
      return result.rows[0];
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  // Méthode spécifique pour l'authentification
  async findUserForAuth(id) {
    try {
      const result = await pool.query(
        `SELECT id, email, role, subscription_status 
         FROM "users" 
         WHERE id = $1;`,
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  async createAccount(accountData) {
    try {
      const { 
        email, 
        password_hash, 
        role = 'user', 
        household_members = {}, 
        preferences = {},
        subscription_status = 'active'  // Valeur par défaut pour les nouveaux comptes
      } = accountData;
      
      const result = await pool.query(
        `INSERT INTO "users" 
         (email, password_hash, role, household_members, preferences, subscription_status) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING id, email, role, household_members, preferences, subscription_status, created_at;`,
        [email, password_hash, role, household_members, preferences, subscription_status]
      );
      return result.rows[0];
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  async updateAccount(id, accountData) {
    try {
      const allowedUpdates = [
        'email', 
        'password_hash', 
        'role', 
        'household_members', 
        'preferences', 
        'subscription_type', 
        'subscription_status'
      ];
      const updates = [];
      const values = [];
      let counter = 1;

      for (const [key, value] of Object.entries(accountData)) {
        if (allowedUpdates.includes(key)) {
          updates.push(`${key} = $${counter}`);
          values.push(value);
          counter++;
        }
      }

      if (updates.length === 0) return null;

      // Ajout automatique de la date de mise à jour
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      
      values.push(id);
      const result = await pool.query(
        `UPDATE "users" 
         SET ${updates.join(', ')} 
         WHERE id = $${counter} 
         RETURNING id, email, role, household_members, preferences, 
                   subscription_type, subscription_status, updated_at;`,
        values
      );
      return result.rows[0];
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  async deleteAccount(id) {
    try {
      const result = await pool.query(
        'DELETE FROM "users" WHERE id = $1 RETURNING id;',
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      throw new DbError(error.message);
    }
  }
};

export default accountDataMapper;