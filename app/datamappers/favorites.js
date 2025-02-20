import pool from "../datamappers/connexion.js";

const favoritesDataMapper = {
  async findAllByUser(userId) {
    const query = `
      SELECT f.*, r.title, r.image_url, r.prep_time, r.difficulty_level 
      FROM favorites f
      JOIN recipes r ON f.recipe_id = r.id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  async findOne(userId, recipeId) {
    const query = 'SELECT * FROM favorites WHERE user_id = $1 AND recipe_id = $2';
    const result = await pool.query(query, [userId, recipeId]);
    return result.rows[0];
  },

  async create(userId, recipeId) {
    const query = `
      INSERT INTO favorites (user_id, recipe_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await pool.query(query, [userId, recipeId]);
    return result.rows[0];
  },

  async delete(userId, recipeId) {
    const query = 'DELETE FROM favorites WHERE user_id = $1 AND recipe_id = $2 RETURNING *';
    const result = await pool.query(query, [userId, recipeId]);
    return result.rows[0];
  },

  async checkRecipeExists(recipeId) {
    const query = 'SELECT id FROM recipes WHERE id = $1';
    const result = await pool.query(query, [recipeId]);
    return result.rows[0];
  }
};

export default favoritesDataMapper;