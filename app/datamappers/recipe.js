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

      // Ordre par défaut: du plus récent au plus ancien
      query += ' ORDER BY created_at DESC';
      
      // Limiter aux 50 premiers résultats pour le type 'free'
      if (filters.type === 'free') {
        query += ' LIMIT 50';
      }
      // Pas de limite pour le type 'premium'

      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  async findFreeRecipes() {
    try {
      // Récupération des 50 recettes les plus récentes
      const query = `
        SELECT r.*, u.email as author_email,
               (SELECT COUNT(*) FROM favorites f WHERE f.recipe_id = r.id) as favorite_count,
               (SELECT AVG(rating) FROM recipe_reviews rr WHERE rr.recipe_id = r.id) as average_rating
        FROM recipes r
        LEFT JOIN users u ON r.author_id = u.id
        ORDER BY created_at DESC
        LIMIT 50
      `;
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  async findPremiumRecipes() {
    try {
      // Récupération de toutes les recettes
      const query = `
        SELECT r.*, u.email as author_email,
               (SELECT COUNT(*) FROM favorites f WHERE f.recipe_id = r.id) as favorite_count,
               (SELECT AVG(rating) FROM recipe_reviews rr WHERE rr.recipe_id = r.id) as average_rating
        FROM recipes r
        LEFT JOIN users u ON r.author_id = u.id
        ORDER BY created_at DESC
      `;
      
      const result = await pool.query(query);
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
        nutrition_info, servings, author_id, image_url
      } = recipeData;

      const result = await pool.query(
        `INSERT INTO recipes (
          title, description, origin, prep_time, difficulty_level,
          meal_type, season, is_premium, ingredients, steps,
          nutrition_info, servings, author_id, image_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          title, description, origin, prep_time, difficulty_level,
          meal_type, season, is_premium, ingredients, steps,
          nutrition_info, servings, author_id, image_url
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
  },

  async getIngredients(recipeId) {
    try {
      const result = await pool.query(
        'SELECT ingredients FROM recipes WHERE id = $1',
        [recipeId]
      );
      return result.rows[0]?.ingredients || null;
    } catch (error) {
      throw new DbError(error.message);
    }
  },

  async updateIngredients(recipeId, ingredients) {
    try {
      const result = await pool.query(
        'UPDATE recipes SET ingredients = $1 WHERE id = $2 RETURNING ingredients',
        [ingredients, recipeId]
      );
      return result.rows[0]?.ingredients || null;
    } catch (error) {
      throw new DbError(error.message);
    }
  },

async countAccessibleRecipes(userType = 'none', filters = {}) {
  try {
    // Construire une requête qui compte plutôt que de retourner les lignes complètes
    let query, values = [];
    
    if (userType === 'none') {
      // Pour les utilisateurs sans abonnement: compte le nombre de recettes non-premium + premium disponibles
      query = `
        SELECT 
          (SELECT COUNT(*) FROM recipes WHERE is_premium = false) +
          LEAST(
            (SELECT COUNT(*) FROM recipes WHERE is_premium = true),
            (SELECT quota_limit FROM access_quotas WHERE user_type = 'none' AND feature_name = 'recipes') -
            (SELECT COUNT(*) FROM recipes WHERE is_premium = false)
          ) AS total_count
      `;
    } else {
      // Pour les utilisateurs avec abonnement: toutes les recettes avec filtres appliqués
      query = `
        SELECT COUNT(*) AS total_count
        FROM recipes r
        WHERE 1=1
      `;
      
      // Ajouter les filtres spécifiques si fournis
      let paramIndex = 1;
      if (filters.meal_type) {
        query += ` AND r.meal_type = $${paramIndex++}`;
        values.push(filters.meal_type);
      }
      if (filters.difficulty_level) {
        query += ` AND r.difficulty_level = $${paramIndex++}`;
        values.push(filters.difficulty_level);
      }
      if (filters.season) {
        query += ` AND r.season = $${paramIndex++}`;
        values.push(filters.season);
      }
    }
    
    const result = await pool.query(query, values);
    return parseInt(result.rows[0].total_count, 10);
  } catch (error) {
    throw new DbError(error.message);
  }
},
async findAccessibleRecipes(userType = 'none', filters = {}, pagination = {}) {
  try {
    // Récupérer le quota pour les utilisateurs non abonnés
    let recipeLimit;
    if (userType === 'none') {
      const quotaResult = await pool.query(
        'SELECT quota_limit FROM access_quotas WHERE user_type = $1 AND feature_name = $2',
        ['none', 'recipes']
      );
      recipeLimit = quotaResult.rows[0]?.quota_limit || 50;
    }
    
    // Construire la requête selon l'abonnement
    let query, values = [];
    
    if (userType === 'none') {
      // Pour les utilisateurs sans abonnement: recettes non-premium et premium jusqu'à la limite
      query = `
        WITH non_premium_recipes AS (
          SELECT r.*, u.email as author_email,
                 (SELECT COUNT(*) FROM favorites f WHERE f.recipe_id = r.id) as favorite_count,
                 (SELECT AVG(rating) FROM recipe_reviews rr WHERE rr.recipe_id = r.id) as average_rating
          FROM recipes r
          LEFT JOIN users u ON r.author_id = u.id
          WHERE r.is_premium = false
        ),
        premium_recipes AS (
          SELECT r.*, u.email as author_email,
                 (SELECT COUNT(*) FROM favorites f WHERE f.recipe_id = r.id) as favorite_count,
                 (SELECT AVG(rating) FROM recipe_reviews rr WHERE rr.recipe_id = r.id) as average_rating
          FROM recipes r
          LEFT JOIN users u ON r.author_id = u.id
          WHERE r.is_premium = true
          ORDER BY r.rating DESC NULLS LAST, r.created_at DESC
          LIMIT GREATEST(0, $1 - (SELECT COUNT(*) FROM non_premium_recipes))
        )
        SELECT * FROM non_premium_recipes
        UNION ALL
        SELECT * FROM premium_recipes
        ORDER BY created_at DESC
      `;
      values.push(recipeLimit);
    } else {
      // Pour les utilisateurs avec abonnement: toutes les recettes
      query = `
        SELECT r.*, u.email as author_email,
               (SELECT COUNT(*) FROM favorites f WHERE f.recipe_id = r.id) as favorite_count,
               (SELECT AVG(rating) FROM recipe_reviews rr WHERE rr.recipe_id = r.id) as average_rating
        FROM recipes r
        LEFT JOIN users u ON r.author_id = u.id
        WHERE 1=1
      `;
      
      // Ajouter les filtres spécifiques si fournis
      let paramIndex = 1;
      if (filters.meal_type) {
        query += ` AND r.meal_type = $${paramIndex++}`;
        values.push(filters.meal_type);
      }
      if (filters.difficulty_level) {
        query += ` AND r.difficulty_level = $${paramIndex++}`;
        values.push(filters.difficulty_level);
      }
      if (filters.season) {
        query += ` AND r.season = $${paramIndex++}`;
        values.push(filters.season);
      }
      
      query += ` ORDER BY r.created_at DESC`;
      
      // Pagination
      if (pagination.limit) {
        query += ` LIMIT $${paramIndex++}`;
        values.push(pagination.limit);
        
        if (pagination.offset) {
          query += ` OFFSET $${paramIndex++}`;
          values.push(pagination.offset);
        }
      }
    }
    
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    throw new DbError(error.message);
  }
},
  async getSuggestions(userId, preferences = {}) {
    try {
      // Récupération des restrictions alimentaires de l'utilisateur
      const dietaryQuery = `
        SELECT restriction_type, details 
        FROM dietary_restrictions 
        WHERE user_id = $1
      `;
      const dietaryResult = await pool.query(dietaryQuery, [userId]);
      const restrictions = dietaryResult.rows;
      
      // Base de la requête pour les suggestions
      let query = `
        SELECT r.*, 
        (SELECT AVG(rating) FROM recipe_reviews rr WHERE rr.recipe_id = r.id) as average_rating
        FROM recipes r
        LEFT JOIN favorites f ON r.id = f.recipe_id AND f.user_id = $1
        WHERE f.recipe_id IS NULL
      `;
      
      const values = [userId];
      let paramCount = 2;
      
      // Ajout de filtres basés sur les restrictions alimentaires
      // Note: Ceci est une implémentation simplifiée, car les restrictions
      // alimentaires sont stockées dans JSONB et nécessiteraient une logique plus complexe
      
      // Filtre par saison en cours si spécifié
      if (preferences.current_season) {
        query += ` AND (r.season = $${paramCount} OR r.season = 'all')`;
        values.push(preferences.current_season);
        paramCount++;
      }
      
      // Filtre pour les recettes les mieux notées
      query += ` ORDER BY average_rating DESC NULLS LAST LIMIT 10`;
      
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      throw new DbError(error.message);
    }
  }
};

export default recipeDataMapper;