import pool from "./connexion.js";
import DbError from "../erros/dbError.js";

const userProfileDataMapper = {
  async getUserProfile(userId) {
    try {
      const query = `
        SELECT id, username, email, role, household_members, preferences, 
               subscription_type, subscription_status
        FROM users 
        WHERE id = $1
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      throw new DbError(error.message);
    }
  },
  
  async getActiveMenu(userId) {
    try {
      const query = `
        SELECT *
        FROM menus
        WHERE user_id = $1 
          AND status = 'active'
          AND valid_from <= CURRENT_TIMESTAMP
          AND valid_to >= CURRENT_TIMESTAMP
        ORDER BY valid_from DESC
        LIMIT 1
      `;
      
      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      throw new DbError(error.message);
    }
  },
  
  async getSeasonalItemsBySeason(season) {
    try {
      const query = `
        SELECT *
        FROM seasonal_items
        WHERE seasons @> $1::jsonb
        ORDER BY type, name
      `;
      
      // Construire le tableau JSON pour la recherche
      const seasonJson = JSON.stringify([season]);
      
      const result = await pool.query(query, [seasonJson]);
      return result.rows;
    } catch (error) {
      throw new DbError(error.message);
    }
  },
  
  async getDessertSuggestions(season, isPremium) {
    try {
      const query = `
        SELECT id, title, description, prep_time, difficulty_level, 
               image_url, rating, is_premium, servings
        FROM recipes
        WHERE meal_type = 'dessert'
          AND (season = $1 OR season = 'all')
          AND (is_premium = false OR $2 = true)
        ORDER BY rating DESC, created_at DESC
        LIMIT 5
      `;
      
      const result = await pool.query(query, [season, isPremium]);
      return result.rows;
    } catch (error) {
      throw new DbError(error.message);
    }
  }
};

export default userProfileDataMapper;