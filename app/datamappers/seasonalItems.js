import pool from "../datamappers/connexion.js";

const seasonalItemsDataMapper = {
  async findAll() {
    const query = 'SELECT * FROM seasonal_items ORDER BY name';
    const result = await pool.query(query);
    return result.rows;
  },

  async findById(id) {
    const query = 'SELECT * FROM seasonal_items WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  },

  async findByType(type) {
    const query = 'SELECT * FROM seasonal_items WHERE type = $1 ORDER BY name';
    const result = await pool.query(query, [type]);
    return result.rows;
  },

  async create(seasonalItem) {
    const query = `
      INSERT INTO seasonal_items 
      (name, type, seasons, description, image_url, nutritional_benefits, storage_tips)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      seasonalItem.name,
      seasonalItem.type,
      seasonalItem.seasons,
      seasonalItem.description,
      seasonalItem.image_url,
      seasonalItem.nutritional_benefits,
      seasonalItem.storage_tips
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async update(id, seasonalItem) {
    const query = `
      UPDATE seasonal_items 
      SET name = $1, type = $2, seasons = $3, description = $4, 
          image_url = $5, nutritional_benefits = $6, storage_tips = $7
      WHERE id = $8
      RETURNING *
    `;
    const values = [
      seasonalItem.name,
      seasonalItem.type,
      seasonalItem.seasons,
      seasonalItem.description,
      seasonalItem.image_url,
      seasonalItem.nutritional_benefits,
      seasonalItem.storage_tips,
      id
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async delete(id) {
    const query = 'DELETE FROM seasonal_items WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
};

export default seasonalItemsDataMapper;