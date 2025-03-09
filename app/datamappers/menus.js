import pool from "../datamappers/connexion.js";
import DbError from '../erros/dbError.js';

const menusDataMapper = {
  // Weekly Menus methods
  async findAllWeeklyMenus(userId) {
    const query = 'SELECT * FROM weekly_menus WHERE user_id = $1 ORDER BY generated_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  },
  
  async findActiveWeeklyMenu(userId) {
    const query = `
      SELECT * 
      FROM weekly_menus 
      WHERE user_id = $1 
        AND status = 'active' 
        AND valid_from <= CURRENT_TIMESTAMP 
        AND valid_to >= CURRENT_TIMESTAMP 
      ORDER BY generated_at DESC 
      LIMIT 1
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows[0] || null;
  },
  
  async findWeeklyMenuById(id, userId) {
    const query = 'SELECT * FROM weekly_menus WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  },

  async findActiveWeeklyMenus(userId) {
    const query = 'SELECT * FROM weekly_menus WHERE user_id = $1 AND status = $2 ORDER BY valid_from DESC';
    const result = await pool.query(query, [userId, 'active']);
    return result.rows;
  },

  async getEligibleRecipes(dietaryRestrictions = [], familySize = 1, mealTypes = ['breakfast', 'lunch', 'dinner'], limit = 100, userRole = 'user') {
    try {
      // Vérifier si on utilise les restrictions avec la structure complète ou juste des chaînes
      const isSimpleRestrictions = typeof dietaryRestrictions[0] === 'string';
      
      let query = `
        SELECT r.* 
        FROM recipes r
        WHERE 1=1
      `;
      
      const values = [];
      let paramCount = 1;
      
      // Filtrer par accès premium
      if (userRole !== 'premium' && userRole !== 'admin') {
        query += ` AND (r.is_premium = false OR r.is_premium IS NULL)`;
      }
      
      // Filtrer par type de repas
      if (mealTypes && mealTypes.length > 0) {
        query += ` AND r.meal_type = ANY($${paramCount})`;
        values.push(mealTypes);
        paramCount++;
      }
      
      // Traiter les restrictions alimentaires
      if (dietaryRestrictions && dietaryRestrictions.length > 0) {
        if (isSimpleRestrictions) {
          // Version simple: chaque restriction est une chaîne de caractères
          dietaryRestrictions.forEach(restriction => {
            query += ` AND NOT (r.ingredients::text ILIKE '%' || $${paramCount} || '%')`;
            values.push(restriction);
            paramCount++;
          });
        } else {
          // Version complexe: chaque restriction est un objet
          dietaryRestrictions.forEach(restriction => {
            // Exclure les ingrédients spécifiés dans les restrictions
            if (typeof restriction === 'string') {
              query += ` AND NOT (r.ingredients::text ILIKE '%' || $${paramCount} || '%')`;
              values.push(restriction);
              paramCount++;
            } 
            else if (restriction.restriction_type === 'vegetarian') {
              query += ` AND (r.ingredients::text NOT ILIKE '%meat%' AND r.ingredients::text NOT ILIKE '%chicken%' AND r.ingredients::text NOT ILIKE '%beef%')`;
            }
            else {
              query += ` AND NOT (r.ingredients::text ILIKE '%' || $${paramCount} || '%')`;
              values.push(restriction.details || restriction.restriction_type);
              paramCount++;
            }
          });
        }
      }
      
      // Trier aléatoirement pour la diversité des menus
      query += ` ORDER BY random()`;
      
      // Ajouter une limite
      if (limit) {
        query += ` LIMIT $${paramCount}`;
        values.push(limit);
      }
      
      const result = await pool.query(query, values);
      return result.rows;
    } catch (error) {
      console.error('Error in getEligibleRecipes:', error);
      throw new DbError(error.message);
    }
  },
  
  async createWeeklyMenu(userId, menuData) {
    const query = `
      INSERT INTO weekly_menus 
      (user_id, meal_schedule, menu_type, status, is_customized, valid_from, valid_to, family_size, generated_options)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const values = [
      userId,
      menuData.meal_schedule,
      menuData.type || 'weekly',
      menuData.status || 'active',
      menuData.is_customized || false,
      menuData.valid_from,
      menuData.valid_to,
      menuData.family_size || 1,
      menuData.generated_options || {}
    ];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in createWeeklyMenu:', error);
      throw new DbError(error.message);
    }
  },

  async updateWeeklyMenu(id, userId, menuData) {
    const query = `
      UPDATE weekly_menus 
      SET meal_schedule = $1, menu_type = $2, status = $3, 
          is_customized = $4, valid_from = $5, valid_to = $6,
          family_size = $7, generated_options = $8
      WHERE id = $9 AND user_id = $10
      RETURNING *
    `;
    const values = [
      menuData.meal_schedule,
      menuData.type || 'weekly',
      menuData.status || 'active',
      menuData.is_customized || false,
      menuData.valid_from,
      menuData.valid_to,
      menuData.family_size || 1,
      menuData.generated_options || {},
      id,
      userId
    ];
    
    try {
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error in updateWeeklyMenu:', error);
      throw new DbError(error.message);
    }
  },

  async deleteWeeklyMenu(id, userId) {
    const query = 'DELETE FROM weekly_menus WHERE id = $1 AND user_id = $2 RETURNING *';
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  },

  async archiveExpiredWeeklyMenus() {
    const query = `
      UPDATE weekly_menus 
      SET status = 'archived' 
      WHERE valid_to < CURRENT_TIMESTAMP AND status = 'active'
      RETURNING *
    `;
    const result = await pool.query(query);
    return result.rows;
  },

  async getFavoriteRecipes(userId, limit = 20) {
    const query = `
      SELECT r.* 
      FROM recipes r
      JOIN favorites f ON r.id = f.recipe_id
      WHERE f.user_id = $1
      ORDER BY random()
      LIMIT $2
    `;
    const result = await pool.query(query, [userId, limit]);
    return result.rows;
  }
};

export default menusDataMapper;