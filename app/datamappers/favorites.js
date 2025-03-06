import pool from "../datamappers/connexion.js";

// Créer une classe d'erreur personnalisée si elle n'existe pas
class DbError extends Error {
  constructor(message) {
    super(message);
    this.name = "DbError";
  }
}

const favoritesDataMapper = {
  async findAllByUser(userId, hasActiveSubscription = false) {
    try {
      // Requête modifiée pour supprimer f.id qui n'existe pas
      let query = `
        SELECT 
          f.user_id,
          f.recipe_id,
          f.created_at,
          r.title,
          r.image_url,
          r.prep_time,
          r.cook_time,
          r.difficulty_level,
          r.is_premium,
          r.meal_type,
          r.rating,
          r.description
        FROM favorites f
        JOIN recipes r ON f.recipe_id = r.id
        WHERE f.user_id = $1
      `;
      
      // Filtrer les recettes premium pour les utilisateurs sans abonnement
      if (!hasActiveSubscription) {
        query += ` AND (r.is_premium = false OR r.is_premium IS NULL)`;
      }
      
      query += ` ORDER BY f.created_at DESC`;
      
      const result = await pool.query(query, [userId]);
      
      // Transformation mise à jour pour correspondre au format attendu par le front
      return result.rows.map(row => ({
        user_id: row.user_id,
        recipe_id: row.recipe_id,
        created_at: row.created_at,
        recipe: {
          id: row.recipe_id,
          title: row.title,
          description: row.description,
          prep_time: row.prep_time,
          cook_time: row.cook_time,
          difficulty_level: row.difficulty_level,
          image_url: row.image_url,
          is_premium: row.is_premium,
          meal_type: row.meal_type,
          rating: row.rating
        }
      }));
    } catch (error) {
      console.error("Erreur dans findAllByUser:", error.message);
      throw new DbError(error.message);
    }
  },
  
  async findOne(userId, recipeId) {
    try {
      const query = 'SELECT * FROM favorites WHERE user_id = $1 AND recipe_id = $2';
      const result = await pool.query(query, [userId, recipeId]);
      return result.rows[0];
    } catch (error) {
      console.error("Erreur dans findOne:", error.message);
      throw new DbError(error.message);
    }
  },

  async create(userId, recipeId) {
    try {
      const query = `
        INSERT INTO favorites (user_id, recipe_id)
        VALUES ($1, $2)
        RETURNING *
      `;
      const result = await pool.query(query, [userId, recipeId]);
      return result.rows[0];
    } catch (error) {
      console.error("Erreur dans create:", error.message);
      
      // Si l'erreur est due à une contrainte unique
      if (error.code === '23505') {
        // Récupérer le favori existant au lieu d'échouer
        const existingFavorite = await this.findOne(userId, recipeId);
        return existingFavorite;
      }
      
      throw new DbError(error.message);
    }
  },

  async delete(userId, recipeId) {
    try {
      const query = 'DELETE FROM favorites WHERE user_id = $1 AND recipe_id = $2 RETURNING *';
      const result = await pool.query(query, [userId, recipeId]);
      return result.rows[0];
    } catch (error) {
      console.error("Erreur dans delete:", error.message);
      throw new DbError(error.message);
    }
  },

  async checkRecipeExists(recipeId) {
    try {
      const query = 'SELECT id, is_premium FROM recipes WHERE id = $1';
      const result = await pool.query(query, [recipeId]);
      return result.rows[0];
    } catch (error) {
      console.error("Erreur dans checkRecipeExists:", error.message);
      throw new DbError(error.message);
    }
  }
};

export default favoritesDataMapper;