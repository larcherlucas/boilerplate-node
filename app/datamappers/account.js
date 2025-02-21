import DbError from "../erros/dbError.js";
import pool from "../datamappers/connexion.js";
import cryptoPassword from "../utils/cryptoPassword.js";

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
        username,        // nouveau champ
        email, 
        password,        // mot de passe en clair
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
        'email',
        'password', // Changed from password_hash to accept plain password
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
          // Special handling for password updates
          if (key === 'password') {
            updates.push(`password_hash = $${counter}`);
            const hashedPassword = await cryptoPassword.hash(value);
            values.push(hashedPassword);
          } else {
            updates.push(`${key} = $${counter}`);
            values.push(value);
          }
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