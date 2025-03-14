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
        // Cette méthode doit être adaptée pour prendre en compte les filtres
        const whereClause = [];
        
        if (filters.meal_type) {
          whereClause.push(`meal_type = $${values.length + 1}`);
          values.push(filters.meal_type);
        }
        if (filters.difficulty_level) {
          whereClause.push(`difficulty_level = $${values.length + 1}`);
          values.push(filters.difficulty_level);
        }
        if (filters.season) {
          whereClause.push(`(season = $${values.length + 1} OR season = 'all')`);
          values.push(filters.season);
        }
        // Ajout des nouveaux filtres
        if (filters.category) {
          whereClause.push(`category = $${values.length + 1}`);
          values.push(filters.category);
        }
        if (filters.origin) {
          whereClause.push(`origin = $${values.length + 1}`);
          values.push(filters.origin);
        }
        
        const filterCondition = whereClause.length ? 'AND ' + whereClause.join(' AND ') : '';
        
        query = `
          SELECT 
            (SELECT COUNT(*) FROM recipes WHERE is_premium = false ${filterCondition}) +
            LEAST(
              (SELECT COUNT(*) FROM recipes WHERE is_premium = true ${filterCondition}),
              (SELECT quota_limit FROM access_quotas WHERE user_type = 'none' AND feature_name = 'recipes') -
              (SELECT COUNT(*) FROM recipes WHERE is_premium = false ${filterCondition})
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
          query += ` AND (r.season = $${paramIndex++} OR r.season = 'all')`;
          values.push(filters.season);
        }
        // Ajout des nouveaux filtres
        if (filters.category) {
          query += ` AND r.category = $${paramIndex++}`;
          values.push(filters.category);
        }
        if (filters.origin) {
          query += ` AND r.origin = $${paramIndex++}`;
          values.push(filters.origin);
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
        // Nous devons modifier cette approche pour incorporer les filtres de catégorie et origine
        // Note: Cette requête est simplifiée pour plus de clarté
        
        // Premièrement, construisons notre clause WHERE pour les filtres
        let whereClause = "r.is_premium = false";
        let whereClausePremium = "r.is_premium = true";
        
        // Paramètres pour les filtres
        if (filters.meal_type) {
          whereClause += ` AND r.meal_type = $1`;
          whereClausePremium += ` AND r.meal_type = $1`;
          values.push(filters.meal_type);
        }
        if (filters.difficulty_level) {
          whereClause += ` AND r.difficulty_level = $${values.length + 1}`;
          whereClausePremium += ` AND r.difficulty_level = $${values.length + 1}`;
          values.push(filters.difficulty_level);
        }
        if (filters.season) {
          whereClause += ` AND (r.season = $${values.length + 1} OR r.season = 'all')`;
          whereClausePremium += ` AND (r.season = $${values.length + 1} OR r.season = 'all')`;
          values.push(filters.season);
        }
        // Ajout des nouveaux filtres
        if (filters.category) {
          whereClause += ` AND r.category = $${values.length + 1}`;
          whereClausePremium += ` AND r.category = $${values.length + 1}`;
          values.push(filters.category);
        }
        if (filters.origin) {
          whereClause += ` AND r.origin = $${values.length + 1}`;
          whereClausePremium += ` AND r.origin = $${values.length + 1}`;
          values.push(filters.origin);
        }
        
        // Ajouter le paramètre pour la limite de recettes
        values.push(recipeLimit);
        
        query = `
          WITH non_premium_recipes AS (
            SELECT r.*, u.email as author_email,
                   (SELECT COUNT(*) FROM favorites f WHERE f.recipe_id = r.id) as favorite_count,
                   (SELECT AVG(rating) FROM recipe_reviews rr WHERE rr.recipe_id = r.id) as average_rating
            FROM recipes r
            LEFT JOIN users u ON r.author_id = u.id
            WHERE ${whereClause}
          ),
          premium_recipes AS (
            SELECT r.*, u.email as author_email,
                   (SELECT COUNT(*) FROM favorites f WHERE f.recipe_id = r.id) as favorite_count,
                   (SELECT AVG(rating) FROM recipe_reviews rr WHERE rr.recipe_id = r.id) as average_rating
            FROM recipes r
            LEFT JOIN users u ON r.author_id = u.id
            WHERE ${whereClausePremium}
            ORDER BY r.rating DESC NULLS LAST, r.created_at DESC
            LIMIT GREATEST(0, $${values.length} - (SELECT COUNT(*) FROM non_premium_recipes))
          )
          SELECT * FROM non_premium_recipes
          UNION ALL
          SELECT * FROM premium_recipes
          ORDER BY created_at DESC
        `;
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
          query += ` AND (r.season = $${paramIndex++} OR r.season = 'all')`;
          values.push(filters.season);
        }
        // Ajout des nouveaux filtres
        if (filters.category) {
          query += ` AND r.category = $${paramIndex++}`;
          values.push(filters.category);
        }
        if (filters.origin) {
          query += ` AND r.origin = $${paramIndex++}`;
          values.push(filters.origin);
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

  // Récupérer toutes les recettes avec filtres et pagination (admin)
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
      // Ajout des nouveaux filtres pour catégorie et origine
      if (filters.category) {
        query += ` AND category = $${paramCount}`;
        values.push(filters.category);
        paramCount++;
      }
      if (filters.origin) {
        query += ` AND origin = $${paramCount}`;
        values.push(filters.origin);
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

  // Compter le nombre total de recettes avec filtres (pour pagination)
  countRecipes: async (filters = {}) => {
    try {
      let query = `
        SELECT COUNT(id) as total 
        FROM recipes 
        WHERE 1=1
      `;
      const values = [];
      let paramIndex = 1;
      
      // Appliquer les filtres
      if (filters.status) {
        query += ` AND status = $${paramIndex}`;
        values.push(filters.status);
        paramIndex++;
      }
      if (filters.meal_type) {
        query += ` AND meal_type = $${paramIndex}`;
        values.push(filters.meal_type);
        paramIndex++;
      }
      if (filters.difficulty_level) {
        query += ` AND difficulty_level = $${paramIndex}`;
        values.push(filters.difficulty_level);
        paramIndex++;
      }
      if (filters.is_premium !== undefined) {
        query += ` AND is_premium = $${paramIndex}`;
        values.push(filters.is_premium);
        paramIndex++;
      }
      
      // Recherche par titre ou description
      if (filters.search) {
        query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex+1})`;
        const searchPattern = `%${filters.search}%`;
        values.push(searchPattern, searchPattern);
        paramIndex += 2;
      }
      
      const result = await pool.query(query, values);
      return parseInt(result.rows[0].total, 10);
    } catch (err) {
      console.error('Erreur dans countRecipes:', err);
      throw err;
    }
  },
/**
 * Récupère toutes les catégories distinctes de recettes
 */
async findAllCategories() {
  try {
    const query = `
      SELECT DISTINCT category 
      FROM recipes 
      WHERE category IS NOT NULL 
      ORDER BY category
    `;
    
    const result = await pool.query(query);
    return result.rows.map(row => row.category);
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    throw new DbError(error.message);
  }
},

/**
 * Récupère toutes les origines distinctes de recettes
 */
/**
 * Récupère toutes les origines distinctes de recettes avec encodage UTF-8 correct
 */
async findAllOrigins() {
  try {
    // Requête directe à la base de données avec encodage explicitement défini
    const query = {
      text: `SELECT name FROM recipe_origins ORDER BY name`,
      // Configurer explicitement l'encodage UTF-8 pour cette requête spécifique
      options: { encoding: 'utf8' }
    };
    
    // Ajouter un log pour débogage
    console.log("Exécution de la requête pour les origines avec encodage UTF-8");
    
    // Exécuter la requête avec les options d'encodage
    const result = await pool.query(query);
    
    // Extraire les résultats
    const origins = result.rows.map(row => row.name);
    
    // Log pour vérifier les valeurs récupérées
    console.log("Origines récupérées de la base de données:", origins);
    
    // Si nécessaire, on peut appliquer une correction supplémentaire ici
    // pour s'assurer que les caractères sont bien encodés
    const cleanedOrigins = origins.map(origin => 
      // Remplacer les caractères mal encodés si nécessaire
      origin
        .replace(/Ã§/g, 'ç')
        .replace(/Ã©/g, 'é')
        .replace(/Ã¨/g, 'è')
    );
    
    return cleanedOrigins;
  } catch (error) {
    console.error('Erreur lors de la récupération des origines:', error);
    throw new DbError(error.message);
  }
},

/**
 * Récupère les statistiques de recettes par catégorie
 */
async findCategoriesStats() {
  try {
    const query = `
      SELECT category, COUNT(*) as count 
      FROM recipes 
      WHERE category IS NOT NULL 
      GROUP BY category 
      ORDER BY count DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques de catégories:', error);
    throw new DbError(error.message);
  }
},

/**
 * Récupère les statistiques de recettes par origine
 */
async findOriginsStats() {
  try {
    const query = `
      SELECT origin, COUNT(*) as count 
      FROM recipes 
      WHERE origin IS NOT NULL 
      GROUP BY origin 
      ORDER BY count DESC
    `;
    
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques d\'origines:', error);
    throw new DbError(error.message);
  }
},
  // Mise à jour en lot du statut des recettes
  bulkUpdateStatus: async (recipeIds, status) => {
    try {
      const query = `
        UPDATE recipes 
        SET status = $1, updated_at = $2
        WHERE id = ANY($3::int[])
        RETURNING id
      `;
      const result = await pool.query(query, [status, new Date(), recipeIds]);
      return result.rowCount;
    } catch (err) {
      console.error('Erreur dans bulkUpdateStatus:', err);
      throw err;
    }
  },

  // Mise à jour en lot du statut premium des recettes
  bulkUpdatePremium: async (recipeIds, isPremium) => {
    try {
      const query = `
        UPDATE recipes 
        SET is_premium = $1, updated_at = $2
        WHERE id = ANY($3::int[])
        RETURNING id
      `;
      const result = await pool.query(query, [isPremium, new Date(), recipeIds]);
      return result.rowCount;
    } catch (err) {
      console.error('Erreur dans bulkUpdatePremium:', err);
      throw err;
    }
  },

  // Suppression en lot de recettes
  bulkDelete: async (recipeIds) => {
    try {
      const query = `
        DELETE FROM recipes
        WHERE id = ANY($1::int[])
        RETURNING id
      `;
      const result = await pool.query(query, [recipeIds]);
      return result.rowCount;
    } catch (err) {
      console.error('Erreur dans bulkDelete:', err);
      throw err;
    }
  },
  findRecentRecipes: async (limit = 5) => {
    try {
      const query = {
        text: `
          SELECT id, title, status, meal_type, created_at, updated_at
          FROM recipes
          ORDER BY updated_at DESC
          LIMIT $1
        `,
        values: [limit]
      };
      
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Erreur lors de la récupération des recettes récentes:', error);
      throw new DbError(error);
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