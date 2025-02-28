import DbError from "../erros/dbError.js";
import pool from "../datamappers/connexion.js";
import cryptoPassword from "../utils/cryptoPassword.js";

const accountDataMapper = {
  async findAllAccounts() {
    try {
      const result = await pool.query(
        `SELECT id, username, email, role, household_members, preferences, 
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
        `SELECT id, username, email, role, household_members, preferences, 
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

  async findByEmail(email) {
    try {
      const result = await pool.query(
        `SELECT id, username, email, role, household_members, preferences, 
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

  async findByEmailWithPassword(email) {
    try {
      const result = await pool.query(
        `SELECT id, username, email, password_hash, role, household_members, preferences, 
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

  async findUserForAuth(id) {
    try {
      const result = await pool.query(
        `SELECT id, username, email, role, subscription_status 
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
        username,
        email, 
        password,
        role = 'user', 
        household_members = {}, 
        preferences = {},
        subscription_status = 'active'
      } = accountData;
  
      if (!username) {
        throw new Error("Username is required");
      }
  
      // Hash le mot de passe en clair via cryptoPassword.hash
      const password_hash = await cryptoPassword.hash(password);
  
      const result = await pool.query(
        `INSERT INTO "users" 
         (username, email, password_hash, role, household_members, preferences, subscription_status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, username, email, role, household_members, preferences, subscription_status, created_at;`,
        [username, email, password_hash, role, household_members, preferences, subscription_status]
      );
      return result.rows[0];
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  async updateAccount(id, accountData) {
    try {
      const allowedUpdates = [
        'username',  // Ajout de username aux champs permis
        'email',
        'password_hash', // Pour permettre la mise à jour du mot de passe hashé
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

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const result = await pool.query(
        `UPDATE "users" 
         SET ${updates.join(', ')} 
         WHERE id = $${counter} 
         RETURNING id, username, email, role, household_members, preferences, 
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
  },

  // Méthodes supplémentaires pour les restrictions alimentaires
  async getDietaryRestrictions(userId) {
    try {
      const result = await pool.query(
        `SELECT id, restriction_type, details, created_at
         FROM "dietary_restrictions"
         WHERE user_id = $1;`,
        [userId]
      );
      return result.rows;
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  async addDietaryRestriction(userId, data) {
    try {
      const { restriction_type, details } = data;
      
      const result = await pool.query(
        `INSERT INTO "dietary_restrictions" (user_id, restriction_type, details)
         VALUES ($1, $2, $3)
         RETURNING id, restriction_type, details, created_at;`,
        [userId, restriction_type, details]
      );
      return result.rows[0];
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  async deleteDietaryRestriction(userId, restrictionType) {
    try {
      const result = await pool.query(
        `DELETE FROM "dietary_restrictions"
         WHERE user_id = $1 AND restriction_type = $2
         RETURNING id;`,
        [userId, restrictionType]
      );
      return result.rowCount > 0;
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  async deleteAllDietaryRestrictions(userId) {
    try {
      const result = await pool.query(
        `DELETE FROM "dietary_restrictions"
         WHERE user_id = $1
         RETURNING id;`,
        [userId]
      );
      return result.rowCount > 0;
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  // Méthodes pour la gestion des membres du foyer
  async getHouseholdMembers(userId) {
    try {
      const result = await pool.query(
        `SELECT household_members
         FROM "users"
         WHERE id = $1;`,
        [userId]
      );
      return result.rows[0]?.household_members || {};
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  async updateHouseholdMembers(userId, householdData) {
    try {
      const result = await pool.query(
        `UPDATE "users"
         SET household_members = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING household_members;`,
        [householdData, userId]
      );
      return result.rows[0];
    } catch (error) {
      throw new DbError(error.message);
    }
  }
};

export default accountDataMapper;