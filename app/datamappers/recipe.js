import DbError from "../erros/dbError.js";
import pool from "../datamappers/connexion.js";

const recipeDataMapper = {
  async findAllRecipes(filters = {}) {
    try {
      let query = `
        SELECT r.*, u.email as author_email,
               (SELECT COUNT(*) FROM favorites f WHERE f.recipe_id = r.id) as favorite_count,
               (SELECT AVG(rating) FROM recipe_reviews rr WHERE rr.recipe_id = r.id) as average_rating
        FROM recipes r
        LEFT JOIN users u ON r.author_id = u.id
        WHERE 1=1
      `;
      const values = [];
      let paramCount = 1;

      // Ajout dynamique des filtres
      if (filters.meal_type) {
        query += ` AND meal_type = $${paramCount}`;
        values.push(filters.meal_type);
        paramCount++;
      }
      if (filters.difficulty_level) {
        query += ` AND difficulty_level = $${paramCount}`;
        values.push(filters.difficulty_level);
        paramCount++;
      }
      if (filters.season) {
        query += ` AND season = $${paramCount}`;
        values.push(filters.season);
        paramCount++;
      }
      if (filters.is_premium !== undefined) {
        query += ` AND is_premium = $${paramCount}`;
        values.push(filters.is_premium);
        paramCount++;
      }

      query += ' ORDER BY created_at DESC';

      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  async findOneRecipe(id) {
    try {
      const query = `
        SELECT r.*, u.email as author_email,
               (SELECT COUNT(*) FROM favorites f WHERE f.recipe_id = r.id) as favorite_count,
               (SELECT AVG(rating) FROM recipe_reviews rr WHERE rr.recipe_id = r.id) as average_rating,
               (
                 SELECT json_agg(
                   json_build_object(
                     'id', rr.id,
                     'rating', rr.rating,
                     'comment', rr.comment,
                     'user_email', u2.email,
                     'created_at', rr.created_at
                   )
                 )
                 FROM recipe_reviews rr
                 JOIN users u2 ON rr.user_id = u2.id
                 WHERE rr.recipe_id = r.id
               ) as reviews
        FROM recipes r
        LEFT JOIN users u ON r.author_id = u.id
        WHERE r.id = $1
      `;
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  async createRecipe(recipeData) {
    try {
      const {
        title, description, origin, prep_time, difficulty_level,
        meal_type, season, is_premium, ingredients, steps,
        nutrition_info, servings, author_id
      } = recipeData;

      const result = await pool.query(
        `INSERT INTO recipes (
          title, description, origin, prep_time, difficulty_level,
          meal_type, season, is_premium, ingredients, steps,
          nutrition_info, servings, author_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          title, description, origin, prep_time, difficulty_level,
          meal_type, season, is_premium, ingredients, steps,
          nutrition_info, servings, author_id
        ]
      );
      return result.rows[0];
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  async updateRecipe(id, recipeData) {
    try {
      const allowedUpdates = [
        'title', 'description', 'origin', 'prep_time', 'difficulty_level',
        'meal_type', 'season', 'is_premium', 'ingredients', 'steps',
        'nutrition_info', 'servings', 'image_url'
      ];
      const updates = [];
      const values = [];
      let counter = 1;

      for (const [key, value] of Object.entries(recipeData)) {
        if (allowedUpdates.includes(key)) {
          updates.push(`${key} = $${counter}`);
          values.push(value);
          counter++;
        }
      }

      if (updates.length === 0) return null;

      values.push(id);
      const result = await pool.query(
        `UPDATE recipes 
         SET ${updates.join(', ')} 
         WHERE id = $${counter} 
         RETURNING *`,
        values
      );
      return result.rows[0];
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  async deleteRecipe(id) {
    try {
      const result = await pool.query(
        'DELETE FROM recipes WHERE id = $1 RETURNING id',
        [id]
      );
      return result.rowCount > 0;
    } catch (error) {
      throw new DbError(error.message);
    }
  }
};

export default recipeDataMapper;