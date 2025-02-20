import pool from "../datamappers/connexion.js";

const menusDataMapper = {
  async findAll(userId) {
    const query = 'SELECT * FROM menus WHERE user_id = $1 ORDER BY generated_at DESC';
    const result = await pool.query(query, [userId]);
    return result.rows;
  },

  async findById(id, userId) {
    const query = 'SELECT * FROM menus WHERE id = $1 AND user_id = $2';
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  },

  async findActive(userId) {
    const query = 'SELECT * FROM menus WHERE user_id = $1 AND status = $2 ORDER BY valid_from DESC';
    const result = await pool.query(query, [userId, 'active']);
    return result.rows;
  },

  async create(userId, menuData) {
    const query = `
      INSERT INTO menus 
      (user_id, type, meal_schedule, status, is_customized, valid_from, valid_to)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      userId,
      menuData.type,
      menuData.meal_schedule,
      menuData.status,
      menuData.is_customized,
      menuData.valid_from,
      menuData.valid_to
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async update(id, userId, menuData) {
    const query = `
      UPDATE menus 
      SET type = $1, meal_schedule = $2, status = $3, 
          is_customized = $4, valid_from = $5, valid_to = $6
      WHERE id = $7 AND user_id = $8
      RETURNING *
    `;
    const values = [
      menuData.type,
      menuData.meal_schedule,
      menuData.status,
      menuData.is_customized,
      menuData.valid_from,
      menuData.valid_to,
      id,
      userId
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async delete(id, userId) {
    const query = 'DELETE FROM menus WHERE id = $1 AND user_id = $2 RETURNING *';
    const result = await pool.query(query, [id, userId]);
    return result.rows[0];
  },

  async archiveExpired() {
    const query = `
      UPDATE menus 
      SET status = 'archived' 
      WHERE valid_to < CURRENT_TIMESTAMP AND status = 'active'
      RETURNING *
    `;
    const result = await pool.query(query);
    return result.rows;
  }
};

export default menusDataMapper;