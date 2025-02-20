import pool from "../datamappers/connexion.js";

const recipeReviewsDataMapper = {
  async findAllByRecipe(recipeId) {
    const query = `
      SELECT rr.*, u.email 
      FROM recipe_reviews rr
      JOIN users u ON rr.user_id = u.id
      WHERE rr.recipe_id = $1
      ORDER BY rr.created_at DESC
    `;
    const result = await pool.query(query, [recipeId]);
    return result.rows;
  },

  async findAllByUser(userId) {
    const query = `
      SELECT rr.*, r.title as recipe_title
      FROM recipe_reviews rr
      JOIN recipes r ON rr.recipe_id = r.id
      WHERE rr.user_id = $1
      ORDER BY rr.created_at DESC
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  async findOne(userId, recipeId) {
    const query = 'SELECT * FROM recipe_reviews WHERE user_id = $1 AND recipe_id = $2';
    const result = await pool.query(query, [userId, recipeId]);
    return result.rows[0];
  },

  async create(userId, recipeId, reviewData) {
    const query = `
      INSERT INTO recipe_reviews (user_id, recipe_id, rating, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const values = [userId, recipeId, reviewData.rating, reviewData.comment];
    const result = await pool.query(query, values);

    // Mettre à jour la note moyenne de la recette
    await this.updateRecipeAverageRating(recipeId);
    
    return result.rows[0];
  },

  async update(userId, recipeId, reviewData) {
    const query = `
      UPDATE recipe_reviews
      SET rating = $1, comment = $2, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $3 AND recipe_id = $4
      RETURNING *
    `;
    const values = [reviewData.rating, reviewData.comment, userId, recipeId];
    const result = await pool.query(query, values);

    // Mettre à jour la note moyenne de la recette
    await this.updateRecipeAverageRating(recipeId);
    
    return result.rows[0];
  },

  async delete(userId, recipeId) {
    const query = 'DELETE FROM recipe_reviews WHERE user_id = $1 AND recipe_id = $2 RETURNING *';
    const result = await pool.query(query, [userId, recipeId]);

    if (result.rows[0]) {
      // Mettre à jour la note moyenne de la recette
      await this.updateRecipeAverageRating(recipeId);
    }

    return result.rows[0];
  },

  async updateRecipeAverageRating(recipeId) {
    const query = `
      UPDATE recipes
      SET rating = (
        SELECT ROUND(AVG(rating)::numeric, 2)
        FROM recipe_reviews
        WHERE recipe_id = $1
      )
      WHERE id = $1
    `;
    await pool.query(query, [recipeId]);
  },

  async getRecipeStats(recipeId) {
    const query = `
      SELECT 
        COUNT(*) as total_reviews,
        ROUND(AVG(rating)::numeric, 2) as average_rating,
        COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star_count,
        COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star_count,
        COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star_count,
        COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star_count,
        COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_count
      FROM recipe_reviews
      WHERE recipe_id = $1
    `;
    const result = await pool.query(query, [recipeId]);
    return result.rows[0];
  },

  async checkRecipeExists(recipeId) {
    const query = 'SELECT id FROM recipes WHERE id = $1';
    const result = await pool.query(query, [recipeId]);
    return result.rows[0];
  }
};

export default recipeReviewsDataMapper;