import pool from "../datamappers/connexion.js";

const dietaryRestrictionsDataMapper = {
  async findAllByUser(userId) {
    const query = 'SELECT * FROM dietary_restrictions WHERE user_id = $1 ORDER BY restriction_type';
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  async findOne(userId, restrictionType) {
    const query = 'SELECT * FROM dietary_restrictions WHERE user_id = $1 AND restriction_type = $2';
    const result = await pool.query(query, [userId, restrictionType]);
    return result.rows[0];
  },

  async create(userId, restriction) {
    const query = `
      INSERT INTO dietary_restrictions (user_id, restriction_type, details)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const values = [userId, restriction.restriction_type, restriction.details];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async update(userId, restrictionType, restriction) {
    const query = `
      UPDATE dietary_restrictions
      SET details = $1
      WHERE user_id = $2 AND restriction_type = $3
      RETURNING *
    `;
    const values = [restriction.details, userId, restrictionType];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async delete(userId, restrictionType) {
    const query = `
      DELETE FROM dietary_restrictions 
      WHERE user_id = $1 AND restriction_type = $2
      RETURNING *
    `;
    const result = await pool.query(query, [userId, restrictionType]);
    return result.rows[0];
  },

  async deleteAll(userId) {
    const query = 'DELETE FROM dietary_restrictions WHERE user_id = $1 RETURNING *';
    const result = await pool.query(query, [userId]);
    return result.rows;
  }
};

export default dietaryRestrictionsDataMapper;