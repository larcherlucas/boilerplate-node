import pool from "../datamappers/connexion.js";

const menusDataMapper = {
  // Weekly Menus methods
  async findAllWeeklyMenus(userId) {
    const query = 'SELECT * FROM weekly_menus WHERE user_id = $1 ORDER BY generated_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
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

  async createWeeklyMenu(userId, menuData) {
    const query = `
      INSERT INTO weekly_menus 
      (user_id, meal_schedule, status, is_customized, valid_from, valid_to, family_size, generated_options)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const values = [
      userId,
      menuData.meal_schedule,
      menuData.status || 'active',
      menuData.is_customized || false,
      menuData.valid_from,
      menuData.valid_to,
      menuData.family_size || 1,
      menuData.generated_options || {}
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async updateWeeklyMenu(id, userId, menuData) {
    const query = `
      UPDATE weekly_menus 
      SET meal_schedule = $1, status = $2, 
          is_customized = $3, valid_from = $4, valid_to = $5,
          family_size = $6, generated_options = $7
      WHERE id = $8 AND user_id = $9
      RETURNING *
    `;
    const values = [
      menuData.meal_schedule,
      menuData.status,
      menuData.is_customized,
      menuData.valid_from,
      menuData.valid_to,
      menuData.family_size || 1,
      menuData.generated_options || {},
      id,
      userId
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
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

  // Nouvelles méthodes pour le générateur de menus
  async getEligibleRecipes(dietaryRestrictions = [], familySize = 1, mealTypes = ['breakfast', 'lunch', 'dinner'], limit = 100) {
    // Construction des conditions pour les restrictions alimentaires
    let restrictionConditions = '';
    const values = [familySize];
    
    if (dietaryRestrictions.length > 0) {
      restrictionConditions = 'AND (';
      dietaryRestrictions.forEach((restriction, index) => {
        if (index > 0) restrictionConditions += ' AND ';
        
        switch(restriction.restriction_type) {
          case 'allergy':
            restrictionConditions += `NOT EXISTS (
              SELECT 1 FROM recipe_ingredients ri 
              JOIN ingredients i ON ri.ingredient_id = i.id 
              WHERE ri.recipe_id = r.id AND i.name ILIKE $${values.length + 1}
            )`;
            values.push(`%${restriction.details}%`);
            break;
          case 'diet':
            if (restriction.details === 'vegetarian') {
              restrictionConditions += `r.is_vegetarian = true`;
            } else if (restriction.details === 'vegan') {
              restrictionConditions += `r.is_vegan = true`;
            }
            break;
          case 'dislike':
            restrictionConditions += `NOT EXISTS (
              SELECT 1 FROM recipe_ingredients ri 
              JOIN ingredients i ON ri.ingredient_id = i.id 
              WHERE ri.recipe_id = r.id AND i.name ILIKE $${values.length + 1}
            )`;
            values.push(`%${restriction.details}%`);
            break;
        }
      });
      restrictionConditions += ')';
    }

    // Condition pour les types de repas
    let mealTypeCondition = '';
    if (mealTypes.length > 0) {
      mealTypeCondition = 'AND r.meal_type = ANY($' + (values.length + 1) + ')';
      values.push(mealTypes);
    }

    const query = `
      SELECT r.* 
      FROM recipes r
      WHERE r.serves_min <= $1 AND r.serves_max >= $1
      ${restrictionConditions}
      ${mealTypeCondition}
      ORDER BY random()
      LIMIT $${values.length + 1}
    `;
    
    values.push(limit);
    const result = await pool.query(query, values);
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